import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/rbac';
import { jsonError, jsonOk } from '@/lib/api-response';
import { getUserFriendlyError } from '@/lib/user-friendly-errors';
import prisma from '@/lib/prisma';

/**
 * GET /api/settings/notifications
 * Get notification provider settings from database
 */
export async function GET(req: NextRequest) {
    try {
        const user = await getCurrentUser();
        if (!user || user.role !== 'ADMIN') {
            return jsonError('Unauthorized. Admin access required.', 403);
        }

        // Get settings from database
        const [twilioProvider, awsProvider, firebaseProvider, onesignalProvider] = await Promise.all([
            prisma.notificationProvider.findUnique({ where: { provider: 'twilio' } }),
            prisma.notificationProvider.findUnique({ where: { provider: 'aws-sns' } }),
            prisma.notificationProvider.findUnique({ where: { provider: 'firebase' } }),
            prisma.notificationProvider.findUnique({ where: { provider: 'onesignal' } }),
        ]);

        // Build SMS config from database
        let smsConfig: any = { enabled: false, provider: null };
        if (twilioProvider && twilioProvider.enabled) {
            const config = twilioProvider.config as any;
            smsConfig = {
                enabled: true,
                provider: 'twilio',
                accountSid: config.accountSid || '',
                authToken: config.authToken || '',
                fromNumber: config.fromNumber || '',
            };
        } else if (awsProvider && awsProvider.enabled) {
            const config = awsProvider.config as any;
            smsConfig = {
                enabled: true,
                provider: 'aws-sns',
                region: config.region || 'us-east-1',
                accessKeyId: config.accessKeyId || '',
                secretAccessKey: config.secretAccessKey || '',
            };
        }

        // Build Push config from database
        let pushConfig: any = { enabled: false, provider: null };
        if (firebaseProvider && firebaseProvider.enabled) {
            const config = firebaseProvider.config as any;
            pushConfig = {
                enabled: true,
                provider: 'firebase',
                projectId: config.projectId || '',
                privateKey: config.privateKey || '',
                clientEmail: config.clientEmail || '',
            };
        } else if (onesignalProvider && onesignalProvider.enabled) {
            const config = onesignalProvider.config as any;
            pushConfig = {
                enabled: true,
                provider: 'onesignal',
                appId: config.appId || '',
                restApiKey: config.restApiKey || '',
            };
        }

        // Get WhatsApp config from database
        const whatsappProvider = twilioProvider?.config as any;
        const whatsappNumber = whatsappProvider?.whatsappNumber || '';
        const whatsappContentSid = whatsappProvider?.whatsappContentSid || '';
        const whatsappConfig = {
            number: whatsappNumber,
            contentSid: whatsappContentSid,
            enabled: smsConfig.enabled && smsConfig.provider === 'twilio' && !!whatsappNumber
        };

        return jsonOk({
            sms: smsConfig,
            push: pushConfig,
            whatsapp: whatsappConfig,
        });
    } catch (error) {
        return jsonError(getUserFriendlyError(error), 500);
    }
}

/**
 * POST /api/settings/notifications
 * Update notification provider settings in database
 */
export async function POST(req: NextRequest) {
    try {
        const user = await getCurrentUser();
        if (!user || user.role !== 'ADMIN') {
            return jsonError('Unauthorized. Admin access required.', 403);
        }

        const body = await req.json();
        const existingTwilioProvider = await prisma.notificationProvider.findUnique({
            where: { provider: 'twilio' }
        });
        const existingTwilioConfig = (existingTwilioProvider?.config as any) || {};

        // Save SMS provider (Twilio or AWS SNS)
        if (body.sms) {
            const smsProvider = body.sms.provider === 'twilio' ? 'twilio' : 'aws-sns';
            const smsConfig: any = {
                enabled: body.sms.enabled || false,
            };

            if (body.sms.provider === 'twilio') {
                smsConfig.accountSid = body.sms.accountSid || '';
                smsConfig.authToken = body.sms.authToken || '';
                smsConfig.fromNumber = body.sms.fromNumber || '';
                // Store WhatsApp config in Twilio provider config
                const whatsappNumber = body.whatsapp?.number ?? existingTwilioConfig.whatsappNumber ?? '';
                smsConfig.whatsappNumber = whatsappNumber;
                smsConfig.whatsappContentSid = body.whatsapp?.contentSid ?? existingTwilioConfig.whatsappContentSid ?? '';
                smsConfig.whatsappEnabled = body.whatsapp?.enabled ?? existingTwilioConfig.whatsappEnabled ?? !!whatsappNumber;
                smsConfig.whatsappAccountSid = existingTwilioConfig.whatsappAccountSid;
                smsConfig.whatsappAuthToken = existingTwilioConfig.whatsappAuthToken;
            } else if (body.sms.provider === 'aws-sns') {
                smsConfig.region = body.sms.region || 'us-east-1';
                smsConfig.accessKeyId = body.sms.accessKeyId || '';
                smsConfig.secretAccessKey = body.sms.secretAccessKey || '';
            }

            await prisma.notificationProvider.upsert({
                where: { provider: smsProvider },
                create: {
                    provider: smsProvider,
                    enabled: smsConfig.enabled,
                    config: smsConfig,
                    updatedBy: user.id,
                },
                update: {
                    enabled: smsConfig.enabled,
                    config: smsConfig,
                    updatedBy: user.id,
                },
            });

            // Disable the other SMS provider if switching
            const otherProvider = body.sms.provider === 'twilio' ? 'aws-sns' : 'twilio';
            const otherProviderRecord = await prisma.notificationProvider.findUnique({
                where: { provider: otherProvider }
            });
            if (otherProviderRecord) {
                await prisma.notificationProvider.update({
                    where: { provider: otherProvider },
                    data: { enabled: false, updatedBy: user.id }
                });
            }
        }

        // Save Push provider (Firebase or OneSignal)
        if (body.push) {
            const pushProvider = body.push.provider === 'firebase' ? 'firebase' : 'onesignal';
            const pushConfig: any = {
                enabled: body.push.enabled || false,
            };

            if (body.push.provider === 'firebase') {
                pushConfig.projectId = body.push.projectId || '';
                pushConfig.privateKey = body.push.privateKey || '';
                pushConfig.clientEmail = body.push.clientEmail || '';
            } else if (body.push.provider === 'onesignal') {
                pushConfig.appId = body.push.appId || '';
                pushConfig.restApiKey = body.push.restApiKey || '';
            }

            await prisma.notificationProvider.upsert({
                where: { provider: pushProvider },
                create: {
                    provider: pushProvider,
                    enabled: pushConfig.enabled,
                    config: pushConfig,
                    updatedBy: user.id,
                },
                update: {
                    enabled: pushConfig.enabled,
                    config: pushConfig,
                    updatedBy: user.id,
                },
            });

            // Disable the other push provider if switching
            const otherProvider = body.push.provider === 'firebase' ? 'onesignal' : 'firebase';
            const otherProviderRecord = await prisma.notificationProvider.findUnique({
                where: { provider: otherProvider }
            });
            if (otherProviderRecord) {
                await prisma.notificationProvider.update({
                    where: { provider: otherProvider },
                    data: { enabled: false, updatedBy: user.id }
                });
            }
        }

        return jsonOk({
            success: true,
            message: 'Notification provider settings saved successfully',
        });
    } catch (error) {
        return jsonError(getUserFriendlyError(error), 500);
    }
}

