'use server';

import prisma from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { getCurrentUser, assertResponderOrAbove } from '@/lib/rbac';

export type PostmortemData = {
    title: string;
    summary?: string;
    timeline?: any[];
    impact?: any;
    rootCause?: string;
    resolution?: string;
    actionItems?: any[];
    lessons?: string;
    status?: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
    isPublic?: boolean;
};

/**
 * Create or update a postmortem for an incident
 */
export async function upsertPostmortem(
    incidentId: string,
    data: PostmortemData
) {
    try {
        await assertResponderOrAbove();
    } catch (error) {
        throw new Error(error instanceof Error ? error.message : 'Unauthorized');
    }

    const user = await getCurrentUser();
    if (!user) {
        throw new Error('User not found');
    }

    // Check if incident exists and is resolved
    const incident = await prisma.incident.findUnique({
        where: { id: incidentId },
    });

    if (!incident) {
        throw new Error('Incident not found');
    }

    if (incident.status !== 'RESOLVED') {
        throw new Error('Postmortems can only be created for resolved incidents');
    }

    const postmortem = await prisma.postmortem.upsert({
        where: { incidentId },
        update: {
            ...data,
            updatedAt: new Date(),
            ...(data.status === 'PUBLISHED' && { publishedAt: new Date() }),
        },
        create: {
            incidentId,
            createdById: user.id,
            ...data,
            ...(data.status === 'PUBLISHED' && { publishedAt: new Date() }),
        },
    });

    revalidatePath(`/incidents/${incidentId}`);
    revalidatePath('/postmortems');
    return { success: true, postmortem };
}

/**
 * Get postmortem for an incident
 */
export async function getPostmortem(incidentId: string) {
    const postmortem = await prisma.postmortem.findUnique({
        where: { incidentId },
        include: {
            createdBy: {
                select: { id: true, name: true, email: true },
            },
            incident: {
                select: {
                    id: true,
                    title: true,
                    status: true,
                    resolvedAt: true,
                },
            },
        },
    });

    return postmortem;
}

/**
 * Get all postmortems
 */
export async function getAllPostmortems(
    status?: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED',
    limit: number = 50
) {
    const where = status ? { status } : {};

    const postmortems = await prisma.postmortem.findMany({
        where,
        include: {
            createdBy: {
                select: { id: true, name: true, email: true },
            },
            incident: {
                select: {
                    id: true,
                    title: true,
                    status: true,
                    service: {
                        select: { id: true, name: true },
                    },
                    resolvedAt: true,
                },
            },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
    });

    return postmortems;
}

/**
 * Delete a postmortem
 */
export async function deletePostmortem(incidentId: string) {
    try {
        await assertResponderOrAbove();
    } catch (error) {
        throw new Error(error instanceof Error ? error.message : 'Unauthorized');
    }

    await prisma.postmortem.delete({
        where: { incidentId },
    });

    revalidatePath(`/incidents/${incidentId}`);
    revalidatePath('/postmortems');
    return { success: true };
}







