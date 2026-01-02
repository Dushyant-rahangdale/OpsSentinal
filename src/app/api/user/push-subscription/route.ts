import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { getAuthOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { logger } from '@/lib/logger';

export async function POST(req: NextRequest) {
    const authOptions = await getAuthOptions();
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.id) {
        return new NextResponse('Unauthorized', { status: 401 });
    }

    try {
        const subscription = await req.json();
        if (!subscription || !subscription.endpoint) {
            return new NextResponse('Invalid subscription', { status: 400 });
        }

        // Store subscription
        // We use endpoint as deviceId (it's unique per browser)
        const deviceId = subscription.endpoint;
        const token = JSON.stringify(subscription);

        await prisma.userDevice.upsert({
            where: {
                userId_deviceId: {
                    userId: session.user.id,
                    deviceId: deviceId,
                },
            },
            update: {
                token: token,
                lastUsed: new Date(),
                userAgent: req.headers.get('user-agent') || undefined,
            },
            create: {
                userId: session.user.id,
                deviceId: deviceId,
                token: token,
                platform: 'web',
                userAgent: req.headers.get('user-agent') || undefined,
            },
        });

        // Also enable push notifications for user if not already
        await prisma.user.update({
            where: { id: session.user.id },
            data: { pushNotificationsEnabled: true },
        });

        return new NextResponse(JSON.stringify({ success: true }), {
            headers: { 'Content-Type': 'application/json' },
        });

    } catch (error) {
        logger.error('Failed to save subscription', { error });
        return new NextResponse('Internal Server Error', { status: 500 });
    }
}
