/**
 * JiraCapabilityService — centralized Jira availability and capability contract.
 *
 * Every Jira surface (action items, incidents, postmortems, service settings,
 * command bar) MUST consume this service instead of independently checking
 * `jiraConfig.enabled` or other scattered flags.
 *
 * This eliminates the class of bug where Jira UI appears when Jira isn't
 * configured, and ensures a single source of truth for integration state.
 */

import prisma from '@/lib/prisma';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type JiraWorkspaceState =
  | 'NOT_CONFIGURED' // No JiraConfig row exists
  | 'CONFIGURED' // Credentials saved but not yet verified or enabled
  | 'DISABLED' // Configured and explicitly disabled by admin
  | 'ENABLED'; // Configured and enabled

export type JiraCapabilityReason = 'NOT_CONFIGURED' | 'DISABLED' | 'NOT_MAPPED' | 'OK';

/**
 * The single object every Jira UI surface should consume.
 */
export type JiraCapability = {
  /** High-level workspace integration state. */
  workspaceState: JiraWorkspaceState;

  /** Whether this specific service has a Jira mapping. */
  serviceMapped: boolean;

  /** Whether the service mapping has sync enabled. */
  syncEnabled: boolean;

  /** Whether the user can see any operational Jira UI. */
  showOperationalJira: boolean;

  /** Whether the user can create Jira issues for this entity type. */
  canCreate: boolean;

  /** Whether the user can link existing Jira issues. */
  canLink: boolean;

  /** Whether the user can sync Jira metadata. */
  canSync: boolean;

  /** Whether the user can unlink a Jira issue. */
  canUnlink: boolean;

  /** Human-readable reason for any disabled capability. */
  reason: JiraCapabilityReason;

  /** The raw Jira config enabled flag (for settings pages that need it). */
  rawEnabled: boolean;
};

/**
 * Input for computing capabilities.
 */
export type JiraCapabilityInput = {
  /** Service ID to check mapping for. Pass null for workspace-level contexts. */
  serviceId: string | null;

  /** Whether the current user has manage permissions. */
  canManage: boolean;

  /**
   * 'service' (default): service-specific contract — service mapping gates
   *   `canCreate`. Use for incident pages, service settings, and any surface
   *   tied to exactly one service.
   * 'workspace': aggregate contract for surfaces that span multiple services
   *   (e.g. the action-items board). `canCreate` is based on workspace state
   *   only; the per-entity service mapping is validated downstream in the
   *   server action, so properly-mapped items still render Create.
   */
  scope?: 'service' | 'workspace';
};

// ---------------------------------------------------------------------------
// Core capability computation
// ---------------------------------------------------------------------------

/**
 * Compute the Jira capability contract for a given service context.
 *
 * This is the SINGLE function that should be called from every server
 * component, server action, and page that needs to know about Jira state.
 */
export async function getJiraCapabilities(input: JiraCapabilityInput): Promise<JiraCapability> {
  const { serviceId, canManage, scope = 'service' } = input;

  // 1. Fetch workspace-level Jira configuration
  const jiraConfig = await prisma.jiraConfig.findUnique({
    where: { id: 'default' },
    select: {
      enabled: true,
      baseUrl: true,
      userEmail: true,
      apiTokenEncrypted: true,
    },
  });

  // Determine workspace state
  let workspaceState: JiraWorkspaceState;
  if (!jiraConfig) {
    workspaceState = 'NOT_CONFIGURED';
  } else if (!jiraConfig.enabled) {
    workspaceState = 'DISABLED';
  } else {
    // Has credentials and is enabled — check if credentials are actually present
    workspaceState =
      jiraConfig.baseUrl && jiraConfig.userEmail && jiraConfig.apiTokenEncrypted
        ? 'ENABLED'
        : 'CONFIGURED';
  }

  // 2. Fetch service-level Jira mapping
  let serviceMapped = false;
  let syncEnabled = true;
  if (serviceId) {
    const mapping = await prisma.jiraServiceMapping.findUnique({
      where: { serviceId },
      select: {
        projectKey: true,
        syncEnabled: true,
      },
    });
    serviceMapped = Boolean(mapping?.projectKey);
    syncEnabled = mapping?.syncEnabled ?? true;
  }

  // 3. Compute derived capabilities
  const isOperational = workspaceState === 'ENABLED';
  const showOperationalJira = isOperational && canManage;

  // In workspace scope, creation is gated on workspace state only — the
  // per-entity service mapping is validated downstream in the server action.
  const createNeedsMapping = scope === 'service';
  const canCreate = showOperationalJira && (!createNeedsMapping || serviceMapped);
  const canLink = showOperationalJira;
  const canSync = showOperationalJira && syncEnabled;
  const canUnlink = showOperationalJira;

  // 4. Determine the reason for any restriction
  let reason: JiraCapabilityReason;
  if (!isOperational) {
    reason = workspaceState === 'NOT_CONFIGURED' ? 'NOT_CONFIGURED' : 'DISABLED';
  } else if (createNeedsMapping && !serviceMapped) {
    reason = 'NOT_MAPPED';
  } else {
    reason = 'OK';
  }

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
    rawEnabled: jiraConfig?.enabled ?? false,
  };
}

/**
 * Convenience: compute capabilities for incident context.
 * Incidents always have a serviceId.
 */
export async function getIncidentJiraCapabilities(
  serviceId: string,
  canManage: boolean
): Promise<JiraCapability> {
  return getJiraCapabilities({ serviceId, canManage });
}

/**
 * Convenience: compute capabilities for action-item context.
 * Action items may or may not have an associated service (via incident → service).
 */
export async function getActionItemJiraCapabilities(
  serviceId: string | null,
  canManage: boolean
): Promise<JiraCapability> {
  return getJiraCapabilities({ serviceId, canManage });
}

// ---------------------------------------------------------------------------
// Typed sync result — replaces the current pattern of returning success: true
// after an internal failure
// ---------------------------------------------------------------------------

export type JiraSyncResult =
  | { ok: true; link: { id: string; externalKey: string; externalStatus: string | null } }
  | {
      ok: false;
      code: string;
      retryable: boolean;
      message: string;
    };

// ---------------------------------------------------------------------------
// Typed error classification — replaces string matching on raw Jira errors
// ---------------------------------------------------------------------------

export type JiraErrorCode =
  | 'JIRA_AUTH_FAILED'
  | 'JIRA_FORBIDDEN'
  | 'JIRA_PROJECT_NOT_FOUND'
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

/**
 * Classify a raw Jira error message into a typed error code.
 * This replaces fragile string matching scattered across actions.
 */
export function classifyJiraError(error: unknown): {
  code: JiraErrorCode;
  retryable: boolean;
  userMessage: string;
} {
  const rawMsg = error instanceof Error ? error.message : String(error);
  const lower = rawMsg.toLowerCase();

  if (lower.includes('not configured') || lower.includes('integration_disabled')) {
    return {
      code: 'JIRA_NOT_CONFIGURED',
      retryable: false,
      userMessage: 'Jira is not configured or is disabled in workspace settings.',
    };
  }
  if (lower.includes('401') || lower.includes('unauthorized') || lower.includes('auth')) {
    return {
      code: 'JIRA_AUTH_FAILED',
      retryable: false,
      userMessage:
        'Jira authentication failed. Check your API token in Settings → Integrations → Jira.',
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
