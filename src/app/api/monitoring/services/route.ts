import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { assertAdmin } from '@/lib/rbac';

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
        console.error('[API] Error fetching service health:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to fetch services' },
            { status: 500 }
        );
    }
}
