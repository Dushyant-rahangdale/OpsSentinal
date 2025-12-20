'use server';

import prisma from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { getDefaultActorId, logAudit } from '@/lib/audit';

type TeamFormState = {
    error?: string | null;
    success?: boolean;
};

async function ensureTeamHasOwner(teamId: string, excludeMemberId?: string) {
    const ownerCount = await prisma.teamMember.count({
        where: {
            teamId,
            role: 'OWNER',
            ...(excludeMemberId ? { NOT: { id: excludeMemberId } } : {})
        }
    });

    if (ownerCount === 0) {
        throw new Error('Each team must have at least one owner.');
    }
}

export async function createTeam(_prevState: TeamFormState, formData: FormData): Promise<TeamFormState> {
    const name = (formData.get('name') as string | null)?.trim() ?? '';
    const description = (formData.get('description') as string | null)?.trim() ?? '';

    if (!name) {
        return { error: 'Team name is required.' };
    }

    const existing = await prisma.team.findFirst({
        where: {
            name: {
                equals: name,
                mode: 'insensitive'
            }
        }
    });

    if (existing) {
        return { error: 'A team with that name already exists.' };
    }

    const team = await prisma.team.create({
        data: {
            name,
            description: description || null
        }
    });

    await logAudit({
        action: 'team.created',
        entityType: 'TEAM',
        entityId: team.id,
        actorId: await getDefaultActorId(),
        details: { name }
    });

    revalidatePath('/teams');
    revalidatePath('/services');
    revalidatePath('/audit');

    return { success: true };
}

export async function updateTeam(teamId: string, formData: FormData) {
    const name = formData.get('name') as string;
    const description = formData.get('description') as string;

    await prisma.team.update({
        where: { id: teamId },
        data: {
            name,
            description: description || null
        }
    });

    await logAudit({
        action: 'team.updated',
        entityType: 'TEAM',
        entityId: teamId,
        actorId: await getDefaultActorId(),
        details: { name }
    });

    revalidatePath('/teams');
    revalidatePath('/services');
    revalidatePath('/audit');
}

export async function deleteTeam(teamId: string) {
    await prisma.teamMember.deleteMany({
        where: { teamId }
    });

    await prisma.service.updateMany({
        where: { teamId },
        data: { teamId: null }
    });

    await prisma.team.delete({
        where: { id: teamId }
    });

    await logAudit({
        action: 'team.deleted',
        entityType: 'TEAM',
        entityId: teamId,
        actorId: await getDefaultActorId()
    });

    revalidatePath('/teams');
    revalidatePath('/services');
    revalidatePath('/audit');
}

export async function addTeamMember(teamId: string, formData: FormData) {
    const userId = formData.get('userId') as string;
    const role = (formData.get('role') as string) || 'MEMBER';

    if (!userId) return;

    await prisma.teamMember.create({
        data: {
            teamId,
            userId,
            role: role as any
        }
    });

    await logAudit({
        action: 'team.member.added',
        entityType: 'TEAM_MEMBER',
        entityId: `${teamId}:${userId}`,
        actorId: await getDefaultActorId(),
        details: { teamId, userId, role }
    });

    revalidatePath('/teams');
    revalidatePath('/users');
    revalidatePath('/audit');
}

export async function updateTeamMemberRole(memberId: string, formData: FormData) {
    const role = (formData.get('role') as string) || 'MEMBER';

    const member = await prisma.teamMember.findUnique({
        where: { id: memberId }
    });

    if (!member) return;

    if (member.role === 'OWNER' && role !== 'OWNER') {
        await ensureTeamHasOwner(member.teamId, member.id);
    }

    await prisma.teamMember.update({
        where: { id: memberId },
        data: { role: role as any }
    });

    await logAudit({
        action: 'team.member.role.updated',
        entityType: 'TEAM_MEMBER',
        entityId: memberId,
        actorId: await getDefaultActorId(),
        details: { teamId: member.teamId, userId: member.userId, role }
    });

    revalidatePath('/teams');
    revalidatePath('/users');
    revalidatePath('/audit');
}

export async function removeTeamMember(memberId: string) {
    const member = await prisma.teamMember.findUnique({
        where: { id: memberId }
    });

    if (!member) return;

    if (member.role === 'OWNER') {
        await ensureTeamHasOwner(member.teamId, member.id);
    }

    await prisma.teamMember.delete({
        where: { id: memberId }
    });

    await logAudit({
        action: 'team.member.removed',
        entityType: 'TEAM_MEMBER',
        entityId: memberId,
        actorId: await getDefaultActorId(),
        details: { teamId: member.teamId, userId: member.userId }
    });

    revalidatePath('/teams');
    revalidatePath('/users');
    revalidatePath('/audit');
}
