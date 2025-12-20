import prisma from './prisma';
import { Prisma } from '@prisma/client';

export type AuditDetails = Prisma.InputJsonValue;

export async function getDefaultActorId() {
    const user = await prisma.user.findFirst({ select: { id: true } });
    return user?.id ?? null;
}

export async function logAudit(params: {
    action: string;
    entityType: 'USER' | 'TEAM' | 'TEAM_MEMBER' | 'SERVICE';
    entityId?: string | null;
    actorId?: string | null;
    details?: AuditDetails | null;
}) {
    const { action, entityType, entityId, actorId, details } = params;
    await prisma.auditLog.create({
        data: {
            action,
            entityType,
            entityId: entityId || null,
            actorId: actorId || null,
            details: details ?? Prisma.DbNull
        }
    });
}
