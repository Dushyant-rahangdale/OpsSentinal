import type { NotificationTrafficClass } from '@prisma/client';
/* eslint-disable security/detect-object-injection */
import type { ProviderAdmissionScope } from './provider-admission';

const ABSOLUTE_RATE_CEILING = 10_000;
const ABSOLUTE_IN_FLIGHT_CEILING = 5_000;

const DEFAULT_RATE: Record<ProviderAdmissionScope, number> = {
  EMAIL: 8,
  SMS: 20,
  WHATSAPP: 50,
  PUSH: 100,
  SLACK: 1,
  WEBHOOK: 20,
};

const DEFAULT_IN_FLIGHT: Record<ProviderAdmissionScope, number> = {
  EMAIL: 5,
  SMS: 10,
  WHATSAPP: 10,
  PUSH: 20,
  SLACK: 2,
  WEBHOOK: 10,
};

export interface ProviderCapacity {
  configuredRatePerSecond: number;
  effectiveRatePerSecond: number;
  bulkRatePerSecond: number;
  maxInFlight: number;
  adaptiveBackpressure: boolean;
  quotaBlockSize: number;
}

function integerSetting(raw: string | undefined, fallback: number, min: number, max: number) {
  if (!raw) return fallback;
  const parsed = Number(raw);
  if (!Number.isSafeInteger(parsed) || parsed < min || parsed > max) return fallback;
  return parsed;
}

function shareSetting(raw: string | undefined): number {
  if (!raw) return 0.8;
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed >= 0.05 && parsed <= 1 ? parsed : 0.8;
}

const adaptiveRates = new Map<string, number>();

function capacityKey(scope: ProviderAdmissionScope, providerKey: string) {
  return `${scope}:${providerKey}`;
}

export function getProviderCapacity(
  scope: ProviderAdmissionScope,
  providerKey = 'default',
  env: NodeJS.ProcessEnv = process.env
): ProviderCapacity {
  /* Provider scope is a closed enum, so these computed configuration keys cannot
   * be influenced by request data. */
  const configuredRatePerSecond = integerSetting(
    env[`NOTIFICATION_${scope}_RATE_PER_SECOND`],
    DEFAULT_RATE[scope],
    1,
    ABSOLUTE_RATE_CEILING
  );
  const deploymentRateCeiling = integerSetting(
    env.NOTIFICATION_DEPLOYMENT_RATE_CEILING,
    ABSOLUTE_RATE_CEILING,
    1,
    ABSOLUTE_RATE_CEILING
  );
  const hardRate = Math.min(configuredRatePerSecond, deploymentRateCeiling);
  const adaptiveBackpressure = env.NOTIFICATION_ADAPTIVE_BACKPRESSURE !== 'false';
  const adaptiveRate = adaptiveBackpressure
    ? (adaptiveRates.get(capacityKey(scope, providerKey)) ?? hardRate)
    : hardRate;
  const effectiveRatePerSecond = Math.max(1, Math.min(hardRate, adaptiveRate));
  const bulkRatePerSecond = Math.max(
    1,
    Math.floor(effectiveRatePerSecond * shareSetting(env.NOTIFICATION_BULK_SHARE))
  );
  return {
    configuredRatePerSecond,
    effectiveRatePerSecond,
    bulkRatePerSecond,
    maxInFlight: integerSetting(
      env[`NOTIFICATION_${scope}_MAX_IN_FLIGHT`],
      DEFAULT_IN_FLIGHT[scope],
      1,
      ABSOLUTE_IN_FLIGHT_CEILING
    ),
    adaptiveBackpressure,
    quotaBlockSize: integerSetting(env.NOTIFICATION_QUOTA_BLOCK_SIZE, 100, 1, 1_000),
  };
}

export function recordCapacityPressure(scope: ProviderAdmissionScope, providerKey: string): number {
  const capacity = getProviderCapacity(scope, providerKey);
  const reduced = Math.max(1, Math.floor(capacity.effectiveRatePerSecond / 2));
  adaptiveRates.set(capacityKey(scope, providerKey), reduced);
  return reduced;
}

export function recordHealthyCapacity(scope: ProviderAdmissionScope, providerKey: string): number {
  const capacity = getProviderCapacity(scope, providerKey);
  const increased = Math.min(
    capacity.configuredRatePerSecond,
    capacity.effectiveRatePerSecond +
      Math.max(1, Math.ceil(capacity.configuredRatePerSecond * 0.05))
  );
  adaptiveRates.set(capacityKey(scope, providerKey), increased);
  return increased;
}

export function usesBulkCapacity(trafficClass: NotificationTrafficClass | undefined): boolean {
  return trafficClass === 'PUBLIC_INCIDENT' || trafficClass === 'BULK';
}

export function resetProviderCapacityForTests(): void {
  adaptiveRates.clear();
}
