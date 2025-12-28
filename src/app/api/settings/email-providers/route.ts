import { NextRequest } from 'next/server';
import { getCurrentUser } from '@/lib/rbac';
import { jsonError, jsonOk } from '@/lib/api-response';
import prisma from '@/lib/prisma';

/**
 * GET /api/settings/email-providers
 * Get available email providers (for status page subscription config)
 */
export async function GET(req: NextRequest) {
    try {
        const user = await getCurrentUser();
        if (!user || user.role !== 'ADMIN') {
            return jsonError('Unauthorized. Admin access required.', 403);
        }

        // Fetch all email providers from database
        const [resendProvider, sendgridProvider, smtpProvider] = await Promise.all([
            prisma.notificationProvider.findUnique({ where: { provider: 'resend' } }),
            prisma.notificationProvider.findUnique({ where: { provider: 'sendgrid' } }),
            prisma.notificationProvider.findUnique({ where: { provider: 'smtp' } }),
        ]);

        const providers = [];

        if (resendProvider && resendProvider.enabled) {
            const config = resendProvider.config as any;
            if (config?.apiKey) {
                providers.push({
                    provider: 'resend',
                    enabled: true,
                });
            }
        }

        if (sendgridProvider && sendgridProvider.enabled) {
            const config = sendgridProvider.config as any;
            if (config?.apiKey) {
                providers.push({
                    provider: 'sendgrid',
                    enabled: true,
                });
            }
        }

        if (smtpProvider && smtpProvider.enabled) {
            const config = smtpProvider.config as any;
            if (config?.host && config?.user && config?.password) {
                providers.push({
                    provider: 'smtp',
                    enabled: true,
                });
            }
        }

        return jsonOk({ providers });
    } catch (error: any) {
        return jsonError(error.message || 'Failed to fetch email providers', 500);
    }
}
