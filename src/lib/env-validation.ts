/**
 * Environment Variable Validation
 * 
 * Ensures critical environment variables are set, especially in production.
 * Provides clear error messages when configuration is missing.
 */

import { logger } from './logger';

/**
 * Get the base application URL with proper validation
 * Throws an error in production if not configured
 */
export function getBaseUrl(): string {
    const url = process.env.NEXT_PUBLIC_APP_URL;

    if (!url) {
        if (process.env.NODE_ENV === 'production') {
            throw new Error(
                'NEXT_PUBLIC_APP_URL environment variable is required in production. ' +
                'This is used for notification links, webhooks, and RSS feeds. ' +
                'Please set it to your application URL (e.g., https://opssure.yourdomain.com)'
            );
        }

        // Development fallback
        logger.warn('NEXT_PUBLIC_APP_URL not set, using localhost fallback (development only)');
        return 'http://localhost:3000';
    }

    // Remove trailing slash for consistency
    return url.replace(/\/$/, '');
}

/**
 * Validate required environment variables for production
 * Call this early in application startup
 */
export function validateProductionEnv(): void {
    if (process.env.NODE_ENV !== 'production') {
        return; // Skip validation in development
    }

    const required: Array<{ name: string; description: string }> = [
        {
            name: 'DATABASE_URL',
            description: 'PostgreSQL connection string'
        },
        {
            name: 'NEXTAUTH_SECRET',
            description: 'Secret for NextAuth.js session encryption (generate with: openssl rand -base64 32)'
        },
        {
            name: 'NEXTAUTH_URL',
            description: 'Full URL of your application (e.g., https://opssure.yourdomain.com)'
        },
        {
            name: 'NEXT_PUBLIC_APP_URL',
            description: 'Public URL used in notifications, webhooks, and RSS feeds'
        }
    ];

    const missing = required.filter(({ name }) => !process.env[name]);

    if (missing.length > 0) {
        const errorMessage = [
            '❌ PRODUCTION CONFIGURATION ERROR',
            '',
            'Missing required environment variables:',
            '',
            ...missing.map(({ name, description }) => `  • ${name}\n    ${description}`),
            '',
            'Please set these in your .env file or deployment configuration.',
            'See env.example for reference.',
            ''
        ].join('\n');

        throw new Error(errorMessage);
    }

    // Validate NEXT_PUBLIC_APP_URL format
    const appUrl = process.env.NEXT_PUBLIC_APP_URL;
    if (appUrl && !appUrl.startsWith('http')) {
        throw new Error(
            `NEXT_PUBLIC_APP_URL must start with http:// or https:// (got: ${appUrl})`
        );
    }

    // Warn about localhost in production
    if (appUrl && appUrl.includes('localhost')) {
        logger.warn('⚠️  NEXT_PUBLIC_APP_URL points to localhost in production. This may cause issues with notifications and webhooks.');
    }

    logger.info('✅ Production environment variables validated');
}

/**
 * Get notification from email with fallback
 */
export function getFromEmail(): string {
    const fromEmail = process.env.EMAIL_FROM;

    if (fromEmail) {
        return fromEmail;
    }

    // Generate from domain
    const appUrl = process.env.NEXT_PUBLIC_APP_URL;
    if (appUrl) {
        const domain = appUrl.replace(/^https?:\/\//, '').split('/')[0];
        return `noreply@${domain}`;
    }

    if (process.env.NODE_ENV === 'production') {
        logger.warn('EMAIL_FROM not set and cannot derive from NEXT_PUBLIC_APP_URL. Using default.');
    }

    return 'noreply@opssure.local';
}

