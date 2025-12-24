import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET() {
    try {
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
        console.error('[API] Error fetching service health:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to fetch services' },
            { status: 500 }
        );
    }
}
