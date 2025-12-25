import { NextRequest, NextResponse } from 'next/server';
import { retryFailedNotifications } from '@/lib/notification-retry';
import { logger } from '@/lib/logger';

/**
 * Cron endpoint to retry failed notifications
 * Should be called periodically (e.g., every 5 minutes)
 * 
 * To set up in Vercel:
 * - Add to vercel.json cron jobs
 * - Or use external cron service to call this endpoint
 */
export async function GET(req: NextRequest) {
    try {
        // Verify cron secret if needed
        const authHeader = req.headers.get('authorization');
        const cronSecret = process.env.CRON_SECRET;
        
        if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const result = await retryFailedNotifications();

        logger.info('cron.retry_notifications.completed', result);

        return NextResponse.json({
            success: true,
            ...result
        });
    } catch (error: any) {
        logger.error('cron.retry_notifications.error', {
            error: error.message
        });

        return NextResponse.json({
            success: false,
            error: error.message
        }, { status: 500 });
    }
}

