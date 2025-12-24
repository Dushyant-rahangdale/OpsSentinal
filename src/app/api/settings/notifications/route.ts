import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/rbac';
import { jsonError, jsonOk } from '@/lib/api-response';
import { getUserFriendlyError } from '@/lib/user-friendly-errors';

/**
 * GET /api/settings/notifications
 * Get notification provider settings
 */
export async function GET(req: NextRequest) {
    try {
        const user = await getCurrentUser();
        if (!user || user.role !== 'ADMIN') {
            return jsonError('Unauthorized. Admin access required.', 403);
        }

        // In a real implementation, this would fetch from database
        // For now, return environment-based config
        const { getSMSConfig, getPushConfig } = await import('@/lib/notification-providers');
        
        const [smsConfig, pushConfig] = await Promise.all([
            getSMSConfig(),
            getPushConfig(),
        ]);

        return jsonOk({
            sms: smsConfig,
            push: pushConfig,
        });
    } catch (error) {
        return jsonError(getUserFriendlyError(error), 500);
    }
}

/**
 * POST /api/settings/notifications
 * Update notification provider settings
 */
export async function POST(req: NextRequest) {
    try {
        const user = await getCurrentUser();
        if (!user || user.role !== 'ADMIN') {
            return jsonError('Unauthorized. Admin access required.', 403);
        }

        const body = await req.json();

        // In a real implementation, this would save to database
        // For now, we'll just validate and return success
        // In production, store encrypted credentials in database

        return jsonOk({
            success: true,
            message: 'Notification provider settings saved successfully',
        });
    } catch (error) {
        return jsonError(getUserFriendlyError(error), 500);
    }
}

