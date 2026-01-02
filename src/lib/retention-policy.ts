import { logger } from '@/lib/logger';
import prisma from '@/lib/prisma';

// Default Retention Policies (Fallbacks)
const DEFAULTS = {
  RAW_LOG_DAYS: 3, // Bronze
  MINUTE_METRIC_DAYS: 180, // Silver (Extended to 6 Months per user request)
  HOURLY_METRIC_DAYS: 365, // Silver (Low Res - 1 Year)
};

type RetentionPolicyOverrides = {
  rawLogs?: number;
  minuteMetrics?: number;
  hourlyMetrics?: number;
};

/**
 * The Smart Janitor (Retention Governance)
 * Enforces cost control by deleting old data according to policy.
 * Should be run via Cron (e.g., nightly).
 */
export async function runRetentionPolicy() {
  logger.info('janitor.cleanup.started');

  try {
    // 1. Load Policy from SystemConfig
    const configRecord = await prisma.systemConfig.findUnique({
      where: { key: 'retention_policy' },
    });

    let policy = DEFAULTS;
    if (
      configRecord?.value &&
      typeof configRecord.value === 'object' &&
      !Array.isArray(configRecord.value)
    ) {
      const custom = configRecord.value as RetentionPolicyOverrides;
      policy = {
        RAW_LOG_DAYS: typeof custom.rawLogs === 'number' ? custom.rawLogs : DEFAULTS.RAW_LOG_DAYS,
        MINUTE_METRIC_DAYS:
          typeof custom.minuteMetrics === 'number'
            ? custom.minuteMetrics
            : DEFAULTS.MINUTE_METRIC_DAYS,
        HOURLY_METRIC_DAYS:
          typeof custom.hourlyMetrics === 'number'
            ? custom.hourlyMetrics
            : DEFAULTS.HOURLY_METRIC_DAYS,
      };
    }

    const now = new Date();

    // 2. Bronze Tier Cleanup (Raw Logs)
    const logCutoff = new Date(now.getTime() - policy.RAW_LOG_DAYS * 24 * 60 * 60 * 1000);
    const deletedLogs = await prisma.logEntry.deleteMany({
      where: { timestamp: { lt: logCutoff } },
    });
    logger.info('janitor.cleanup.logs', { deleted: deletedLogs.count, days: policy.RAW_LOG_DAYS });

    // 3. Silver Tier Cleanup (Minute Metrics)
    const metricCutoff = new Date(now.getTime() - policy.MINUTE_METRIC_DAYS * 24 * 60 * 60 * 1000);
    const deletedMetrics = await prisma.metricRollup.deleteMany({
      where: {
        bucket: { lt: metricCutoff },
        // Assuming we default to minute resolution for now.
        // Later we can differentiate tag='hourly'
      },
    });
    logger.info('janitor.cleanup.metrics', {
      deleted: deletedMetrics.count,
      days: policy.MINUTE_METRIC_DAYS,
    });

    // 4. Gold Tier (SLASnapshot)
    // Explicitly NO CLEANUP. Gold data is infinite.

    logger.info('janitor.cleanup.complete', {
      deletedLogs: deletedLogs.count,
      deletedMetrics: deletedMetrics.count,
    });
    return { success: true, deletedLogs: deletedLogs.count, deletedMetrics: deletedMetrics.count };
  } catch (error) {
    logger.error('janitor.cleanup.failed', { error });
    return { success: false, error };
  }
}
