import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

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
            return NextResponse.json({ 
                success: true, 
                message: 'Status page already exists',
                id: existing.id 
            });
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

        return NextResponse.json({ 
            success: true, 
            message: 'Default status page created',
            id: statusPage.id 
        });
    } catch (error: any) {
        console.error('Create status page error:', error);
        
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

        return NextResponse.json(
            { error: error.message || 'Failed to create status page' },
            { status: 500 }
        );
    }
}





