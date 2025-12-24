import prisma from './prisma';

export type SMSProvider = 'twilio' | 'aws-sns' | null;
export type PushProvider = 'firebase' | 'onesignal' | null;

export interface SMSConfig {
    enabled: boolean;
    provider: SMSProvider;
    // Twilio config
    accountSid?: string;
    authToken?: string;
    fromNumber?: string;
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

export type EmailProvider = 'resend' | 'sendgrid' | 'smtp' | null;

export interface EmailConfig {
    enabled: boolean;
    provider: EmailProvider;
    apiKey?: string;
    fromEmail?: string;
    source?: string;
    host?: string;
}

export type NotificationChannelType = 'EMAIL' | 'SMS' | 'PUSH';

export async function getEmailConfig(): Promise<EmailConfig> {
    const defaultFromEmail = process.env.EMAIL_FROM || `noreply@${process.env.NEXT_PUBLIC_APP_URL?.replace(/^https?:\/\//, '') || 'opsguard.com'}`;

    if (process.env.RESEND_API_KEY) {
        return {
            enabled: true,
            provider: 'resend',
            apiKey: process.env.RESEND_API_KEY,
            fromEmail: process.env.RESEND_FROM_EMAIL || defaultFromEmail,
            source: 'resend'
        };
    }

    if (process.env.SENDGRID_API_KEY) {
        return {
            enabled: true,
            provider: 'sendgrid',
            apiKey: process.env.SENDGRID_API_KEY,
            fromEmail: process.env.SENDGRID_FROM_EMAIL || defaultFromEmail,
            source: 'sendgrid'
        };
    }

    if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASSWORD) {
        return {
            enabled: true,
            provider: 'smtp',
            apiKey: process.env.SMTP_PASSWORD,
            fromEmail: process.env.SMTP_FROM_EMAIL || defaultFromEmail,
            source: 'smtp'
            ,
            host: process.env.SMTP_HOST
        };
    }

    return {
        enabled: false,
        provider: null
    };
}

export async function isChannelAvailable(channel: NotificationChannelType): Promise<boolean> {
    switch (channel) {
        case 'EMAIL':
            return (await getEmailConfig()).enabled;
        case 'SMS':
            return (await getSMSConfig()).enabled;
        case 'PUSH':
            return (await getPushConfig()).enabled;
        default:
            return false;
    }
}

/**
 * Get SMS configuration from environment variables
 * In production, this could be stored in database
 */
export async function getSMSConfig(): Promise<SMSConfig> {
    // Check environment variables first
    if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
        return {
            enabled: true,
            provider: 'twilio',
            accountSid: process.env.TWILIO_ACCOUNT_SID,
            authToken: process.env.TWILIO_AUTH_TOKEN,
            fromNumber: process.env.TWILIO_FROM_NUMBER,
        };
    }

    if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
        return {
            enabled: true,
            provider: 'aws-sns',
            region: process.env.AWS_REGION || 'us-east-1',
            accessKeyId: process.env.AWS_ACCESS_KEY_ID,
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        };
    }

    return {
        enabled: false,
        provider: null,
    };
}

/**
 * Get Push notification configuration from environment variables
 * In production, this could be stored in database
 */
export async function getPushConfig(): Promise<PushConfig> {
    // Check environment variables first
    if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_PRIVATE_KEY) {
        return {
            enabled: true,
            provider: 'firebase',
            projectId: process.env.FIREBASE_PROJECT_ID,
            privateKey: process.env.FIREBASE_PRIVATE_KEY,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        };
    }

    if (process.env.ONESIGNAL_APP_ID && process.env.ONESIGNAL_REST_API_KEY) {
        return {
            enabled: true,
            provider: 'onesignal',
            appId: process.env.ONESIGNAL_APP_ID,
            restApiKey: process.env.ONESIGNAL_REST_API_KEY,
        };
    }

    return {
        enabled: false,
        provider: null,
    };
}
