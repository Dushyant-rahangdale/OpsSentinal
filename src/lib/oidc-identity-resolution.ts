import prisma from '@/lib/prisma';
import { runSerializableTransaction } from '@/lib/db-utils';
import { hasOidcEmailLinkAssurance } from '@/lib/oidc-provider';
import { isOidcLinkingApprovalUsable } from '@/lib/oidc-linking-approval';

export type OidcTargetUser = {
  id: string;
  email: string;
  status: string;
  role: string;
  name: string | null;
  department: string | null;
  jobTitle: string | null;
  avatarUrl: string | null;
};

export type OidcIdentityResolutionFailure =
  | 'OIDC_EMAIL_REQUIRED'
  | 'OIDC_EMAIL_ASSURANCE_REQUIRED'
  | 'OIDC_DOMAIN_NOT_ALLOWED'
  | 'OIDC_AUTO_PROVISION_DISABLED'
  | 'OIDC_LINK_NOT_APPROVED'
  | 'OIDC_LINK_APPROVAL_EXPIRED'
  | 'OIDC_TARGET_NOT_OPERATIONAL'
  | 'OIDC_IDENTITY_OWNED_BY_ANOTHER_USER';

export type OidcIdentityResolutionResult =
  | {
      ok: true;
      user: OidcTargetUser;
      identityCreated: boolean;
      userCreated: boolean;
      approvalConsumed: boolean;
    }
  | {
      ok: false;
      reason: OidcIdentityResolutionFailure;
    };

type ResolveOidcIdentityInput = {
  issuer: string;
  subject: string;
  email: string | null;
  displayName: string | null;
  providerType: string | null | undefined;
  emailVerifiedClaim: boolean | undefined;
  autoProvision: boolean;
  allowedDomains: string[];
};

const targetUserSelect = {
  id: true,
  email: true,
  status: true,
  role: true,
  name: true,
  department: true,
  jobTitle: true,
  avatarUrl: true,
} as const;

function normalizeEmail(email: string | null): string | null {
  const normalized = email?.trim().toLowerCase() ?? '';
  return normalized || null;
}

function isAllowedDomain(email: string, allowedDomains: string[]): boolean {
  if (allowedDomains.length === 0) return true;
  const separator = email.lastIndexOf('@');
  if (separator <= 0 || separator === email.length - 1) return false;
  const domain = email.slice(separator + 1).trim().toLowerCase();
  const normalizedAllowed = allowedDomains.map(value => value.trim().toLowerCase());
  return normalizedAllowed.includes(domain);
}

/**
 * Resolve one OIDC principal to an OpsKnight user.
 *
 * Stable identity `(issuer, subject)` always wins. Email is only consulted when
 * no identity is linked yet, for explicit account linking or JIT provisioning.
 * All state-changing first-link decisions are rechecked inside one serializable
 * transaction so user creation and identity creation cannot commit separately.
 */
export async function resolveOidcIdentityForSignIn(
  input: ResolveOidcIdentityInput,
  now = new Date()
): Promise<OidcIdentityResolutionResult> {
  const email = normalizeEmail(input.email);

  // Established identity fast path. Email/domain/verification changes cannot
  // move or destroy an existing immutable binding.
  const existingIdentity = await prisma.oidcIdentity.findUnique({
    where: { issuer_subject: { issuer: input.issuer, subject: input.subject } },
    select: { userId: true },
  });
  if (existingIdentity) {
    const linkedUser = await prisma.user.findUnique({
      where: { id: existingIdentity.userId },
      select: targetUserSelect,
    });
    if (!linkedUser || linkedUser.status === 'DISABLED') {
      return { ok: false, reason: 'OIDC_TARGET_NOT_OPERATIONAL' };
    }
    return {
      ok: true,
      user: linkedUser,
      identityCreated: false,
      userCreated: false,
      approvalConsumed: false,
    };
  }

  if (!email) return { ok: false, reason: 'OIDC_EMAIL_REQUIRED' };
  if (!isAllowedDomain(email, input.allowedDomains)) {
    return { ok: false, reason: 'OIDC_DOMAIN_NOT_ALLOWED' };
  }

  try {
    return await runSerializableTransaction(async tx => {
      // A concurrent callback may have created the identity after the fast
      // path. Recheck first and let the stable binding win unconditionally.
      const identityInsideTransaction = await tx.oidcIdentity.findUnique({
        where: { issuer_subject: { issuer: input.issuer, subject: input.subject } },
        select: { userId: true },
      });
      if (identityInsideTransaction) {
        const linkedUser = await tx.user.findUnique({
          where: { id: identityInsideTransaction.userId },
          select: targetUserSelect,
        });
        if (!linkedUser || linkedUser.status === 'DISABLED') {
          throw new Error('OIDC_TARGET_NOT_OPERATIONAL');
        }
        return {
          ok: true as const,
          user: linkedUser,
          identityCreated: false,
          userCreated: false,
          approvalConsumed: false,
        };
      }

      // Email is discovery material only after stable identity lookup misses.
      // Re-read it in the transaction so linking decisions never rely on stale
      // state observed before the transaction began.
      const emailUser = await tx.user.findUnique({
        where: { email },
        select: targetUserSelect,
      });

      if (emailUser?.status === 'DISABLED') {
        throw new Error('OIDC_TARGET_NOT_OPERATIONAL');
      }

      if (emailUser) {
        if (!hasOidcEmailLinkAssurance(input.providerType, input.emailVerifiedClaim)) {
          throw new Error('OIDC_EMAIL_ASSURANCE_REQUIRED');
        }

        const approval = await tx.oidcLinkingApproval.findUnique({
          where: { userId: emailUser.id },
          select: { id: true, generation: true, revokedAt: true, expiresAt: true },
        });
        if (!approval) throw new Error('OIDC_LINK_NOT_APPROVED');
        if (!isOidcLinkingApprovalUsable(approval, now)) {
          if (!approval.revokedAt && approval.expiresAt && approval.expiresAt <= now) {
            throw new Error('OIDC_LINK_APPROVAL_EXPIRED');
          }
          throw new Error('OIDC_LINK_NOT_APPROVED');
        }

        // Consume exactly the generation that was evaluated. This closes the
        // revoke/renew/callback race and guarantees one callback consumes one
        // approval generation.
        const consumed = await tx.oidcLinkingApproval.updateMany({
          where: {
            id: approval.id,
            generation: approval.generation,
            revokedAt: null,
            OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
          },
          data: { revokedAt: now },
        });
        if (consumed.count !== 1) throw new Error('OIDC_LINK_NOT_APPROVED');

        await tx.oidcIdentity.create({
          data: {
            issuer: input.issuer,
            subject: input.subject,
            email,
            userId: emailUser.id,
          },
        });

        return {
          ok: true as const,
          user: emailUser,
          identityCreated: true,
          userCreated: false,
          approvalConsumed: true,
        };
      }

      if (!input.autoProvision) {
        throw new Error('OIDC_AUTO_PROVISION_DISABLED');
      }

      // JIT user and immutable identity are one atomic unit. If identity
      // insertion fails, the transaction rolls the new user back too.
      const createdUser = await tx.user.create({
        data: {
          email,
          name: input.displayName || email.split('@')[0],
          role: 'USER',
          status: 'ACTIVE',
        },
        select: targetUserSelect,
      });

      await tx.oidcIdentity.create({
        data: {
          issuer: input.issuer,
          subject: input.subject,
          email,
          userId: createdUser.id,
        },
      });

      return {
        ok: true as const,
        user: createdUser,
        identityCreated: true,
        userCreated: true,
        approvalConsumed: false,
      };
    });
  } catch (error) {
    const reason = error instanceof Error ? error.message : '';
    const knownReasons = new Set<OidcIdentityResolutionFailure>([
      'OIDC_EMAIL_REQUIRED',
      'OIDC_EMAIL_ASSURANCE_REQUIRED',
      'OIDC_DOMAIN_NOT_ALLOWED',
      'OIDC_AUTO_PROVISION_DISABLED',
      'OIDC_LINK_NOT_APPROVED',
      'OIDC_LINK_APPROVAL_EXPIRED',
      'OIDC_TARGET_NOT_OPERATIONAL',
      'OIDC_IDENTITY_OWNED_BY_ANOTHER_USER',
    ]);
    if (knownReasons.has(reason as OidcIdentityResolutionFailure)) {
      return { ok: false, reason: reason as OidcIdentityResolutionFailure };
    }
    throw error;
  }
}
