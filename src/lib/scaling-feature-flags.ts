export type ScalingFeatureFlag = 'STATUS_PAGE_EXTERNAL_SERVING_STORE';

/**
 * Only capabilities with a real production rollback path are exposed as runtime
 * flags. The core notification/snapshot safety model is migration-backed and is
 * rolled back by deploying the previous application version, not by pretending a
 * boolean can restore the legacy data contract safely.
 */
export function scalingFeatureEnabled(
  flag: ScalingFeatureFlag,
  env: NodeJS.ProcessEnv = process.env
): boolean {
  const value = Reflect.get(env, flag);
  if (value === 'true') return true;
  if (value === 'false') return false;
  return false;
}
