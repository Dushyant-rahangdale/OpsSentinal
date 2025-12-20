'use server';

import prisma from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
export async function createSchedule(formData: FormData) {
    const name = formData.get('name') as string;
    const timeZone = formData.get('timeZone') as string || 'UTC';

    await prisma.onCallSchedule.create({
        data: { name, timeZone }
    });

    revalidatePath('/schedules');
}

export async function createLayer(scheduleId: string, formData: FormData) {
    const name = formData.get('name') as string;
    const start = formData.get('start') as string;
    const end = formData.get('end') as string;
    const rotationLength = Number(formData.get('rotationLengthHours'));

    if (!name || !start || Number.isNaN(rotationLength) || rotationLength <= 0) {
        return;
    }

    const startDate = new Date(start);
    const endDate = end ? new Date(end) : null;

    if (Number.isNaN(startDate.getTime())) {
        return;
    }
    if (endDate && Number.isNaN(endDate.getTime())) {
        return;
    }
    if (endDate && endDate <= startDate) {
        return;
    }

    await prisma.onCallLayer.create({
        data: {
            scheduleId,
            name,
            start: startDate,
            end: endDate && !Number.isNaN(endDate.getTime()) ? endDate : null,
            rotationLengthHours: rotationLength
        }
    });

    revalidatePath(`/schedules/${scheduleId}`);
    revalidatePath('/schedules');
}

export async function deleteLayer(scheduleId: string, layerId: string) {
    await prisma.$transaction([
        prisma.onCallLayerUser.deleteMany({
            where: { layerId }
        }),
        prisma.onCallLayer.delete({
            where: { id: layerId }
        })
    ]);

    revalidatePath(`/schedules/${scheduleId}`);
    revalidatePath('/schedules');
}

export async function addLayerUser(layerId: string, formData: FormData) {
    const userId = formData.get('userId') as string;

    if (!userId) {
        return;
    }

    const existing = await prisma.onCallLayerUser.findUnique({
        where: {
            layerId_userId: { layerId, userId }
        }
    });

    const maxPosition = await prisma.onCallLayerUser.aggregate({
        where: { layerId },
        _max: { position: true }
    });
    const nextPosition = (maxPosition._max.position ?? 0) + 1;
    const finalPosition = nextPosition;

    if (existing) {
        await prisma.onCallLayerUser.update({
            where: { id: existing.id },
            data: { position: finalPosition }
        });
    } else {
        await prisma.onCallLayerUser.create({
            data: {
                layerId,
                userId,
                position: finalPosition
            }
        });
    }

    const ordered = await prisma.onCallLayerUser.findMany({
        where: { layerId },
        orderBy: { position: 'asc' }
    });

    await prisma.$transaction(
        ordered.map((entry, index) =>
            prisma.onCallLayerUser.update({
                where: { id: entry.id },
                data: { position: index + 1 }
            })
        )
    );

    const layer = await prisma.onCallLayer.findUnique({
        where: { id: layerId },
        select: { scheduleId: true }
    });

    if (layer) {
        revalidatePath(`/schedules/${layer.scheduleId}`);
        revalidatePath('/schedules');
    }
}

export async function updateLayer(layerId: string, formData: FormData) {
    const name = formData.get('name') as string;
    const start = formData.get('start') as string;
    const end = formData.get('end') as string;
    const rotationLength = Number(formData.get('rotationLengthHours'));

    if (!name || !start || Number.isNaN(rotationLength) || rotationLength <= 0) {
        return;
    }

    const startDate = new Date(start);
    const endDate = end ? new Date(end) : null;

    if (Number.isNaN(startDate.getTime())) {
        return;
    }
    if (endDate && Number.isNaN(endDate.getTime())) {
        return;
    }
    if (endDate && endDate <= startDate) {
        return;
    }

    await prisma.onCallLayer.update({
        where: { id: layerId },
        data: {
            name,
            start: startDate,
            end: endDate && !Number.isNaN(endDate.getTime()) ? endDate : null,
            rotationLengthHours: rotationLength
        }
    });

    const layer = await prisma.onCallLayer.findUnique({
        where: { id: layerId },
        select: { scheduleId: true }
    });

    if (layer) {
        revalidatePath(`/schedules/${layer.scheduleId}`);
        revalidatePath('/schedules');
    }
}
export async function moveLayerUser(layerId: string, userId: string, direction: 'up' | 'down') {
    const users = await prisma.onCallLayerUser.findMany({
        where: { layerId },
        orderBy: { position: 'asc' }
    });
    const index = users.findIndex((u) => u.userId === userId);
    const targetIndex = direction === 'up' ? index - 1 : index + 1;

    if (index === -1 || targetIndex < 0 || targetIndex >= users.length) {
        return;
    }

    const current = users[index];
    const target = users[targetIndex];

    await prisma.$transaction([
        prisma.onCallLayerUser.update({
            where: { id: current.id },
            data: { position: target.position }
        }),
        prisma.onCallLayerUser.update({
            where: { id: target.id },
            data: { position: current.position }
        })
    ]);

    const layer = await prisma.onCallLayer.findUnique({
        where: { id: layerId },
        select: { scheduleId: true }
    });

    if (layer) {
        revalidatePath(`/schedules/${layer.scheduleId}`);
        revalidatePath('/schedules');
    }
}

export async function removeLayerUser(layerId: string, userId: string) {
    await prisma.onCallLayerUser.delete({
        where: { layerId_userId: { layerId, userId } }
    });

    const layer = await prisma.onCallLayer.findUnique({
        where: { id: layerId },
        select: { scheduleId: true }
    });

    if (layer) {
        revalidatePath(`/schedules/${layer.scheduleId}`);
    }
}

export async function createOverride(scheduleId: string, formData: FormData) {
    const userId = formData.get('userId') as string;
    const replacesUserId = (formData.get('replacesUserId') as string) || null;
    const start = formData.get('start') as string;
    const end = formData.get('end') as string;

    if (!userId || !start || !end) {
        return;
    }

    const startDate = new Date(start);
    const endDate = new Date(end);

    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
        return;
    }

    if (endDate <= startDate) {
        return;
    }

    await prisma.onCallOverride.create({
        data: {
            scheduleId,
            userId,
            replacesUserId: replacesUserId || null,
            start: startDate,
            end: endDate
        }
    });

    revalidatePath(`/schedules/${scheduleId}`);
}

export async function deleteOverride(scheduleId: string, overrideId: string) {
    await prisma.onCallOverride.delete({
        where: { id: overrideId }
    });

    revalidatePath(`/schedules/${scheduleId}`);
}
