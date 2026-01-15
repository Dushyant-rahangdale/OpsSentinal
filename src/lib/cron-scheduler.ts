import { processPendingEscalations } from './escalation';
import { processPendingJobs } from './jobs/queue';
import { logger } from './logger';
import { retryFailedNotifications } from './notification-retry';
import { processAutoUnsnooze } from '@/app/(app)/incidents/snooze-actions';
import { cleanupUserTokens } from '@/lib/user-tokens';
import { checkSLABreaches } from './sla-breach-monitor';
import crypto from 'crypto';

/**
 * Production-Grade Cron Scheduler
 *
 * FEATURES:
 * 1. DB-backed state - survives restarts, shared across workers
 * 2. Distributed locking - only one worker runs at a time
 * 3. Self-healing - stale locks are reclaimed after timeout
 * 4. Dynamic scheduling - runs when needed, not on fixed interval
 * 5. Graceful degradation - continues with defaults on DB errors
 */

// Generate unique worker ID for this process instance
const WORKER_ID = `worker-${process.pid}-${crypto.randomUUID().slice(0, 8)}`;
const LOCK_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes - consider lock stale after this
const MIN_DELAY_MS = 15_000;
const MAX_DELAY_MS = 2 * 60_000;
const SINGLETON_ID = 'singleton';

// Local state for timer management (not persisted)
let timer: NodeJS.Timeout | null = null;
let initialized = false;

/**
 * Get or create the singleton scheduler state from database
 * Uses upsert to avoid race conditions on initial creation
 */
async function getState() {
  const { default: prisma } = await import('./prisma');

  // Use upsert to handle race conditions when creating the singleton
  const state = await prisma.cronSchedulerState.upsert({
    where: { id: SINGLETON_ID },
    update: {}, // No updates needed, just return existing
    create: { id: SINGLETON_ID },
  });

  return state;
}

/**
 * Attempt to acquire distributed lock
 * Returns true if lock acquired, false if another worker holds it
 */
async function acquireLock(): Promise<boolean> {
  const { default: prisma } = await import('./prisma');
  const now = new Date();

  try {
    // Try to acquire lock using atomic update
    const result = await prisma.cronSchedulerState.updateMany({
      where: {
        id: SINGLETON_ID,
        OR: [
          { lockedBy: null }, // No lock
          { lockedBy: WORKER_ID }, // We already have it
          { lockedAt: { lt: new Date(now.getTime() - LOCK_TIMEOUT_MS) } }, // Stale lock
        ],
      },
      data: {
        lockedBy: WORKER_ID,
        lockedAt: now,
      },
    });

    if (result.count > 0) {
      logger.debug('[Cron] Lock acquired', { workerId: WORKER_ID });
      return true;
    }

    // Lock held by another worker
    const state = await getState();
    logger.debug('[Cron] Lock held by another worker', {
      holder: state.lockedBy,
      since: state.lockedAt?.toISOString(),
    });
    return false;
  } catch (error) {
    logger.error('[Cron] Failed to acquire lock', { error });
    return false;
  }
}

/**
 * Release the distributed lock
 */
async function releaseLock(): Promise<void> {
  const { default: prisma } = await import('./prisma');

  try {
    await prisma.cronSchedulerState.updateMany({
      where: {
        id: SINGLETON_ID,
        lockedBy: WORKER_ID, // Only release if we hold it
      },
      data: {
        lockedBy: null,
        lockedAt: null,
      },
    });
    logger.debug('[Cron] Lock released', { workerId: WORKER_ID });
  } catch (error) {
    logger.error('[Cron] Failed to release lock', { error });
  }
}

/**
 * Update scheduler state in database
 */
async function updateState(data: {
  lastRunAt?: Date;
  lastSuccessAt?: Date;
  lastError?: string | null;
  nextRunAt?: Date | null;
  lastRollupDate?: string | null;
}): Promise<void> {
  const { default: prisma } = await import('./prisma');

  try {
    await prisma.cronSchedulerState.update({
      where: { id: SINGLETON_ID },
      data,
    });
  } catch (error) {
    logger.error('[Cron] Failed to update state', { error });
  }
}

/**
 * Calculate next scheduled time based on pending work
 */
async function getNextScheduledTime(): Promise<Date> {
  try {
    const prisma = (await import('./prisma')).default;
    const [nextIncident, nextJob, nextSlaBreach, nextSnooze] = await Promise.all([
      prisma.incident.findFirst({
        where: {
          escalationStatus: 'ESCALATING',
          nextEscalationAt: { not: null },
        },
        orderBy: { nextEscalationAt: 'asc' },
        select: { nextEscalationAt: true },
      }),
      prisma.backgroundJob.findFirst({
        where: { status: 'PENDING' },
        orderBy: { scheduledAt: 'asc' },
        select: { scheduledAt: true },
      }),
      prisma.incident.findFirst({
        where: { status: { not: 'RESOLVED' } },
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
      prisma.incident.findFirst({
        where: {
          status: 'SNOOZED',
          snoozedUntil: { not: null },
        },
        orderBy: { snoozedUntil: 'asc' },
        select: { snoozedUntil: true },
      }),
    ]);

    const times: (number | null)[] = [
      nextIncident?.nextEscalationAt ? new Date(nextIncident.nextEscalationAt).getTime() : null,
      nextJob?.scheduledAt ? new Date(nextJob.scheduledAt).getTime() : null,
      nextSnooze?.snoozedUntil ? new Date(nextSnooze.snoozedUntil).getTime() : null,
    ];

    // Add SLA breach check time (5 min before ack target)
    if (
      nextSlaBreach &&
      !nextSlaBreach.acknowledgedAt &&
      nextSlaBreach.service.serviceNotifyOnSlaBreach
    ) {
      const createdAt = new Date(nextSlaBreach.createdAt).getTime();
      const ackWarningMs = 5 * 60 * 1000;
      const targetAckMs = (nextSlaBreach.service.targetAckMinutes || 15) * 60 * 1000;
      const breachCheckTime = createdAt + targetAckMs - ackWarningMs;
      times.push(breachCheckTime > Date.now() ? breachCheckTime : null);
    }

    const validTimes = times.filter((v): v is number => typeof v === 'number');

    if (validTimes.length === 0) {
      return new Date(Date.now() + MAX_DELAY_MS);
    }

    return new Date(Math.min(...validTimes));
  } catch (error) {
    logger.error('[Cron] Failed to query next scheduled time', { error });
    return new Date(Date.now() + MAX_DELAY_MS);
  }
}

/**
 * Schedule the next cron run
 */
function scheduleNextRun(targetTime: Date) {
  const now = Date.now();
  const rawDelay = targetTime.getTime() - now;
  const delay = Math.min(Math.max(rawDelay, MIN_DELAY_MS), MAX_DELAY_MS);
  const nextRunAt = new Date(now + delay);

  if (timer) {
    clearTimeout(timer);
  }

  timer = setTimeout(runOnce, delay);

  // Update DB with next run time (fire and forget)
  updateState({ nextRunAt }).catch(() => {});

  logger.debug('[Cron] Next run scheduled', {
    nextRunAt: nextRunAt.toISOString(),
    delayMs: delay,
  });
}

/**
 * Execute one cron cycle
 */
async function runOnce() {
  // Try to acquire lock
  const hasLock = await acquireLock();
  if (!hasLock) {
    // Another worker is running, schedule retry
    scheduleNextRun(new Date(Date.now() + MIN_DELAY_MS));
    return;
  }

  const startTime = Date.now();
  await updateState({ lastRunAt: new Date() });

  logger.info('[Cron] Worker tick started', {
    workerId: WORKER_ID,
    timestamp: new Date().toISOString(),
  });

  try {
    // Process all scheduled tasks
    const escalationResult = await processPendingEscalations();
    logger.info('[Cron] Escalations processed', {
      processed: escalationResult.processed,
      total: escalationResult.total,
      errors: escalationResult.errors,
    });

    const jobResult = await processPendingJobs(50);
    logger.info('[Cron] Background jobs processed', {
      processed: jobResult.processed,
      failed: jobResult.failed,
      total: jobResult.total,
    });

    const retryResult = await retryFailedNotifications();
    logger.info('[Cron] Notification retries processed', retryResult);

    const autoUnsnoozeResult = await processAutoUnsnooze();
    logger.info('[Cron] Auto-unsnooze processed', autoUnsnoozeResult);

    const tokenCleanup = await cleanupUserTokens();
    logger.info('[Cron] User tokens cleaned up', tokenCleanup);

    const breachResult = await checkSLABreaches();
    logger.info('[Cron] SLA breaches checked', {
      activeIncidents: breachResult.activeIncidentCount,
      warnings: breachResult.warningCount,
    });

    // Daily rollup generation (once per day at/after 1 AM UTC)
    const state = await getState();
    const now = new Date();
    const todayKey = now.toISOString().split('T')[0];
    const isNewDay = !state.lastRollupDate || state.lastRollupDate !== todayKey;
    const isAfter1AM = now.getUTCHours() >= 1;

    if (isNewDay && isAfter1AM) {
      try {
        const yesterday = new Date(now);
        yesterday.setDate(yesterday.getDate() - 1);
        yesterday.setUTCHours(0, 0, 0, 0);

        const { generateAllDailyRollups, cleanupOldRollups } = await import('./metric-rollup');
        const { cleanupOldData } = await import('./retention-policy');

        await generateAllDailyRollups(yesterday);

        // Cleanup old data based on retention policy
        const cleanupStats = await cleanupOldData();
        const deletedRollups = await cleanupOldRollups();

        await updateState({ lastRollupDate: todayKey });
        logger.info('[Cron] Daily maintenance complete', {
          date: yesterday.toISOString().split('T')[0],
          dataCleanup: cleanupStats,
          rollupsDeleted: deletedRollups,
          nextRun: 'tomorrow at 1 AM UTC',
        });
      } catch (error) {
        logger.error('[Cron] Failed to generate daily rollups', {
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
        });
        // Don't update lastRollupDate so it retries next cycle
      }
    }

    const duration = Date.now() - startTime;
    await updateState({
      lastSuccessAt: new Date(),
      lastError: null,
    });

    logger.info('[Cron] Worker tick completed', {
      workerId: WORKER_ID,
      durationMs: duration,
    });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    await updateState({ lastError: errorMsg });
    logger.error('[Cron] Worker tick failed', {
      workerId: WORKER_ID,
      error: errorMsg,
      stack: error instanceof Error ? error.stack : undefined,
    });
  } finally {
    // Release lock and schedule next run
    await releaseLock();

    try {
      const nextTime = await getNextScheduledTime();
      scheduleNextRun(nextTime);
    } catch (error) {
      logger.error('[Cron] Failed to schedule next tick, retrying in MAX_DELAY', { error });
      scheduleNextRun(new Date(Date.now() + MAX_DELAY_MS));
    }
  }
}

/**
 * Start the cron scheduler
 */
export function startCronScheduler() {
  if (initialized) {
    logger.debug('[Cron] Already initialized, skipping');
    return;
  }

  const enableInternalCron = process.env.ENABLE_INTERNAL_CRON !== 'false';
  if (!enableInternalCron) {
    logger.info('[Cron] Scheduler disabled via ENABLE_INTERNAL_CRON=false');
    initialized = true;
    return;
  }

  initialized = true;
  logger.info('[Cron] Starting scheduler', { workerId: WORKER_ID });

  // Schedule first run immediately
  scheduleNextRun(new Date());
}

/**
 * Stop the cron scheduler
 */
export async function stopCronScheduler() {
  if (timer) {
    clearTimeout(timer);
    timer = null;
  }

  await releaseLock();
  initialized = false; // Allow restart

  logger.info('[Cron] Scheduler stopped', { workerId: WORKER_ID });
}

/**
 * Get current scheduler status
 */
export async function getCronSchedulerStatus() {
  try {
    const state = await getState();
    return {
      running: !!timer,
      workerId: WORKER_ID,
      lastRunAt: state.lastRunAt,
      lastSuccessAt: state.lastSuccessAt,
      lastError: state.lastError,
      nextRunAt: state.nextRunAt,
      lockedBy: state.lockedBy,
      lockedAt: state.lockedAt,
      schedule: 'dynamic',
    };
  } catch (error) {
    return {
      running: !!timer,
      workerId: WORKER_ID,
      lastRunAt: null,
      lastSuccessAt: null,
      lastError: 'Failed to read state from database',
      nextRunAt: null,
      lockedBy: null,
      lockedAt: null,
      schedule: 'dynamic',
    };
  }
}
