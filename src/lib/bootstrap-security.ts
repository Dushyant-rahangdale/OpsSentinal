import { createHash, randomBytes } from 'crypto';
import prisma from '@/lib/prisma';
import { logger } from '@/lib/logger';

export const BOOTSTRAP_CONFIG_KEY = 'auth.bootstrap.authorization';
export const BOOTSTRAP_TTL_MS = 30 * 60 * 1000;

export type BootstrapAuthorizationState = {
  tokenHash: string;
  expiresAt: string;
  usedAt: string | null;
  generation: number;
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

/**
 * Ensure a one-time setup capability exists. The raw capability is never sent
 * to an unauthenticated browser: it is emitted once to the operator-controlled
 * server log and only a SHA-256 digest is persisted.
 */
export async function ensureBootstrapAuthorization(): Promise<{ expiresAt: Date }> {
  const now = new Date();
  const existingRow = await prisma.systemConfig.findUnique({
    where: { key: BOOTSTRAP_CONFIG_KEY },
    select: { value: true },
  });
  const existing = parseBootstrapState(existingRow?.value);
  if (existing && !existing.usedAt && new Date(existing.expiresAt) > now) {
    return { expiresAt: new Date(existing.expiresAt) };
  }

  const code = randomBytes(24).toString('base64url');
  const expiresAt = new Date(now.getTime() + BOOTSTRAP_TTL_MS);
  const nextState: BootstrapAuthorizationState = {
    tokenHash: hashBootstrapCode(code),
    expiresAt: expiresAt.toISOString(),
    usedAt: null,
    generation: (existing?.generation ?? 0) + 1,
  };

  if (!existingRow) {
    try {
      await prisma.systemConfig.create({
        data: { key: BOOTSTRAP_CONFIG_KEY, value: nextState },
      });
    } catch (error) {
      // A concurrent first request may have won the unique-key race. Never
      // overwrite its still-valid capability with a second secret.
      if (!(error && typeof error === 'object' && 'code' in error && error.code === 'P2002')) {
        throw error;
      }
      const winner = await prisma.systemConfig.findUnique({
        where: { key: BOOTSTRAP_CONFIG_KEY },
        select: { value: true },
      });
      const winnerState = parseBootstrapState(winner?.value);
      if (winnerState && !winnerState.usedAt && new Date(winnerState.expiresAt) > now) {
        return { expiresAt: new Date(winnerState.expiresAt) };
      }
      throw error;
    }
  } else {
    await prisma.systemConfig.update({
      where: { key: BOOTSTRAP_CONFIG_KEY },
      data: { value: nextState, updatedBy: null },
    });
  }

  // Keep the raw capability out of the application's in-memory log buffer.
  // stderr is the self-hosted operator console/out-of-band delivery channel.
  logger.warn('auth.bootstrap.authorization_issued', {
    component: 'bootstrap-security',
    generation: nextState.generation,
    expiresAt: expiresAt.toISOString(),
  });
  process.stderr.write(
    `[OpsKnight setup] One-time authorization code (expires ${expiresAt.toISOString()}): ${code}\n`
  );
  return { expiresAt };
}
