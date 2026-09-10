import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => {
  const tx = {
    jiraConfig: {
      findFirst: vi.fn(),
      deleteMany: vi.fn(),
    },
    providerAdmission: { deleteMany: vi.fn() },
    externalIssueLink: { deleteMany: vi.fn() },
    jiraServiceMapping: { deleteMany: vi.fn() },
    externalOperation: { deleteMany: vi.fn() },
    $executeRaw: vi.fn(),
  };

  return {
    assertAdmin: vi.fn(),
    logAudit: vi.fn(),
    revalidatePath: vi.fn(),
    jiraConfigFindUnique: vi.fn(),
    transaction: vi.fn(),
    tx,
  };
});

vi.mock('@/lib/rbac', () => ({ assertAdmin: mocks.assertAdmin }));
vi.mock('@/lib/audit', () => ({ logAudit: mocks.logAudit }));
vi.mock('next/cache', () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock('@/lib/prisma', () => ({
  __esModule: true,
  default: {
    jiraConfig: { findUnique: mocks.jiraConfigFindUnique },
    $transaction: mocks.transaction,
  },
}));

import { removeJiraWorkspace } from '@/app/(app)/settings/integrations/jira/actions';

const REVISION = new Date('2026-09-10T12:00:00.000Z');

function removalForm(confirmation = 'REMOVE JIRA', updatedAt = REVISION.toISOString()) {
  const formData = new FormData();
  formData.set('confirmation', confirmation);
  formData.set('updatedAt', updatedAt);
  return formData;
}

describe('Jira workspace lifecycle', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.assertAdmin.mockResolvedValue({ id: 'admin-1' });
    mocks.jiraConfigFindUnique.mockResolvedValue({
      id: 'default',
      baseUrl: 'https://acme.atlassian.net',
      userEmail: 'ops@acme.com',
      apiTokenEncrypted: 'encrypted-token',
      webhookSecretEncrypted: 'encrypted-secret',
      enabled: true,
      updatedAt: REVISION,
    });
    mocks.tx.jiraConfig.findFirst.mockResolvedValue({ id: 'default' });
    mocks.tx.jiraConfig.deleteMany.mockResolvedValue({ count: 1 });
    mocks.tx.providerAdmission.deleteMany.mockResolvedValue({ count: 2 });
    mocks.tx.externalIssueLink.deleteMany.mockResolvedValue({ count: 3 });
    mocks.tx.jiraServiceMapping.deleteMany.mockResolvedValue({ count: 4 });
    mocks.tx.externalOperation.deleteMany.mockResolvedValue({ count: 5 });
    mocks.tx.$executeRaw.mockResolvedValueOnce(6).mockResolvedValueOnce(7);
    mocks.transaction.mockImplementation(async callback => callback(mocks.tx));
  });

  it('requires explicit destructive confirmation', async () => {
    const result = await removeJiraWorkspace(removalForm('remove jira'));

    expect(result.success).toBe(false);
    expect(result.code).toBe('VALIDATION_ERROR');
    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it('fails closed when the settings revision changed', async () => {
    mocks.jiraConfigFindUnique.mockResolvedValue({
      id: 'default',
      updatedAt: new Date('2026-09-10T12:05:00.000Z'),
    });

    const result = await removeJiraWorkspace(removalForm());

    expect(result.success).toBe(false);
    expect(result.code).toBe('SETTINGS_CHANGED');
    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it('removes active Jira state while retaining provider tickets and audit history', async () => {
    const result = await removeJiraWorkspace(removalForm());

    expect(result).toEqual({ success: true, error: null, updatedAt: null });
    expect(mocks.tx.externalIssueLink.deleteMany).toHaveBeenCalledWith({
      where: { provider: 'JIRA' },
    });
    expect(mocks.tx.jiraServiceMapping.deleteMany).toHaveBeenCalledWith({});
    expect(mocks.tx.externalOperation.deleteMany).toHaveBeenCalledWith({
      where: { provider: 'JIRA' },
    });
    expect(mocks.tx.providerAdmission.deleteMany).toHaveBeenCalledWith({
      where: { key: { startsWith: 'jira:' } },
    });
    expect(mocks.tx.jiraConfig.deleteMany).toHaveBeenCalledWith({
      where: { id: 'default', updatedAt: REVISION },
    });
    expect(mocks.tx.$executeRaw).toHaveBeenCalledTimes(2);
    expect(mocks.logAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'jira.workspace.removed',
        actorId: 'admin-1',
        oldValue: expect.objectContaining({
          enabled: true,
          baseUrl: 'https://acme.atlassian.net',
          userEmail: 'ops@acme.com',
          hasWebhookSecret: true,
        }),
        newValue: null,
        details: expect.objectContaining({
          providerIssuesDeleted: false,
          historyRetained: true,
        }),
      }),
      mocks.tx
    );

    const auditPayload = mocks.logAudit.mock.calls[0]?.[0];
    expect(JSON.stringify(auditPayload)).not.toContain('encrypted-token');
    expect(JSON.stringify(auditPayload)).not.toContain('encrypted-secret');
  });

  it('requires admin authorization before touching Jira state', async () => {
    mocks.assertAdmin.mockRejectedValue(new Error('Admin access required'));

    const result = await removeJiraWorkspace(removalForm());

    expect(result.success).toBe(false);
    expect(result.code).toBe('FORBIDDEN');
    expect(mocks.jiraConfigFindUnique).not.toHaveBeenCalled();
    expect(mocks.transaction).not.toHaveBeenCalled();
  });
});
