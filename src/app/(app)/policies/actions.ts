'use server';

import prisma from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { assertAdmin } from '@/lib/rbac';
import { getDefaultActorId, logAudit } from '@/lib/audit';

export async function createPolicy(formData: FormData) {
    try {
        await assertAdmin();
    } catch (error) {
        throw new Error(error instanceof Error ? error.message : 'Unauthorized. Admin access required.');
    }
    
    const name = formData.get('name') as string;
    const description = formData.get('description') as string;

    // Parse escalation steps from form data
    const steps: Array<{ targetUserId: string; delayMinutes: number; stepOrder: number }> = [];
    let stepIndex = 0;
    
    while (true) {
        const userId = formData.get(`step-${stepIndex}-userId`);
        const delay = formData.get(`step-${stepIndex}-delayMinutes`);
        
        if (!userId) break;
        
        steps.push({
            targetUserId: userId as string,
            delayMinutes: parseInt(delay as string || '0'),
            stepOrder: stepIndex
        });
        
        stepIndex++;
    }

    if (steps.length === 0) {
        throw new Error('At least one escalation step is required');
    }

    const policy = await prisma.escalationPolicy.create({
        data: {
            name,
            description: description || undefined,
            steps: {
                create: steps
            }
        },
        include: {
            steps: {
                include: { targetUser: true },
                orderBy: { stepOrder: 'asc' }
            }
        }
    });

    await logAudit({
        action: 'escalation_policy.created',
        entityType: 'SERVICE',
        entityId: policy.id,
        actorId: await getDefaultActorId(),
        details: { name, stepCount: steps.length }
    });

    revalidatePath('/policies');
    redirect(`/policies/${policy.id}`);
}

export async function updatePolicy(policyId: string, formData: FormData) {
    try {
        await assertAdmin();
    } catch (error) {
        throw new Error(error instanceof Error ? error.message : 'Unauthorized. Admin access required.');
    }

    const name = formData.get('name') as string;
    const description = formData.get('description') as string;

    await prisma.escalationPolicy.update({
        where: { id: policyId },
        data: {
            name,
            description: description || undefined
        }
    });

    await logAudit({
        action: 'escalation_policy.updated',
        entityType: 'SERVICE',
        entityId: policyId,
        actorId: await getDefaultActorId(),
        details: { name }
    });

    revalidatePath('/policies');
    revalidatePath(`/policies/${policyId}`);
}

export async function deletePolicy(policyId: string) {
    try {
        await assertAdmin();
    } catch (error) {
        throw new Error(error instanceof Error ? error.message : 'Unauthorized. Admin access required.');
    }

    // Check if policy is used by any services
    const servicesUsingPolicy = await prisma.service.findMany({
        where: { escalationPolicyId: policyId },
        select: { id: true, name: true }
    });

    if (servicesUsingPolicy.length > 0) {
        const serviceNames = servicesUsingPolicy.map(s => s.name).join(', ');
        throw new Error(`Cannot delete policy: ${servicesUsingPolicy.length} service(s) are using this policy (${serviceNames}). Please reassign or remove the policy from those services first.`);
    }

    await prisma.escalationPolicy.delete({
        where: { id: policyId }
    });

    await logAudit({
        action: 'escalation_policy.deleted',
        entityType: 'SERVICE',
        entityId: policyId,
        actorId: await getDefaultActorId()
    });

    revalidatePath('/policies');
    redirect('/policies');
}

export async function addPolicyStep(policyId: string, formData: FormData) {
    try {
        await assertAdmin();
    } catch (error) {
        throw new Error(error instanceof Error ? error.message : 'Unauthorized. Admin access required.');
    }

    const userId = formData.get('userId') as string;
    const delayMinutes = parseInt(formData.get('delayMinutes') as string || '0');

    // Get current max step order
    const maxStep = await prisma.escalationRule.findFirst({
        where: { policyId },
        orderBy: { stepOrder: 'desc' }
    });

    const nextStepOrder = maxStep ? maxStep.stepOrder + 1 : 0;

    await prisma.escalationRule.create({
        data: {
            policyId,
            targetUserId: userId,
            delayMinutes,
            stepOrder: nextStepOrder
        }
    });

    await logAudit({
        action: 'escalation_policy.step_added',
        entityType: 'SERVICE',
        entityId: policyId,
        actorId: await getDefaultActorId(),
        details: { stepOrder: nextStepOrder }
    });

    revalidatePath(`/policies/${policyId}`);
}

export async function updatePolicyStep(stepId: string, formData: FormData) {
    try {
        await assertAdmin();
    } catch (error) {
        throw new Error(error instanceof Error ? error.message : 'Unauthorized. Admin access required.');
    }

    const userId = formData.get('userId') as string;
    const delayMinutes = parseInt(formData.get('delayMinutes') as string || '0');

    const step = await prisma.escalationRule.findUnique({
        where: { id: stepId },
        include: { policy: true }
    });

    if (!step) {
        throw new Error('Escalation step not found');
    }

    await prisma.escalationRule.update({
        where: { id: stepId },
        data: {
            targetUserId: userId,
            delayMinutes
        }
    });

    await logAudit({
        action: 'escalation_policy.step_updated',
        entityType: 'SERVICE',
        entityId: step.policyId,
        actorId: await getDefaultActorId(),
        details: { stepId, stepOrder: step.stepOrder }
    });

    revalidatePath(`/policies/${step.policyId}`);
}

export async function deletePolicyStep(stepId: string) {
    try {
        await assertAdmin();
    } catch (error) {
        throw new Error(error instanceof Error ? error.message : 'Unauthorized. Admin access required.');
    }

    const step = await prisma.escalationRule.findUnique({
        where: { id: stepId },
        include: { policy: true }
    });

    if (!step) {
        throw new Error('Escalation step not found');
    }

    const policyId = step.policyId;
    const deletedStepOrder = step.stepOrder;

    await prisma.escalationRule.delete({
        where: { id: stepId }
    });

    // Reorder remaining steps
    const remainingSteps = await prisma.escalationRule.findMany({
        where: { policyId },
        orderBy: { stepOrder: 'asc' }
    });

    // Update step orders to be sequential
    for (let i = 0; i < remainingSteps.length; i++) {
        if (remainingSteps[i].stepOrder !== i) {
            await prisma.escalationRule.update({
                where: { id: remainingSteps[i].id },
                data: { stepOrder: i }
            });
        }
    }

    await logAudit({
        action: 'escalation_policy.step_deleted',
        entityType: 'SERVICE',
        entityId: policyId,
        actorId: await getDefaultActorId(),
        details: { deletedStepOrder }
    });

    revalidatePath(`/policies/${policyId}`);
}

export async function movePolicyStep(stepId: string, direction: 'up' | 'down') {
    try {
        await assertAdmin();
    } catch (error) {
        throw new Error(error instanceof Error ? error.message : 'Unauthorized. Admin access required.');
    }

    const step = await prisma.escalationRule.findUnique({
        where: { id: stepId },
        include: { policy: true }
    });

    if (!step) {
        throw new Error('Escalation step not found');
    }

    const policyId = step.policyId;
    const currentOrder = step.stepOrder;
    const newOrder = direction === 'up' ? currentOrder - 1 : currentOrder + 1;

    if (newOrder < 0) {
        throw new Error('Cannot move step up: already at first position');
    }

    // Get all steps
    const allSteps = await prisma.escalationRule.findMany({
        where: { policyId },
        orderBy: { stepOrder: 'asc' }
    });

    if (newOrder >= allSteps.length) {
        throw new Error('Cannot move step down: already at last position');
    }

    // Find the step at the target position
    const targetStep = allSteps.find(s => s.stepOrder === newOrder);
    if (!targetStep) {
        throw new Error('Target step not found');
    }

    // Swap step orders
    await prisma.$transaction([
        prisma.escalationRule.update({
            where: { id: stepId },
            data: { stepOrder: newOrder }
        }),
        prisma.escalationRule.update({
            where: { id: targetStep.id },
            data: { stepOrder: currentOrder }
        })
    ]);

    await logAudit({
        action: 'escalation_policy.step_moved',
        entityType: 'SERVICE',
        entityId: policyId,
        actorId: await getDefaultActorId(),
        details: { stepId, from: currentOrder, to: newOrder }
    });

    revalidatePath(`/policies/${policyId}`);
}
