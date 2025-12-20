'use server';

import prisma from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { getDefaultActorId, logAudit } from '@/lib/audit';
import { randomBytes } from 'crypto';
import { getCurrentUser, assertAdmin, assertAdminOrResponder, assertNotSelf } from '@/lib/rbac';

async function assertUserIsNotSoleOwner(userId: string) {
    const ownedMemberships = await prisma.teamMember.findMany({
        where: { userId, role: 'OWNER' },
        select: { teamId: true }
    });

    if (ownedMemberships.length === 0) return;

    const teamIds = ownedMemberships.map((membership) => membership.teamId);
    const ownerCounts = await prisma.teamMember.groupBy({
        by: ['teamId'],
        where: {
            teamId: { in: teamIds },
            role: 'OWNER'
        },
        _count: { _all: true }
    });

    const soleOwnerTeamIds = ownerCounts
        .filter((entry) => entry._count._all === 1)
        .map((entry) => entry.teamId);

    if (soleOwnerTeamIds.length > 0) {
        throw new Error('Reassign team ownership before deleting this user.');
    }
}

async function deleteUserInternal(userId: string) {
    await assertUserIsNotSoleOwner(userId);

    await prisma.$transaction([
        prisma.incident.updateMany({
            where: { assigneeId: userId },
            data: { assigneeId: null }
        }),
        prisma.auditLog.updateMany({
            where: { actorId: userId },
            data: { actorId: null }
        }),
        prisma.teamMember.deleteMany({ where: { userId } }),
        prisma.onCallShift.deleteMany({ where: { userId } }),
        prisma.escalationRule.deleteMany({ where: { targetUserId: userId } }),
        prisma.incidentNote.deleteMany({ where: { userId } }),
        prisma.notification.deleteMany({ where: { userId } }),
        prisma.incidentWatcher.deleteMany({ where: { userId } }),
        prisma.user.delete({ where: { id: userId } })
    ]);
}

type UserFormState = {
    error?: string | null;
    success?: boolean;
    inviteUrl?: string | null;
};

async function createInviteToken(email: string) {
    const token = randomBytes(32).toString('base64url');
    const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await prisma.verificationToken.deleteMany({
        where: { identifier: email }
    });

    await prisma.verificationToken.create({
        data: {
            identifier: email,
            token,
            expires
        }
    });

    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
    const inviteUrl = `${baseUrl}/set-password?token=${encodeURIComponent(token)}`;

    return inviteUrl;
}

export async function addUser(_prevState: UserFormState, formData: FormData): Promise<UserFormState> {
    try {
        await assertAdmin();
    } catch {
        return { error: 'Unauthorized. Admin access required.' };
    }

    const name = (formData.get('name') as string | null)?.trim() ?? '';
    const email = (formData.get('email') as string | null)?.trim().toLowerCase() ?? '';
    const role = formData.get('role') as string;

    if (!name || !email) {
        return { error: 'Name and email are required.' };
    }

    const existing = await prisma.user.findUnique({
        where: { email }
    });

    if (existing?.status === 'DISABLED') {
        return { error: 'User is disabled. Reactivate before adding again.' };
    }

    if (existing) {
        return { error: 'A user with that email already exists.' };
    }

    const user = await prisma.user.create({
        data: {
            name,
            email,
            role: (role as 'ADMIN' | 'RESPONDER' | 'USER') || 'USER',
            status: 'INVITED',
            invitedAt: new Date()
        }
    });

    const inviteUrl = await createInviteToken(email);

    await logAudit({
        action: 'user.invited',
        entityType: 'USER',
        entityId: user.id,
        actorId: await getDefaultActorId(),
        details: { email, role: role || 'USER' }
    });

    revalidatePath('/users');
    revalidatePath('/audit');

    return { success: true, inviteUrl };
}

export async function updateUserRole(userId: string, formData: FormData) {
    try {
        const currentUser = await assertAdmin();
        assertNotSelf(currentUser.id, userId, 'change the role of');
    } catch (error) {
        return { error: error instanceof Error ? error.message : 'Unauthorized. Admin access required.' };
    }
    const role = formData.get('role') as string;
    await prisma.user.update({
        where: { id: userId },
        data: { role: role as 'ADMIN' | 'RESPONDER' | 'USER' }
    });

    await logAudit({
        action: 'user.role.updated',
        entityType: 'USER',
        entityId: userId,
        actorId: await getDefaultActorId(),
        details: { role }
    });

    revalidatePath('/users');
    revalidatePath('/audit');
}

export async function addUserToTeam(userId: string, formData: FormData) {
    try {
        await assertAdminOrResponder();
    } catch (error) {
        return { error: error instanceof Error ? error.message : 'Unauthorized. Admin or Responder access required.' };
    }
    const teamId = formData.get('teamId') as string;
    const role = (formData.get('role') as string) || 'MEMBER';

    if (!teamId) return;

    const existing = await prisma.teamMember.findFirst({
        where: { teamId, userId }
    });

    if (existing) return;

    await prisma.teamMember.create({
        data: {
            userId,
            teamId,
            role: (role as 'OWNER' | 'ADMIN' | 'MEMBER') || 'MEMBER'
        }
    });

    await logAudit({
        action: 'team.member.added',
        entityType: 'TEAM_MEMBER',
        entityId: `${teamId}:${userId}`,
        actorId: await getDefaultActorId(),
        details: { teamId, userId, role: role || 'MEMBER' }
    });

    revalidatePath('/users');
    revalidatePath('/teams');
    revalidatePath('/audit');
}

export async function removeUserFromTeam(memberId: string) {
    await assertAdmin();
    const member = await prisma.teamMember.delete({
        where: { id: memberId }
    });

    await logAudit({
        action: 'team.member.removed',
        entityType: 'TEAM_MEMBER',
        entityId: memberId,
        actorId: await getDefaultActorId(),
        details: { teamId: member.teamId, userId: member.userId }
    });

    revalidatePath('/users');
    revalidatePath('/teams');
    revalidatePath('/audit');
}

export async function deactivateUser(userId: string, _formData?: FormData) {
    try {
        const currentUser = await assertAdmin();
        assertNotSelf(currentUser.id, userId, 'deactivate');
    } catch (error) {
        return { error: error instanceof Error ? error.message : 'Unauthorized. Admin access required.' };
    }
    await prisma.user.update({
        where: { id: userId },
        data: {
            status: 'DISABLED',
            deactivatedAt: new Date()
        }
    });

    await logAudit({
        action: 'user.deactivated',
        entityType: 'USER',
        entityId: userId,
        actorId: await getDefaultActorId()
    });

    revalidatePath('/users');
    revalidatePath('/audit');
}

export async function reactivateUser(userId: string, _formData?: FormData) {
    try {
        await assertAdmin();
    } catch (error) {
        return { error: error instanceof Error ? error.message : 'Unauthorized. Admin access required.' };
    }
    await prisma.user.update({
        where: { id: userId },
        data: {
            status: 'ACTIVE',
            deactivatedAt: null
        }
    });

    await logAudit({
        action: 'user.reactivated',
        entityType: 'USER',
        entityId: userId,
        actorId: await getDefaultActorId()
    });

    revalidatePath('/users');
    revalidatePath('/audit');
}

export async function generateInvite(userId: string, _prevState: UserFormState, _formData: FormData): Promise<UserFormState> {
    try {
        await assertAdmin();
    } catch {
        return { error: 'Unauthorized. Admin access required.' };
    }

    const user = await prisma.user.findUnique({
        where: { id: userId }
    });

    if (!user) {
        return { error: 'User not found.' };
    }

    if (user.status === 'DISABLED') {
        return { error: 'User is disabled. Reactivate before inviting.' };
    }

    await prisma.user.update({
        where: { id: userId },
        data: {
            status: 'INVITED',
            invitedAt: new Date()
        }
    });

    const inviteUrl = await createInviteToken(user.email);

    await logAudit({
        action: 'user.invite.resent',
        entityType: 'USER',
        entityId: user.id,
        actorId: await getDefaultActorId(),
        details: { email: user.email }
    });

    revalidatePath('/users');
    revalidatePath('/audit');

    return { success: true, inviteUrl };
}

export async function deleteUser(userId: string, _formData?: FormData): Promise<{ error?: string } | undefined> {
    try {
        const currentUser = await assertAdmin();
        assertNotSelf(currentUser.id, userId, 'delete');
    } catch (error) {
        return { error: error instanceof Error ? error.message : 'Unauthorized. Admin access required.' };
    }
    
    try {
        await deleteUserInternal(userId);

        await logAudit({
            action: 'user.deleted',
            entityType: 'USER',
            entityId: userId,
            actorId: await getDefaultActorId()
        });

        revalidatePath('/users');
        revalidatePath('/audit');
        revalidatePath('/incidents');
        revalidatePath('/schedules');
    } catch (error) {
        return { error: error instanceof Error ? error.message : 'Failed to delete user.' };
    }
}

type BulkUserActionState = {
    error?: string | null;
    success?: boolean;
    message?: string;
};

export async function bulkUpdateUsers(_prevState: BulkUserActionState, formData: FormData): Promise<BulkUserActionState> {
    try {
        await assertAdmin();
    } catch {
        return { error: 'Unauthorized. Admin access required.' };
    }
    const action = formData.get('bulkAction') as string;
    const userIds = formData.getAll('userIds').filter(Boolean) as string[];

    if (!action) {
        return { error: 'Choose a bulk action first.' };
    }

    if (userIds.length === 0) {
        return { error: 'Select at least one user.' };
    }

    if (action === 'activate') {
        for (const userId of userIds) {
            await prisma.user.update({
                where: { id: userId },
                data: {
                    status: 'ACTIVE',
                    deactivatedAt: null
                }
            });

            await logAudit({
                action: 'user.reactivated',
                entityType: 'USER',
                entityId: userId,
                actorId: await getDefaultActorId()
            });
        }
    } else if (action === 'deactivate') {
        for (const userId of userIds) {
            await prisma.user.update({
                where: { id: userId },
                data: {
                    status: 'DISABLED',
                    deactivatedAt: new Date()
                }
            });

            await logAudit({
                action: 'user.deactivated',
                entityType: 'USER',
                entityId: userId,
                actorId: await getDefaultActorId()
            });
        }
        revalidatePath('/users');
        return { success: true, message: `Deactivated ${userIds.length} user(s)` };
    } else if (action === 'delete') {
        try {
            for (const userId of userIds) {
                await assertUserIsNotSoleOwner(userId);
            }
        } catch (error) {
            return { error: error instanceof Error ? error.message : 'Unable to delete selected users.' };
        }

        for (const userId of userIds) {
            await deleteUserInternal(userId);

            await logAudit({
                action: 'user.deleted',
                entityType: 'USER',
                entityId: userId,
                actorId: await getDefaultActorId()
            });
        }
        revalidatePath('/users');
        return { success: true, message: `Deleted ${userIds.length} user(s)` };
    } else if (action === 'setRole') {
        const role = formData.get('role') as string;
        if (!role) {
            return { error: 'Role is required.' };
        }
        for (const userId of userIds) {
            await prisma.user.update({
                where: { id: userId },
                data: { role: role as 'ADMIN' | 'RESPONDER' | 'USER' }
            });

            await logAudit({
                action: 'user.role.updated',
                entityType: 'USER',
                entityId: userId,
                actorId: await getDefaultActorId(),
                details: { role }
            });
        }
        revalidatePath('/users');
        return { success: true, message: `Updated role for ${userIds.length} user(s)` };
    }
    
    return { error: 'Unsupported bulk action.' };
}
