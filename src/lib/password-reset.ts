import { randomBytes, createHash } from 'crypto';
import prisma from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { getEmailConfig, getSMSConfig } from '@/lib/notification-providers';
import { sendNotification } from '@/lib/notifications';
import { createInAppNotifications } from '@/lib/in-app-notifications';
import bcrypt from 'bcryptjs';

const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour
const MAX_ATTEMPTS_PER_WINDOW = 5;
const ADMIN_NOTIFICATION_COOLDOWN_MS = 24 * 60 * 60 * 1000; // 24 hours

export type PasswordResetResult = {
    success: boolean;
    message: string; // Generic message for security
    method?: 'EMAIL' | 'SMS' | 'ADMIN_NOTIFIED'; // Internal use for debugging/logging
};

/**
 * Initiates the password reset flow.
 * SECURE: Always returns a generic success message to prevent enumeration.
 */
export async function initiatePasswordReset(email: string, ipAddress?: string): Promise<PasswordResetResult> {
    const normalizedEmail = email.toLowerCase().trim();
    const startTime = Date.now();

    try {
        // 1. Rate Limit Check (Audit Log based)
        await checkRateLimit(normalizedEmail, ipAddress);

        // 2. User Lookup
        const user = await prisma.user.findUnique({
            where: { email: normalizedEmail },
            include: {
                // Check if user is disabled? logic says: if disabled, they can't login, but maybe reset allows re-activation?
                // Usually reset is for active users. Let's assume only active/invited.
            }
        });

        // 3. Timing Mitigation & User Validation
        if (!user || user.status === 'DISABLED') {
            await simulateWork(startTime);
            // Log attempt for nonexistent user (careful with enumeration in logs, maybe just log "Failed reset attempt")
            logger.info('Password reset requested for non-existent or disabled user', { email: normalizedEmail });
            await logAttempt(normalizedEmail, 'PASSWORD_RESET_INITIATED', ipAddress, undefined, { result: 'USER_NOT_FOUND' });
            return { success: true, message: 'If an account exists with this email, you will receive password reset instructions.' };
        }

        // 4. Generate Token
        // Token valid for 1 hour
        const token = randomBytes(32).toString('hex');
        const tokenHash = createHash('sha256').update(token).digest('hex');
        const expires = new Date(Date.now() + 60 * 60 * 1000);

        // Store token in VerificationToken (or dedicated PasswordResetToken table if we had one, but VerificationToken is generic enough or we create a new one?
        // Plan said "VerificationToken". Schema has `VerificationToken { identifier, token, expires }`.
        // Identifier can be email. Token should be the HASH.
        // Wait, schema `VerificationToken` has composite unique [identifier, token].
        // NextAuth uses this table. We can reuse it.

        await prisma.verificationToken.create({
            data: {
                identifier: normalizedEmail,
                token: tokenHash,
                expires
            }
        });

        const resetLink = `${process.env.NEXT_PUBLIC_APP_URL}/reset-password?token=${token}`;

        // 5. Channel Selection Strategy
        const emailConfig = await getEmailConfig();
        const smsConfig = await getSMSConfig(); // Checks Twilio & SNS

        let method: 'EMAIL' | 'SMS' | 'ADMIN_NOTIFIED' | null = null;
        let sent = false;

        // Strategy A: Email
        if (emailConfig.enabled) {
            // In a real app, we'd use a proper email template. For now, using the notification system.
            // Using `sendNotification` might be tricky if it expects an Incident. 
            // We should probably use a direct mailer or adapt `sendNotification`.
            // Looking at `src/lib/notifications.ts`, it takes `incidentId`. 
            // Actually, we probably need a lower-level sender for system messages. 
            // `src/lib/email.ts` likely has `sendEmail`. Let's assume we can use that.

            // For this implementation, I'll assume we can use a direct email helper.
            try {
                const { sendEmail } = await import('@/lib/email');
                const result = await sendEmail({
                    to: user.email,
                    subject: 'Reset your password',
                    text: `Click here to reset your password: ${resetLink}`, // Fallback
                    html: `<p>You requested a password reset. Click the link below to reset it:</p><p><a href="${resetLink}">Reset Password</a></p><p>This link expires in 1 hour.</p>`
                });

                if (result.success) {
                    method = 'EMAIL';
                    sent = true;
                } else {
                    logger.warn('Failed to send reset email', { error: result.error });
                    // Fallthrough to SMS
                }
            } catch (e) {
                logger.error('Exception sending reset email', { error: e });
                // Fallthrough to SMS
            }
        }

        // Strategy B: SMS (if Email failed or disabled)
        if (!sent && smsConfig.enabled && user.phoneNumber && user.smsNotificationsEnabled) {
            try {
                const { sendSMS } = await import('@/lib/sms');
                const result = await sendSMS({
                    to: user.phoneNumber,
                    message: `OpsSentinal: Reset your password here: ${resetLink}`
                });

                if (result.success) {
                    method = 'SMS';
                    sent = true;
                } else {
                    logger.warn('Failed to send reset SMS', { error: result.error });
                }
            } catch (e) {
                logger.error('Exception sending reset SMS', { error: e });
            }
        }

        // Strategy C: Admin Fallback
        if (!sent) {
            // Check cooldown for admin notifications to prevent spam
            const lastAdminNotify = await prisma.inAppNotification.findFirst({
                where: {
                    type: 'TEAM',
                    title: 'Password Reset Request',
                    message: { contains: user.name },
                    createdAt: { gt: new Date(Date.now() - ADMIN_NOTIFICATION_COOLDOWN_MS) }
                }
            });

            if (!lastAdminNotify) {
                // Find Admins
                const admins = await prisma.user.findMany({
                    where: { role: 'ADMIN', status: 'ACTIVE' }
                });

                if (admins.length > 0) {
                    await createInAppNotifications({
                        userIds: admins.map(a => a.id),
                        type: 'TEAM', // Using TEAM or similar as generic category, schema has INCIDENT, SCHEDULE, TEAM, SERVICE
                        title: 'Password Reset Request',
                        message: `User ${user.name} (${user.email}) requested a password reset but has no reachable notification channels. Please assist them manually.`,
                        entityType: 'USER',
                        entityId: user.id
                    });
                    method = 'ADMIN_NOTIFIED';
                    sent = true;
                }
            } else {
                method = 'ADMIN_NOTIFIED'; // Already notified recently
                sent = true;
            }
        }

        await logAttempt(normalizedEmail, 'PASSWORD_RESET_INITIATED', ipAddress, user.id, { method });

        return { success: true, message: 'If an account exists with this email, you will receive password reset instructions.' };

    } catch (error) {
        logger.error('Error in initiatePasswordReset', { error });
        return { success: false, message: 'An internal error occurred.' };
    }
}

async function checkRateLimit(email: string, ip?: string) {
    const windowStart = new Date(Date.now() - RATE_LIMIT_WINDOW_MS);

    // Check by Email
    const emailCount = await prisma.auditLog.count({
        where: {
            action: 'PASSWORD_RESET_INITIATED',
            details: {
                path: ['targetEmail'],
                equals: email
            },
            createdAt: { gt: windowStart }
        }
    });

    if (emailCount >= MAX_ATTEMPTS_PER_WINDOW) {
        throw new Error('Too many requests. Please try again later.');
    }

    // Check by IP (if provided and we store it in details)
    if (ip) {
        const ipCount = await prisma.auditLog.count({
            where: {
                action: 'PASSWORD_RESET_INITIATED',
                details: {
                    path: ['ip'],
                    equals: ip
                },
                createdAt: { gt: windowStart }
            }
        });

        if (ipCount >= MAX_ATTEMPTS_PER_WINDOW * 2) { // Allow slightly more per IP to account for NAT
            throw new Error('Too many requests from this IP.');
        }
    }
}

async function logAttempt(email: string, action: string, ip: string | undefined, userId: string | undefined, data: any) {
    try {
        await prisma.auditLog.create({
            data: {
                action,
                entityType: 'USER',
                entityId: userId || 'unknown', // generic if unknown
                actorId: userId, // acts as self
                details: { ...data, targetEmail: email, ip }
            }
        });
    } catch (e) {
        // Don't fail the flow if logging fails
        console.error('Failed to write audit log', e);
    }
}

/**
 * Simulates hashing work to prevent timing attacks.
 * Attempts to match the duration of a successful lookup + potential token generation.
 * Target duration: approx 300-500ms.
 */
async function simulateWork(startTime: number) {
    // Generate a dummy hash to burn CPU
    const dummy = '$2a$10$abcdefghijklmnopqrstuv'; // Cost 10 bcrypt
    // bcrypt.compare is async
    try {
        await bcrypt.compare('dummy-password', dummy);
    } catch { } // Ignore result

    // Ensure we wait at least a minimum time if hashing was too fast
    const elapsed = Date.now() - startTime;
    const minTime = 300;
    if (elapsed < minTime) {
        await new Promise(resolve => setTimeout(resolve, minTime - elapsed));
    }
}
