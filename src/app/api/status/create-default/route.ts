import prisma from '@/lib/prisma';
import { jsonError, jsonOk } from '@/lib/api-response';
import { logger } from '@/lib/logger';

/**
 * Create default status page if it doesn't exist
 * POST /api/status/create-default
 */
export async function POST() {
    try {
        // Check if status page exists
        const existing = await prisma.statusPage.findFirst({
            where: { enabled: true },
        });

        if (existing) {
            return jsonOk({ 
                success: true, 
                message: 'Status page already exists',
                id: existing.id 
            }, 200);
        }

        // Create default status page
        const statusPage = await prisma.statusPage.create({
            data: {
                name: 'Status Page',
                enabled: true,
                showServices: true,
                showIncidents: true,
                showMetrics: true,
            },
        });

        return jsonOk({ 
            success: true, 
            message: 'Default status page created',
            id: statusPage.id 
        }, 200);
    } catch (error: any) {
        logger.error('api.status.create_default_error', { error: error instanceof Error ? error.message : String(error) });
        
        // If table doesn't exist, provide helpful error
        if (error.message?.includes('does not exist') || error.code === '42P01') {
            return NextResponse.json(
                { 
                    error: 'Database tables not found. Please run: npx prisma db push',
                    code: 'MIGRATION_NEEDED'
                },
                { status: 500 }
            );
        }

        return jsonError(error.message || 'Failed to create status page', 500);
    }
}






