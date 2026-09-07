import { Prisma } from '@prisma/client';
import { logger } from './logger';

/**
 * Postgres advisory-lock helpers.
 *
 * Used to serialize writers that otherwise race each other (e.g.,
 * rollup generation vs. rollup cleanup) without holding row-level
 * locks for the whole transaction. Advisory locks are transaction-
 * scoped via `pg_advisory_xact_lock` so they're released
 * automatically when the wrapping transaction commits or rolls back —
 * no explicit unlock, no leaked locks if the process crashes.
 *
 * Lock keys are stable bigint constants defined below. Pick a key by
 * `LOCK_KEYS.x` so they can't drift between caller and callee.
 */

export const LOCK_KEYS = {
  /** Held by both `IncidentMetricRollup` writers and cleaners. */
  ROLLUP_WRITE: BigInt(9141001),
  /** Held by the drift-detection job. */
  DRIFT_DETECTION: BigInt(9141002),
  /** Serializes all mutations that can remove the final ACTIVE administrator. */
  USER_ADMIN_INVARIANT: BigInt(9141003),
  /** Serializes manual or scheduled data retention cleanups across cluster nodes. */
  DATA_CLEANUP: BigInt(9141004),
} as const;

/**
 * Acquire a transaction-scoped advisory lock inside a Prisma transaction client.
 * Blocks until acquired and is released when the surrounding transaction ends.
 */
export async function acquireAdvisoryLock(
  tx: Prisma.TransactionClient,
  key: bigint
): Promise<void> {
  try {
    // PostgreSQL's pg_advisory_xact_lock() returns the `void` pseudo-type.
    // Prisma cannot deserialize that value from $queryRaw, even though the
    // lock itself was successfully acquired. Execute the lock in a subquery
    // and expose only a normal boolean column to Prisma.
    const rows = await tx.$queryRaw<Array<{ acquired: boolean }>>`
      SELECT TRUE AS "acquired"
      FROM (SELECT pg_advisory_xact_lock(${key}::bigint)) AS lock_result
    `;

    if (rows[0]?.acquired !== true) {
      throw new Error(`PostgreSQL advisory lock ${key.toString()} was not acquired`);
    }
  } catch (err) {
    // Fail closed: a real statement failure must roll back the transaction.
    logger.error('[DbLocks] pg_advisory_xact_lock failed; rolling back transaction', {
      key: key.toString(),
      error: err instanceof Error ? err.message : String(err),
    });
    throw err;
  }
}

/**
 * Try to acquire a transaction-scoped advisory lock without blocking.
 * Returns false for ordinary contention; propagates actual query failures.
 */
export async function tryAdvisoryLock(tx: Prisma.TransactionClient, key: bigint): Promise<boolean> {
  try {
    const rows = await tx.$queryRaw<Array<{ pg_try_advisory_xact_lock: boolean }>>`
      SELECT pg_try_advisory_xact_lock(${key}::bigint)
    `;
    return rows[0]?.pg_try_advisory_xact_lock === true;
  } catch (err) {
    logger.error('[DbLocks] pg_try_advisory_xact_lock failed; rolling back transaction', {
      key: key.toString(),
      error: err instanceof Error ? err.message : String(err),
    });
    throw err;
  }
}
