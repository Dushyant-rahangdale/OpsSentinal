import { NextRequest, NextResponse } from 'next/server';
import { processPendingEscalations } from '@/lib/escalation';

/**
 * Cron endpoint for processing pending escalations
 * 
 * This should be called periodically (e.g., every 1-5 minutes) to process
 * escalations that are scheduled for execution.
 * 
 * Setup options:
 * 1. Vercel Cron: Add to vercel.json
 * 2. External cron service: Call this endpoint
 * 3. Self-hosted: Use node-cron or similar
 * 
 * Example Vercel Cron config (vercel.json):
 * {
 *   "crons": [{
 *     "path": "/api/cron/process-escalations",
 *     "schedule": "*/2 * * * *"
 *   }]
 * }
 */
export async function GET(req: NextRequest) {
  try {
    // Optional: Add authentication/authorization
    // const authHeader = req.headers.get('authorization');
    // if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    // }

    const result = await processPendingEscalations();

    return NextResponse.json({
      success: true,
      processed: result.processed,
      total: result.total,
      errors: result.errors,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error processing escalations:', error);
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
