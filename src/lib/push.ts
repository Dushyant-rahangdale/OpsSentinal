/**
 * Push Notification Service
 * Sends push notifications for incidents
 * 
 * To use with Firebase Cloud Messaging (FCM):
 * 1. Install: npm install firebase-admin
 * 2. Set FIREBASE_PROJECT_ID and FIREBASE_PRIVATE_KEY in .env
 * 3. Uncomment the Firebase implementation below
 * 
 * To use with OneSignal:
 * 1. Install: npm install onesignal-node
 * 2. Set ONESIGNAL_APP_ID and ONESIGNAL_REST_API_KEY in .env
 * 3. Use OneSignal implementation
 */

import prisma from './prisma';
import { getPushConfig } from './notification-providers';
import { getBaseUrl } from './env-validation';

export type PushOptions = {
    userId: string;
    title: string;
    body: string;
    data?: Record<string, any>;
    badge?: number;
};

/**
 * Send push notification
 * Currently uses console.log for development
 * Replace with actual push service in production
 */
export async function sendPush(options: PushOptions): Promise<{ success: boolean; error?: string }> {
    try {
        // Get push configuration
        const pushConfig = await getPushConfig();

        // Get user's device tokens
        const devices = await prisma.userDevice.findMany({
            where: { userId: options.userId },
            orderBy: { lastUsed: 'desc' }
        });

        if (devices.length === 0) {
            return { success: false, error: 'No device tokens found for user' };
        }

        // Development: Log push instead of sending if no provider configured
        if (process.env.NODE_ENV === 'development' || !pushConfig.enabled) {
            console.log('Push Notification:', {
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
        let errorMessages: string[] = [];

        if (pushConfig.provider === 'firebase') {
            // TODO: Implement Firebase when npm package is installed
            // const admin = require('firebase-admin');
            // if (!admin.apps.length) {
            //     admin.initializeApp({
            //         credential: admin.credential.cert({
            //             projectId: pushConfig.projectId,
            //             privateKey: pushConfig.privateKey,
            //             clientEmail: pushConfig.clientEmail,
            //         })
            //     });
            // }
            // Send to all devices
            // for (const device of devices) {
            //     try {
            //         const message = {
            //             notification: { title: options.title, body: options.body },
            //             data: options.data,
            //             token: device.token,
            //         };
            //         await admin.messaging().send(message);
            //         await prisma.userDevice.update({
            //             where: { id: device.id },
            //             data: { lastUsed: new Date() }
            //         });
            //         successCount++;
            //     } catch (error: any) {
            //         errorMessages.push(`Device ${device.deviceId}: ${error.message}`);
            //     }
            // }
            console.log('Would send via Firebase to', devices.length, 'devices:', { userId: options.userId, title: options.title });
            successCount = devices.length;
        } else if (pushConfig.provider === 'onesignal') {
            // TODO: Implement OneSignal when npm package is installed
            // const { Client } = require('onesignal-node');
            // const client = new Client(pushConfig.appId, pushConfig.restApiKey);
            // const deviceTokens = devices.map(d => d.token);
            // await client.createNotification({
            //     headings: { en: options.title },
            //     contents: { en: options.body },
            //     include_player_ids: deviceTokens,
            //     data: options.data,
            // });
            console.log('Would send via OneSignal to', devices.length, 'devices:', { userId: options.userId, title: options.title });
            successCount = devices.length;
        } else {
            return { success: false, error: 'No push notification provider configured' };
        }

        // Update lastUsed for successful devices
        if (successCount > 0) {
            await prisma.userDevice.updateMany({
                where: { userId: options.userId },
                data: { lastUsed: new Date() }
            });
        }

        return successCount > 0 
            ? { success: true }
            : { success: false, error: errorMessages.join('; ') || 'Failed to send to all devices' };

        // No provider configured
        return { success: false, error: 'No push notification provider configured' };
    } catch (error: any) {
        console.error('Push send error:', error);
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
                    assignee: true
                }
            })
        ]);

        if (!user || !incident) {
            return { success: false, error: 'User or incident not found' };
        }

        const baseUrl = getBaseUrl();
        const incidentUrl = `${baseUrl}/incidents/${incidentId}`;

        const urgencyLabel = incident.urgency === 'HIGH' ? 'CRITICAL' : 'INFO';
        const statusLabel = eventType === 'resolved'
            ? '[RESOLVED]'
            : eventType === 'acknowledged'
                ? '[ACK]'
                : '[TRIGGERED]';

        const title = `${statusLabel} [${urgencyLabel}] ${incident.title}`;
        const body = `${incident.service.name} -> ${incident.status}`;

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
            },
            badge: 1, // Increment badge count
        });
    } catch (error: any) {
        console.error('Send incident push error:', error);
        return { success: false, error: error.message };
    }
}

