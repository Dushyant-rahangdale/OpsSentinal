export type ScalingFeatureFlag =
  | 'NOTIFICATION_TRAFFIC_CLASSES_V2'
  | 'NOTIFICATION_PROVIDER_CAPACITY_V2'
  | 'STATUS_PAGE_ASYNC_FANOUT'
  | 'NOTIFICATION_FANOUT_CAMPAIGNS'
  | 'STATUS_PAGE_SNAPSHOT_ONLY'
  | 'STATUS_PAGE_EXTERNAL_SERVING_STORE';

const SAFE_DEFAULTS: Record<ScalingFeatureFlag, boolean> = {
  NOTIFICATION_TRAFFIC_CLASSES_V2: true,
  NOTIFICATION_PROVIDER_CAPACITY_V2: true,
  STATUS_PAGE_ASYNC_FANOUT: true,
  NOTIFICATION_FANOUT_CAMPAIGNS: true,
  STATUS_PAGE_SNAPSHOT_ONLY: true,
  STATUS_PAGE_EXTERNAL_SERVING_STORE: false,
};

export function scalingFeatureEnabled(
  flag: ScalingFeatureFlag,
  env: NodeJS.ProcessEnv = process.env
) {
  const value = Reflect.get(env, flag);
  if (value === 'true') return true;
  if (value === 'false') return false;
  // `flag` is a closed union and cannot contain request-controlled property names.
  // eslint-disable-next-line security/detect-object-injection
  return SAFE_DEFAULTS[flag];
}
