import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { getAuthOptions } from '@/lib/auth';
import { assertAdmin } from '@/lib/rbac';
import prisma from '@/lib/prisma';
import { jsonError, jsonOk } from '@/lib/api-response';
import { logger } from '@/lib/logger';

/**
 * Delete Custom Field
 * DELETE /api/settings/custom-fields/[id]
 */
export async function DELETE(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(await getAuthOptions());
        if (!session) {
            return jsonError('Unauthorized', 401);
        }

        try {
            await assertAdmin();
        } catch (error) {
            return jsonError(error instanceof Error ? error.message : 'Unauthorized', 403);
        }

        const { id } = await params;

        // Delete all values first (cascade should handle this, but being explicit)
        await prisma.customFieldValue.deleteMany({
            where: { customFieldId: id },
        });

        // Delete the field
        await prisma.customField.delete({
            where: { id },
        });

        logger.info('api.custom_fields.deleted', { customFieldId: id });
        return jsonOk({ success: true }, 200);
    } catch (error: any) {
        logger.error('api.custom_fields.delete_error', { error: error instanceof Error ? error.message : String(error) });
        return jsonError(error.message || 'Failed to delete custom field', 500);
    }
}







