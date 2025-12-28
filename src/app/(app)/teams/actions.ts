'use server';

import prisma from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { getDefaultActorId, logAudit } from '@/lib/audit';
import { assertAdminOrResponder, assertAdmin, assertAdminOrTeamOwner } from '@/lib/rbac';

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
    try {
        await assertAdminOrResponder();
    } catch (error) {
        return { error: error instanceof Error ? error.message : 'Unauthorized. Admin or Responder access required.' };
    }
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
    try {
        await assertAdminOrResponder();
    } catch (error) {
        return { error: error instanceof Error ? error.message : 'Unauthorized. Admin or Responder access required.' };
    }
    const name = formData.get('name') as string;
    const description = formData.get('description') as string;
    const teamLeadId = formData.get('teamLeadId') as string;

    // Validate team lead is a team member
    if (teamLeadId) {
        const isMember = await prisma.teamMember.findFirst({
            where: {
                teamId,
                userId: teamLeadId
            }
        });

        if (!isMember) {
            return { error: 'Team lead must be a team member' };
        }
    }

    await prisma.team.update({
        where: { id: teamId },
        data: {
            name,
            description: description || null,
            teamLeadId: teamLeadId || null
        }
    });

    await logAudit({
        action: 'team.updated',
        entityType: 'TEAM',
        entityId: teamId,
        actorId: await getDefaultActorId(),
        details: { name, teamLeadId: teamLeadId || null }
    });

    revalidatePath('/teams');
    revalidatePath('/services');
    revalidatePath('/audit');
}

export async function deleteTeam(teamId: string) {
    try {
        await assertAdmin();
    } catch (error) {
        return { error: error instanceof Error ? error.message : 'Unauthorized. Admin access required.' };
    }
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
    let currentUser;
    try {
        currentUser = await assertAdminOrResponder();
    } catch (error) {
        return { error: error instanceof Error ? error.message : 'Unauthorized. Admin or Responder access required.' };
    }
    const userId = formData.get('userId') as string;
    const role = (formData.get('role') as string) || 'MEMBER';

    // Only admins or team owners can assign OWNER/ADMIN roles
    if (role === 'OWNER' || role === 'ADMIN') {
        const isAdmin = currentUser.role === 'ADMIN';
        const isTeamOwner = await prisma.teamMember.findFirst({
            where: {
                teamId,
                userId: currentUser.id,
                role: 'OWNER'
            }
        });

        if (!isAdmin && !isTeamOwner) {
            return { error: 'Only admins or team owners can assign OWNER or ADMIN roles.' };
        }
    }

    if (!userId) return;

    await prisma.teamMember.create({
        data: {
            teamId,
            userId,
            role: role as 'OWNER' | 'ADMIN' | 'MEMBER'
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

export async function updateTeamMemberRole(memberId: string, formData: FormData): Promise<{ error?: string } | undefined> {
    let currentUser;
    try {
        currentUser = await assertAdminOrResponder();
    } catch (error) {
        return { error: error instanceof Error ? error.message : 'Unauthorized. Admin or Responder access required.' };
    }
    const role = (formData.get('role') as string) || 'MEMBER';

    const member = await prisma.teamMember.findUnique({
        where: { id: memberId }
    });

    if (!member) {
        return { error: 'Member not found.' };
    }

    // Only admins or team owners can assign OWNER/ADMIN roles
    if (role === 'OWNER' || role === 'ADMIN') {
        const isAdmin = currentUser.role === 'ADMIN';
        const isTeamOwner = await prisma.teamMember.findFirst({
            where: {
                teamId: member.teamId,
                userId: currentUser.id,
                role: 'OWNER'
            }
        });

        if (!isAdmin && !isTeamOwner) {
            return { error: 'Only admins or team owners can assign OWNER or ADMIN roles.' };
        }
    }

    if (member.role === 'OWNER' && role !== 'OWNER') {
        try {
            await ensureTeamHasOwner(member.teamId, member.id);
        } catch (error) {
            return { error: error instanceof Error ? error.message : 'Cannot change role of last owner.' };
        }
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

export async function updateTeamMemberNotifications(memberId: string, receiveNotifications: boolean): Promise<{ error?: string } | undefined> {
    const member = await prisma.teamMember.findUnique({
        where: { id: memberId },
        select: { teamId: true, userId: true }
    });

    if (!member) {
        return { error: 'Member not found.' };
    }

    try {
        await assertAdminOrTeamOwner(member.teamId);
    } catch (error) {
        return { error: error instanceof Error ? error.message : 'Unauthorized. Admin or Team Owner access required.' };
    }

    await prisma.teamMember.update({
        where: { id: memberId },
        data: { receiveTeamNotifications: receiveNotifications }
    });

    await logAudit({
        action: 'team.member.notifications.updated',
        entityType: 'TEAM_MEMBER',
        entityId: memberId,
        actorId: await getDefaultActorId(),
        details: {
            teamId: member.teamId,
            userId: member.userId,
            receiveTeamNotifications: receiveNotifications
        }
    });

    revalidatePath('/teams');
}

export async function removeTeamMember(memberId: string): Promise<{ error?: string } | undefined> {
    try {
        await assertAdminOrResponder();
    } catch (error) {
        return { error: error instanceof Error ? error.message : 'Unauthorized. Admin or Responder access required.' };
    }
    const member = await prisma.teamMember.findUnique({
        where: { id: memberId }
    });

    if (!member) {
        return { error: 'Member not found.' };
    }

    if (member.role === 'OWNER') {
        try {
            await ensureTeamHasOwner(member.teamId, member.id);
        } catch (error) {
            return { error: error instanceof Error ? error.message : 'Cannot remove last owner.' };
        }
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
