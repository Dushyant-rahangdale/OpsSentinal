import { NextRequest, NextResponse } from 'next/server';
import { alertRulesService } from '@/services/alert-rules/AlertRulesService';
import { getServerSession } from 'next-auth';
import { getAuthOptions } from '@/lib/auth';
import { logger } from '@/lib/logger';

/**
 * API endpoint to trigger alert rule evaluation
 * Can be called by a cron job or manually by admins
 */
export async function POST(request: NextRequest) {
    const session = await getServerSession(await getAuthOptions());
    if (!session?.user || (session.user as any).role !== 'ADMIN') {
        return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    try {
        const result = await alertRulesService.runEvaluation();
        return NextResponse.json({
            success: true,
            ...result
        });
    } catch (error) {
        logger.error('Alert evaluation failed', { error });
        return NextResponse.json({ error: 'Evaluation failed' }, { status: 500 });
    }
}

/**
 * GET: Retrieve current alert rules
 */
export async function GET() {
    const session = await getServerSession(await getAuthOptions());
    if (!session?.user || (session.user as any).role !== 'ADMIN') {
        return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    try {
        const rules = await alertRulesService.getActiveRules();
        return NextResponse.json(rules);
    } catch (error) {
        logger.error('Failed to get alert rules', { error });
        return NextResponse.json({ error: 'Failed to get rules' }, { status: 500 });
    }
}
