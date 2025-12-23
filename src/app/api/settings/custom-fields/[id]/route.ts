import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { assertAdmin } from '@/lib/rbac';
import prisma from '@/lib/prisma';

/**
 * Delete Custom Field
 * DELETE /api/settings/custom-fields/[id]
 */
export async function DELETE(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        await assertAdmin();

        const { id } = await params;

        // Delete all values first (cascade should handle this, but being explicit)
        await prisma.customFieldValue.deleteMany({
            where: { customFieldId: id },
        });

        // Delete the field
        await prisma.customField.delete({
            where: { id },
        });

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('Delete custom field error:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to delete custom field' },
            { status: 500 }
        );
    }
}





