import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';
import { getAuthOptions } from '@/lib/auth';
import { type Role, type User, type UserStatus, DigestLevel } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { testPrisma, resetDatabase, createTestUser } from '../helpers/test-db';

const describeIfRealDB = (process.env.VITEST_USE_REAL_DB === '1' || process.env.CI) ? describe : describe.skip;

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

describeIfRealDB('Authentication Logic (Real DB)', () => {
  beforeAll(async () => {
    // Ensure we are in real DB mode for these tests if this file is run
    process.env.VITEST_USE_REAL_DB = '1';
  });

  beforeEach(async () => {
    vi.clearAllMocks();
    await resetDatabase();
  });

  describe('CredentialsProvider authorize', () => {
    it('should return user for correct credentials', async () => {
      const authOptions = await getAuthOptions();
      const authorize = getCredentialsAuthorize(authOptions);

      const password = 'password123';
      const passwordHash = await bcrypt.hash(password, 10);
      const user = await createTestUser({
        email: 'test@example.com',
        passwordHash,
        role: 'ADMIN'
      });

      const result = await authorize({
        email: 'test@example.com',
        password: password,
      });

      expect(result).toEqual({
        id: user.id,
        name: 'Test User',
        email: 'test@example.com',
        role: 'ADMIN',
      });
    });

    it('should return null for invalid password', async () => {
      const authOptions = await getAuthOptions();
      const authorize = getCredentialsAuthorize(authOptions);

      const passwordHash = await bcrypt.hash('correct-password', 10);
      await createTestUser({ email: 'test@example.com', passwordHash });

      const result = await authorize({
        email: 'test@example.com',
        password: 'wrong-password',
      });

      expect(result).toBeNull();
    });

    it('should return null for disabled user', async () => {
      const authOptions = await getAuthOptions();
      const authorize = getCredentialsAuthorize(authOptions);

      const passwordHash = await bcrypt.hash('password', 10);
      await createTestUser({
        email: 'test@example.com',
        passwordHash,
        status: 'DISABLED' as UserStatus
      });

      const result = await authorize({
        email: 'test@example.com',
        password: 'password',
      });

      expect(result).toBeNull();
    });

    it('should activate invited user on successful login', async () => {
      const authOptions = await getAuthOptions();
      const authorize = getCredentialsAuthorize(authOptions);

      const password = 'password123';
      const passwordHash = await bcrypt.hash(password, 10);
      const user = await createTestUser({
        email: 'invited@example.com',
        passwordHash,
        status: 'INVITED' as UserStatus,
        name: 'Invited User',
      });

      await authorize({
        email: 'invited@example.com',
        password: password,
      });

      // Verification: Check DB for status update
      const updatedUser = await testPrisma.user.findUnique({
        where: { email: 'invited@example.com' }
      });

      expect(updatedUser?.status).toBe('ACTIVE');
      expect(updatedUser?.invitedAt).toBeNull();
    });
  });

  describe('Callbacks', () => {
    it('jwt callback should update token from DB', async () => {
      const authOptions = await getAuthOptions();

      const user = await createTestUser({
        name: 'Initial Name',
        role: 'USER',
      });

      const token: Record<string, unknown> = { sub: user.id, role: 'USER' };

      // Simulate name change in DB
      await testPrisma.user.update({
        where: { id: user.id },
        data: { name: 'New Name', role: 'ADMIN' }
      });

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
