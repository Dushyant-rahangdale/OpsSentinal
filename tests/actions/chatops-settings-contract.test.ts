import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  assertAdmin: vi.fn(),
  findUnique: vi.fn(),
  create: vi.fn(),
  findUniqueOrThrow: vi.fn(),
  transaction: vi.fn(),
  logAudit: vi.fn(),
  revalidatePath: vi.fn(),
}));

const tx = {
  chatOpsConfig: { create: mocks.create, findUniqueOrThrow: mocks.findUniqueOrThrow },
};

vi.mock('@/lib/rbac', () => ({
  assertAdmin: mocks.assertAdmin,
}));

vi.mock('@/lib/prisma', () => ({
  __esModule: true,
  default: {
    chatOpsConfig: { findUnique: mocks.findUnique },
    $transaction: mocks.transaction,
  },
}));

vi.mock('@/lib/audit', () => ({
  logAudit: mocks.logAudit,
}));

vi.mock('next/cache', () => ({
  revalidatePath: mocks.revalidatePath,
}));

import { saveChatOpsConfig } from '@/app/(app)/settings/integrations/chatops/actions';

function baseFormData() {
  const formData = new FormData();
  formData.set('channelPrefix', 'inc');
  formData.set('defaultVideoBridge', 'NONE');
  return formData;
}

describe('ChatOps settings contract', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.assertAdmin.mockResolvedValue({ id: 'admin-1' });
    mocks.findUnique.mockResolvedValue(null);
    mocks.create.mockResolvedValue({});
    mocks.findUniqueOrThrow.mockResolvedValue({ updatedAt: new Date('2026-09-09T00:00:00Z') });
    mocks.transaction.mockImplementation(async callback => callback(tx));
  });

  it('rejects an invalid non-empty URL even when bridge selection is NONE', async () => {
    const formData = baseFormData();
    formData.set('customBridgeUrlTemplate', 'javascript:alert(1)');

    const result = await saveChatOpsConfig(undefined, formData);

    expect(result).toMatchObject({
      success: false,
      code: 'VALIDATION_ERROR',
      error: 'Custom bridge URL must be a valid HTTP(S) URL template.',
    });
    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it('rejects unsupported template placeholders', async () => {
    const formData = baseFormData();
    formData.set('customBridgeUrlTemplate', 'https://meet.example.com/{workspaceId}');

    const result = await saveChatOpsConfig(undefined, formData);

    expect(result).toMatchObject({
      success: false,
      code: 'VALIDATION_ERROR',
      error: 'Unsupported bridge URL template variable: {workspaceId}.',
    });
    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it('accepts the supported incidentId placeholder and audits atomically', async () => {
    const formData = baseFormData();
    formData.set('customBridgeUrlTemplate', 'https://meet.example.com/{incidentId}');

    const result = await saveChatOpsConfig(undefined, formData);

    expect(result).toEqual({
      success: true,
      error: null,
      updatedAt: '2026-09-09T00:00:00.000Z',
    });
    expect(mocks.transaction).toHaveBeenCalledTimes(1);
    expect(mocks.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          customBridgeUrlTemplate: 'https://meet.example.com/{incidentId}',
        }),
      })
    );
    expect(mocks.logAudit).toHaveBeenCalledTimes(1);
    expect(mocks.logAudit).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'chatops.config.updated', actorId: 'admin-1' }),
      tx
    );
  });
});
