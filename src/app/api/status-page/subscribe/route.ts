import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { jsonError, jsonOk } from '@/lib/api-response';
import { logger } from '@/lib/logger';
import { randomBytes } from 'crypto';
import { sendEmail } from '@/lib/email';
import { getVerificationEmailTemplate } from '@/lib/status-page-email-templates';
import { getBaseUrl } from '@/lib/env-validation';

/**
 * Subscribe to Status Page Updates
 * POST /api/status-page/subscribe
 */
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { statusPageId, email } = body;

        if (!statusPageId || !email || !email.includes('@')) {
            return jsonError('Valid statusPageId and email are required', 400);
        }

        // Verify status page exists and is enabled
        const statusPage = await prisma.statusPage.findFirst({
            where: { id: statusPageId, enabled: true },
        });

        if (!statusPage) {
            return jsonError('Status page not found or disabled', 404);
        }

        // Generate tokens
        const token = randomBytes(32).toString('hex');
        const verificationToken = randomBytes(32).toString('hex');

        // Check if subscription already exists
        const existing = await prisma.statusPageSubscription.findUnique({
            where: {
                statusPageId_email: {
                    statusPageId,
                    email: email.trim().toLowerCase(),
                },
            },
        });

        if (existing) {
            if (existing.unsubscribedAt) {
                // Resubscribe
                await prisma.statusPageSubscription.update({
                    where: { id: existing.id },
                    data: {
                        unsubscribedAt: null,
                        token,
                        verificationToken,
                        verified: false,
                    },
                });
            } else {
                // Already subscribed - return success but don't send another email
                return jsonOk({ success: true, message: 'Already subscribed' }, 200);
            }
        } else {
            // Create new subscription
            await prisma.statusPageSubscription.create({
                data: {
                    statusPageId,
                    email: email.trim().toLowerCase(),
                    token,
                    verificationToken,
                    verified: false,
                },
            });
        }

        // Send verification email using status page's preferred email provider
        try {
            const { getStatusPageEmailConfig } = await import('@/lib/notification-providers');
            const emailConfig = await getStatusPageEmailConfig(statusPageId);

            if (!emailConfig.enabled || !emailConfig.provider) {
                logger.warn('api.status_page.subscription.no_email_provider', { statusPageId });
                // Continue - subscription created but no email sent
            } else {
                const baseUrl = getBaseUrl();
                const verificationUrl = `${baseUrl}/status/verify/${verificationToken}`;

                const emailTemplate = getVerificationEmailTemplate({
                    statusPageName: statusPage.name,
                    organizationName: statusPage.organizationName || undefined,
                    statusPageUrl: `${baseUrl}/status`,
                    verificationUrl,
                });

                await sendEmail({
                    to: email.trim().toLowerCase(),
                    subject: emailTemplate.subject,
                    html: emailTemplate.html,
                    text: emailTemplate.text,
                }, emailConfig); // Pass the config

                logger.info('api.status_page.subscription.verification_email_sent', {
                    statusPageId,
                    email,
                    provider: emailConfig.provider
                });
            }
        } catch (emailError: any) {
            // Log error but don't fail the subscription - email can be resent later
            logger.error('api.status_page.subscription.verification_email_failed', {
                statusPageId,
                email,
                error: emailError instanceof Error ? emailError.message : String(emailError),
            });
        }

        logger.info('api.status_page.subscription.created', { statusPageId, email });

        return jsonOk({ success: true, message: 'Subscription created. Please check your email to verify.' }, 200);
    } catch (error: any) {
        logger.error('api.status_page.subscription.error', { error: error instanceof Error ? error.message : String(error) });
        return jsonError(error.message || 'Failed to create subscription', 500);
    }
}
