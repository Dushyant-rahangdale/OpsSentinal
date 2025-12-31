import prisma from './prisma';
import { logger } from './logger';

export type SMSProvider = 'twilio' | 'aws-sns' | null;
export type PushProvider = 'firebase' | 'onesignal' | null;

export interface SMSConfig {
    enabled: boolean;
    provider: SMSProvider;
    // Twilio config
    accountSid?: string;
    authToken?: string;
    fromNumber?: string;
    whatsappNumber?: string; // WhatsApp Business API number (optional)
    whatsappContentSid?: string; // Twilio Content API SID for templates
    // AWS SNS config
    region?: string;
    accessKeyId?: string;
    secretAccessKey?: string;
}

export interface PushConfig {
    enabled: boolean;
    provider: PushProvider;
    // Firebase config
    projectId?: string;
    privateKey?: string;
    clientEmail?: string;
    // OneSignal config
    appId?: string;
    restApiKey?: string;
}

export type EmailProvider = 'resend' | 'sendgrid' | 'smtp' | 'ses' | null;

export interface EmailConfig {
    enabled: boolean;
    provider: EmailProvider;
    apiKey?: string;
    fromEmail?: string;
    source?: string;
    host?: string;
    accessKeyId?: string;
    user?: string;
    port?: string | number;
    secure?: boolean;
}

export type NotificationChannelType = 'EMAIL' | 'SMS' | 'PUSH' | 'WHATSAPP';

export async function getEmailConfig(): Promise<EmailConfig> {
    const defaultFromEmail = `noreply@${process.env.NEXT_PUBLIC_APP_URL?.replace(/^https?:\/\//, '') || 'OpsSentinal.com'}`;

    try {
        // Check Resend first
        const resendProvider = await prisma.notificationProvider.findUnique({
            where: { provider: 'resend' }
        });

        if (resendProvider && resendProvider.enabled && resendProvider.config) {
            const config = resendProvider.config as any; // eslint-disable-line @typescript-eslint/no-explicit-any
            if (config.apiKey) {
                return {
                    enabled: true,
                    provider: 'resend',
                    apiKey: config.apiKey,
                    fromEmail: config.fromEmail || defaultFromEmail,
                    source: 'resend'
                };
            }
        }

        // Check SendGrid
        const sendgridProvider = await prisma.notificationProvider.findUnique({
            where: { provider: 'sendgrid' }
        });

        if (sendgridProvider && sendgridProvider.enabled && sendgridProvider.config) {
            const config = sendgridProvider.config as any; // eslint-disable-line @typescript-eslint/no-explicit-any
            if (config.apiKey) {
                return {
                    enabled: true,
                    provider: 'sendgrid',
                    apiKey: config.apiKey,
                    fromEmail: config.fromEmail || defaultFromEmail,
                    source: 'sendgrid'
                };
            }
        }

        // Check SMTP
        const smtpProvider = await prisma.notificationProvider.findUnique({
            where: { provider: 'smtp' }
        });

        if (smtpProvider && smtpProvider.enabled && smtpProvider.config) {
            const config = smtpProvider.config as any; // eslint-disable-line @typescript-eslint/no-explicit-any
            if (config.host && config.user && config.password) {
                return {
                    enabled: true,
                    provider: 'smtp',
                    apiKey: config.password,
                    fromEmail: config.fromEmail || defaultFromEmail,
                    source: 'smtp',
                    host: config.host,
                    user: config.user,
                    port: config.port,
                    secure: config.secure === true
                };
            }
        }

        // Check Amazon SES
        const sesProvider = await prisma.notificationProvider.findUnique({
            where: { provider: 'ses' }
        });

        if (sesProvider && sesProvider.enabled && sesProvider.config) {
            const config = sesProvider.config as any; // eslint-disable-line @typescript-eslint/no-explicit-any
            if (config.accessKeyId && config.secretAccessKey) {
                return {
                    enabled: true,
                    provider: 'ses',
                    apiKey: config.secretAccessKey,
                    accessKeyId: config.accessKeyId,
                    fromEmail: config.fromEmail || defaultFromEmail,
                    source: 'ses',
                    host: config.region || 'us-east-1'
                };
            }
        }
    } catch (error) {
        logger.error('Failed to load Email config from database', { component: 'notification-providers', error });
        return { enabled: false, provider: null, source: 'error' };
    }

    return {
        enabled: false,
        provider: null
    };
}

/**
 * Get email config for status page subscriptions
 * Respects the emailProvider setting from StatusPage
 */
export async function getStatusPageEmailConfig(statusPageId?: string): Promise<EmailConfig> {
    const defaultFromEmail = `noreply@${process.env.NEXT_PUBLIC_APP_URL?.replace(/^https?:\/\//, '') || 'OpsSentinal.com'}`;

    try {
        // Get status page email provider preference
        let preferredProvider: string | null = null;
        if (statusPageId) {
            const statusPage = await prisma.statusPage.findUnique({
                where: { id: statusPageId },
                select: { emailProvider: true }
            });
            preferredProvider = statusPage?.emailProvider || null;
        }

        // If status page has a preferred provider, try it first
        if (preferredProvider) {
            const provider = await prisma.notificationProvider.findUnique({
                where: { provider: preferredProvider }
            });

            if (provider && provider.enabled && provider.config) {
                const config = provider.config as any; // eslint-disable-line @typescript-eslint/no-explicit-any
                if (preferredProvider === 'resend' && config.apiKey) {
                    return {
                        enabled: true,
                        provider: 'resend',
                        apiKey: config.apiKey,
                        fromEmail: config.fromEmail || defaultFromEmail,
                        source: 'status-page-resend'
                    };
                } else if (preferredProvider === 'sendgrid' && config.apiKey) {
                    return {
                        enabled: true,
                        provider: 'sendgrid',
                        apiKey: config.apiKey,
                        fromEmail: config.fromEmail || defaultFromEmail,
                        source: 'status-page-sendgrid'
                    };
                } else if (preferredProvider === 'smtp' && config.host) {
                    return {
                        enabled: true,
                        provider: 'smtp',
                        apiKey: config.password,
                        fromEmail: config.fromEmail || defaultFromEmail,
                        source: 'status-page-smtp',
                        host: config.host,
                        user: config.user,
                        port: config.port,
                        secure: config.secure === true
                    };
                } else if (preferredProvider === 'ses' && config.accessKeyId) {
                    return {
                        enabled: true,
                        provider: 'ses',
                        apiKey: config.secretAccessKey,
                        accessKeyId: config.accessKeyId,
                        fromEmail: config.fromEmail || defaultFromEmail,
                        source: 'status-page-ses',
                        host: config.region || 'us-east-1'
                    };
                }
            }
        }

        // Fall back to default email config
        return await getEmailConfig();
    } catch (error) {
        logger.error('Failed to load status page email config', { component: 'notification-providers', error });
        return { enabled: false, provider: null }; // Fall back to default email config
    }
}

export async function isChannelAvailable(channel: NotificationChannelType): Promise<boolean> {
    switch (channel) {
        case 'EMAIL':
            return (await getEmailConfig()).enabled;
        case 'SMS':
            return (await getSMSConfig()).enabled;
        case 'PUSH':
            return (await getPushConfig()).enabled;
        case 'WHATSAPP':
            // WhatsApp has independent enabled state stored in Twilio config
            return (await getWhatsAppConfig()).enabled;
        default:
            return false;
    }
}

/**
 * Get WhatsApp configuration (stored in Twilio provider config)
 */
export async function getWhatsAppConfig(): Promise<SMSConfig> {
    try {
        const twilioProvider = await prisma.notificationProvider.findUnique({
            where: { provider: 'twilio' }
        });

        if (twilioProvider && twilioProvider.config) {
            const config = twilioProvider.config as any; // eslint-disable-line @typescript-eslint/no-explicit-any

            // Prioritize specific WhatsApp credentials, fall back to global Twilio credentials
            const accountSid = config.whatsappAccountSid || config.accountSid;
            const authToken = config.whatsappAuthToken || config.authToken;

            // Check if WhatsApp is enabled (independent of Twilio SMS)
            const whatsappEnabled = config.whatsappEnabled !== undefined ? config.whatsappEnabled : true;
            if (whatsappEnabled && accountSid && authToken && config.whatsappNumber) {
                return {
                    enabled: true,
                    provider: 'twilio',
                    accountSid: accountSid,
                    authToken: authToken,
                    fromNumber: config.fromNumber,
                    whatsappNumber: config.whatsappNumber,
                    whatsappContentSid: config.whatsappContentSid,
                };
            }
        }
    } catch (error) {
        logger.error('Failed to load WhatsApp config from database', { component: 'notification-providers', error });
    }

    return {
        enabled: false,
        provider: null,
    };
}

/**
 * Get SMS configuration from database only
 */
export async function getSMSConfig(): Promise<SMSConfig> {
    try {
        const twilioProvider = await prisma.notificationProvider.findUnique({
            where: { provider: 'twilio' }
        });

        if (twilioProvider && twilioProvider.enabled && twilioProvider.config) {
            const config = twilioProvider.config as any; // eslint-disable-line @typescript-eslint/no-explicit-any
            if (config.accountSid && config.authToken) {
                return {
                    enabled: true,
                    provider: 'twilio',
                    accountSid: config.accountSid,
                    authToken: config.authToken,
                    fromNumber: config.fromNumber,
                    whatsappNumber: config.whatsappNumber,
                    whatsappContentSid: config.whatsappContentSid,
                };
            }
        }

        const awsProvider = await prisma.notificationProvider.findUnique({
            where: { provider: 'aws-sns' }
        });

        if (awsProvider && awsProvider.enabled && awsProvider.config) {
            const config = awsProvider.config as any; // eslint-disable-line @typescript-eslint/no-explicit-any
            if (config.accessKeyId && config.secretAccessKey) {
                return {
                    enabled: true,
                    provider: 'aws-sns',
                    region: config.region || 'us-east-1',
                    accessKeyId: config.accessKeyId,
                    secretAccessKey: config.secretAccessKey,
                };
            }
        }
    } catch (error) {
        logger.error('Failed to load SMS config from database', { component: 'notification-providers', error });
    }

    return {
        enabled: false,
        provider: null,
    };
}

/**
 * Get Push notification configuration from database only
 */
export async function getPushConfig(): Promise<PushConfig> {
    try {
        const firebaseProvider = await prisma.notificationProvider.findUnique({
            where: { provider: 'firebase' }
        });

        if (firebaseProvider && firebaseProvider.enabled && firebaseProvider.config) {
            const config = firebaseProvider.config as any; // eslint-disable-line @typescript-eslint/no-explicit-any
            if (config.projectId && config.privateKey) {
                return {
                    enabled: true,
                    provider: 'firebase',
                    projectId: config.projectId,
                    privateKey: config.privateKey,
                    clientEmail: config.clientEmail,
                };
            }
        }

        const onesignalProvider = await prisma.notificationProvider.findUnique({
            where: { provider: 'onesignal' }
        });

        if (onesignalProvider && onesignalProvider.enabled && onesignalProvider.config) {
            const config = onesignalProvider.config as any; // eslint-disable-line @typescript-eslint/no-explicit-any
            if (config.appId && config.restApiKey) {
                return {
                    enabled: true,
                    provider: 'onesignal',
                    appId: config.appId,
                    restApiKey: config.restApiKey,
                };
            }
        }
    } catch (error) {
        logger.error('Failed to load Push config from database', { component: 'notification-providers', error });
    }

    return {
        enabled: false,
        provider: null,
    };
}
