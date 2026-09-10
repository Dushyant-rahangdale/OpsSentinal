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

function revalidateActionItemPaths(postmortemId?: string | null, incidentId?: string | null) {
  if (postmortemId) revalidatePath(`/postmortems/${postmortemId}`);
  if (incidentId) {
    revalidatePath(`/incidents/${incidentId}`);
    revalidatePath(`/postmortems/${incidentId}`);
  }
  revalidatePath('/action-items');
  revalidatePath('/postmortems');
}

export async function createJiraIssueFromActionItem(
  actionItemId: string
): Promise<JiraActionResult> {
  try {
    await assertAdminOrResponder();

    const actionItem = await prisma.actionItem.findUnique({
      where: { id: actionItemId },
      select: {
        id: true,
        title: true,
        description: true,
        postmortemId: true,
        incidentId: true,
        incident: {
          select: {
            service: {
              select: {
                jiraServiceMapping: true,
              },
            },
          },
        },
      },
    });

    if (!actionItem) return { success: false, error: 'Action item not found.' };

    const mapping = actionItem.incident?.service?.jiraServiceMapping;
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
        error: 'Configure a Jira project for this service in Service Settings first.',
      };
    }

    const issueType = mapping?.actionItemIssueType ?? 'Task';
    const labels = mapping?.defaultLabels ?? ['opsknight'];
    const component = mapping?.defaultComponent ?? null;

    try {
      const { issue } = await createJiraIssueAndLink({
        actionItemId,
        projectKey,
        issueType,
        summary: actionItem.title,
        description: actionItem.description || actionItem.title,
        labels,
        component,
      });

      revalidateActionItemPaths(actionItem.postmortemId, actionItem.incidentId);
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

export async function linkJiraIssueToActionItem(
  actionItemId: string,
  jiraKey: string
): Promise<JiraActionResult> {
  try {
    await assertAdminOrResponder();

    const actionItem = await prisma.actionItem.findUnique({
      where: { id: actionItemId },
      select: { id: true, postmortemId: true, incidentId: true },
    });
    if (!actionItem) return { success: false, error: 'Action item not found.' };

    try {
      const { issue } = await linkExistingJiraIssue({ actionItemId, jiraKey });
      revalidateActionItemPaths(actionItem.postmortemId, actionItem.incidentId);
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

export async function unlinkJiraIssueFromActionItem(
  actionItemId: string,
  linkId: string
): Promise<JiraActionResult> {
  try {
    await assertAdminOrResponder();

    const ownershipWhere = {
      id: linkId,
      provider: 'JIRA' as const,
      actionItemId,
    };

    const link = await prisma.externalIssueLink.findFirst({
      where: ownershipWhere,
      select: {
        id: true,
        externalKey: true,
        actionItem: { select: { postmortemId: true, incidentId: true } },
      },
    });
    if (!link) {
      return { success: false, error: 'Jira link not found for this action item.' };
    }

    // Scope the mutation itself as well as the preflight lookup.
    const deleted = await prisma.externalIssueLink.deleteMany({ where: ownershipWhere });
    if (deleted.count !== 1) {
      return { success: false, error: 'Jira link changed before it could be unlinked. Retry.' };
    }

    revalidateActionItemPaths(link.actionItem?.postmortemId, link.actionItem?.incidentId);
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to unlink Jira issue.',
    };
  }
}

export async function syncActionItemJiraIssue(
  actionItemId: string,
  linkId: string
): Promise<JiraActionResult> {
  try {
    await assertAdminOrResponder();

    const link = await prisma.externalIssueLink.findFirst({
      where: {
        id: linkId,
        provider: 'JIRA',
        actionItemId,
      },
      select: {
        id: true,
        actionItem: { select: { postmortemId: true, incidentId: true } },
      },
    });

    if (!link) {
      return { success: false, error: 'Jira link not found for this action item.' };
    }

    try {
      const result = await syncExternalIssueLink(link.id);
      if (!result) {
        return { success: false, error: 'Jira sync failed. Check integration health in Settings.' };
      }
    } catch (error) {
      const classified = classifyJiraError(error);
      return { success: false, error: classified.userMessage };
    }

    revalidateActionItemPaths(link.actionItem?.postmortemId, link.actionItem?.incidentId);
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to sync Jira issue.',
    };
  }
}
