import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit } from '@/lib/rate-limit';

/**
 * SLA Streaming API - Server-Sent Events Endpoint
 *
 * Streams SLA metrics data in batches for large datasets.
 * Prevents memory exhaustion by processing incidents in chunks.
 *
 * GET /api/sla/stream?serviceId=xxx&windowDays=30
 *
 * Rate Limit: 30 requests per 15 minutes per user
 */

export const dynamic = 'force-dynamic';

const BATCH_SIZE = 100;
const RATE_LIMIT_MAX = 30;
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes

export async function GET(req: NextRequest) {
  const { default: prisma } = await import('@/lib/prisma');
  const { getServerSession } = await import('next-auth');
  const { getAuthOptions } = await import('@/lib/auth');

  // Authenticate
  const authOptions = await getAuthOptions();
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Rate limiting
  const rateLimitKey = `sla-stream:${session.user.email}`;
  const rateLimit = checkRateLimit(rateLimitKey, RATE_LIMIT_MAX, RATE_LIMIT_WINDOW_MS);
  if (!rateLimit.allowed) {
    const retryAfter = Math.ceil((rateLimit.resetAt - Date.now()) / 1000);
    return NextResponse.json(
      { error: 'Rate limit exceeded', retryAfter },
      {
        status: 429,
        headers: {
          'X-RateLimit-Limit': RATE_LIMIT_MAX.toString(),
          'X-RateLimit-Remaining': rateLimit.remaining.toString(),
          'X-RateLimit-Reset': new Date(rateLimit.resetAt).toISOString(),
          'Retry-After': retryAfter.toString(),
        },
      }
    );
  }

  // Parse query parameters
  const searchParams = req.nextUrl.searchParams;
  const serviceId = searchParams.get('serviceId');
  const windowDays = parseInt(searchParams.get('windowDays') || '7', 10);

  // Calculate date range
  const now = new Date();
  const startDate = new Date(now);
  startDate.setDate(now.getDate() - windowDays);

  // Build where clause
  const where = {
    createdAt: { gte: startDate, lte: now },
    ...(serviceId ? { serviceId } : {}),
  };

  // Create SSE stream
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      try {
        // Send initial metadata
        const totalCount = await prisma.incident.count({ where });
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({ type: 'meta', totalCount, batchSize: BATCH_SIZE })}\n\n`
          )
        );

        // Stream incidents in batches
        let skip = 0;
        let batchNumber = 0;

        while (true) {
          const batch = await prisma.incident.findMany({
            where,
            select: {
              id: true,
              title: true,
              status: true,
              urgency: true,
              createdAt: true,
              acknowledgedAt: true,
              resolvedAt: true,
              serviceId: true,
              service: {
                select: {
                  name: true,
                  targetAckMinutes: true,
                  targetResolveMinutes: true,
                },
              },
            },
            take: BATCH_SIZE,
            skip,
            orderBy: { createdAt: 'desc' },
          });

          if (batch.length === 0) break;

          // Send batch
          const data = JSON.stringify({
            type: 'batch',
            batchNumber,
            incidents: batch,
            remaining: Math.max(0, totalCount - skip - batch.length),
          });
          controller.enqueue(encoder.encode(`data: ${data}\n\n`));

          skip += BATCH_SIZE;
          batchNumber++;

          // Small delay to prevent overwhelming the client
          await new Promise(resolve => setTimeout(resolve, 10));
        }

        // Send completion message
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({ type: 'complete', totalBatches: batchNumber })}\n\n`
          )
        );
        controller.close();
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ type: 'error', message: errorMessage })}\n\n`)
        );
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no', // Disable nginx buffering
    },
  });
}
