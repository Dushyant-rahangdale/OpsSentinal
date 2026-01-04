import { getServerSession } from 'next-auth';
import { getAuthOptions } from '@/lib/auth';
import { logger } from '@/lib/logger';
import { getWidgetData } from '@/lib/widget-data-provider';
import prisma from '@/lib/prisma';

/**
 * Server-Sent Events (SSE) Stream for Real-time Widget Updates
 * Pushes updates every 10 seconds or on demand
 */
export async function GET(request: Request) {
  try {
    const session = await getServerSession(await getAuthOptions());
    if (!session?.user?.email) {
      return new Response('Unauthorized', { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: {
        id: true,
        role: true,
      },
    });

    if (!user) {
      return new Response('User not found', { status: 404 });
    }

    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        // Send initial data immediately
        try {
          const initialData = await getWidgetData(user.id, user.role);
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(initialData)}\n\n`));
        } catch (error) {
          logger.error('sse.widgets.initial_error', {
            error: error instanceof Error ? error.message : String(error),
          });
        }

        // Set up interval for periodic updates
        const intervalId = setInterval(async () => {
          try {
            const data = await getWidgetData(user.id, user.role);
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
          } catch (error) {
            logger.error('sse.widgets.update_error', {
              error: error instanceof Error ? error.message : String(error),
            });
          }
        }, 10000); // Update every 10 seconds

        // Cleanup on disconnect
        request.signal.addEventListener('abort', () => {
          clearInterval(intervalId);
          controller.close();
          logger.info('sse.widgets.stream_closed', { userId: user.id });
        });
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        Connection: 'keep-alive',
        'X-Accel-Buffering': 'no', // Disable nginx buffering
      },
    });
  } catch (error) {
    logger.error('api.widgets.stream.error', {
      error: error instanceof Error ? error.message : String(error),
    });
    return new Response('Internal Server Error', { status: 500 });
  }
}
