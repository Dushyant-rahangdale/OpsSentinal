import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  assertAdmin: vi.fn(),
  findUnique: vi.fn(),
  decrypt: vi.fn(),
  testJiraConnection: vi.fn(),
}));

vi.mock('@/lib/rbac', () => ({ assertAdmin: mocks.assertAdmin }));
vi.mock('@/lib/prisma', () => ({
  __esModule: true,
  default: { jiraConfig: { findUnique: mocks.findUnique } },
}));
vi.mock('@/lib/encryption', () => ({ decrypt: mocks.decrypt }));
vi.mock('@/lib/jira', () => ({ testJiraConnection: mocks.testJiraConnection }));
vi.mock('@/lib/logger', () => ({ logger: { error: vi.fn() } }));

import { POST } from '@/app/api/jira/test/route';

describe('Jira connection-test credential boundary', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.assertAdmin.mockResolvedValue({ id: 'admin-1' });
    mocks.findUnique.mockResolvedValue({
      baseUrl: 'https://workspace.atlassian.net',
      userEmail: 'jira@example.com',
      apiTokenEncrypted: 'encrypted-token',
    });
    mocks.decrypt.mockResolvedValue('stored-token');
    mocks.testJiraConnection.mockResolvedValue({ accountId: 'account-1' });
  });

  it('reuses a masked stored token only for the configured origin', async () => {
    const response = await POST(
      new Request('http://localhost/api/jira/test', {
        method: 'POST',
        body: JSON.stringify({
          baseUrl: 'https://workspace.atlassian.net/path',
          userEmail: 'jira@example.com',
          apiToken: '********',
        }),
      }) as never
    );

    expect(response.status).toBe(200);
    expect(mocks.decrypt).toHaveBeenCalledOnce();
    expect(mocks.testJiraConnection).toHaveBeenCalledWith(
      expect.objectContaining({ apiToken: 'stored-token' })
    );
  });

  it('never sends a stored token to a caller-supplied origin', async () => {
    const response = await POST(
      new Request('http://localhost/api/jira/test', {
        method: 'POST',
        body: JSON.stringify({
          baseUrl: 'https://attacker.example',
          userEmail: 'jira@example.com',
          apiToken: '********',
        }),
      }) as never
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.code).toBe('VALIDATION_FAILED');
    expect(mocks.decrypt).not.toHaveBeenCalled();
    expect(mocks.testJiraConnection).not.toHaveBeenCalled();
  });
});
