export type ScalingFeatureFlag =
  | 'NOTIFICATION_TRAFFIC_CLASSES_V2'
  | 'NOTIFICATION_PROVIDER_CAPACITY_V2'
  | 'STATUS_PAGE_ASYNC_FANOUT'
  | 'NOTIFICATION_FANOUT_CAMPAIGNS'
  | 'STATUS_PAGE_SNAPSHOT_ONLY'
  | 'STATUS_PAGE_EXTERNAL_SERVING_STORE';

function defaultFor(flag: ScalingFeatureFlag): boolean {
  switch (flag) {
    case 'STATUS_PAGE_EXTERNAL_SERVING_STORE':
      return false;
    case 'NOTIFICATION_TRAFFIC_CLASSES_V2':
    case 'NOTIFICATION_PROVIDER_CAPACITY_V2':
    case 'STATUS_PAGE_ASYNC_FANOUT':
    case 'NOTIFICATION_FANOUT_CAMPAIGNS':
    case 'STATUS_PAGE_SNAPSHOT_ONLY':
      return true;
  }
}

export function scalingFeatureEnabled(
  flag: ScalingFeatureFlag,
  env: NodeJS.ProcessEnv = process.env
) {
  const value = Reflect.get(env, flag);
  if (value === 'true') return true;
  if (value === 'false') return false;
  return defaultFor(flag);
}
