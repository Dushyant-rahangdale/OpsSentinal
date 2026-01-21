'use server';

import prisma from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { getCurrentUser, assertResponderOrAbove } from '@/lib/rbac';

export type TimelineEvent = {
  id: string;
  timestamp: string;
  type: 'DETECTION' | 'ESCALATION' | 'MITIGATION' | 'RESOLUTION';
  title: string;
  description: string;
  actor?: string;
};

export type ImpactMetrics = {
  usersAffected?: number;
  downtimeMinutes?: number;
  errorRate?: number;
  servicesAffected?: string[];
  slaBreaches?: number;
  revenueImpact?: number;
  apiErrors?: number;
  performanceDegradation?: number;
};

export type ActionItem = {
  id: string;
  title: string;
  description: string;
  owner?: string;
  dueDate?: string;
  status: 'OPEN' | 'IN_PROGRESS' | 'COMPLETED' | 'BLOCKED';
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
};

export type PostmortemData = {
  title: string;
  summary?: string;
  timeline?: TimelineEvent[];
  impact?: ImpactMetrics;
  rootCause?: string;
  resolution?: string;
  actionItems?: ActionItem[];
  lessons?: string;
  status?: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  isPublic?: boolean;
};

/**
 * Create or update a postmortem for an incident
 */
export async function upsertPostmortem(incidentId: string, data: PostmortemData) {
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
 * Get all postmortems with pagination
 */
export async function getAllPostmortems(
  options: {
    status?: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
    page?: number;
    limit?: number;
  } = {}
) {
  const { status, page = 1, limit = 50 } = options;
  const skip = (page - 1) * limit;

  const where = status ? { status } : {};

  const [postmortems, total] = await Promise.all([
    prisma.postmortem.findMany({
      where,
      include: {
        createdBy: {
          select: { id: true, name: true, email: true, avatarUrl: true },
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
      skip,
      take: limit,
    }),
    prisma.postmortem.count({ where }),
  ]);

  return {
    postmortems,
    pagination: {
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      totalItems: total,
      itemsPerPage: limit,
    },
  };
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

/**
 * Generate a draft postmortem using heuristics (Template Engine)
 */
export async function generatePostmortemDraft(incidentId: string) {
  try {
    await assertResponderOrAbove();
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : 'Unauthorized');
  }

  const incident = await prisma.incident.findUnique({
    where: { id: incidentId },
    include: {
      service: true,
      events: {
        orderBy: { createdAt: 'asc' },
      },
    },
  });

  if (!incident) {
    throw new Error('Incident not found');
  }

  // 1. Calculate Duration & Impact
  const start = new Date(incident.createdAt);
  const end = incident.resolvedAt ? new Date(incident.resolvedAt) : new Date();
  const durationMs = end.getTime() - start.getTime();
  const durationMinutes = Math.floor(durationMs / 60000);
  const durationHours = Math.floor(durationMinutes / 60);
  const durationString =
    durationHours > 0 ? `${durationHours}h ${durationMinutes % 60}m` : `${durationMinutes}m`;

  const impact: ImpactMetrics = {
    downtimeMinutes: durationMinutes,
    servicesAffected: [incident.service.name],
  };

  // 2. Generate Summary
  const date = start.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
  const startTime = start.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short',
  });
  const endTime = incident.resolvedAt
    ? end.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZoneName: 'short' })
    : 'ongoing';

  const summary = `On ${date}, the ${incident.service.name} service experienced an incident${incident.urgency === 'HIGH' ? ' (High Urgency)' : ''}. The incident began at ${startTime} and was resolved at ${endTime}. The total duration of impact was ${durationString}.`;

  // 3. Generate Timeline from Incident Events
  const timeline: TimelineEvent[] = incident.events.map(event => {
    let type: TimelineEvent['type'] = 'DETECTION';
    const msg = event.message.toLowerCase();
    if (msg.includes('resolved') || msg.includes('fixed')) type = 'RESOLUTION';
    else if (msg.includes('escalated') || msg.includes('notified') || msg.includes('acknowledg'))
      type = 'ESCALATION';
    else if (msg.includes('mitigated') || msg.includes('stabilized')) type = 'MITIGATION';

    return {
      id: `draft-${event.id}`,
      timestamp: event.createdAt.toISOString(),
      type,
      title: event.message.length > 50 ? event.message.substring(0, 50) + '...' : event.message,
      description: event.message,
      actor: 'System',
    };
  });

  // Add explicit start/end events if missing
  if (!timeline.some(e => e.type === 'DETECTION')) {
    timeline.unshift({
      id: `draft-start`,
      timestamp: incident.createdAt.toISOString(),
      type: 'DETECTION',
      title: 'Incident Started',
      description: `Incident created for ${incident.service.name}`,
    });
  }
  if (incident.resolvedAt && !timeline.some(e => e.type === 'RESOLUTION')) {
    timeline.push({
      id: `draft-end`,
      timestamp: incident.resolvedAt.toISOString(),
      type: 'RESOLUTION',
      title: 'Incident Resolved',
      description: 'Incident marked as resolved.',
    });
  }

  return {
    summary,
    impact,
    timeline,
    rootCause: 'To be determined. Preliminary analysis suggests...',
    resolution: 'Service was restored by...',
    lessons: '1. Improve monitoring for...\n2. Update runbooks for...',
  };
}
