import {
  detectOidcProviderType,
  isMicrosoftEntraGenericAuthority,
  getMicrosoftEntraTenantAuthority,
  type OidcProviderType,
} from '@/lib/oidc-provider';

export type OidcClaims = Record<string, unknown>;

export type OrganizationPolicyResult =
  | { ok: true }
  | { ok: false; reason: 'OIDC_ORGANIZATION_REJECTED' };

export interface OidcProviderPolicy {
  readonly family: OidcProviderType;
  readonly acceptedIdTokenAlgorithms: readonly string[];
  validateIssuer(issuer: URL): boolean;
  validateOrganizationBoundary(
    claims: OidcClaims,
    allowedDomains: string[]
  ): OrganizationPolicyResult;
  allowsMissingEmailVerified(): boolean;
}

function normalizedAllowed(values: string[]): Set<string> {
  return new Set(values.map(value => value.trim().toLowerCase()).filter(Boolean));
}

function emailDomain(claims: OidcClaims): string | null {
  if (typeof claims.email !== 'string') return null;
  const separator = claims.email.lastIndexOf('@');
  return separator > 0
    ? claims.email
        .slice(separator + 1)
        .trim()
        .toLowerCase()
    : null;
}

function emailBoundary(claims: OidcClaims, allowedDomains: string[]): OrganizationPolicyResult {
  const allowed = normalizedAllowed(allowedDomains);
  if (allowed.size === 0) return { ok: true };
  const domain = emailDomain(claims);
  return domain && allowed.has(domain)
    ? { ok: true }
    : { ok: false, reason: 'OIDC_ORGANIZATION_REJECTED' };
}

const genericPolicy: OidcProviderPolicy = {
  family: 'custom',
  acceptedIdTokenAlgorithms: ['RS256', 'ES256'],
  validateIssuer: () => true,
  validateOrganizationBoundary: emailBoundary,
  allowsMissingEmailVerified: () => false,
};

const googlePolicy: OidcProviderPolicy = {
  family: 'google',
  acceptedIdTokenAlgorithms: ['RS256'],
  validateIssuer: issuer =>
    issuer.protocol === 'https:' &&
    issuer.hostname === 'accounts.google.com' &&
    issuer.pathname === '/',
  validateOrganizationBoundary: (claims, allowedDomains) => {
    const allowed = normalizedAllowed(allowedDomains);
    if (allowed.size === 0) return { ok: true };
    // The signed hd claim is the Workspace membership assertion. Email domain
    // and the authorization-request hd parameter are not security boundaries.
    const hostedDomain = typeof claims.hd === 'string' ? claims.hd.trim().toLowerCase() : null;
    return hostedDomain && allowed.has(hostedDomain)
      ? { ok: true }
      : { ok: false, reason: 'OIDC_ORGANIZATION_REJECTED' };
  },
  allowsMissingEmailVerified: () => false,
};

const entraPolicy: OidcProviderPolicy = {
  family: 'azure',
  acceptedIdTokenAlgorithms: ['RS256'],
  validateIssuer: issuer => {
    const authority = getMicrosoftEntraTenantAuthority(issuer);
    return authority !== null && !isMicrosoftEntraGenericAuthority(authority);
  },
  // Entra membership is bounded by the tenant-specific issuer. An email suffix
  // is not tenant proof and must never be used as one.
  validateOrganizationBoundary: () => ({ ok: true }),
  allowsMissingEmailVerified: () => true,
};

const oktaPolicy: OidcProviderPolicy = {
  ...genericPolicy,
  family: 'okta',
  acceptedIdTokenAlgorithms: ['RS256'],
};

const auth0Policy: OidcProviderPolicy = {
  ...genericPolicy,
  family: 'auth0',
  acceptedIdTokenAlgorithms: ['RS256'],
};

const policies: Record<OidcProviderType, OidcProviderPolicy> = {
  google: googlePolicy,
  azure: entraPolicy,
  okta: oktaPolicy,
  auth0: auth0Policy,
  custom: genericPolicy,
};

/** Security policy is derived from the trusted issuer, never from UI branding. */
export function getOidcProviderPolicy(issuer: string): OidcProviderPolicy {
  return policies[detectOidcProviderType(issuer)];
}
