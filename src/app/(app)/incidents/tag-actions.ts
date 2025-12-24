'use server';

import prisma from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { assertResponderOrAbove, getCurrentUser } from '@/lib/rbac';

export async function addTagToIncident(incidentId: string, tagName: string) {
    try {
        await assertResponderOrAbove();
    } catch (error) {
        throw new Error(error instanceof Error ? error.message : 'Unauthorized');
    }

    // Get or create tag
    const tag = await prisma.tag.upsert({
        where: { name: tagName },
        create: { name: tagName },
        update: {}
    });

    // Add tag to incident (ignore if already exists)
    try {
        await prisma.incidentTag.create({
            data: {
                incidentId,
                tagId: tag.id
            }
        });

        const user = await getCurrentUser();
        await prisma.incidentEvent.create({
            data: {
                incidentId,
                message: `Tag "${tagName}" added${user ? ` by ${user.name}` : ''}`
            }
        });
    } catch (error: any) {
        // Ignore unique constraint violations (tag already exists)
        if (!error.code || error.code !== 'P2002') {
            throw error;
        }
    }

    revalidatePath(`/incidents/${incidentId}`);
    revalidatePath('/incidents');
}

export async function removeTagFromIncident(incidentId: string, tagId: string) {
    try {
        await assertResponderOrAbove();
    } catch (error) {
        throw new Error(error instanceof Error ? error.message : 'Unauthorized');
    }

    const tag = await prisma.tag.findUnique({ where: { id: tagId } });
    await prisma.incidentTag.delete({
        where: {
            incidentId_tagId: {
                incidentId,
                tagId
            }
        }
    });

    const user = await getCurrentUser();
    await prisma.incidentEvent.create({
        data: {
            incidentId,
            message: `Tag "${tag?.name || 'Unknown'}" removed${user ? ` by ${user.name}` : ''}`
        }
    });

    revalidatePath(`/incidents/${incidentId}`);
    revalidatePath('/incidents');
}

export async function getAllTags() {
    const tags = await prisma.tag.findMany({
        orderBy: { name: 'asc' },
        include: {
            _count: {
                select: { incidents: true }
            }
        }
    });
    return tags;
}









