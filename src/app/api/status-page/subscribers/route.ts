import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { jsonError, jsonOk } from '@/lib/api-response';
import { logger } from '@/lib/logger';
import { getServerSession } from 'next-auth';
import { getAuthOptions } from '@/lib/auth';
import { assertAdmin } from '@/lib/rbac';

/**
 * Get Status Page Subscribers
 * GET /api/status-page/subscribers?page=1&limit=10&verified=true
 */
export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(await getAuthOptions());
        if (!session) {
            return jsonError('Unauthorized', 401);
        }

        // Require admin role
        try {
            await assertAdmin();
        } catch {
            return jsonError('Admin access required', 403);
        }

        const searchParams = req.nextUrl.searchParams;
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '10');
        const statusPageId = searchParams.get('statusPageId');
        const verifiedFilter = searchParams.get('verified'); // 'true', 'false', or null (all)
        const searchEmail = searchParams.get('email'); // Search by email

        const skip = (page - 1) * limit;

        // Build where clause
        const where: any = {};

        if (statusPageId) {
            where.statusPageId = statusPageId;
        }

        if (verifiedFilter === 'true') {
            where.verified = true;
        } else if (verifiedFilter === 'false') {
            where.verified = false;
        }

        if (searchEmail) {
            where.email = {
                contains: searchEmail,
                mode: 'insensitive',
            };
        }

        // Get total count
        const total = await prisma.statusPageSubscription.count({ where });

        // Get paginated subscribers
        const subscribers = await prisma.statusPageSubscription.findMany({
            where,
            include: {
                statusPage: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
            },
            orderBy: {
                subscribedAt: 'desc',
            },
            skip,
            take: limit,
        });

        const totalPages = Math.ceil(total / limit);

        logger.info('api.status_page.subscribers.fetched', {
            page,
            limit,
            total,
            verified: verifiedFilter,
        });

        return jsonOk({
            subscribers,
            total,
            page,
            limit,
            totalPages,
        }, 200);
    } catch (error: any) {
        logger.error('api.status_page.subscribers.error', {
            error: error instanceof Error ? error.message : String(error),
        });
        return jsonError(error.message || 'Failed to fetch subscribers', 500);
    }
}

/**
 * Delete/Unsubscribe a subscriber
 * DELETE /api/status-page/subscribers?id=xxx
 */
export async function DELETE(req: NextRequest) {
    try {
        const session = await getServerSession(await getAuthOptions());
        if (!session) {
            return jsonError('Unauthorized', 401);
        }

        // Require admin role
        try {
            await assertAdmin();
        } catch {
            return jsonError('Admin access required', 403);
        }

        const searchParams = req.nextUrl.searchParams;
        const subscriptionId = searchParams.get('id');

        if (!subscriptionId) {
            return jsonError('Subscription ID is required', 400);
        }

        // Check if subscription exists
        const subscription = await prisma.statusPageSubscription.findUnique({
            where: { id: subscriptionId },
        });

        if (!subscription) {
            return jsonError('Subscription not found', 404);
        }

        // Mark as unsubscribed instead of deleting
        await prisma.statusPageSubscription.update({
            where: { id: subscriptionId },
            data: {
                unsubscribedAt: new Date(),
            },
        });

        logger.info('api.status_page.subscriber.unsubscribed', {
            subscriptionId,
            email: subscription.email,
        });

        return jsonOk({ success: true, message: 'Subscriber unsubscribed successfully' }, 200);
    } catch (error: any) {
        logger.error('api.status_page.subscriber.delete.error', {
            error: error instanceof Error ? error.message : String(error),
        });
        return jsonError(error.message || 'Failed to unsubscribe', 500);
    }
}
