import { jsonError, jsonOk } from '@/lib/api-response';
import { getAuthOptions } from '@/lib/auth';
import { logger } from '@/lib/logger';
import prisma from '@/lib/prisma';
import { sendPush } from '@/lib/push';
import { getServerSession } from 'next-auth';

export async function POST() {
  try {
    const session = await getServerSession(await getAuthOptions());
    if (!session?.user?.email) {
      return jsonError('Unauthorized', 401);
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true, name: true },
    });

    if (!user) {
      return jsonError('User not found', 404);
    }

    const result = await sendPush({
      userId: user.id,
      title: '🔔 OpsSentinal Test Push',
      body: `Hey ${user.name || 'there'}! Your push notifications are working perfectly. ✅`,
      data: {
        url: '/m/notifications',
        type: 'test',
      },
      badge: 1,
    });

    if (!result.success) {
      return jsonError(result.error || 'Failed to send test push', 500);
    }

    return jsonOk(
      { success: true, message: 'Test notification sent successfully! Check your device.' },
      200
    );
  } catch (error) {
    logger.error('api.notifications.test_push_error', {
      error: error instanceof Error ? error.message : String(error),
    });
    return jsonError('Failed to send test push', 500);
  }
}
