/**
 * Push Notification Service
 * Sends push notifications for incidents
 *
 * Push notification providers are configured via the UI at Settings -> System -> Notification Providers
 *
 * To use with Firebase Cloud Messaging (FCM):
 * 1. Install: npm install firebase-admin
 * 2. Configure Firebase in Settings -> System -> Notification Providers
 *
 * To use with OneSignal:
 * 1. Install: npm install onesignal-node
 * 2. Configure OneSignal in Settings -> System -> Notification Providers
 */

import prisma from './prisma';
import { getPushConfig } from './notification-providers';
import { getBaseUrl } from './env-validation';
import { logger } from './logger';
import webpush from 'web-push';

// Configure Web Push if keys are present
// We will configure VAPID details per-request based on DB config or Env variables

export type PushOptions = {
  userId: string;
  title: string;
  body: string;
  data?: Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
  badge?: number;
};

/**
 * Send push notification
 * Uses logger output for development mode
 */
export async function sendPush(
  options: PushOptions
): Promise<{ success: boolean; error?: string }> {
  try {
    // Get push configuration
    const pushConfig = await getPushConfig();

    // Get user's device tokens
    const devices = await prisma.userDevice.findMany({
      where: { userId: options.userId },
      orderBy: { lastUsed: 'desc' },
    });

    if (devices.length === 0) {
      return { success: false, error: 'No device tokens found for user' };
    }

    // If provider is not enabled, log and return (mock mode)
    // Note: In development, we still want to send if enabled to test functionality
    if (!pushConfig.enabled) {
      logger.info('Push notification (mock)', {
        userId: options.userId,
        title: options.title,
        body: options.body,
        provider: pushConfig.provider,
      });

      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 100));

      return { success: true };
    }

    // Production: Use configured provider
    let successCount = 0;
    const errorMessages: string[] = [];
    const resolveVapidDetails = () => {
      if (
        pushConfig.provider === 'web-push' &&
        pushConfig.vapidPublicKey &&
        pushConfig.vapidPrivateKey
      ) {
        return {
          subject: pushConfig.vapidSubject || 'mailto:admin@localhost',
          publicKey: pushConfig.vapidPublicKey,
          privateKey: pushConfig.vapidPrivateKey,
        };
      }

      if (process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
        return {
          subject: process.env.VAPID_SUBJECT || 'mailto:admin@localhost',
          publicKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
          privateKey: process.env.VAPID_PRIVATE_KEY,
        };
      }

      return undefined;
    };

    const vapidDetails = resolveVapidDetails();

    const sendWebPush = async (device: (typeof devices)[number]) => {
      if (!vapidDetails) {
        errorMessages.push(`Device ${device.deviceId}: VAPID keys not configured`);
        return;
      }

      try {
        const subscription = JSON.parse(device.token);
        const payload = JSON.stringify({
          title: options.title,
          body: options.body,
          data: options.data,
          icon: '/icons/android-chrome-192x192.png',
          badge: options.data?.badge || '/icons/android-chrome-192x192.png',
          url: options.data?.url || '/m',
          actions: options.data?.actions ? JSON.parse(options.data.actions) : undefined,
        });
        await webpush.sendNotification(subscription, payload, { vapidDetails });
        await prisma.userDevice.update({
          where: { id: device.id },
          data: { lastUsed: new Date() },
        });
        successCount++;
      } catch (error: unknown) {
        const statusCode =
          typeof error === 'object' && error !== null && 'statusCode' in error
            ? (error as { statusCode?: number }).statusCode
            : undefined;
        const errorMessage =
          typeof error === 'object' && error !== null && 'message' in error
            ? String((error as { message?: unknown }).message ?? '')
            : 'Unknown error';

        if (statusCode === 410 || statusCode === 404) {
          await prisma.userDevice.delete({ where: { id: device.id } });
          errorMessages.push(`Device ${device.deviceId}: Subscription expired (removed)`);
        } else {
          errorMessages.push(`Device ${device.deviceId}: ${errorMessage}`);
        }
      }
    };

    if (pushConfig.provider === 'web-push') {
      const webDevices = devices.filter(device => device.platform === 'web');
      if (webDevices.length === 0) {
        return { success: false, error: 'No web push subscriptions found for user' };
      }

      if (!vapidDetails) {
        return { success: false, error: 'VAPID keys not configured' };
      }

      for (const device of webDevices) {
        await sendWebPush(device);
      }
    } else if (pushConfig.provider === 'firebase') {
      try {
        // Validate required Firebase config
        if (!pushConfig.projectId || !pushConfig.privateKey || !pushConfig.clientEmail) {
          return {
            success: false,
            error:
              'Firebase configuration incomplete. Please configure Project ID, Private Key, and Client Email in Settings -> System -> Notification Providers',
          };
        }

        // Use runtime require to avoid build-time dependency
        const requireFunc = eval('require') as (id: string) => any; // eslint-disable-line @typescript-eslint/no-explicit-any
        const admin = requireFunc('firebase-admin');

        // Initialize Firebase Admin if not already initialized
        if (!admin.apps.length) {
          try {
            admin.initializeApp({
              credential: admin.credential.cert({
                projectId: pushConfig.projectId,
                privateKey: pushConfig.privateKey.replace(/\\n/g, '\n'), // Handle escaped newlines
                clientEmail: pushConfig.clientEmail,
              }),
            });
          } catch (initError: any) {
            // eslint-disable-line @typescript-eslint/no-explicit-any
            // App might already be initialized with different config
            if (!initError.message?.includes('already been initialized')) {
              throw initError;
            }
          }
        }

        // Send to all devices
        for (const device of devices) {
          try {
            // Handle Web Push (PWA)
            if (device.platform === 'web') {
              await sendWebPush(device);
              continue;
            }

            // ... existing Firebase logic ...
            const message = {
              notification: {
                title: options.title,
                body: options.body,
              },
              data: options.data
                ? Object.fromEntries(Object.entries(options.data).map(([k, v]) => [k, String(v)]))
                : undefined,
              token: device.token,
              apns: options.badge
                ? {
                    payload: {
                      aps: {
                        badge: options.badge,
                      },
                    },
                  }
                : undefined,
            };

            await admin.messaging().send(message);
            await prisma.userDevice.update({
              where: { id: device.id },
              data: { lastUsed: new Date() },
            });
            successCount++;
          } catch (error: any) {
            // eslint-disable-line @typescript-eslint/no-explicit-any
            // Handle invalid token errors
            if (
              error.code === 'messaging/invalid-registration-token' ||
              error.code === 'messaging/registration-token-not-registered'
            ) {
              // Remove invalid token
              await prisma.userDevice.delete({ where: { id: device.id } });
              errorMessages.push(`Device ${device.deviceId}: Invalid token, removed`);
            } else {
              errorMessages.push(`Device ${device.deviceId}: ${error.message}`);
            }
          }
        }
      } catch (error: any) {
        // eslint-disable-line @typescript-eslint/no-explicit-any
        // If Firebase package is not installed
        if (error.code === 'MODULE_NOT_FOUND') {
          logger.warn('Firebase Admin package not installed', {
            component: 'push',
            provider: 'firebase',
            installCommand: 'npm install firebase-admin',
          });
          return {
            success: false,
            error: 'Firebase Admin package not installed. Install with: npm install firebase-admin',
          };
        }
        logger.error('Firebase push send error', {
          component: 'push',
          provider: 'firebase',
          error,
          userId: options.userId,
        });
        return { success: false, error: error.message || 'Firebase send error' };
      }
    } else if (pushConfig.provider === 'onesignal') {
      try {
        // Validate required OneSignal config
        if (!pushConfig.appId || !pushConfig.restApiKey) {
          return {
            success: false,
            error:
              'OneSignal configuration incomplete. Please configure App ID and REST API Key in Settings -> System -> Notification Providers',
          };
        }

        // Use runtime require to avoid build-time dependency
        const requireFunc = eval('require') as (id: string) => any; // eslint-disable-line @typescript-eslint/no-explicit-any
        const { Client } = requireFunc('onesignal-node');

        const client = new Client(pushConfig.appId, pushConfig.restApiKey);
        const deviceTokens = devices.map(d => d.token);

        const notification = {
          headings: { en: options.title },
          contents: { en: options.body },
          include_player_ids: deviceTokens,
          data: options.data || {},
          badge: options.badge,
        };

        const response = await client.createNotification(notification);

        // OneSignal sends to all devices at once
        if (response.body?.id) {
          // Update all devices as successful
          await prisma.userDevice.updateMany({
            where: { userId: options.userId },
            data: { lastUsed: new Date() },
          });
          successCount = devices.length;
          logger.info('Push sent via OneSignal', {
            userId: options.userId,
            notificationId: response.body.id,
            devices: devices.length,
          });
        } else {
          return { success: false, error: 'OneSignal API returned no notification ID' };
        }
      } catch (error: any) {
        // eslint-disable-line @typescript-eslint/no-explicit-any
        // If OneSignal package is not installed
        if (error.code === 'MODULE_NOT_FOUND') {
          logger.warn('OneSignal package not installed', {
            component: 'push',
            provider: 'onesignal',
            installCommand: 'npm install onesignal-node',
          });
          return {
            success: false,
            error: 'OneSignal package not installed. Install with: npm install onesignal-node',
          };
        }
        logger.error('OneSignal push send error', {
          component: 'push',
          provider: 'onesignal',
          error,
          userId: options.userId,
        });
        return { success: false, error: error.message || 'OneSignal send error' };
      }
    } else {
      return { success: false, error: 'No push notification provider configured' };
    }

    // Update lastUsed for successful devices
    if (successCount > 0) {
      await prisma.userDevice.updateMany({
        where: { userId: options.userId },
        data: { lastUsed: new Date() },
      });
    }

    if (successCount > 0) {
      return { success: true };
    } else {
      return { success: false, error: errorMessages.join('; ') || 'Failed to send to all devices' };
    }
  } catch (error: any) {
    // eslint-disable-line @typescript-eslint/no-explicit-any
    logger.error('Push send error', { component: 'push', error, userId: options.userId });
    return { success: false, error: error.message };
  }
}

/**
 * Send incident notification push
 */
export async function sendIncidentPush(
  userId: string,
  incidentId: string,
  eventType: 'triggered' | 'acknowledged' | 'resolved'
): Promise<{ success: boolean; error?: string }> {
  try {
    const [user, incident] = await Promise.all([
      prisma.user.findUnique({ where: { id: userId } }),
      prisma.incident.findUnique({
        where: { id: incidentId },
        include: {
          service: true,
          assignee: true,
        },
      }),
    ]);

    if (!user || !incident) {
      return { success: false, error: 'User or incident not found' };
    }

    const baseUrl = getBaseUrl();
    const incidentUrl = `${baseUrl}/incidents/${incidentId}`;

    // Format timestamps
    const formatTime = (date: Date) => {
      return new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      }).format(date);
    };

    // Enhanced emoji logic based on urgency and event
    let titleEmoji = '';
    let badge = '/icons/android-chrome-192x192.png';

    if (eventType === 'triggered') {
      titleEmoji = incident.urgency === 'HIGH' ? '🔴' : incident.urgency === 'MEDIUM' ? '🟡' : '🔵';
      badge = incident.urgency === 'HIGH' ? '/icons/badge-critical.png' : '/icons/badge-info.png';
    } else if (eventType === 'acknowledged') {
      titleEmoji = '✅';
    } else {
      titleEmoji = '✓';
    }

    const urgencyLabel =
      incident.urgency === 'HIGH' ? 'CRITICAL' : incident.urgency === 'MEDIUM' ? 'MEDIUM' : 'LOW';

    // Build enhanced title
    const title =
      eventType === 'triggered'
        ? `${titleEmoji} ${urgencyLabel} | ${incident.title}`
        : eventType === 'acknowledged'
          ? `${titleEmoji} Acknowledged | ${incident.title}`
          : `${titleEmoji} Resolved | ${incident.title}`;

    // Build cleaner body with structured format
    let body = `Service: ${incident.service.name}`;
    if (incident.assignee) {
      body += `\nAssignee: ${incident.assignee.name}`;
    }
    body += `\nTime: ${formatTime(incident.createdAt)}`;

    if (incident.description) {
      const shortDesc =
        incident.description.length > 60
          ? incident.description.substring(0, 60) + '...'
          : incident.description;
      body += `\n${shortDesc}`;
    }

    // Action buttons for triggered incidents
    const actions =
      eventType === 'triggered'
        ? [
            { action: 'view', title: '👁️ View', icon: '/icons/android-chrome-192x192.png' },
            {
              action: 'acknowledge',
              title: '✓ Acknowledge',
              icon: '/icons/android-chrome-192x192.png',
            },
          ]
        : [{ action: 'view', title: '👁️ View', icon: '/icons/android-chrome-192x192.png' }];

    return await sendPush({
      userId,
      title,
      body,
      data: {
        incidentId,
        incidentUrl,
        eventType,
        urgency: incident.urgency,
        status: incident.status,
        url: `/m/incidents/${incidentId}`,
        actions: JSON.stringify(actions),
      },
      badge: 1,
    });
  } catch (error: any) {
    // eslint-disable-line @typescript-eslint/no-explicit-any
    logger.error('Send incident push error', {
      component: 'push',
      error,
      incidentId,
      userId,
      eventType,
    });
    return { success: false, error: error.message };
  }
}
