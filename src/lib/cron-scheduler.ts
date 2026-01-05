import { processPendingEscalations } from './escalation';
import { processPendingJobs } from './jobs/queue';
import { logger } from './logger';
import { retryFailedNotifications } from './notification-retry';
import { processAutoUnsnooze } from '@/app/(app)/incidents/snooze-actions';
import { cleanupUserTokens } from '@/lib/user-tokens';
import { checkSLABreaches } from './sla-breach-monitor';

// Global state to persist across HMR
const globalForCron = global as unknown as {
  cronState:
    | {
        timer: NodeJS.Timeout | null;
        isRunning: boolean;
        lastRunAt: Date | null;
        lastSuccessAt: Date | null;
        lastError: string | null;
        nextRunAt: Date | null;
        initialized: boolean;
        lastRollupDate: string | null;
      }
    | undefined;
};

const state = globalForCron.cronState || {
  timer: null,
  isRunning: false,
  lastRunAt: null,
  lastSuccessAt: null,
  lastError: null,
  nextRunAt: null,
  initialized: false,
  lastRollupDate: null,
};

if (process.env.NODE_ENV !== 'production') globalForCron.cronState = state;

const MIN_DELAY_MS = 15_000;
const MAX_DELAY_MS = 2 * 60_000; // Reduced from 5min to 2min for faster SLA breach detection

async function getNextScheduledTime(): Promise<Date> {
  try {
    const prisma = (await import('./prisma')).default;
    const [nextIncident, nextJob, nextSlaBreach] = await Promise.all([
      prisma.incident.findFirst({
        where: {
          escalationStatus: 'ESCALATING',
          nextEscalationAt: { not: null },
        },
        orderBy: { nextEscalationAt: 'asc' },
        select: { nextEscalationAt: true },
      }),
      prisma.backgroundJob.findFirst({
        where: {
          status: 'PENDING',
        },
        orderBy: { scheduledAt: 'asc' },
        select: { scheduledAt: true },
      }),
      // Check for next potential SLA breach
      prisma.incident.findFirst({
        where: {
          status: { not: 'RESOLVED' },
        },
        orderBy: { createdAt: 'asc' },
        select: {
          createdAt: true,
          acknowledgedAt: true,
          service: {
            select: {
              targetAckMinutes: true,
              targetResolveMinutes: true,
              serviceNotifyOnSlaBreach: true,
            },
          },
        },
      }),
    ]);

    const times = [
      nextIncident?.nextEscalationAt ? new Date(nextIncident.nextEscalationAt).getTime() : null,
      nextJob?.scheduledAt ? new Date(nextJob.scheduledAt).getTime() : null,
    ];

    // Add SLA breach check time (5 min before ack target for unacked incidents)
    if (
      nextSlaBreach &&
      !nextSlaBreach.acknowledgedAt &&
      nextSlaBreach.service.serviceNotifyOnSlaBreach
    ) {
      const createdAt = new Date(nextSlaBreach.createdAt).getTime();
      const ackWarningMs = 5 * 60 * 1000; // 5 min warning threshold
      const targetAckMs = (nextSlaBreach.service.targetAckMinutes || 15) * 60 * 1000;
      const breachCheckTime = createdAt + targetAckMs - ackWarningMs;
      times.push(breachCheckTime > Date.now() ? breachCheckTime : null);
    }

    const validTimes = times.filter((value): value is number => typeof value === 'number');

    if (validTimes.length === 0) {
      return new Date(Date.now() + MAX_DELAY_MS);
    }

    return new Date(Math.min(...validTimes));
  } catch (error) {
    // Database connection error - use max delay as fallback
    logger.error('[Cron Scheduler] Failed to query next scheduled time from database', { error });
    return new Date(Date.now() + MAX_DELAY_MS);
  }
}

function scheduleNextRun(targetTime: Date) {
  const now = Date.now();
  const rawDelay = targetTime.getTime() - now;
  const delay = Math.min(Math.max(rawDelay, MIN_DELAY_MS), MAX_DELAY_MS);
  state.nextRunAt = new Date(now + delay);

  if (state.timer) {
    clearTimeout(state.timer);
  }

  state.timer = setTimeout(runOnce, delay);
}

async function runOnce() {
  if (state.isRunning) {
    return;
  }

  state.isRunning = true;
  const startTime = Date.now();
  state.lastRunAt = new Date();
  logger.info('Cron worker tick started', { timestamp: state.lastRunAt.toISOString() });

  try {
    const escalationResult = await processPendingEscalations();
    logger.info('Escalations processed', {
      processed: escalationResult.processed,
      total: escalationResult.total,
      errors: escalationResult.errors,
    });

    const jobResult = await processPendingJobs(50);
    logger.info('Background jobs processed', {
      processed: jobResult.processed,
      failed: jobResult.failed,
      total: jobResult.total,
    });

    const retryResult = await retryFailedNotifications();
    logger.info('Notification retries processed', retryResult);

    const autoUnsnoozeResult = await processAutoUnsnooze();
    logger.info('Auto-unsnooze processed', autoUnsnoozeResult);

    const tokenCleanup = await cleanupUserTokens();
    logger.info('User tokens cleaned up', tokenCleanup);

    // SLA Breach Monitoring (runs every cycle)
    const breachResult = await checkSLABreaches();
    logger.info('SLA breaches checked', {
      activeIncidents: breachResult.activeIncidentCount,
      warnings: breachResult.warningCount,
    });

    // Metric Rollup Generation (runs once daily at/after 1 AM UTC)
    const now = new Date();
    const todayKey = now.toISOString().split('T')[0];
    const isNewDay = !state.lastRollupDate || state.lastRollupDate !== todayKey;
    const isAfter1AM = now.getUTCHours() >= 1;

    if (isNewDay && isAfter1AM) {
      try {
        const yesterday = new Date(now);
        yesterday.setDate(yesterday.getDate() - 1);
        yesterday.setUTCHours(0, 0, 0, 0);

        const { generateAllDailyRollups } = await import('./metric-rollup');
        await generateAllDailyRollups(yesterday);

        state.lastRollupDate = todayKey;
        logger.info('Daily metric rollups generated', {
          date: yesterday.toISOString().split('T')[0],
          nextRun: 'tomorrow at 1 AM UTC',
        });
      } catch (error) {
        logger.error('Failed to generate daily rollups', {
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
        });
        // Don't set lastRollupDate so it will retry next cycle
      }
    }

    const duration = Date.now() - startTime;
    state.lastSuccessAt = new Date();
    state.lastError = null;
    logger.info('Cron worker tick completed', { durationMs: duration });
  } catch (error) {
    state.lastError = error instanceof Error ? error.message : String(error);
    logger.error('Cron worker tick failed', {
      error: state.lastError,
      stack: error instanceof Error ? error.stack : undefined,
    });
  } finally {
    state.isRunning = false;
    try {
      const nextTime = await getNextScheduledTime();
      scheduleNextRun(nextTime);
    } catch (error) {
      state.lastError = error instanceof Error ? error.message : String(error);
      logger.error('Failed to schedule next cron tick', { error: state.lastError });
    }
  }
}

/**
 * Start the internal cron scheduler
 * Runs escalation and job processing every 2 minutes
 */
export function startCronScheduler() {
  if (state.initialized) {
    return; // Already initialized, silent return
  }

  // Run by default (including development) unless explicitly disabled
  // Now that we have singleton protection, it's safe to run in dev
  const enableInternalCron = process.env.ENABLE_INTERNAL_CRON !== 'false';

  if (!enableInternalCron) {
    logger.info('Internal cron scheduler disabled (set ENABLE_INTERNAL_CRON=true to enable)');
    state.initialized = true; // Mark as initialized so we don't log again
    return;
  }

  state.initialized = true;
  scheduleNextRun(new Date());
  logger.info('Internal cron scheduler started (dynamic schedule)');
}

/**
 * Stop the internal cron scheduler
 */
/**
 * Stop the internal cron scheduler
 */
export function stopCronScheduler() {
  if (state.timer) {
    clearTimeout(state.timer);
    state.timer = null;
    state.nextRunAt = null;
    state.lastError = null;
    state.isRunning = false;
    logger.info('Internal cron scheduler stopped');
  }
}

export function getCronSchedulerStatus() {
  return {
    running: !!state.timer,
    lastRunAt: state.lastRunAt,
    lastSuccessAt: state.lastSuccessAt,
    lastError: state.lastError,
    nextRunAt: state.nextRunAt,
    schedule: 'dynamic',
  };
}
