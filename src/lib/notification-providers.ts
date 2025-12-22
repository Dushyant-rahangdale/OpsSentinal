/**
 * System-Level Notification Provider Configuration
 * Reads from database (admin-configured) first, then falls back to environment variables
 */

import prisma from './prisma';

/**
 * Get Twilio configuration
 * Checks database first, then falls back to environment variables
 */
export async function getTwilioConfig() {
    // Try database first
    const dbConfig = await prisma.notificationProvider.findUnique({
        where: { provider: 'twilio' }
    });

    if (dbConfig && dbConfig.enabled && dbConfig.config) {
        const config = dbConfig.config as any;
        return {
            accountSid: config.accountSid,
            authToken: config.authToken,
            fromNumber: config.fromNumber,
            enabled: true,
            source: 'database' as const
        };
    }

    // Fallback to environment variables
    return {
        accountSid: process.env.TWILIO_ACCOUNT_SID,
        authToken: process.env.TWILIO_AUTH_TOKEN,
        fromNumber: process.env.TWILIO_FROM_NUMBER,
        enabled: !!(
            process.env.TWILIO_ACCOUNT_SID &&
            process.env.TWILIO_AUTH_TOKEN &&
            process.env.TWILIO_FROM_NUMBER
        ),
        source: 'environment' as const
    };
}

/**
 * Get Email configuration
 * Checks database first (Resend, SendGrid, SMTP), then falls back to environment variables
 */
export async function getEmailConfig() {
    // Try Resend from database
    const resendConfig = await prisma.notificationProvider.findUnique({
        where: { provider: 'resend' }
    });
    if (resendConfig && resendConfig.enabled && resendConfig.config) {
        const config = resendConfig.config as any;
        return {
            provider: 'resend' as const,
            apiKey: config.apiKey,
            fromEmail: config.fromEmail,
            enabled: true,
            source: 'database' as const
        };
    }

    // Try SendGrid from database
    const sendgridConfig = await prisma.notificationProvider.findUnique({
        where: { provider: 'sendgrid' }
    });
    if (sendgridConfig && sendgridConfig.enabled && sendgridConfig.config) {
        const config = sendgridConfig.config as any;
        return {
            provider: 'sendgrid' as const,
            apiKey: config.apiKey,
            fromEmail: config.fromEmail,
            enabled: true,
            source: 'database' as const
        };
    }

    // Try SMTP from database
    const smtpConfig = await prisma.notificationProvider.findUnique({
        where: { provider: 'smtp' }
    });
    if (smtpConfig && smtpConfig.enabled && smtpConfig.config) {
        const config = smtpConfig.config as any;
        return {
            provider: 'smtp' as const,
            host: config.host,
            port: parseInt(config.port || '587'),
            user: config.user,
            password: config.password,
            fromEmail: config.fromEmail,
            secure: config.secure || false,
            enabled: true,
            source: 'database' as const
        };
    }

    // Fallback to environment variables
    if (process.env.RESEND_API_KEY) {
        return {
            provider: 'resend' as const,
            apiKey: process.env.RESEND_API_KEY,
            fromEmail: process.env.EMAIL_FROM || 'noreply@opsguard.com',
            enabled: true,
            source: 'environment' as const
        };
    }

    if (process.env.SENDGRID_API_KEY) {
        return {
            provider: 'sendgrid' as const,
            apiKey: process.env.SENDGRID_API_KEY,
            fromEmail: process.env.EMAIL_FROM || 'noreply@opsguard.com',
            enabled: true,
            source: 'environment' as const
        };
    }

    if (process.env.SMTP_HOST) {
        return {
            provider: 'smtp' as const,
            host: process.env.SMTP_HOST,
            port: parseInt(process.env.SMTP_PORT || '587'),
            user: process.env.SMTP_USER,
            password: process.env.SMTP_PASSWORD,
            fromEmail: process.env.EMAIL_FROM || 'noreply@opsguard.com',
            enabled: true,
            source: 'environment' as const
        };
    }

    // Default: disabled
    return {
        provider: 'none' as const,
        enabled: false,
        source: 'none' as const
    };
}

/**
 * Get SMS configuration
 * Checks database first (Twilio, AWS SNS), then falls back to environment variables
 */
export async function getSMSConfig() {
    // Try Twilio from database
    const twilioConfig = await prisma.notificationProvider.findUnique({
        where: { provider: 'twilio' }
    });
    if (twilioConfig && twilioConfig.enabled && twilioConfig.config) {
        const config = twilioConfig.config as any;
        return {
            provider: 'twilio' as const,
            accountSid: config.accountSid,
            authToken: config.authToken,
            fromNumber: config.fromNumber,
            enabled: true,
            source: 'database' as const
        };
    }

    // Try AWS SNS from database
    const snsConfig = await prisma.notificationProvider.findUnique({
        where: { provider: 'aws-sns' }
    });
    if (snsConfig && snsConfig.enabled && snsConfig.config) {
        const config = snsConfig.config as any;
        return {
            provider: 'aws-sns' as const,
            region: config.region || 'us-east-1',
            accessKeyId: config.accessKeyId,
            secretAccessKey: config.secretAccessKey,
            enabled: true,
            source: 'database' as const
        };
    }

    // Fallback to environment variables
    if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
        return {
            provider: 'twilio' as const,
            accountSid: process.env.TWILIO_ACCOUNT_SID,
            authToken: process.env.TWILIO_AUTH_TOKEN,
            fromNumber: process.env.TWILIO_FROM_NUMBER,
            enabled: true,
            source: 'environment' as const
        };
    }

    if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
        return {
            provider: 'aws-sns' as const,
            region: process.env.AWS_REGION || 'us-east-1',
            accessKeyId: process.env.AWS_ACCESS_KEY_ID,
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
            enabled: true,
            source: 'environment' as const
        };
    }

    return {
        provider: 'none' as const,
        enabled: false,
        source: 'none' as const
    };
}

/**
 * Get Push notification configuration
 * Checks database first (Firebase, OneSignal), then falls back to environment variables
 */
export async function getPushConfig() {
    // Try Firebase from database
    const firebaseConfig = await prisma.notificationProvider.findUnique({
        where: { provider: 'firebase' }
    });
    if (firebaseConfig && firebaseConfig.enabled && firebaseConfig.config) {
        const config = firebaseConfig.config as any;
        return {
            provider: 'firebase' as const,
            projectId: config.projectId,
            privateKey: config.privateKey,
            clientEmail: config.clientEmail,
            enabled: true,
            source: 'database' as const
        };
    }

    // Try OneSignal from database
    const onesignalConfig = await prisma.notificationProvider.findUnique({
        where: { provider: 'onesignal' }
    });
    if (onesignalConfig && onesignalConfig.enabled && onesignalConfig.config) {
        const config = onesignalConfig.config as any;
        return {
            provider: 'onesignal' as const,
            appId: config.appId,
            apiKey: config.apiKey,
            enabled: true,
            source: 'database' as const
        };
    }

    // Fallback to environment variables
    if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_PRIVATE_KEY) {
        return {
            provider: 'firebase' as const,
            projectId: process.env.FIREBASE_PROJECT_ID,
            privateKey: process.env.FIREBASE_PRIVATE_KEY,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            enabled: true,
            source: 'environment' as const
        };
    }

    if (process.env.ONESIGNAL_APP_ID && process.env.ONESIGNAL_API_KEY) {
        return {
            provider: 'onesignal' as const,
            appId: process.env.ONESIGNAL_APP_ID,
            apiKey: process.env.ONESIGNAL_API_KEY,
            enabled: true,
            source: 'environment' as const
        };
    }

    return {
        provider: 'none' as const,
        enabled: false,
        source: 'none' as const
    };
}

/**
 * Check if a notification channel is available (provider configured)
 */
export async function isChannelAvailable(channel: 'EMAIL' | 'SMS' | 'PUSH' | 'SLACK'): Promise<boolean> {
    switch (channel) {
        case 'EMAIL':
            return (await getEmailConfig()).enabled;
        case 'SMS':
            return (await getTwilioConfig()).enabled;
        case 'PUSH':
            return (await getPushConfig()).enabled;
        case 'SLACK':
            // Slack is configured per-service, not system-wide
            return true;
        default:
            return false;
    }
}

