import { processPendingEscalations } from './escalation';
import { processPendingJobs } from './jobs/queue';
import { logger } from './logger';
import { retryFailedNotifications } from './notification-retry';
import { processAutoUnsnooze } from '@/app/(app)/incidents/snooze-actions';
import { cleanupUserTokens } from '@/lib/user-tokens';

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
};

if (process.env.NODE_ENV !== 'production') globalForCron.cronState = state;

const MIN_DELAY_MS = 15_000;
const MAX_DELAY_MS = 5 * 60_000;

async function getNextScheduledTime(): Promise<Date> {
  try {
    const prisma = (await import('./prisma')).default;
    const [nextIncident, nextJob] = await Promise.all([
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
    ]);

    const times = [
      nextIncident?.nextEscalationAt ? new Date(nextIncident.nextEscalationAt).getTime() : null,
      nextJob?.scheduledAt ? new Date(nextJob.scheduledAt).getTime() : null,
    ].filter((value): value is number => typeof value === 'number');

    if (times.length === 0) {
      return new Date(Date.now() + MAX_DELAY_MS);
    }

    return new Date(Math.min(...times));
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
