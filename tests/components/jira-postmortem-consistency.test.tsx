import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import PostmortemActionItems from '@/components/postmortem/PostmortemActionItems';
import { normalizeLegacyActionItems } from '@/lib/action-items';
import { deriveJiraCapability } from '@/lib/jira-capabilities';

vi.mock('@/contexts/TimezoneContext', () => ({
  useTimezone: () => ({ userTimeZone: 'UTC' }),
}));

vi.mock('@/app/(app)/action-items/jira/actions', () => ({
  createJiraIssueFromActionItem: vi.fn().mockResolvedValue({ success: true }),
  linkJiraIssueToActionItem: vi.fn().mockResolvedValue({ success: true }),
  unlinkJiraIssueFromActionItem: vi.fn().mockResolvedValue({ success: true }),
  syncActionItemJiraIssue: vi.fn().mockResolvedValue({ success: true }),
}));

const jiraCapability = deriveJiraCapability({
  workspaceState: 'ENABLED',
  canManage: true,
  serviceMapped: true,
  syncEnabled: true,
  rawEnabled: true,
});

describe('postmortem Jira action-item consistency', () => {
  it('shows an existing Jira ticket instead of Create Jira after the postmortem boundary normalizes it', () => {
    const items = normalizeLegacyActionItems([
      {
        id: 'ai-postmortem-1-existing',
        title: 'Persisted follow-up',
        description: 'Already tracked in Jira',
        status: 'IN_PROGRESS',
        priority: 'HIGH',
        externalIssue: {
          linkId: 'link-456',
          provider: 'JIRA',
          key: 'OPS-456',
          url: 'https://acme.atlassian.net/browse/OPS-456',
          status: 'In Progress',
          assignee: 'Responder',
          syncState: 'SYNCED',
        },
      },
    ]);

    render(
      <PostmortemActionItems
        actionItems={items}
        onChange={vi.fn()}
        users={[]}
        jiraCapability={jiraCapability}
      />
    );

    expect(screen.getByText('Persisted follow-up')).toBeInTheDocument();
    expect(screen.getByText('OPS-456')).toBeInTheDocument();
    expect(screen.queryByText('Create Jira')).not.toBeInTheDocument();
    expect(screen.queryByTitle('Link existing Jira issue')).not.toBeInTheDocument();
  });
});
