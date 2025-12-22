import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { assertResponderOrAbove } from '@/lib/rbac';
import prisma from '@/lib/prisma';

/**
 * Update Custom Field Value for Incident
 * POST /api/incidents/[id]/custom-fields
 */
export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        await assertResponderOrAbove();

        const { id: incidentId } = await params;
        const body = await req.json();
        const { customFieldId, value } = body;

        // Verify incident exists
        const incident = await prisma.incident.findUnique({
            where: { id: incidentId },
        });

        if (!incident) {
            return NextResponse.json({ error: 'Incident not found' }, { status: 404 });
        }

        // Verify custom field exists
        const customField = await prisma.customField.findUnique({
            where: { id: customFieldId },
        });

        if (!customField) {
            return NextResponse.json({ error: 'Custom field not found' }, { status: 404 });
        }

        // Validate required fields
        if (customField.required && (!value || value.trim() === '')) {
            return NextResponse.json(
                { error: `${customField.name} is required` },
                { status: 400 }
            );
        }

        // Upsert custom field value
        await prisma.customFieldValue.upsert({
            where: {
                incidentId_customFieldId: {
                    incidentId,
                    customFieldId,
                },
            },
            update: {
                value: value || null,
            },
            create: {
                incidentId,
                customFieldId,
                value: value || null,
            },
        });

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('Update custom field error:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to update custom field' },
            { status: 500 }
        );
    }
}

