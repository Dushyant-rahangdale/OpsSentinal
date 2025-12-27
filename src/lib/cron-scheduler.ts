import { processPendingEscalations } from './escalation';
import { processPendingJobs } from './jobs/queue';
import { logger } from './logger';
import { retryFailedNotifications } from './notification-retry';
import { processAutoUnsnooze } from '@/app/(app)/incidents/snooze-actions';

let cronTimer: NodeJS.Timeout | null = null;
let isRunning = false;
let lastRunAt: Date | null = null;
let lastSuccessAt: Date | null = null;
let lastError: string | null = null;
let nextRunAt: Date | null = null;

const MIN_DELAY_MS = 15_000;
const MAX_DELAY_MS = 5 * 60_000;

async function getNextScheduledTime(): Promise<Date> {
    const prisma = (await import('./prisma')).default;
    const [nextIncident, nextJob] = await Promise.all([
        prisma.incident.findFirst({
            where: {
                escalationStatus: 'ESCALATING',
                nextEscalationAt: { not: null }
            },
            orderBy: { nextEscalationAt: 'asc' },
            select: { nextEscalationAt: true }
        }),
        prisma.backgroundJob.findFirst({
            where: {
                status: 'PENDING'
            },
            orderBy: { scheduledAt: 'asc' },
            select: { scheduledAt: true }
        })
    ]);

    const times = [
        nextIncident?.nextEscalationAt ? new Date(nextIncident.nextEscalationAt).getTime() : null,
        nextJob?.scheduledAt ? new Date(nextJob.scheduledAt).getTime() : null
    ].filter((value): value is number => typeof value === 'number');

    if (times.length === 0) {
        return new Date(Date.now() + MAX_DELAY_MS);
    }

    return new Date(Math.min(...times));
}

function scheduleNextRun(targetTime: Date) {
    const now = Date.now();
    const rawDelay = targetTime.getTime() - now;
    const delay = Math.min(Math.max(rawDelay, MIN_DELAY_MS), MAX_DELAY_MS);
    nextRunAt = new Date(now + delay);

    if (cronTimer) {
        clearTimeout(cronTimer);
    }

    cronTimer = setTimeout(runOnce, delay);
}

async function runOnce() {
    if (isRunning) {
        return;
    }

    isRunning = true;
    const startTime = Date.now();
    lastRunAt = new Date();
    logger.info('Cron worker tick started', { timestamp: lastRunAt.toISOString() });

    try {
        const escalationResult = await processPendingEscalations();
        logger.info('Escalations processed', {
            processed: escalationResult.processed,
            total: escalationResult.total,
            errors: escalationResult.errors
        });

        const jobResult = await processPendingJobs(50);
        logger.info('Background jobs processed', {
            processed: jobResult.processed,
            failed: jobResult.failed,
            total: jobResult.total
        });

        const retryResult = await retryFailedNotifications();
        logger.info('Notification retries processed', retryResult);

        const autoUnsnoozeResult = await processAutoUnsnooze();
        logger.info('Auto-unsnooze processed', autoUnsnoozeResult);

        const duration = Date.now() - startTime;
        lastSuccessAt = new Date();
        lastError = null;
        logger.info('Cron worker tick completed', { durationMs: duration });
    } catch (error) {
        lastError = error instanceof Error ? error.message : String(error);
        logger.error('Cron worker tick failed', {
            error: lastError,
            stack: error instanceof Error ? error.stack : undefined
        });
    } finally {
        isRunning = false;
        try {
            const nextTime = await getNextScheduledTime();
            scheduleNextRun(nextTime);
        } catch (error) {
            lastError = error instanceof Error ? error.message : String(error);
            logger.error('Failed to schedule next cron tick', { error: lastError });
        }
    }
}

/**
 * Start the internal cron scheduler
 * Runs escalation and job processing every 2 minutes
 */
export function startCronScheduler() {
    if (cronTimer) {
        logger.info('Cron scheduler already running');
        return;
    }

    // Only run in production or if explicitly enabled
    const enableInternalCron = process.env.ENABLE_INTERNAL_CRON === 'true' || process.env.NODE_ENV === 'production';

    if (!enableInternalCron) {
        logger.info('Internal cron scheduler disabled (set ENABLE_INTERNAL_CRON=true to enable)');
        return;
    }

    scheduleNextRun(new Date());
    logger.info('Internal cron scheduler started (dynamic schedule)');
}

/**
 * Stop the internal cron scheduler
 */
export function stopCronScheduler() {
    if (cronTimer) {
        clearTimeout(cronTimer);
        cronTimer = null;
        nextRunAt = null;
        lastError = null;
        logger.info('Internal cron scheduler stopped');
    }
}

export function getCronSchedulerStatus() {
    return {
        running: !!cronTimer,
        lastRunAt,
        lastSuccessAt,
        lastError,
        nextRunAt,
        schedule: 'dynamic'
    };
}
