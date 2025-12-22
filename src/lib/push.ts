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
        // Get push configuration (database first, then env vars)
        const { getPushConfig } = await import('./notification-providers');
        const pushConfig = await getPushConfig();

        // Get user's FCM token (would be stored in user profile or separate table)
        const user = await prisma.user.findUnique({
            where: { id: options.userId },
            // TODO: Add fcmToken field to User model or create UserDevice table
        });

        if (!user) {
            return { success: false, error: 'User not found' };
        }

        // Development: Log push instead of sending if no provider configured
        if (process.env.NODE_ENV === 'development' || !pushConfig.enabled) {
            console.log('🔔 Push Notification:', {
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
            // });
            // }
            // const message = {
            //     notification: { title: options.title, body: options.body },
            //     data: options.data,
            //     token: user.fcmToken,
            // };
            // await admin.messaging().send(message);
            console.log('🔔 Would send via Firebase:', { userId: options.userId, title: options.title });
            return { success: true };
        }

        if (pushConfig.provider === 'onesignal') {
            // TODO: Implement OneSignal when npm package is installed
            // const { Client } = require('onesignal-node');
            // const client = new Client(pushConfig.appId, pushConfig.restApiKey);
            // await client.createNotification({
            //     headings: { en: options.title },
            //     contents: { en: options.body },
            //     include_external_user_ids: [options.userId],
            //     data: options.data,
            // });
            console.log('🔔 Would send via OneSignal:', { userId: options.userId, title: options.title });
            return { success: true };
        }

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

        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
        const incidentUrl = `${baseUrl}/incidents/${incidentId}`;
        
        const urgencyLabel = incident.urgency === 'HIGH' ? 'CRITICAL' : 'INFO';
        const statusEmoji = eventType === 'resolved' ? '✅' : eventType === 'acknowledged' ? '👀' : '🚨';
        
        const title = `${statusEmoji} [${urgencyLabel}] ${incident.title}`;
        const body = `${incident.service.name} • ${incident.status}`;

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

