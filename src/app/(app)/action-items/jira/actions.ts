'use server';

import prisma from '@/lib/prisma';
import { assertAdminOrResponder } from '@/lib/rbac';
import {
  createJiraIssueAndLink,
  linkExistingJiraIssue,
  syncExternalIssueLink,
} from '@/lib/jira-sync';
import { classifyJiraError } from '@/lib/jira-capabilities';
import type { ActionItemExternalIssue } from '@/lib/action-items';
import { revalidatePath } from 'next/cache';

export type JiraActionResult = {
  success: boolean;
  error?: string;
  key?: string;
  url?: string;
  externalIssue?: ActionItemExternalIssue;
};

type JiraLinkProjection = {
  id: string;
  provider: string;
  externalKey: string;
  externalUrl: string;
  externalStatus: string | null;
  externalAssignee: string | null;
  syncState: string;
};

function toActionItemExternalIssue(link: JiraLinkProjection): ActionItemExternalIssue {
  return {
    linkId: link.id,
    provider: link.provider,
    key: link.externalKey,
    url: link.externalUrl,
    status: link.externalStatus ?? undefined,
    assignee: link.externalAssignee ?? undefined,
    syncState: link.syncState,
  };
}

function revalidateActionItemPaths(incidentId?: string | null) {
  if (incidentId) {
    revalidatePath(`/incidents/${incidentId}`);
    revalidatePath(`/postmortems/${incidentId}`);
  }
  revalidatePath('/action-items');
  revalidatePath('/postmortems');
}

function alreadyLinkedError(externalKey: string): JiraActionResult {
  return {
    success: false,
    error: `This action item is already linked to Jira issue ${externalKey}. Refresh the page to see the current link.`,
  };
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
        externalIssueLinks: {
          where: { provider: 'JIRA' },
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { externalKey: true },
        },
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

    const existingLink = actionItem.externalIssueLinks[0];
    if (existingLink) return alreadyLinkedError(existingLink.externalKey);

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
      const { issue, link } = await createJiraIssueAndLink({
        actionItemId,
        projectKey,
        issueType,
        summary: actionItem.title,
        description: actionItem.description || actionItem.title,
        labels,
        component,
      });

      revalidateActionItemPaths(actionItem.incidentId);
      return {
        success: true,
        key: issue.key,
        url: issue.url,
        externalIssue: toActionItemExternalIssue(link),
      };
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
      select: {
        id: true,
        incidentId: true,
        externalIssueLinks: {
          where: { provider: 'JIRA' },
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { externalKey: true },
        },
      },
    });
    if (!actionItem) return { success: false, error: 'Action item not found.' };

    const existingLink = actionItem.externalIssueLinks[0];
    if (existingLink) return alreadyLinkedError(existingLink.externalKey);

    try {
      const { issue, link } = await linkExistingJiraIssue({ actionItemId, jiraKey });
      revalidateActionItemPaths(actionItem.incidentId);
      return {
        success: true,
        key: issue.key,
        url: issue.url,
        externalIssue: toActionItemExternalIssue(link),
      };
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

    revalidateActionItemPaths(link.actionItem?.incidentId);
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

    let syncedIssue: ActionItemExternalIssue;
    try {
      const result = await syncExternalIssueLink(link.id);
      if (!result) {
        return { success: false, error: 'Jira sync failed. Check integration health in Settings.' };
      }
      syncedIssue = toActionItemExternalIssue(result);
    } catch (error) {
      const classified = classifyJiraError(error);
      return { success: false, error: classified.userMessage };
    }

    revalidateActionItemPaths(link.actionItem?.incidentId);
    return { success: true, externalIssue: syncedIssue };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to sync Jira issue.',
    };
  }
}
