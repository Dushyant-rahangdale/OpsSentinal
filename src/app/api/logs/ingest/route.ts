import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { level, message, context } = body;

        // Ensure we don't log undefined
        if (!message) {
            return NextResponse.json({ error: 'Message is required' }, { status: 400 });
        }

        const logContext = {
            ...context,
            source: 'client',
            userAgent: req.headers.get('user-agent'),
        };

        switch (level) {
            case 'error':
                logger.error(message, logContext);
                break;
            case 'warn':
                logger.warn(message, logContext);
                break;
            case 'debug':
                logger.debug(message, logContext);
                break;
            case 'info':
            default:
                logger.info(message, logContext);
                break;
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        // Internal server error logging fallback
        console.error('Failed to ingest client log:', error);
        return NextResponse.json({ error: 'Failed to ingest log' }, { status: 500 });
    }
}
