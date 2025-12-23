import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { assertAdmin } from '@/lib/rbac';
import prisma from '@/lib/prisma';
import { jsonError, jsonOk } from '@/lib/api-response';
import { CustomFieldCreateSchema } from '@/lib/validation';
import { logger } from '@/lib/logger';
import type { Prisma } from '@prisma/client';

/**
 * Create Custom Field
 * POST /api/settings/custom-fields
 */
export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return jsonError('Unauthorized', 401);
        }

        try {
            await assertAdmin();
        } catch (error) {
            return jsonError(error instanceof Error ? error.message : 'Unauthorized', 403);
        }

        let body: any;
        try {
            body = await req.json();
        } catch (error) {
            return jsonError('Invalid JSON in request body.', 400);
        }
        const parsed = CustomFieldCreateSchema.safeParse(body);
        if (!parsed.success) {
            return jsonError('Invalid request body.', 400, { issues: parsed.error.issues });
        }
        const { name, key, type, required, defaultValue, options, showInList } = parsed.data;

        // Check if key already exists
        const existing = await prisma.customField.findUnique({
            where: { key },
        });

        if (existing) {
            return jsonError('A custom field with this key already exists', 400);
        }

        // Get max order
        const maxOrder = await prisma.customField.aggregate({
            _max: { order: true },
        });

        const fieldData: Prisma.CustomFieldCreateInput = {
            name,
            key,
            type,
            required: required || false,
            defaultValue: defaultValue || null,
            showInList: showInList || false,
            order: (maxOrder._max.order || 0) + 1,
        };

        if (options !== undefined && options !== null) {
            fieldData.options = options as Prisma.InputJsonValue;
        }

        const customField = await prisma.customField.create({
            data: fieldData
        });

        logger.info('api.custom_fields.created', { customFieldId: customField.id });
        return jsonOk({ success: true, field: customField }, 200);
    } catch (error: any) {
        logger.error('api.custom_fields.create_error', { error: error instanceof Error ? error.message : String(error) });
        return jsonError(error.message || 'Failed to create custom field', 500);
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
            return jsonError('Unauthorized', 401);
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

        return jsonOk({ fields: customFields }, 200);
    } catch (error: any) {
        logger.error('api.custom_fields.fetch_error', { error: error instanceof Error ? error.message : String(error) });
        return jsonError(error.message || 'Failed to fetch custom fields', 500);
    }
}






