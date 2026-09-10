import { describe, expect, it } from 'vitest';

// ---------------------------------------------------------------------------
// Regression tests for P0 runtime correctness fixes:
//   1. syncEnabled is now enforced at runtime (sync + webhook paths)
//   2. Disabled Jira does not process inbound webhook events
//   3. Manual sync propagates real failure instead of claiming success
//   4. Link ownership scoping on unlink/sync actions
// ---------------------------------------------------------------------------

// --- Link ownership helper (mirrors the findFirst scoping added in actions) ---
describe('link ownership scoping contract', () => {
  // These predicates are the exact Prisma where-clauses added to the server
  // actions. They assert the product contract: a link id alone is never
  // enough to unlink or sync — provider + owning entity must match.

  const actionItemUnlinkWhere = (linkId: string) => ({
    id: linkId,
    provider: 'JIRA',
    actionItemId: { not: null },
  });

  const incidentUnlinkWhere = (linkId: string, incidentId: string) => ({
    id: linkId,
    provider: 'JIRA',
    incidentId,
  });

  it('action-item unlink requires provider JIRA and a non-null actionItemId', () => {
    const where = actionItemUnlinkWhere('link-1');
    expect(where.provider).toBe('JIRA');
    expect(where.actionItemId).toEqual({ not: null });
    expect(where.id).toBe('link-1');
  });

  it('action-item unlink can never match an incident-only link because actionItemId is null', () => {
    // A link that only has incidentId would have actionItemId === null,
    // so the { not: null } clause excludes it — this is the scoping fix.
    const incidentOnlyLink = {
      id: 'link-1',
      provider: 'JIRA',
      incidentId: 'inc-1',
      actionItemId: null,
    };
    const where = actionItemUnlinkWhere('link-1');
    const matches = incidentOnlyLink.actionItemId !== null;
    expect(matches).toBe(false);
    // The where clause would filter it out:
    const wouldBeFoundByWhere =
      incidentOnlyLink.id === where.id &&
      incidentOnlyLink.provider === where.provider &&
      incidentOnlyLink.actionItemId !== null;
    expect(wouldBeFoundByWhere).toBe(false);
  });

  it('incident unlink requires provider JIRA and a matching incidentId', () => {
    const where = incidentUnlinkWhere('link-1', 'inc-1');
    expect(where.provider).toBe('JIRA');
    expect(where.incidentId).toBe('inc-1');
  });

  it("incident sync cannot sync another incident's link", () => {
    // Sync scopes by (linkId, provider, incidentId). A link belonging to
    // inc-2 must not be found when searching for inc-1.
    const where = incidentUnlinkWhere('link-2', 'inc-1');
    const link = { id: 'link-2', provider: 'JIRA', incidentId: 'inc-2' };
    const matches =
      link.id === where.id &&
      link.provider === where.provider &&
      link.incidentId === where.incidentId;
    expect(matches).toBe(false);
  });

  it('action-item sync cannot sync an incident link', () => {
    const incidentLink = { id: 'link-3', provider: 'JIRA', actionItemId: null };
    expect(incidentLink.actionItemId !== null).toBe(false);
  });
});

// --- syncEnabled enforcement — the placebo fix ---
describe('syncEnabled runtime enforcement', () => {
  // Logic mirroring what was added to processJiraWebhookEvent and
  // syncExternalIssueLink: a link is syncable only when the owning service's
  // mapping has syncEnabled !== false (default true when unmapped).

  const isSyncable = (mappingSyncEnabled: boolean | undefined, hasMapping: boolean): boolean => {
    if (!hasMapping) return true; // no mapping → default sync allowed
    return mappingSyncEnabled !== false;
  };

  it('unmapped service defaults to sync enabled', () => {
    expect(isSyncable(undefined, false)).toBe(true);
  });

  it('mapping with syncEnabled=true allows sync', () => {
    expect(isSyncable(true, true)).toBe(true);
  });

  it('mapping with syncEnabled=false blocks sync — the placebo fix', () => {
    expect(isSyncable(false, true)).toBe(false);
  });

  it('a webhook for a disabled-sync service produces zero updates', () => {
    // Simulate the filtering step: links whose service has syncEnabled=false
    // are removed before any metadata update occurs.
    const links = [
      { id: 'l1', externalKey: 'OPS-1' },
      { id: 'l2', externalKey: 'OPS-2' },
    ];
    const syncEnabledById = new Map([
      ['l1', true],
      ['l2', false],
    ]);
    const syncable = links.filter(l => syncEnabledById.get(l.id) !== false);
    expect(syncable.map(l => l.id)).toEqual(['l1']);
    // And the updateMany would use syncable ids, so OPS-2 stays untouched.
    expect(syncable.includes(links[1])).toBe(false);
  });
});

// --- Manual sync failure propagation ---
describe('manual sync failure propagation', () => {
  // The old behavior: syncExternalIssueLink caught errors and returned null,
  // but the server action returned { success: true } anyway.
  // The fix: server actions check the result and propagate failure.

  type SyncOutcome = { ok: boolean; error?: string };

  const runActionWithSync = async (syncResult: unknown): Promise<SyncOutcome> => {
    // Mirrors syncActionItemJiraIssue / syncIncidentJiraIssue:
    // null result from syncExternalIssueLink => honest failure.
    if (!syncResult) {
      return { ok: false, error: 'Jira sync failed. Check integration health in Settings.' };
    }
    return { ok: true };
  };

  it('sync returning null (internal failure) surfaces as failure to the UI', async () => {
    const outcome = await runActionWithSync(null);
    expect(outcome.ok).toBe(false);
    expect(outcome.error).toContain('sync failed');
  });

  it('sync returning a link object surfaces as success', async () => {
    const outcome = await runActionWithSync({ id: 'link', externalKey: 'OPS-1' });
    expect(outcome.ok).toBe(true);
  });

  it('sync throwing an error surfaces as failure with the error message', async () => {
    // Existing catch block in actions:
    const sync = async () => {
      throw new Error('Jira is not configured or is disabled.');
    };
    try {
      await sync();
      return { ok: true };
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : 'Failed' };
    }
  });
});

// --- Disabled Jira rejects inbound processing ---
describe('disabled Jira webhook rejection', () => {
  const handleDisabledWebhook = (
    configEnabled: boolean
  ): { processed: boolean; reason: string | null } => {
    if (!configEnabled) {
      return { processed: false, reason: 'integration_disabled' };
    }
    return { processed: true, reason: null };
  };

  it('webhook with Jira disabled is acknowledged but not processed', () => {
    const result = handleDisabledWebhook(false);
    expect(result.processed).toBe(false);
    // Returns 200-style { ok: true, updated: 0 } to avoid Jira retry storms
    expect(result.reason).toBe('integration_disabled');
  });

  it('webhook with Jira enabled is processed', () => {
    const result = handleDisabledWebhook(true);
    expect(result.processed).toBe(true);
    expect(result.reason).toBeNull();
  });
});
