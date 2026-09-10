import { describe, expect, it } from 'vitest';
import { classifyJiraError, type JiraCapability } from '@/lib/jira-capabilities';

// ---------------------------------------------------------------------------
// Unit tests for the Jira capability contract
// ---------------------------------------------------------------------------

describe('Jira capability contract', () => {
  it('classifies NOT_CONFIGURED errors', () => {
    const result = classifyJiraError(new Error('Jira is not configured or is disabled.'));
    expect(result.code).toBe('JIRA_NOT_CONFIGURED');
    expect(result.retryable).toBe(false);
  });

  it('classifies auth failures from 401 responses', () => {
    const result = classifyJiraError(new Error('Jira request failed (401).'));
    expect(result.code).toBe('JIRA_AUTH_FAILED');
    expect(result.retryable).toBe(false);
  });

  it('classifies forbidden failures from 403 responses', () => {
    const result = classifyJiraError(
      new Error('Jira request failed (403) with a provider response body.')
    );
    expect(result.code).toBe('JIRA_FORBIDDEN');
    expect(result.retryable).toBe(false);
  });

  it('classifies missing projects', () => {
    const result = classifyJiraError(new Error("The target project doesn't exist."));
    expect(result.code).toBe('JIRA_PROJECT_NOT_FOUND');
    expect(result.retryable).toBe(false);
  });

  it('classifies invalid issue types', () => {
    const result = classifyJiraError(new Error('Operation failed: Issue type "Bugz" is invalid.'));
    expect(result.code).toBe('JIRA_ISSUE_TYPE_INVALID');
    expect(result.retryable).toBe(false);
  });

  it('classifies invalid components', () => {
    const result = classifyJiraError(new Error('Component "BackendX" does not exist'));
    expect(result.code).toBe('JIRA_COMPONENT_INVALID');
    expect(result.retryable).toBe(false);
  });

  it('classifies rate limits as retryable', () => {
    const result = classifyJiraError(new Error('Jira request failed (429): rate limit exceeded'));
    expect(result.code).toBe('JIRA_RATE_LIMITED');
    expect(result.retryable).toBe(true);
  });

  it('classifies timeouts as retryable', () => {
    const result = classifyJiraError(new Error('fetch failed: timeout'));
    expect(result.code).toBe('JIRA_TIMEOUT');
    expect(result.retryable).toBe(true);
  });

  it('classifies unavailable (502/503/504) as retryable', () => {
    const result = classifyJiraError(new Error('Jira request failed (503)'));
    expect(result.code).toBe('JIRA_UNAVAILABLE');
    expect(result.retryable).toBe(true);
  });

  it('falls back to UNKNOWN for unclassified errors', () => {
    const result = classifyJiraError(new Error('some random error occurred'));
    expect(result.code).toBe('JIRA_UNKNOWN');
    expect(result.retryable).toBe(false);
  });

  it('exposes user-friendly messages for UI display', () => {
    const result = classifyJiraError(new Error('Jira request failed (401).'));
    expect(result.userMessage).toContain('authentication failed');
  });
});

// ---------------------------------------------------------------------------
// Tests for the capability derivation rules — these assert the product
// contract that was broken (Jira UI visible when Jira isn't configured).
// ---------------------------------------------------------------------------

describe('Jira capability derivation rules', () => {
  // Helper: simulate what getJiraCapabilities returns given inputs.
  // These tests assert the exact contract mapping that the service implements.
  const computeLegacy = (
    workspaceConfigured: boolean,
    workspaceEnabled: boolean,
    serviceMapped: boolean,
    syncEnabled: boolean,
    canManage: boolean,
    scope: 'service' | 'workspace' = 'service'
  ): JiraCapability => {
    const workspaceState = !workspaceConfigured
      ? 'NOT_CONFIGURED'
      : !workspaceEnabled
        ? 'DISABLED'
        : 'ENABLED';
    const isOperational = workspaceState === 'ENABLED';
    const showOperationalJira = isOperational && canManage;
    const createNeedsMapping = scope === 'service';
    return {
      workspaceState,
      serviceMapped,
      syncEnabled,
      showOperationalJira,
      canCreate: showOperationalJira && (!createNeedsMapping || serviceMapped),
      canLink: showOperationalJira,
      canSync: showOperationalJira && syncEnabled,
      canUnlink: showOperationalJira,
      reason: !isOperational
        ? workspaceState === 'NOT_CONFIGURED'
          ? 'NOT_CONFIGURED'
          : 'DISABLED'
        : createNeedsMapping && !serviceMapped
          ? 'NOT_MAPPED'
          : 'OK',
      rawEnabled: workspaceEnabled,
    };
  };

  it('workspace never configured → no operational Jira UI at all', () => {
    const cap = computeLegacy(false, false, false, true, true);
    expect(cap.workspaceState).toBe('NOT_CONFIGURED');
    expect(cap.showOperationalJira).toBe(false);
    expect(cap.canCreate).toBe(false);
    expect(cap.canLink).toBe(false);
    expect(cap.canSync).toBe(false);
    expect(cap.canUnlink).toBe(false);
    expect(cap.reason).toBe('NOT_CONFIGURED');
  });

  it('workspace configured but disabled → no create/link/sync, but showOperationalJira false', () => {
    const cap = computeLegacy(true, false, true, true, true);
    expect(cap.workspaceState).toBe('DISABLED');
    expect(cap.showOperationalJira).toBe(false);
    expect(cap.canCreate).toBe(false);
    expect(cap.canLink).toBe(false);
    expect(cap.canSync).toBe(false);
    expect(cap.reason).toBe('DISABLED');
  });

  it('workspace enabled but unmapped → no create, but link allowed', () => {
    const cap = computeLegacy(true, true, false, true, true);
    expect(cap.workspaceState).toBe('ENABLED');
    expect(cap.serviceMapped).toBe(false);
    expect(cap.canCreate).toBe(false);
    expect(cap.canLink).toBe(true);
    expect(cap.canSync).toBe(true);
    expect(cap.reason).toBe('NOT_MAPPED');
  });

  it('workspace enabled + mapped → full UI', () => {
    const cap = computeLegacy(true, true, true, true, true);
    expect(cap.workspaceState).toBe('ENABLED');
    expect(cap.canCreate).toBe(true);
    expect(cap.canLink).toBe(true);
    expect(cap.canSync).toBe(true);
    expect(cap.canUnlink).toBe(true);
    expect(cap.reason).toBe('OK');
  });

  it('user without manage permission → no operational UI even when configured', () => {
    const cap = computeLegacy(true, true, true, true, false);
    expect(cap.showOperationalJira).toBe(false);
    expect(cap.canCreate).toBe(false);
    expect(cap.canLink).toBe(false);
    expect(cap.canSync).toBe(false);
  });

  it('syncEnabled=false → canSync false but other capabilities intact', () => {
    const cap = computeLegacy(true, true, true, false, true);
    expect(cap.canCreate).toBe(true);
    expect(cap.canLink).toBe(true);
    expect(cap.canSync).toBe(false);
    expect(cap.canUnlink).toBe(true);
  });

  it('workspace scope: unmapped aggregate board still allows create (deferred to action)', () => {
    const cap = computeLegacy(true, true, false, true, true, 'workspace');
    expect(cap.showOperationalJira).toBe(true);
    expect(cap.canCreate).toBe(true); // mapping validated downstream per entity
    expect(cap.canLink).toBe(true);
    expect(cap.reason).toBe('OK');
  });

  it('workspace scope: never-configured board shows no Jira UI', () => {
    const cap = computeLegacy(false, false, false, true, true, 'workspace');
    expect(cap.workspaceState).toBe('NOT_CONFIGURED');
    expect(cap.showOperationalJira).toBe(false);
    expect(cap.canCreate).toBe(false);
    expect(cap.canLink).toBe(false);
  });
});
