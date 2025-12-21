'use server';

import prisma from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { randomBytes } from 'crypto';
import { getDefaultActorId, logAudit } from '@/lib/audit';
import { assertAdminOrResponder, assertAdmin } from '@/lib/rbac';

export async function createIntegration(formData: FormData) {
    try {
        await assertAdminOrResponder();
    } catch (error) {
        throw new Error(error instanceof Error ? error.message : 'Unauthorized');
    }
    const serviceId = formData.get('serviceId') as string;
    const name = formData.get('name') as string;

    if (!serviceId || !name) {
        throw new Error('Missing required fields');
    }

    // Generate a random 32-char hex key
    const key = randomBytes(16).toString('hex');

    await prisma.integration.create({
        data: {
            name,
            serviceId,
            type: 'EVENTS_API_V2',
            key,
        }
    });

    revalidatePath(`/services/${serviceId}/integrations`);
}

export async function updateService(serviceId: string, formData: FormData) {
    try {
        await assertAdminOrResponder();
    } catch (error) {
        throw new Error(error instanceof Error ? error.message : 'Unauthorized');
    }
    const name = formData.get('name') as string;
    const description = formData.get('description') as string;
    const slackWebhookUrl = formData.get('slackWebhookUrl') as string;
    const teamId = formData.get('teamId') as string;
    const escalationPolicyId = formData.get('escalationPolicyId') as string;

    await prisma.service.update({
        where: { id: serviceId },
        data: {
            name,
            description,
            slackWebhookUrl: slackWebhookUrl || null, // Set to null if empty to clear it
            teamId: teamId || null,
            escalationPolicyId: escalationPolicyId || null
        }
    });

    await logAudit({
        action: 'service.updated',
        entityType: 'SERVICE',
        entityId: serviceId,
        actorId: await getDefaultActorId(),
        details: { name, teamId: teamId || null, escalationPolicyId: escalationPolicyId || null }
    });

    revalidatePath(`/services/${serviceId}`);
    revalidatePath('/services');
    revalidatePath('/audit');
}

export async function deleteService(serviceId: string) {
    try {
        await assertAdmin();
    } catch (error) {
        throw new Error(error instanceof Error ? error.message : 'Unauthorized. Admin access required.');
    }
    if (!serviceId) return;

    // Delete related data first to avoid constraints (or rely on cascade delete)
    // Prisma cascade delete is configured in schema typically, but being safe:
    await prisma.service.delete({
        where: { id: serviceId }
    });

    revalidatePath('/services');
}
