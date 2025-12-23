import { NextRequest, NextResponse } from 'next/server';
import { processPendingEscalations } from '@/lib/escalation';
import { processPendingJobs, getJobStats } from '@/lib/jobs/queue';
import { jsonError, jsonOk } from '@/lib/api-response';
import { logger } from '@/lib/logger';

/**
 * Cron endpoint for processing pending escalations and background jobs
 * 
 * This endpoint processes:
 * 1. Escalations based on nextEscalationAt field in Incident table
 * 2. Background jobs from BackgroundJob table (PostgreSQL-based queue)
 * 
 * This should be called periodically (e.g., every 1-5 minutes).
 * 
 * Setup options:
 * 1. Vercel Cron: Already configured in vercel.json (every 5 minutes)
 * 2. External cron service: Call this endpoint
 * 3. Self-hosted: Use node-cron or similar
 * 
 * Example Vercel Cron config (vercel.json):
 * {
 *   "crons": [{
 *     "path": "/api/cron/process-escalations",
 *     "schedule": "every 2 minutes"
 *   }]
 * }
 */
export async function GET(req: NextRequest) {
  try {
    const cronSecret = process.env.CRON_SECRET;
    if (!cronSecret) {
      return jsonError('CRON_SECRET is not configured', 500);
    }

    const authHeader = req.headers.get('authorization');
    if (authHeader !== `Bearer ${cronSecret}`) {
      return jsonError('Unauthorized', 401);
    }

    // Process escalations (legacy method - based on nextEscalationAt)
    const escalationResult = await processPendingEscalations();

    // Process background jobs (PostgreSQL-based queue)
    const jobResult = await processPendingJobs(50);

    // Get job statistics
    const jobStats = await getJobStats();

    return jsonOk({
      success: true,
      escalations: {
        processed: escalationResult.processed,
        total: escalationResult.total,
        errors: escalationResult.errors,
      },
      jobs: {
        processed: jobResult.processed,
        failed: jobResult.failed,
        total: jobResult.total,
      },
      stats: jobStats,
      timestamp: new Date().toISOString(),
    }, 200);
  } catch (error) {
    logger.error('api.cron.escalations_error', { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

// Also support POST for flexibility
export async function POST(req: NextRequest) {
  return GET(req);
}
