import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  assertAdminOrResponder: vi.fn(),
  actionItemFindUnique: vi.fn(),
  incidentFindUnique: vi.fn(),
  jiraConfigFindUnique: vi.fn(),
  externalIssueFindFirst: vi.fn(),
  externalIssueDeleteMany: vi.fn(),
  incidentEventCreate: vi.fn(),
  createJiraIssueAndLink: vi.fn(),
  linkExistingJiraIssue: vi.fn(),
  syncExternalIssueLink: vi.fn(),
  revalidatePath: vi.fn(),
}));

vi.mock('@/lib/rbac', () => ({
  assertAdminOrResponder: mocks.assertAdminOrResponder,
}));

vi.mock('@/lib/prisma', () => ({
  __esModule: true,
  default: {
    actionItem: { findUnique: mocks.actionItemFindUnique },
    incident: { findUnique: mocks.incidentFindUnique },
    jiraConfig: { findUnique: mocks.jiraConfigFindUnique },
    externalIssueLink: {
      findFirst: mocks.externalIssueFindFirst,
      deleteMany: mocks.externalIssueDeleteMany,
    },
    incidentEvent: { create: mocks.incidentEventCreate },
  },
}));

vi.mock('@/lib/jira-sync', () => ({
  createJiraIssueAndLink: mocks.createJiraIssueAndLink,
  linkExistingJiraIssue: mocks.linkExistingJiraIssue,
  syncExternalIssueLink: mocks.syncExternalIssueLink,
}));

vi.mock('next/cache', () => ({ revalidatePath: mocks.revalidatePath }));

import {
  syncActionItemJiraIssue,
  unlinkJiraIssueFromActionItem,
} from '@/app/(app)/action-items/jira/actions';
import {
  syncIncidentJiraIssue,
  unlinkJiraIssueFromIncident,
} from '@/app/(app)/incidents/jira/actions';

describe('Jira P0 production action contract', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.assertAdminOrResponder.mockResolvedValue({ id: 'responder-1' });
    mocks.externalIssueDeleteMany.mockResolvedValue({ count: 1 });
    mocks.incidentEventCreate.mockResolvedValue({ id: 'event-1' });
  });

  describe('action-item ownership scoping', () => {
    it('requires the exact actionItemId for unlink and scopes the mutation itself', async () => {
      mocks.externalIssueFindFirst.mockResolvedValue({
        id: 'link-1',
        externalKey: 'OPS-1',
        actionItem: { postmortemId: 'pm-1', incidentId: 'inc-1' },
      });

      const result = await unlinkJiraIssueFromActionItem('action-1', 'link-1');

      expect(result).toEqual({ success: true });
      expect(mocks.externalIssueFindFirst).toHaveBeenCalledWith({
        where: { id: 'link-1', provider: 'JIRA', actionItemId: 'action-1' },
        select: {
          id: true,
          externalKey: true,
          actionItem: { select: { postmortemId: true, incidentId: true } },
        },
      });
      expect(mocks.externalIssueDeleteMany).toHaveBeenCalledWith({
        where: { id: 'link-1', provider: 'JIRA', actionItemId: 'action-1' },
      });
    });

    it("does not unlink another action item's Jira link", async () => {
      mocks.externalIssueFindFirst.mockResolvedValue(null);

      const result = await unlinkJiraIssueFromActionItem('action-A', 'link-owned-by-B');

      expect(result.success).toBe(false);
      expect(result.error).toContain('this action item');
      expect(mocks.externalIssueDeleteMany).not.toHaveBeenCalled();
    });

    it("does not call Jira sync for another action item's link", async () => {
      mocks.externalIssueFindFirst.mockResolvedValue(null);

      const result = await syncActionItemJiraIssue('action-A', 'link-owned-by-B');

      expect(result.success).toBe(false);
      expect(mocks.syncExternalIssueLink).not.toHaveBeenCalled();
    });

    it('propagates a null sync result as failure instead of claiming success', async () => {
      mocks.externalIssueFindFirst.mockResolvedValue({
        id: 'link-1',
        actionItem: { postmortemId: 'pm-1', incidentId: 'inc-1' },
      });
      mocks.syncExternalIssueLink.mockResolvedValue(null);

      const result = await syncActionItemJiraIssue('action-1', 'link-1');

      expect(result.success).toBe(false);
      expect(result.error).toContain('sync failed');
      expect(mocks.syncExternalIssueLink).toHaveBeenCalledWith('link-1');
    });

    it('uses the production Jira error classifier for provider failures', async () => {
      mocks.externalIssueFindFirst.mockResolvedValue({
        id: 'link-1',
        actionItem: { postmortemId: 'pm-1', incidentId: 'inc-1' },
      });
      mocks.syncExternalIssueLink.mockRejectedValue(new Error('Jira request failed (401)'));

      const result = await syncActionItemJiraIssue('action-1', 'link-1');

      expect(result.success).toBe(false);
      expect(result.error).toContain('authentication failed');
    });
  });

  describe('incident ownership scoping', () => {
    it('requires the exact incidentId for unlink and scopes the mutation itself', async () => {
      mocks.externalIssueFindFirst.mockResolvedValue({
        id: 'link-2',
        externalKey: 'OPS-2',
        incidentId: 'inc-2',
      });

      const result = await unlinkJiraIssueFromIncident('link-2', 'inc-2');

      expect(result).toEqual({ success: true });
      expect(mocks.externalIssueFindFirst).toHaveBeenCalledWith({
        where: { id: 'link-2', provider: 'JIRA', incidentId: 'inc-2' },
        select: { id: true, externalKey: true, incidentId: true },
      });
      expect(mocks.externalIssueDeleteMany).toHaveBeenCalledWith({
        where: { id: 'link-2', provider: 'JIRA', incidentId: 'inc-2' },
      });
      expect(mocks.incidentEventCreate).toHaveBeenCalledWith({
        data: {
          incidentId: 'inc-2',
          type: 'COMMENT',
          message: 'Jira issue OPS-2 unlinked',
        },
      });
    });

    it("does not call Jira sync for another incident's link", async () => {
      mocks.externalIssueFindFirst.mockResolvedValue(null);

      const result = await syncIncidentJiraIssue('link-owned-by-B', 'inc-A');

      expect(result.success).toBe(false);
      expect(mocks.syncExternalIssueLink).not.toHaveBeenCalled();
    });

    it('reports successful owned sync only when the production sync returns a link', async () => {
      mocks.externalIssueFindFirst.mockResolvedValue({ id: 'link-3' });
      mocks.syncExternalIssueLink.mockResolvedValue({ id: 'link-3', externalKey: 'OPS-3' });

      const result = await syncIncidentJiraIssue('link-3', 'inc-3');

      expect(result).toEqual({ success: true });
      expect(mocks.syncExternalIssueLink).toHaveBeenCalledWith('link-3');
    });
  });
});
