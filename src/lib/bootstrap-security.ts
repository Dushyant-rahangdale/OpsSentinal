import { createHash, randomBytes } from 'crypto';
import { Prisma } from '@prisma/client';
import prisma from '@/lib/prisma';
import { logger } from '@/lib/logger';

export const BOOTSTRAP_CONFIG_KEY = 'auth.bootstrap.authorization';
export const BOOTSTRAP_TTL_MS = 30 * 60 * 1000;
const BOOTSTRAP_ISSUE_ATTEMPTS = 4;

export type BootstrapAuthorizationState = {
  tokenHash: string;
  expiresAt: string;
  usedAt: string | null;
  generation: number;
};

type BootstrapIssueResult = {
  expiresAt: Date;
  generation: number;
  code: string | null;
};

export function hashBootstrapCode(code: string): string {
  return createHash('sha256').update(code).digest('hex');
}

export function parseBootstrapState(value: unknown): BootstrapAuthorizationState | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  if (
    typeof record.tokenHash !== 'string' ||
    !/^[a-f0-9]{64}$/.test(record.tokenHash) ||
    typeof record.expiresAt !== 'string' ||
    (record.usedAt !== null && typeof record.usedAt !== 'string') ||
    typeof record.generation !== 'number' ||
    !Number.isInteger(record.generation)
  ) {
    return null;
  }
  const expiresAt = new Date(record.expiresAt);
  if (!Number.isFinite(expiresAt.getTime())) return null;
  return {
    tokenHash: record.tokenHash,
    expiresAt: record.expiresAt,
    usedAt: record.usedAt as string | null,
    generation: record.generation,
  };
}

function isBootstrapWriteConflict(error: unknown): boolean {
  return Boolean(
    error &&
      typeof error === 'object' &&
      'code' in error &&
      (error.code === 'P2002' || error.code === 'P2034')
  );
}

/**
 * Ensure exactly one live one-time setup capability exists across all replicas.
 * The database unique key plus SERIALIZABLE transaction is the coordination
 * boundary; no in-process mutex is relied upon.
 */
export async function ensureBootstrapAuthorization(): Promise<{ expiresAt: Date }> {
  let result: BootstrapIssueResult | null = null;

  for (let attempt = 1; attempt <= BOOTSTRAP_ISSUE_ATTEMPTS; attempt += 1) {
    try {
      result = await prisma.$transaction(
        async tx => {
          const now = new Date();
          const existingRow = await tx.systemConfig.findUnique({
            where: { key: BOOTSTRAP_CONFIG_KEY },
            select: { value: true },
          });
          const existing = parseBootstrapState(existingRow?.value);

          if (existing && !existing.usedAt && new Date(existing.expiresAt) > now) {
            return {
              expiresAt: new Date(existing.expiresAt),
              generation: existing.generation,
              code: null,
            };
          }

          const code = randomBytes(24).toString('base64url');
          const expiresAt = new Date(now.getTime() + BOOTSTRAP_TTL_MS);
          const nextState: BootstrapAuthorizationState = {
            tokenHash: hashBootstrapCode(code),
            expiresAt: expiresAt.toISOString(),
            usedAt: null,
            generation: (existing?.generation ?? 0) + 1,
          };

          if (existingRow) {
            await tx.systemConfig.update({
              where: { key: BOOTSTRAP_CONFIG_KEY },
              data: { value: nextState, updatedBy: null },
            });
          } else {
            await tx.systemConfig.create({
              data: { key: BOOTSTRAP_CONFIG_KEY, value: nextState },
            });
          }

          return { expiresAt, generation: nextState.generation, code };
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
      );
      break;
    } catch (error) {
      // Concurrent absent-row creation can surface as P2002, while concurrent
      // serializable refreshes surface as P2034. Retry and converge on winner.
      if (isBootstrapWriteConflict(error) && attempt < BOOTSTRAP_ISSUE_ATTEMPTS) continue;
      throw error;
    }
  }

  if (!result) throw new Error('Unable to establish bootstrap authorization safely');

  if (result.code) {
    // Keep the raw capability out of structured/application log buffers. stderr
    // is the operator-controlled out-of-band delivery channel for self-hosting.
    logger.warn('auth.bootstrap.authorization_issued', {
      component: 'bootstrap-security',
      generation: result.generation,
      expiresAt: result.expiresAt.toISOString(),
    });
    process.stderr.write(
      `[OpsKnight setup] One-time authorization code (expires ${result.expiresAt.toISOString()}): ${result.code}\n`
    );
  }

  return { expiresAt: result.expiresAt };
}
