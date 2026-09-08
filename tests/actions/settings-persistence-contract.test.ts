import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  userUpdate: vi.fn(),
  topLevelUserAvatarUpsert: vi.fn(),
  topLevelUserAvatarDeleteMany: vi.fn(),
  txUserUpdate: vi.fn(),
  txUserAvatarUpsert: vi.fn(),
  txUserAvatarDeleteMany: vi.fn(),
  apiKeyFindUnique: vi.fn(),
  txApiKeyUpdateMany: vi.fn(),
  transaction: vi.fn(),
  logAudit: vi.fn(),
  revalidatePath: vi.fn(),
  getEmailConfig: vi.fn(),
  getSMSConfig: vi.fn(),
  getPushConfig: vi.fn(),
  getWhatsAppConfig: vi.fn(),
}));

const tx = {
  user: { update: mocks.txUserUpdate },
  userAvatar: {
    upsert: mocks.txUserAvatarUpsert,
    deleteMany: mocks.txUserAvatarDeleteMany,
  },
  apiKey: {
    updateMany: mocks.txApiKeyUpdateMany,
  },
};

vi.mock('@/lib/rbac', () => ({
  getCurrentUser: mocks.getCurrentUser,
}));

vi.mock('@/lib/prisma', () => ({
  __esModule: true,
  default: {
    user: { update: mocks.userUpdate },
    userAvatar: {
      upsert: mocks.topLevelUserAvatarUpsert,
      deleteMany: mocks.topLevelUserAvatarDeleteMany,
    },
    apiKey: {
      findUnique: mocks.apiKeyFindUnique,
    },
    $transaction: mocks.transaction,
  },
}));

vi.mock('@/lib/audit', () => ({
  logAudit: mocks.logAudit,
}));

vi.mock('next/cache', () => ({
  revalidatePath: mocks.revalidatePath,
}));

vi.mock('@/lib/notification-providers', () => ({
  getEmailConfig: mocks.getEmailConfig,
  getSMSConfig: mocks.getSMSConfig,
  getPushConfig: mocks.getPushConfig,
  getWhatsAppConfig: mocks.getWhatsAppConfig,
}));

vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

import {
  revokeApiKey,
  updateNotificationPreferences,
  updateProfile,
} from '@/app/(app)/settings/actions';

describe('settings persistence contracts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.transaction.mockImplementation(async callback => callback(tx));
    mocks.getCurrentUser.mockResolvedValue({
      id: 'user-1',
      name: 'Test User',
      email: 'test@example.com',
      role: 'ADMIN',
      phoneNumber: '+919876543210',
    });
    mocks.userUpdate.mockResolvedValue({});
    mocks.txUserUpdate.mockResolvedValue({});
    mocks.txUserAvatarUpsert.mockResolvedValue({});
    mocks.txUserAvatarDeleteMany.mockResolvedValue({ count: 1 });
    mocks.getEmailConfig.mockResolvedValue({ enabled: true });
    mocks.getSMSConfig.mockResolvedValue({ enabled: true });
    mocks.getPushConfig.mockResolvedValue({ enabled: true });
    mocks.getWhatsAppConfig.mockResolvedValue({ enabled: true });
  });

  it('preserves the stored phone when the phone field is omitted', async () => {
    const formData = new FormData();
    formData.set('smsNotificationsEnabled', 'true');

    const result = await updateNotificationPreferences({}, formData);

    expect(result).toEqual({ success: true });
    expect(mocks.userUpdate).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      data: {
        emailNotificationsEnabled: false,
        smsNotificationsEnabled: true,
        pushNotificationsEnabled: false,
        whatsappNotificationsEnabled: false,
      },
    });
  });

  it('clears the phone only when the field is explicitly submitted empty', async () => {
    const formData = new FormData();
    formData.set('phoneNumber', '');

    const result = await updateNotificationPreferences({}, formData);

    expect(result).toEqual({ success: true });
    expect(mocks.userUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ phoneNumber: null }),
      })
    );
  });

  it('validates channel enablement against the effective stored phone', async () => {
    mocks.getCurrentUser.mockResolvedValue({
      id: 'user-1',
      name: 'Test User',
      email: 'test@example.com',
      role: 'ADMIN',
      phoneNumber: null,
    });
    const formData = new FormData();
    formData.set('whatsappNotificationsEnabled', 'true');

    const result = await updateNotificationPreferences({}, formData);

    expect(result).toEqual({
      error: 'A valid phone number is required when SMS or WhatsApp notifications are enabled.',
    });
    expect(mocks.userUpdate).not.toHaveBeenCalled();
  });

  it('commits avatar removal and avatarUrl update in one transaction', async () => {
    const formData = new FormData();
    formData.set('removeAvatar', 'true');

    const result = await updateProfile({}, formData);

    expect(result).toEqual({ success: true });
    expect(mocks.transaction).toHaveBeenCalledTimes(1);
    expect(mocks.txUserAvatarDeleteMany).toHaveBeenCalledWith({ where: { userId: 'user-1' } });
    expect(mocks.txUserUpdate).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      data: expect.objectContaining({ avatarUrl: expect.any(String) }),
    });
    expect(mocks.topLevelUserAvatarDeleteMany).not.toHaveBeenCalled();
    expect(mocks.topLevelUserAvatarUpsert).not.toHaveBeenCalled();
  });

  it('does not write a duplicate revoke audit when the key is already revoked', async () => {
    mocks.apiKeyFindUnique.mockResolvedValue({ id: 'key-1', userId: 'user-1' });
    mocks.txApiKeyUpdateMany.mockResolvedValue({ count: 0 });
    const formData = new FormData();
    formData.set('keyId', 'key-1');

    await revokeApiKey(formData);

    expect(mocks.txApiKeyUpdateMany).toHaveBeenCalledTimes(1);
    expect(mocks.logAudit).not.toHaveBeenCalled();
  });

  it('writes exactly one revoke audit when the state transition occurs', async () => {
    mocks.apiKeyFindUnique.mockResolvedValue({ id: 'key-1', userId: 'user-1' });
    mocks.txApiKeyUpdateMany.mockResolvedValue({ count: 1 });
    const formData = new FormData();
    formData.set('keyId', 'key-1');

    await revokeApiKey(formData);

    expect(mocks.logAudit).toHaveBeenCalledTimes(1);
    expect(mocks.logAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'api_key.revoked',
        entityId: 'key-1',
        actorId: 'user-1',
      }),
      tx
    );
  });
});
