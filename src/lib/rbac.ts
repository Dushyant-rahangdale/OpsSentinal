import 'server-only';

import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { getAuthOptions } from '@/lib/auth';
import type { Role } from '@prisma/client';

export async function getCurrentUser() {
  const session = await getServerSession(await getAuthOptions());
  if (!session?.user?.email) {
    throw new Error('Unauthorized');
  }
  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true, role: true, email: true, name: true, timeZone: true },
  });
  if (!user) {
    throw new Error('User not found');
  }
  return user;
}

export async function assertAdmin() {
  const user = await getCurrentUser();
  if (user.role !== 'ADMIN') {
    throw new Error('Unauthorized. Admin access required.');
  }
  return user;
}

export async function assertAdminOrResponder() {
  const user = await getCurrentUser();
  if (user.role !== 'ADMIN' && user.role !== 'RESPONDER') {
    throw new Error('Unauthorized. Admin or Responder access required.');
  }
  return user;
}

export async function assertAdminOrTeamOwner(teamId: string) {
  const user = await getCurrentUser();
  if (user.role === 'ADMIN') {
    return user;
  }

  const membership = await prisma.teamMember.findFirst({
    where: {
      teamId,
      userId: user.id,
      role: 'OWNER',
    },
    select: { id: true },
  });

  if (!membership) {
    throw new Error('Unauthorized. Admin or Team Owner access required.');
  }

  return user;
}

export async function assertResponderOrAbove() {
  const user = await getCurrentUser();
  if (user.role !== 'ADMIN' && user.role !== 'RESPONDER') {
    throw new Error('Unauthorized. Responder access or above required.');
  }
  return user;
}

export async function assertNotSelf(currentUserId: string, targetUserId: string, action: string) {
  if (currentUserId === targetUserId) {
    throw new Error(`You cannot ${action} your own account.`);
  }
}

export async function getUserPermissions() {
  try {
    const user = await getCurrentUser();
    const { logger } = await import('@/lib/logger');
    logger.warn('[RBAC] Resolved user permissions', {
      id: user.id,
      role: user.role,
    });
    return {
      id: user.id,
      role: user.role as Role,
      isAdmin: user.role === 'ADMIN',
      isAdminOrResponder: user.role === 'ADMIN' || user.role === 'RESPONDER',
      isResponderOrAbove: user.role === 'ADMIN' || user.role === 'RESPONDER',
    };
  } catch {
    return {
      id: '',
      role: 'USER' as Role,
      isAdmin: false,
      isAdminOrResponder: false,
      isResponderOrAbove: false,
    };
  }
}

/**
 * Check if user can modify an incident
 * Users can modify incidents if:
 * - They are ADMIN or RESPONDER (any incident)
 * - They are the assignee
 * - They are a member of the team that owns the service
 */
export async function assertCanModifyIncident(incidentId: string) {
  const user = await getCurrentUser();

  // Admins and responders can modify any incident
  if (user.role === 'ADMIN' || user.role === 'RESPONDER') {
    return user;
  }

  // Check if user has access to this incident
  const incident = await prisma.incident.findUnique({
    where: { id: incidentId },
    include: {
      assignee: true,
      service: {
        include: {
          team: {
            include: {
              members: {
                where: { userId: user.id },
              },
            },
          },
        },
      },
    },
  });

  if (!incident) {
    throw new Error('Incident not found');
  }

  // Check if user is assignee
  if (incident.assigneeId === user.id) {
    return user;
  }

  // Check if user is team member
  if (incident.service.team && incident.service.team.members.length > 0) {
    return user;
  }

  throw new Error('Unauthorized. You do not have permission to modify this incident.');
}

/**
 * Check if user can view an incident
 */
export async function assertCanViewIncident(incidentId: string) {
  const user = await getCurrentUser();

  // Admins and responders can view any incident
  if (user.role === 'ADMIN' || user.role === 'RESPONDER') {
    return user;
  }

  // Check if user has access to this incident
  const incident = await prisma.incident.findUnique({
    where: { id: incidentId },
    include: {
      assignee: true,
      service: {
        include: {
          team: {
            include: {
              members: {
                where: { userId: user.id },
              },
            },
          },
        },
      },
    },
  });

  if (!incident) {
    throw new Error('Incident not found');
  }

  // Check if user is assignee
  if (incident.assigneeId === user.id) {
    return user;
  }

  // Check if user is team member
  if (incident.service.team && incident.service.team.members.length > 0) {
    return user;
  }

  throw new Error('Unauthorized. You do not have permission to view this incident.');
}

/**
 * Check if user can modify a service
 */
export async function assertCanModifyService(serviceId: string) {
  const user = await getCurrentUser();

  // Admins and responders can modify any service
  if (user.role === 'ADMIN' || user.role === 'RESPONDER') {
    return user;
  }

  // Check if user is team member of the service's team
  const service = await prisma.service.findUnique({
    where: { id: serviceId },
    include: {
      team: {
        include: {
          members: {
            where: { userId: user.id },
          },
        },
      },
    },
  });

  if (!service) {
    throw new Error('Service not found');
  }

  // Check if user is team member
  if (service.team && service.team.members.length > 0) {
    return user;
  }

  throw new Error('Unauthorized. You do not have permission to modify this service.');
}
