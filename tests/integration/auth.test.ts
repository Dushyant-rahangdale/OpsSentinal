import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getAuthOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import type { Role, User, UserStatus } from '@prisma/client';
import { DigestLevel } from '@prisma/client';
import bcrypt from 'bcryptjs';

type Credentials = { email?: string; password?: string };

function getCredentialsAuthorize(authOptions: Awaited<ReturnType<typeof getAuthOptions>>) {
  const provider = authOptions.providers.find(p => p.id === 'credentials');
  if (
    !provider ||
    typeof (provider as unknown as { options?: { authorize?: unknown } }).options?.authorize !==
      'function'
  ) {
    throw new Error('Credentials provider authorize function not found');
  }
  return (
    provider as unknown as {
      options: { authorize: (credentials: Credentials) => Promise<unknown> };
    }
  ).options.authorize;
}

function mockUserFindUnique(value: User | null) {
  (
    vi.spyOn(prisma.user, 'findUnique') as unknown as {
      mockResolvedValue: (v: User | null) => unknown;
    }
  ).mockResolvedValue(value);
}

function makeUser(overrides: Partial<User> = {}): User {
  const now = new Date();
  return {
    id: 'u1',
    name: 'Test User',
    email: 'test@example.com',
    role: 'ADMIN' as Role,
    status: 'ACTIVE' as UserStatus,
    passwordHash: 'hashed-pw',
    timeZone: 'UTC',
    dailySummary: true,
    incidentDigest: DigestLevel.HIGH,
    emailNotificationsEnabled: false,
    smsNotificationsEnabled: false,
    pushNotificationsEnabled: false,
    whatsappNotificationsEnabled: false,
    phoneNumber: null,
    invitedAt: null,
    deactivatedAt: null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  } as User;
}

describe('Authentication Logic', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('CredentialsProvider authorize', () => {
    it('should return user for correct credentials', async () => {
      const authOptions = await getAuthOptions();
      const authorize = getCredentialsAuthorize(authOptions);

      const passwordHash = 'hashed-pw';
      mockUserFindUnique(makeUser({ passwordHash }));
      vi.spyOn(bcrypt, 'compare').mockResolvedValue(true);

      const result = await authorize({
        email: 'test@example.com',
        password: 'password123',
      });

      expect(result).toEqual({
        id: 'u1',
        name: 'Test User',
        email: 'test@example.com',
        role: 'ADMIN',
      });
    });

    it('should return null for invalid password', async () => {
      const authOptions = await getAuthOptions();
      const authorize = getCredentialsAuthorize(authOptions);

      mockUserFindUnique(makeUser({ passwordHash: 'hash' }));
      vi.spyOn(bcrypt, 'compare').mockResolvedValue(false);

      const result = await authorize({
        email: 'test@example.com',
        password: 'wrong',
      });

      expect(result).toBeNull();
    });

    it('should return null for disabled user', async () => {
      const authOptions = await getAuthOptions();
      const authorize = getCredentialsAuthorize(authOptions);

      mockUserFindUnique(makeUser({ passwordHash: 'hash', status: 'DISABLED' as UserStatus }));

      const result = await authorize({
        email: 'test@example.com',
        password: 'password',
      });

      expect(result).toBeNull();
    });

    it('should activate invited user on successful login', async () => {
      const authOptions = await getAuthOptions();
      const authorize = getCredentialsAuthorize(authOptions);

      mockUserFindUnique(
        makeUser({
          email: 'invited@example.com',
          passwordHash: 'hash',
          status: 'INVITED' as UserStatus,
          name: 'Invited User',
        })
      );
      const updateSpy = vi.spyOn(prisma.user, 'update');
      (updateSpy as unknown as { mockResolvedValue: (v: User) => unknown }).mockResolvedValue(
        makeUser({
          email: 'invited@example.com',
          status: 'ACTIVE' as UserStatus,
          name: 'Invited User',
        })
      );
      vi.spyOn(bcrypt, 'compare').mockResolvedValue(true);

      await authorize({
        email: 'invited@example.com',
        password: 'password',
      });

      expect(updateSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { email: 'invited@example.com' },
          data: expect.objectContaining({ status: 'ACTIVE' }),
        })
      );
    });
  });

  describe('Callbacks', () => {
    it('jwt callback should update token from DB', async () => {
      const authOptions = await getAuthOptions();
      const token: Record<string, unknown> = { sub: 'u1', role: 'USER' };

      mockUserFindUnique(
        makeUser({
          id: 'u1',
          name: 'New Name',
          email: 'new@example.com',
          role: 'ADMIN' as Role,
        })
      );

      const jwtCallback = authOptions.callbacks?.jwt as unknown as (args: {
        token: Record<string, unknown>;
        user?: unknown;
      }) => Promise<Record<string, unknown>>;
      const result = await jwtCallback({ token });

      expect(result.role).toBe('ADMIN');
      expect(result.name).toBe('New Name');
    });

    it('session callback should include role and id', async () => {
      const authOptions = await getAuthOptions();
      const session: { user: Record<string, unknown> } = { user: { name: 'Test' } };
      const token: Record<string, unknown> = { sub: 'u1', role: 'ADMIN', name: 'Updated' };

      const sessionCallback = authOptions.callbacks?.session as unknown as (args: {
        session: { user: Record<string, unknown> };
        token: Record<string, unknown>;
      }) => Promise<{ user: Record<string, unknown> }>;
      const result = await sessionCallback({ session, token });

      expect(result.user.role).toBe('ADMIN');
      expect(result.user.id).toBe('u1');
      expect(result.user.name).toBe('Updated');
    });
  });
});
