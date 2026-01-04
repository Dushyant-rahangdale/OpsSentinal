import { getServerSession } from 'next-auth';
import { getAuthOptions } from '@/lib/auth';
import { jsonError, jsonOk } from '@/lib/api-response';
import { logger } from '@/lib/logger';
import { getWidgetData } from '@/lib/widget-data-provider';
import prisma from '@/lib/prisma';

/**
 * Unified Widget Data API
 * Single endpoint to fetch all dashboard widget data
 */
export async function GET() {
  try {
    const session = await getServerSession(await getAuthOptions());
    if (!session?.user?.email) {
      return jsonError('Unauthorized', 401);
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: {
        id: true,
        role: true,
      },
    });

    if (!user) {
      return jsonError('User not found', 404);
    }

    const widgetData = await getWidgetData(user.id, user.role);

    return jsonOk(widgetData, 200, {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      Pragma: 'no-cache',
      Expires: '0',
    });
  } catch (error) {
    logger.error('api.widgets.data.error', {
      error: error instanceof Error ? error.message : String(error),
    });
    return jsonError('Failed to fetch widget data', 500);
  }
}
