'use server';

import prisma from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

export async function bulkAcknowledge(incidentIds: string[]) {
    if (!incidentIds || incidentIds.length === 0) {
        return { success: false, error: 'No incidents selected' };
    }

    try {
        // Update all selected incidents to ACKNOWLEDGED
        await prisma.incident.updateMany({
            where: {
                id: { in: incidentIds },
                status: { not: 'RESOLVED' } // Only update non-resolved incidents
            },
            data: { status: 'ACKNOWLEDGED' }
        });

        // Log events for each incident
        for (const incidentId of incidentIds) {
            await prisma.incidentEvent.create({
                data: {
                    incidentId,
                    message: 'Bulk acknowledged from dashboard'
                }
            });
        }

        revalidatePath('/');
        return { success: true, count: incidentIds.length };
    } catch (error) {
        console.error('Bulk acknowledge failed:', error);
        return { success: false, error: 'Failed to acknowledge incidents' };
    }
}

export async function bulkResolve(incidentIds: string[]) {
    if (!incidentIds || incidentIds.length === 0) {
        return { success: false, error: 'No incidents selected' };
    }

    try {
        // Update all selected incidents to RESOLVED
        await prisma.incident.updateMany({
            where: {
                id: { in: incidentIds },
                status: { not: 'RESOLVED' }
            },
            data: { status: 'RESOLVED' }
        });

        // Log events for each incident
        for (const incidentId of incidentIds) {
            await prisma.incidentEvent.create({
                data: {
                    incidentId,
                    message: 'Bulk resolved from dashboard'
                }
            });
        }

        revalidatePath('/');
        return { success: true, count: incidentIds.length };
    } catch (error) {
        console.error('Bulk resolve failed:', error);
        return { success: false, error: 'Failed to resolve incidents' };
    }
}
