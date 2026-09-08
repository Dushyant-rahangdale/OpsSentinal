import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  assertAdmin: vi.fn(),
  getCurrentUser: vi.fn(),
  findUnique: vi.fn(),
  findUniqueOrThrow: vi.fn(),
  txUpdateMany: vi.fn(),
  txCreate: vi.fn(),
  transaction: vi.fn(),
  logAudit: vi.fn(),
  decryptProviderConfig: vi.fn(),
  mergeSensitiveProviderFields: vi.fn(),
  encryptProviderConfig: vi.fn(),
  revalidatePath: vi.fn(),
}));

const tx = {
  notificationProvider: {
    updateMany: mocks.txUpdateMany,
    create: mocks.txCreate,
  },
};

vi.mock('@/lib/rbac', () => ({
  assertAdmin: mocks.assertAdmin,
  getCurrentUser: mocks.getCurrentUser,
}));

vi.mock('@/lib/prisma', () => ({
  __esModule: true,
  default: {
    notificationProvider: {
      findUnique: mocks.findUnique,
      findUniqueOrThrow: mocks.findUniqueOrThrow,
    },
    $transaction: mocks.transaction,
  },
}));

vi.mock('@/lib/audit', () => ({ logAudit: mocks.logAudit }));
vi.mock('@/lib/encrypted-provider-config', () => ({
  decryptProviderConfig: mocks.decryptProviderConfig,
  mergeSensitiveProviderFields: mocks.mergeSensitiveProviderFields,
  encryptProviderConfig: mocks.encryptProviderConfig,
}));
vi.mock('next/cache', () => ({ revalidatePath: mocks.revalidatePath }));

import {
  SettingsChangedError,
  updateNotificationProvider,
} from '@/app/(app)/settings/system/provider-actions';

describe('notification provider persistence contract', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.assertAdmin.mockResolvedValue({ id: 'admin-1' });
    mocks.getCurrentUser.mockResolvedValue({ id: 'admin-1' });
    mocks.decryptProviderConfig.mockResolvedValue({ apiKey: 'stored-secret' });
    mocks.mergeSensitiveProviderFields.mockReturnValue({ apiKey: 'stored-secret', fromEmail: 'new@example.com' });
    mocks.encryptProviderConfig.mockResolvedValue({ encrypted: true });
    mocks.transaction.mockImplementation(async callback => callback(tx));
    mocks.findUniqueOrThrow.mockResolvedValue({
      updatedAt: new Date('2026-09-08T12:01:00.000Z'),
    });
  });

  it('updates only the revision the administrator actually loaded', async () => {
    mocks.findUnique.mockResolvedValue({
      id: 'provider-1',
      provider: 'resend',
      enabled: true,
      config: { encrypted: true },
      updatedAt: new Date('2026-09-08T12:00:00.000Z'),
    });
    mocks.txUpdateMany.mockResolvedValue({ count: 1 });

    const result = await updateNotificationProvider(
      'provider-1',
      'resend',
      true,
      { fromEmail: 'new@example.com', apiKey: '********' },
      '2026-09-08T12:00:00.000Z'
    );

    expect(mocks.txUpdateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: 'provider-1',
          updatedAt: new Date('2026-09-08T12:00:00.000Z'),
        },
      })
    );
    expect(mocks.logAudit).toHaveBeenCalledTimes(1);
    expect(mocks.logAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'notification_provider.updated',
        entityId: 'provider-1',
      }),
      tx
    );
    expect(result).toEqual({
      success: true,
      updatedAt: '2026-09-08T12:01:00.000Z',
    });
  });

  it('rejects a stale administrator and does not write an audit event', async () => {
    mocks.findUnique.mockResolvedValue({
      id: 'provider-1',
      provider: 'resend',
      enabled: true,
      config: { encrypted: true },
      updatedAt: new Date('2026-09-08T12:05:00.000Z'),
    });
    mocks.txUpdateMany.mockResolvedValue({ count: 0 });

    await expect(
      updateNotificationProvider(
        'provider-1',
        'resend',
        false,
        { fromEmail: 'stale@example.com' },
        '2026-09-08T12:00:00.000Z'
      )
    ).rejects.toBeInstanceOf(SettingsChangedError);

    expect(mocks.logAudit).not.toHaveBeenCalled();
    expect(mocks.findUniqueOrThrow).not.toHaveBeenCalled();
  });

  it('requires a revision for every existing provider write', async () => {
    mocks.findUnique.mockResolvedValue({
      id: 'provider-1',
      provider: 'resend',
      enabled: true,
      config: { encrypted: true },
      updatedAt: new Date('2026-09-08T12:00:00.000Z'),
    });

    await expect(
      updateNotificationProvider('provider-1', 'resend', true, { fromEmail: 'x@example.com' })
    ).rejects.toThrow('Settings revision is required');

    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it('creates provider configuration and audit in the same transaction', async () => {
    mocks.findUnique.mockResolvedValue(null);
    mocks.txCreate.mockResolvedValue({ id: 'provider-new' });

    const result = await updateNotificationProvider(
      null,
      'resend',
      true,
      { apiKey: 'new-secret', fromEmail: 'alerts@example.com' },
      null
    );

    expect(mocks.txCreate).toHaveBeenCalledTimes(1);
    expect(mocks.logAudit).toHaveBeenCalledTimes(1);
    expect(mocks.logAudit).toHaveBeenCalledWith(expect.any(Object), tx);
    expect(result.updatedAt).toBe('2026-09-08T12:01:00.000Z');
  });

  it('propagates audit failure so the surrounding transaction can roll back', async () => {
    mocks.findUnique.mockResolvedValue({
      id: 'provider-1',
      provider: 'resend',
      enabled: true,
      config: { encrypted: true },
      updatedAt: new Date('2026-09-08T12:00:00.000Z'),
    });
    mocks.txUpdateMany.mockResolvedValue({ count: 1 });
    mocks.logAudit.mockRejectedValue(new Error('audit unavailable'));

    await expect(
      updateNotificationProvider(
        'provider-1',
        'resend',
        true,
        { fromEmail: 'alerts@example.com' },
        '2026-09-08T12:00:00.000Z'
      )
    ).rejects.toThrow('audit unavailable');

    expect(mocks.findUniqueOrThrow).not.toHaveBeenCalled();
  });
});
