import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { getAuthOptions } from '@/lib/auth';
import { assertResponderOrAbove } from '@/lib/rbac';
import prisma from '@/lib/prisma';
import { jsonError, jsonOk } from '@/lib/api-response';
import { IncidentCustomFieldSchema } from '@/lib/validation';
import { logger } from '@/lib/logger';

/**
 * Update Custom Field Value for Incident
 * POST /api/incidents/[id]/custom-fields
 */
export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(await getAuthOptions());
        if (!session) {
            return jsonError('Unauthorized', 401);
        }

        await assertResponderOrAbove();

        const { id: incidentId } = await params;
        let body: any;
        try {
            body = await req.json();
        } catch (error) {
            return jsonError('Invalid JSON in request body.', 400);
        }
        const parsed = IncidentCustomFieldSchema.safeParse(body);
        if (!parsed.success) {
            return jsonError('Invalid request body.', 400, { issues: parsed.error.issues });
        }
        const { customFieldId, value } = parsed.data;
        const normalizedValue = value === null || value === undefined ? null : String(value);
        const trimmedValue = normalizedValue === null ? null : normalizedValue.trim();

        // Verify incident exists
        const incident = await prisma.incident.findUnique({
            where: { id: incidentId },
        });

        if (!incident) {
            return jsonError('Incident not found', 404);
        }

        // Verify custom field exists
        const customField = await prisma.customField.findUnique({
            where: { id: customFieldId },
        });

        if (!customField) {
            return jsonError('Custom field not found', 404);
        }

        // Validate required fields
        if (customField.required && (!trimmedValue || trimmedValue === '')) {
            return jsonError(`${customField.name} is required`, 400);
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
                value: trimmedValue || null,
            },
            create: {
                incidentId,
                customFieldId,
                value: trimmedValue || null,
            },
        });

        logger.info('api.incident.custom_field.updated', { incidentId, customFieldId });
        return jsonOk({ success: true }, 200);
    } catch (error: any) {
        logger.error('api.incident.custom_field.update_error', { error: error instanceof Error ? error.message : String(error) });
        return jsonError(error.message || 'Failed to update custom field', 500);
    }
}







