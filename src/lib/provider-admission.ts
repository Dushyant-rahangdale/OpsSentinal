import crypto from 'node:crypto';
import { Prisma, type NotificationTrafficClass } from '@prisma/client';
import prisma from './prisma';
import { getProviderCapacity, recordCapacityPressure, usesBulkCapacity } from './provider-capacity';

export type ProviderAdmissionScope = 'EMAIL' | 'SMS' | 'WHATSAPP' | 'PUSH' | 'SLACK' | 'WEBHOOK';

export type ProviderAdmissionResult =
  | { allowed: true }
  | { allowed: false; retryAt: Date; reason: 'RATE_LIMITED' };

export type ProviderConcurrencyResult =
  | { allowed: true; leaseKey: string }
  | { allowed: false; retryAt: Date; reason: 'MAX_IN_FLIGHT' };

const PROVIDER_LEASE_MS = 30_000;
const WORKER_ID = process.env.OPSKNIGHT_WORKER_ID?.trim() || crypto.randomUUID();
const localQuota = new Map<string, { remaining: number; expiresAt: number }>();
const localConcurrency = new Map<string, { reserved: number; active: number; expiresAt: number }>();
const concurrencyClaims = new Map<string, string>();

export function resetProviderAdmissionForTests() {
  localQuota.clear();
  localConcurrency.clear();
  concurrencyClaims.clear();
}

function bucketKey(scope: ProviderAdmissionScope, providerKey: string): string {
  return `provider:${scope.toLowerCase()}:${providerKey}`.slice(0, 240);
}

/**
 * Distributed provider admission control using OpsKnight's existing RateLimit table.
 * A conditional UPSERT serializes writers for one provider bucket without holding a
 * serializable read-then-write transaction. This is important during multi-channel
 * fan-out, where competing first writes previously exhausted transaction retries.
 */
export async function acquireProviderAdmission(
  scope: ProviderAdmissionScope,
  providerKey: string,
  now: Date = new Date(),
  trafficClass?: NotificationTrafficClass
): Promise<ProviderAdmissionResult> {
  const capacity = getProviderCapacity(scope, providerKey);
  const bulk = usesBulkCapacity(trafficClass);
  const cacheKey = `${bucketKey(scope, providerKey)}:${bulk ? 'bulk' : 'global'}`;
  const cached = localQuota.get(cacheKey);
  if (cached && cached.expiresAt > now.getTime() && cached.remaining > 0) {
    cached.remaining -= 1;
    return { allowed: true };
  }

  const windowStart = new Date(Math.floor(now.getTime() / 1_000) * 1_000);
  const expiresAt = new Date(windowStart.getTime() + 1_000);
  const id = `${scope}:${providerKey}:${windowStart.getTime()}`.slice(0, 240);
  const requested = Math.min(
    capacity.quotaBlockSize,
    bulk ? capacity.bulkRatePerSecond : capacity.effectiveRatePerSecond
  );
  const rows = await prisma.$queryRaw<Array<{ granted: number }>>(Prisma.sql`
    WITH ensured AS (
      INSERT INTO "ProviderQuotaWindow"
        ("id", "providerKey", "channel", "windowStart", "globalUsed", "bulkUsed", "expiresAt", "updatedAt")
      VALUES (${id}, ${providerKey}, ${scope}, ${windowStart}, 0, 0, ${expiresAt}, NOW())
      ON CONFLICT ("id") DO UPDATE SET "expiresAt" = EXCLUDED."expiresAt", "updatedAt" = NOW()
      RETURNING *
    ), capacity AS (
      SELECT LEAST(
        ${requested},
        GREATEST(0, ${capacity.effectiveRatePerSecond} - "globalUsed"),
        ${bulk ? Prisma.sql`GREATEST(0, ${capacity.bulkRatePerSecond} - "bulkUsed")` : Prisma.sql`${requested}`}
      )::integer AS granted
      FROM ensured
    )
    UPDATE "ProviderQuotaWindow" AS window
    SET "globalUsed" = window."globalUsed" + capacity.granted,
        "bulkUsed" = window."bulkUsed" + ${bulk ? Prisma.sql`capacity.granted` : Prisma.sql`0`},
        "updatedAt" = NOW()
    FROM capacity
    WHERE window."id" = ${id} AND capacity.granted > 0
    RETURNING capacity.granted
  `);
  const granted = Number(rows[0]?.granted ?? 0);
  if (granted > 0) {
    localQuota.set(cacheKey, { remaining: granted - 1, expiresAt: expiresAt.getTime() });
    return { allowed: true };
  }
  return { allowed: false, retryAt: expiresAt, reason: 'RATE_LIMITED' };
}

/** Persist a provider-supplied cooldown (for example HTTP Retry-After) across replicas. */
export async function deferProviderAdmission(
  scope: ProviderAdmissionScope,
  providerKey: string,
  retryAt: Date
): Promise<void> {
  const config = getProviderCapacity(scope, providerKey);
  const key = bucketKey(scope, providerKey);
  const intervalMs = 1_000 / config.effectiveRatePerSecond;
  const cooldownTheoreticalArrival = new Date(
    retryAt.getTime() + intervalMs * Math.max(0, config.effectiveRatePerSecond - 1)
  );
  await prisma.$executeRaw(Prisma.sql`
    INSERT INTO "RateLimit" ("key", "count", "expiresAt")
    VALUES (${key}, ${config.effectiveRatePerSecond}, ${cooldownTheoreticalArrival})
    ON CONFLICT ("key") DO UPDATE SET
      "count" = GREATEST("RateLimit"."count", EXCLUDED."count"),
      "expiresAt" = GREATEST("RateLimit"."expiresAt", EXCLUDED."expiresAt")
  `);
  for (const localKey of localQuota.keys()) {
    if (localKey.startsWith(`${key}:`)) localQuota.delete(localKey);
  }
  recordCapacityPressure(scope, providerKey);
}

/** Distributed concurrency slots with expiring leases for crashed workers. */
export async function acquireProviderConcurrency(
  scope: ProviderAdmissionScope,
  providerKey: string,
  now: Date = new Date()
): Promise<ProviderConcurrencyResult> {
  const config = getProviderCapacity(scope, providerKey);
  const poolKey = `${scope}:${providerKey}`;
  let local = localConcurrency.get(poolKey);
  if (!local || local.expiresAt <= now.getTime()) {
    const id = `${WORKER_ID}:${poolKey}`.slice(0, 240);
    const requested = Math.min(20, config.maxInFlight);
    const rows = await prisma.$queryRaw<Array<{ reservedSlots: number }>>(Prisma.sql`
      WITH lock AS (
        SELECT pg_advisory_xact_lock(hashtextextended(${`provider-slots:${poolKey}`}, 0))
      ), available AS (
        SELECT GREATEST(0, ${config.maxInFlight} - COALESCE(SUM("reservedSlots"), 0))::integer AS slots
        FROM "ProviderWorkerLease", lock
        WHERE "providerKey" = ${providerKey} AND "channel" = ${scope}
          AND "expiresAt" > ${now} AND "workerId" <> ${WORKER_ID}
      )
      INSERT INTO "ProviderWorkerLease"
        ("id", "workerId", "providerKey", "channel", "reservedSlots", "expiresAt", "heartbeatAt", "updatedAt")
      SELECT ${id}, ${WORKER_ID}, ${providerKey}, ${scope}, LEAST(${requested}, slots),
        ${new Date(now.getTime() + PROVIDER_LEASE_MS)}, ${now}, NOW()
      FROM available WHERE slots > 0
      ON CONFLICT ("id") DO UPDATE SET
        "reservedSlots" = EXCLUDED."reservedSlots", "expiresAt" = EXCLUDED."expiresAt",
        "heartbeatAt" = EXCLUDED."heartbeatAt", "updatedAt" = NOW()
      RETURNING "reservedSlots"
    `);
    const reserved = Number(rows[0]?.reservedSlots ?? 0);
    if (reserved === 0) {
      return {
        allowed: false,
        retryAt: new Date(now.getTime() + 250),
        reason: 'MAX_IN_FLIGHT',
      };
    }
    local = { reserved, active: 0, expiresAt: now.getTime() + PROVIDER_LEASE_MS };
    localConcurrency.set(poolKey, local);
  }
  if (local.active >= local.reserved) {
    return {
      allowed: false,
      retryAt: new Date(now.getTime() + 25),
      reason: 'MAX_IN_FLIGHT',
    };
  }
  local.active += 1;
  const leaseKey = `${poolKey}:${crypto.randomUUID()}`;
  concurrencyClaims.set(leaseKey, poolKey);
  return { allowed: true, leaseKey };
}

export async function releaseProviderConcurrency(leaseKey: string): Promise<void> {
  const poolKey = concurrencyClaims.get(leaseKey);
  if (!poolKey) return;
  concurrencyClaims.delete(leaseKey);
  const local = localConcurrency.get(poolKey);
  if (local) local.active = Math.max(0, local.active - 1);
}

export class ProviderCooldownError extends Error {
  constructor(
    readonly providerKey: string,
    readonly retryAt: Date
  ) {
    super(`Provider ${providerKey} is in cooldown until ${retryAt.toISOString()}`);
    this.name = 'ProviderCooldownError';
  }
}

export async function assertProviderAdmitted(key: string, now = new Date()): Promise<void> {
  const admission = await prisma.providerAdmission.findUnique({ where: { key } });
  if (admission?.blockedUntil && admission.blockedUntil > now) {
    throw new ProviderCooldownError(key, admission.blockedUntil);
  }
}

export async function recordProviderSuccess(key: string): Promise<void> {
  await prisma.providerAdmission.upsert({
    where: { key },
    create: { key, state: 'CLOSED', lastSuccessAt: new Date() },
    update: {
      state: 'CLOSED',
      blockedUntil: null,
      consecutiveFails: 0,
      lastSuccessAt: new Date(),
      lastStatusCode: null,
    },
  });
}

export async function recordProviderFailure(
  key: string,
  options: { statusCode?: number; retryAfterMs?: number } = {}
): Promise<void> {
  const now = new Date();
  const blockedUntil = options.retryAfterMs
    ? new Date(now.getTime() + Math.min(Math.max(options.retryAfterMs, 1_000), 24 * 60 * 60_000))
    : undefined;
  await prisma.providerAdmission.upsert({
    where: { key },
    create: {
      key,
      state: blockedUntil ? 'OPEN' : 'DEGRADED',
      blockedUntil,
      consecutiveFails: 1,
      lastFailureAt: now,
      lastStatusCode: options.statusCode,
    },
    update: {
      state: blockedUntil ? 'OPEN' : 'DEGRADED',
      blockedUntil,
      consecutiveFails: { increment: 1 },
      lastFailureAt: now,
      lastStatusCode: options.statusCode,
    },
  });
}
