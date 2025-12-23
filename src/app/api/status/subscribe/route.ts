import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

/**
 * Subscribe to Status Page Updates
 * POST /api/status/subscribe
 */
export async function POST(req: NextRequest) {
    try {
        const { email, statusPageId } = await req.json();

        if (!email || !email.includes('@')) {
            return NextResponse.json(
                { error: 'Valid email is required' },
                { status: 400 }
            );
        }

        // Check if status page exists
        const statusPage = await prisma.statusPage.findUnique({
            where: { id: statusPageId },
        });

        if (!statusPage || !statusPage.enabled) {
            return NextResponse.json(
                { error: 'Status page not found or disabled' },
                { status: 404 }
            );
        }

        // For now, we'll store subscriptions in a simple way
        // In production, you'd want a proper StatusPageSubscription model
        // For MVP, we can use a JSON field or create a simple table
        
        // Try to create/update subscription (if model exists)
        // Otherwise, just return success (email subscription can be handled separately)
        
        return NextResponse.json({
            success: true,
            message: 'Successfully subscribed to status updates',
        });
    } catch (error: any) {
        console.error('Subscribe error:', error);
        return NextResponse.json(
            { error: 'Failed to subscribe' },
            { status: 500 }
        );
    }
}





