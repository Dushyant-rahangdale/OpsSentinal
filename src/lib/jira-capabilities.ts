/**
 * JiraCapabilityService — centralized Jira availability and capability contract.
 *
 * Every operational Jira surface MUST consume this service instead of independently checking
 * `jiraConfig.enabled` or other scattered flags.
 */

import prisma from '@/lib/prisma';

export type JiraWorkspaceState =
  | 'NOT_CONFIGURED'
  | 'CONFIGURED'
  | 'DISABLED'
  | 'ENABLED';

export type JiraCapabilityReason =
  | 'NOT_CONFIGURED'
  | 'CONFIGURED'
  | 'DISABLED'
  | 'NOT_MAPPED'
  | 'SYNC_DISABLED'
  | 'OK';

export type JiraCapability = {
  workspaceState: JiraWorkspaceState;
  serviceMapped: boolean;
  syncEnabled: boolean;
  showOperationalJira: boolean;
  canCreate: boolean;
  canLink: boolean;
  canSync: boolean;
  canUnlink: boolean;
  reason: JiraCapabilityReason;
  rawEnabled: boolean;
};

export type JiraCapabilityInput = {
  /** Service ID for the entity being rendered. Null is workspace-only state. */
  serviceId: string | null;
  canManage: boolean;
  /** @deprecated Aggregate operational actions must use per-entity capabilities. */
  scope?: 'service' | 'workspace';
};

type DeriveJiraCapabilityInput = {
  workspaceState: JiraWorkspaceState;
  canManage: boolean;
  serviceMapped: boolean;
  syncEnabled: boolean;
  rawEnabled: boolean;
};

/**
 * Pure capability derivation used by production and directly exercised by tests.
 * Aggregate screens must call this contract once per entity/service rather than inventing a
 * workspace-wide capability that can lie about service mapping or syncEnabled.
 */
export function deriveJiraCapability(input: DeriveJiraCapabilityInput): JiraCapability {
  const { workspaceState, canManage, serviceMapped, syncEnabled, rawEnabled } = input;
  const isOperational = workspaceState === 'ENABLED';
  const showOperationalJira = isOperational && canManage;

  const canCreate = showOperationalJira && serviceMapped;
  const canLink = showOperationalJira;
  const canSync = showOperationalJira && serviceMapped && syncEnabled;
  const canUnlink = showOperationalJira;

  let reason: JiraCapabilityReason = 'OK';
  if (workspaceState === 'NOT_CONFIGURED') reason = 'NOT_CONFIGURED';
  else if (workspaceState === 'CONFIGURED') reason = 'CONFIGURED';
  else if (workspaceState === 'DISABLED') reason = 'DISABLED';
  else if (!serviceMapped) reason = 'NOT_MAPPED';
  else if (!syncEnabled) reason = 'SYNC_DISABLED';

  return {
    workspaceState,
    serviceMapped,
    syncEnabled,
    showOperationalJira,
    canCreate,
    canLink,
    canSync,
    canUnlink,
    reason,
    rawEnabled,
  };
}

export async function getJiraCapabilities(input: JiraCapabilityInput): Promise<JiraCapability> {
  const { serviceId, canManage } = input;

  const jiraConfig = await prisma.jiraConfig.findUnique({
    where: { id: 'default' },
    select: {
      enabled: true,
      baseUrl: true,
      userEmail: true,
      apiTokenEncrypted: true,
    },
  });

  let workspaceState: JiraWorkspaceState;
  if (!jiraConfig) {
    workspaceState = 'NOT_CONFIGURED';
  } else if (!jiraConfig.enabled) {
    workspaceState = 'DISABLED';
  } else if (jiraConfig.baseUrl && jiraConfig.userEmail && jiraConfig.apiTokenEncrypted) {
    workspaceState = 'ENABLED';
  } else {
    workspaceState = 'CONFIGURED';
  }

  let serviceMapped = false;
  // Missing service context or missing mapping must never imply that sync is enabled.
  let syncEnabled = false;

  if (serviceId) {
    const mapping = await prisma.jiraServiceMapping.findUnique({
      where: { serviceId },
      select: {
        projectKey: true,
        syncEnabled: true,
      },
    });
    serviceMapped = Boolean(mapping?.projectKey);
    syncEnabled = serviceMapped && Boolean(mapping?.syncEnabled);
  }

  return deriveJiraCapability({
    workspaceState,
    canManage,
    serviceMapped,
    syncEnabled,
    rawEnabled: jiraConfig?.enabled ?? false,
  });
}

export async function getIncidentJiraCapabilities(
  serviceId: string,
  canManage: boolean
): Promise<JiraCapability> {
  return getJiraCapabilities({ serviceId, canManage });
}

export async function getActionItemJiraCapabilities(
  serviceId: string | null,
  canManage: boolean
): Promise<JiraCapability> {
  return getJiraCapabilities({ serviceId, canManage });
}

export type JiraSyncResult =
  | { ok: true; link: { id: string; externalKey: string; externalStatus: string | null } }
  | {
      ok: false;
      code: string;
      retryable: boolean;
      message: string;
    };

export type JiraErrorCode =
  | 'JIRA_AUTH_FAILED'
  | 'JIRA_FORBIDDEN'
  | 'JIRA_PROJECT_NOT_FOUND'
  | 'JIRA_ISSUE_NOT_FOUND'
  | 'JIRA_ISSUE_ALREADY_LINKED'
  | 'JIRA_ISSUE_TYPE_INVALID'
  | 'JIRA_COMPONENT_INVALID'
  | 'JIRA_RATE_LIMITED'
  | 'JIRA_TIMEOUT'
  | 'JIRA_UNAVAILABLE'
  | 'JIRA_VALIDATION_FAILED'
  | 'JIRA_NOT_CONFIGURED'
  | 'JIRA_DISABLED'
  | 'JIRA_NOT_MAPPED'
  | 'JIRA_UNKNOWN';

export function classifyJiraError(error: unknown): {
  code: JiraErrorCode;
  retryable: boolean;
  userMessage: string;
} {
  const rawMsg = error instanceof Error ? error.message : String(error);
  const lower = rawMsg.toLowerCase();

  if (lower.includes('integration_disabled') || lower.includes('disabled in workspace')) {
    return {
      code: 'JIRA_DISABLED',
      retryable: false,
      userMessage: 'Jira is disabled in workspace settings.',
    };
  }
  if (lower.includes('not configured')) {
    return {
      code: 'JIRA_NOT_CONFIGURED',
      retryable: false,
      userMessage: 'Jira is not configured in workspace settings.',
    };
  }
  if (lower.includes('configure a jira project') || lower.includes('jira mapping')) {
    return {
      code: 'JIRA_NOT_MAPPED',
      retryable: false,
      userMessage: 'Configure a Jira project for this service first.',
    };
  }
  if (lower.includes('already linked')) {
    return {
      code: 'JIRA_ISSUE_ALREADY_LINKED',
      retryable: false,
      userMessage: 'That Jira issue is already linked to another incident or action item.',
    };
  }
  if (lower.includes('401') || lower.includes('unauthorized') || lower.includes('authentication')) {
    return {
      code: 'JIRA_AUTH_FAILED',
      retryable: false,
      userMessage:
        'Jira authentication failed. Check the API token in Settings → Integrations → Jira.',
    };
  }
  if (lower.includes('403') || lower.includes('forbidden') || lower.includes('permission')) {
    return {
      code: 'JIRA_FORBIDDEN',
      retryable: false,
      userMessage:
        'The Jira service account lacks permission for this operation. Check project permissions.',
    };
  }
  if (
    lower.includes('project') &&
    (lower.includes("doesn't exist") || lower.includes('not found') || lower.includes('404'))
  ) {
    return {
      code: 'JIRA_PROJECT_NOT_FOUND',
      retryable: false,
      userMessage: 'The configured Jira project does not exist or is inaccessible.',
    };
  }
  if (lower.includes('issue type') || lower.includes('issuetype')) {
    return {
      code: 'JIRA_ISSUE_TYPE_INVALID',
      retryable: false,
      userMessage: 'The configured issue type is invalid for this Jira project.',
    };
  }
  if (lower.includes('component')) {
    return {
      code: 'JIRA_COMPONENT_INVALID',
      retryable: false,
      userMessage: 'The configured component does not exist in this Jira project.',
    };
  }
  if ((lower.includes('issue') && lower.includes('not found')) || lower.includes('404')) {
    return {
      code: 'JIRA_ISSUE_NOT_FOUND',
      retryable: false,
      userMessage: 'The Jira issue was not found in your Jira workspace.',
    };
  }
  if (lower.includes('429') || lower.includes('rate limit') || lower.includes('too many')) {
    return {
      code: 'JIRA_RATE_LIMITED',
      retryable: true,
      userMessage: 'Jira rate limit exceeded. Please try again shortly.',
    };
  }
  if (lower.includes('timeout') || lower.includes('aborted') || lower.includes('econnrefused')) {
    return {
      code: 'JIRA_TIMEOUT',
      retryable: true,
      userMessage: 'Jira is temporarily unreachable. Please try again.',
    };
  }
  if (
    lower.includes('502') ||
    lower.includes('503') ||
    lower.includes('504') ||
    lower.includes('unavailable')
  ) {
    return {
      code: 'JIRA_UNAVAILABLE',
      retryable: true,
      userMessage: 'Jira is temporarily unavailable. Please try again.',
    };
  }

  return {
    code: 'JIRA_UNKNOWN',
    retryable: false,
    userMessage: `Jira operation failed: ${rawMsg.slice(0, 200)}`,
  };
}
