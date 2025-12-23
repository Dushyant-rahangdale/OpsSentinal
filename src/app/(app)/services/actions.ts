'use server';

import prisma from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
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
    const type = formData.get('type') as string || 'EVENTS_API_V2';

    if (!serviceId || !name) {
        throw new Error('Missing required fields');
    }

    // Generate a random 32-char hex key
    const key = randomBytes(16).toString('hex');

    await prisma.integration.create({
        data: {
            name,
            serviceId,
            type,
            key,
        }
    });

    await logAudit({
        action: 'integration.created',
        entityType: 'SERVICE',
        entityId: serviceId,
        actorId: await getDefaultActorId(),
        details: { name, type }
    });

    revalidatePath(`/services/${serviceId}/integrations`);
}

export async function deleteIntegration(integrationId: string, serviceId: string, formData?: FormData) {
    try {
        await assertAdminOrResponder();
    } catch (error) {
        throw new Error(error instanceof Error ? error.message : 'Unauthorized');
    }

    await prisma.integration.delete({
        where: { id: integrationId }
    });

    await logAudit({
        action: 'integration.deleted',
        entityType: 'SERVICE',
        entityId: serviceId,
        actorId: await getDefaultActorId(),
        details: { integrationId }
    });

    revalidatePath(`/services/${serviceId}/integrations`);
    revalidatePath(`/services/${serviceId}`);
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
            // Note: Notification channels are now user preferences, not service-level
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

    // Cascade delete is configured in schema, so deleting the service will automatically
    // delete related incidents, alerts, integrations, etc.
    // No need to manually delete them

    // Now delete the service
    await prisma.service.delete({
        where: { id: serviceId }
    });

    await logAudit({
        action: 'service.deleted',
        entityType: 'SERVICE',
        entityId: serviceId,
        actorId: await getDefaultActorId(),
        details: { serviceId }
    });

    revalidatePath('/services');
    revalidatePath('/incidents');
    revalidatePath('/audit');
    
    redirect('/services');
}
