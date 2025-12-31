import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { assertAdmin } from '@/lib/rbac';
import { logger } from '@/lib/logger';

export async function GET() {
    try {
        await assertAdmin();

        const services = await prisma.service.findMany({
            select: {
                id: true,
                name: true,
                status: true,
                updatedAt: true,
                _count: {
                    select: {
                        incidents: {
                            where: {
                                status: {
                                    in: ['OPEN', 'ACKNOWLEDGED']
                                }
                            }
                        }
                    }
                }
            },
            orderBy: {
                name: 'asc'
            }
        });

        return NextResponse.json({
            success: true,
            data: services
        });
    } catch (error) {
        if (error instanceof Error && error.message.includes('Unauthorized')) {
            return NextResponse.json(
                { success: false, error: error.message },
                { status: 403 }
            );
        }
        logger.error('[API] Error fetching service health', { component: 'api-monitoring-services', error });
        return NextResponse.json(
            { success: false, error: 'Failed to fetch services' },
            { status: 500 }
        );
    }
}
