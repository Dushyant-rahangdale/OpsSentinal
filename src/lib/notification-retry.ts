/**
 * Notification Retry Mechanism
 * Handles retrying failed notifications with exponential backoff
 */

import prisma from './prisma';
import { sendNotification, NotificationChannel } from './notifications';
import { logger } from './logger';

const _MAX_RETRY_ATTEMPTS = 3;
const INITIAL_RETRY_DELAY_MS = 5000; // 5 seconds
const MAX_RETRY_DELAY_MS = 300000; // 5 minutes

/**
 * Retry failed notifications
 * Should be called periodically by the internal worker
 */
export async function retryFailedNotifications(): Promise<{
  retried: number;
  succeeded: number;
  failed: number;
}> {
  const failedNotifications = await prisma.notification.findMany({
    where: {
      status: 'FAILED',
      failedAt: {
        not: null,
      },
      attempts: {
        lt: _MAX_RETRY_ATTEMPTS,
      },
    },
    take: 100, // Process in batches
    orderBy: {
      failedAt: 'asc', // Retry oldest failures first
    },
    include: {
      incident: {
        select: {
          id: true,
          status: true,
        },
      },
    },
  });

  let succeeded = 0;
  let failed = 0;

  for (const notification of failedNotifications) {
    try {
      // Check if we should retry (not too many attempts, not too recent)
      const timeSinceFailure = Date.now() - (notification.failedAt?.getTime() || 0);
      const retryDelay = Math.min(
        INITIAL_RETRY_DELAY_MS * Math.pow(2, notification.attempts || 0),
        MAX_RETRY_DELAY_MS
      );

      if (timeSinceFailure < retryDelay) {
        continue; // Too soon to retry
      }

      // Update status to PENDING
      await prisma.notification.update({
        where: { id: notification.id },
        data: {
          status: 'PENDING',
          failedAt: null,
          errorMsg: null,
        },
      });

      let result: { success: boolean; error?: string } = {
        success: false,
        error: 'Unknown channel',
      };

      // Re-dispatch based on channel (Logic mirrored from notifications.ts but without creating new record)
      switch (notification.channel) {
        case 'EMAIL':
          const { sendIncidentEmail } = await import('./email');
          // Use the incident data included in query
          const eventType =
            notification.incident?.status === 'RESOLVED'
              ? 'resolved'
              : notification.incident?.status === 'ACKNOWLEDGED'
                ? 'acknowledged'
                : 'triggered';
          result = await sendIncidentEmail(notification.userId, notification.incidentId, eventType);
          break;
        case 'SMS':
          const { sendIncidentSMS } = await import('./sms');
          const eventTypeSMS =
            notification.incident?.status === 'RESOLVED'
              ? 'resolved'
              : notification.incident?.status === 'ACKNOWLEDGED'
                ? 'acknowledged'
                : 'triggered';
          result = await sendIncidentSMS(
            notification.userId,
            notification.incidentId,
            eventTypeSMS
          );
          break;
        case 'PUSH':
          const { sendIncidentPush } = await import('./push');
          const eventTypePush =
            notification.incident?.status === 'RESOLVED'
              ? 'resolved'
              : notification.incident?.status === 'ACKNOWLEDGED'
                ? 'acknowledged'
                : 'triggered';
          result = await sendIncidentPush(
            notification.userId,
            notification.incidentId,
            eventTypePush
          );
          break;
        // Add other channels as needed (Webhooks/Slack handled elsewhere usually)
        default:
          result = {
            success: false,
            error: `Retry not implemented for channel: ${notification.channel}`,
          };
      }

      if (result.success) {
        succeeded++;
        await prisma.notification.update({
          where: { id: notification.id },
          data: {
            status: 'SENT',
            sentAt: new Date(),
          },
        });
        logger.info('notification.retry.success', {
          notificationId: notification.id,
          channel: notification.channel,
        });
      } else {
        failed++;
        // Update with new failure
        await prisma.notification.update({
          where: { id: notification.id },
          data: {
            status: 'FAILED',
            failedAt: new Date(),
            errorMsg: result.error || 'Retry failed',
            attempts: (notification.attempts || 0) + 1,
          },
        });
      }
    } catch (error: any) {
       
      failed++;
      logger.error('notification.retry.error', {
        notificationId: notification.id,
        error: error.message,
      });

      await prisma.notification.update({
        where: { id: notification.id },
        data: {
          status: 'FAILED',
          failedAt: new Date(),
          errorMsg: error.message,
          attempts: (notification.attempts || 0) + 1,
        },
      });
    }
  }

  return {
    retried: failedNotifications.length,
    succeeded,
    failed,
  };
}

/**
 * Get notification retry statistics
 */
export async function getNotificationRetryStats(): Promise<{
  pending: number;
  failed: number;
  failedRecent: number; // Failed in last 24 hours
}> {
  const [pending, failed, failedRecent] = await Promise.all([
    prisma.notification.count({
      where: { status: 'PENDING' },
    }),
    prisma.notification.count({
      where: { status: 'FAILED' },
    }),
    prisma.notification.count({
      where: {
        status: 'FAILED',
        failedAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
        },
      },
    }),
  ]);

  return { pending, failed, failedRecent };
}
