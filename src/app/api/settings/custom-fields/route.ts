import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { assertAdmin } from '@/lib/rbac';
import prisma from '@/lib/prisma';

/**
 * Create Custom Field
 * POST /api/settings/custom-fields
 */
export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        await assertAdmin();

        const body = await req.json();
        const { name, key, type, required, defaultValue, options, showInList } = body;

        // Validate key format
        if (!/^[a-zA-Z0-9_]+$/.test(key)) {
            return NextResponse.json(
                { error: 'Key must contain only letters, numbers, and underscores' },
                { status: 400 }
            );
        }

        // Check if key already exists
        const existing = await prisma.customField.findUnique({
            where: { key },
        });

        if (existing) {
            return NextResponse.json(
                { error: 'A custom field with this key already exists' },
                { status: 400 }
            );
        }

        // Get max order
        const maxOrder = await prisma.customField.aggregate({
            _max: { order: true },
        });

        const customField = await prisma.customField.create({
            data: {
                name,
                key,
                type,
                required: required || false,
                defaultValue: defaultValue || null,
                options: options ? options : null,
                showInList: showInList || false,
                order: (maxOrder._max.order || 0) + 1,
            },
        });

        return NextResponse.json({ success: true, field: customField });
    } catch (error: any) {
        console.error('Create custom field error:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to create custom field' },
            { status: 500 }
        );
    }
}

/**
 * Get All Custom Fields
 * GET /api/settings/custom-fields
 */
export async function GET() {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const customFields = await prisma.customField.findMany({
            orderBy: { order: 'asc' },
            include: {
                _count: {
                    select: {
                        values: true,
                    },
                },
            },
        });

        return NextResponse.json({ fields: customFields });
    } catch (error: any) {
        console.error('Get custom fields error:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to fetch custom fields' },
            { status: 500 }
        );
    }
}

