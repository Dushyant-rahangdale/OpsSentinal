'use server';

import prisma from '@/lib/prisma';
import { assertAdminOrResponder } from '@/lib/rbac';
import {
  createJiraIssueAndLink,
  linkExistingJiraIssue,
  syncExternalIssueLink,
} from '@/lib/jira-sync';
import { classifyJiraError } from '@/lib/jira-capabilities';
import { revalidatePath } from 'next/cache';

export type JiraActionResult = {
  success: boolean;
  error?: string;
  key?: string;
  url?: string;
};

export async function createJiraIssueFromIncident(incidentId: string): Promise<JiraActionResult> {
  try {
    await assertAdminOrResponder();

    const incident = await prisma.incident.findUnique({
      where: { id: incidentId },
      include: {
        service: {
          include: {
            jiraServiceMapping: true,
          },
        },
      },
    });

    if (!incident) return { success: false, error: 'Incident not found.' };

    const mapping = incident.service?.jiraServiceMapping;
    const jiraConfig = await prisma.jiraConfig.findUnique({
      where: { id: 'default' },
      select: { enabled: true },
    });

    if (!jiraConfig?.enabled) {
      return {
        success: false,
        error: 'Jira is not configured or is disabled in workspace settings.',
      };
    }

    const projectKey = mapping?.projectKey;
    if (!projectKey) {
      return {
        success: false,
        error:
          'Configure a Jira project for this service in Service Settings before creating Jira issues.',
      };
    }

    const issueType = mapping?.incidentIssueType ?? 'Bug';
    const labels = mapping?.defaultLabels ?? ['opsknight'];
    const component = mapping?.defaultComponent ?? null;
    const summary = `[Incident] ${incident.title}`;
    const description = incident.description || `OpsKnight Incident: ${incident.title}`;

    try {
      const { issue } = await createJiraIssueAndLink({
        incidentId,
        projectKey,
        issueType,
        summary,
        description,
        labels,
        component,
      });

      await prisma.incidentEvent.create({
        data: {
          incidentId,
          type: 'COMMENT',
          message: `Jira issue ${issue.key} created`,
        },
      });

      revalidatePath(`/incidents/${incidentId}`);
      return { success: true, key: issue.key, url: issue.url };
    } catch (error) {
      const classified = classifyJiraError(error);
      return { success: false, error: classified.userMessage };
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create Jira issue.',
    };
  }
}

export async function linkJiraIssueToIncident(
  incidentId: string,
  jiraKey: string
): Promise<JiraActionResult> {
  try {
    await assertAdminOrResponder();

    const incident = await prisma.incident.findUnique({
      where: { id: incidentId },
      select: { id: true },
    });
    if (!incident) return { success: false, error: 'Incident not found.' };

    try {
      const { issue } = await linkExistingJiraIssue({ incidentId, jiraKey });

      await prisma.incidentEvent.create({
        data: {
          incidentId,
          type: 'COMMENT',
          message: `Jira issue ${issue.key} linked`,
        },
      });

      revalidatePath(`/incidents/${incidentId}`);
      return { success: true, key: issue.key, url: issue.url };
    } catch (error) {
      const classified = classifyJiraError(error);
      return { success: false, error: classified.userMessage };
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to link Jira issue.',
    };
  }
}

export async function unlinkJiraIssueFromIncident(
  linkId: string,
  incidentId: string
): Promise<JiraActionResult> {
  try {
    await assertAdminOrResponder();

    const ownershipWhere = {
      id: linkId,
      provider: 'JIRA' as const,
      incidentId,
    };

    const link = await prisma.externalIssueLink.findFirst({
      where: ownershipWhere,
      select: { id: true, externalKey: true, incidentId: true },
    });
    if (!link) return { success: false, error: 'Jira link not found for this incident.' };

    const deleted = await prisma.externalIssueLink.deleteMany({ where: ownershipWhere });
    if (deleted.count !== 1) {
      return { success: false, error: 'Jira link changed before it could be unlinked. Retry.' };
    }

    await prisma.incidentEvent.create({
      data: {
        incidentId,
        type: 'COMMENT',
        message: `Jira issue ${link.externalKey} unlinked`,
      },
    });

    revalidatePath(`/incidents/${incidentId}`);
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to unlink Jira issue.',
    };
  }
}

export async function syncIncidentJiraIssue(
  linkId: string,
  incidentId: string
): Promise<JiraActionResult> {
  try {
    await assertAdminOrResponder();

    const link = await prisma.externalIssueLink.findFirst({
      where: {
        id: linkId,
        provider: 'JIRA',
        incidentId,
      },
      select: { id: true },
    });
    if (!link) return { success: false, error: 'Jira link not found for this incident.' };

    try {
      const result = await syncExternalIssueLink(link.id);
      if (!result) {
        return { success: false, error: 'Jira sync failed. Check integration health in Settings.' };
      }
    } catch (error) {
      const classified = classifyJiraError(error);
      return { success: false, error: classified.userMessage };
    }

    revalidatePath(`/incidents/${incidentId}`);
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to sync Jira issue.',
    };
  }
}
