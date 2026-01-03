import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';
import { getAuthOptions } from '@/lib/auth';
import { encryptWithKey } from '@/lib/encryption';
import type { Adapter } from 'next-auth/adapters';
import { type UserStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { testPrisma, resetDatabase, createTestUser } from '../helpers/test-db';

const describeIfRealDB =
  process.env.VITEST_USE_REAL_DB === '1' || process.env.CI ? describe : describe.skip;

type Credentials = { email?: string; password?: string };

const ENCRYPTION_KEY = 'a'.repeat(64);

async function seedOidcConfig(
  overrides: Partial<{
    customScopes: string | null;
    allowedDomains: string[];
    autoProvision: boolean;
    roleMapping: unknown;
    profileMapping: Record<string, string> | null;
  }> = {}
) {
  const encryptedSecret = await encryptWithKey('oidc-secret', ENCRYPTION_KEY);
  const adminUser = await createTestUser({
    email: 'oidc-admin@example.com',
    role: 'ADMIN',
  });

  await testPrisma.oidcConfig.upsert({
    where: { id: 'default' },
    create: {
      id: 'default',
      issuer: 'https://login.example.com',
      clientId: 'client-id',
      clientSecret: encryptedSecret,
      enabled: true,
      autoProvision: overrides.autoProvision ?? true,
      allowedDomains: overrides.allowedDomains ?? [],
      roleMapping: overrides.roleMapping ?? [],
      customScopes: overrides.customScopes ?? null,
      profileMapping: overrides.profileMapping ?? {},
      updatedBy: adminUser.id,
    },
    update: {
      issuer: 'https://login.example.com',
      clientId: 'client-id',
      clientSecret: encryptedSecret,
      enabled: true,
      autoProvision: overrides.autoProvision ?? true,
      allowedDomains: overrides.allowedDomains ?? [],
      roleMapping: overrides.roleMapping ?? [],
      customScopes: overrides.customScopes ?? null,
      profileMapping: overrides.profileMapping ?? {},
      updatedBy: adminUser.id,
    },
  });

  return adminUser;
}

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
    process.env.ENCRYPTION_KEY = ENCRYPTION_KEY;
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
        role: 'ADMIN',
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
        status: 'DISABLED' as UserStatus,
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
        where: { email: 'invited@example.com' },
      });

      expect(updatedUser?.status).toBe('ACTIVE');
      expect(updatedUser?.invitedAt).toBeNull();
    });
  });

  describe('PrismaAdapter', () => {
    it('should create user when emailVerified is null', async () => {
      const authOptions = await getAuthOptions();
      const adapter = authOptions.adapter as Adapter;

      if (!adapter?.createUser) {
        throw new Error('Prisma adapter createUser not configured');
      }

      const created = await adapter.createUser({
        name: 'Adapter User',
        email: 'adapter@example.com',
        emailVerified: null,
      });

      expect(created.email).toBe('adapter@example.com');
      expect(created.emailVerified).toBeNull();
    });
  });

  describe('OIDC Sign-In', () => {
    it('rejects OIDC sign-in when email is missing', async () => {
      await seedOidcConfig();

      const authOptions = await getAuthOptions();
      const signInCallback = authOptions.callbacks?.signIn as unknown as (args: {
        user?: { email?: string | null; id?: string | null; name?: string | null };
        account?: { provider?: string | null };
        profile?: Record<string, unknown> | null;
      }) => Promise<boolean>;

      const result = await signInCallback({
        user: { name: 'No Email' },
        account: { provider: 'oidc' },
        profile: {},
      });

      expect(result).toBe(false);
    });

    it('applies custom scopes to the OIDC provider', async () => {
      await seedOidcConfig({ customScopes: 'groups department' });

      const authOptions = await getAuthOptions();
      const provider = authOptions.providers.find(p => p.id === 'oidc');
      const scopes = (
        provider as {
          authorization?: { params?: { scope?: string } };
        }
      )?.authorization?.params?.scope;

      expect(scopes).toContain('groups');
      expect(scopes).toContain('department');
    });

    it('rejects OIDC sign-in for disallowed domains', async () => {
      await seedOidcConfig({ allowedDomains: ['example.com'] });

      const user = await createTestUser({
        email: 'oidc-user@other.com',
      });

      const authOptions = await getAuthOptions();
      const signInCallback = authOptions.callbacks?.signIn as unknown as (args: {
        user?: { email?: string | null; id?: string | null; name?: string | null };
        account?: { provider?: string | null };
        profile?: Record<string, unknown> | null;
      }) => Promise<boolean>;

      const result = await signInCallback({
        user: { id: user.id, email: user.email, name: user.name },
        account: { provider: 'oidc' },
        profile: { groups: ['any'] },
      });

      expect(result).toBe(false);
    });

    it('rejects OIDC sign-in when auto-provision is disabled', async () => {
      await seedOidcConfig({ autoProvision: false });

      const authOptions = await getAuthOptions();
      const signInCallback = authOptions.callbacks?.signIn as unknown as (args: {
        user?: { email?: string | null; id?: string | null; name?: string | null };
        account?: { provider?: string | null };
        profile?: Record<string, unknown> | null;
      }) => Promise<boolean>;

      const result = await signInCallback({
        user: { email: 'new-user@example.com', name: 'New User' },
        account: { provider: 'oidc' },
        profile: { groups: ['any'] },
      });

      expect(result).toBe(false);
    });

    it('ignores invalid role mappings', async () => {
      await seedOidcConfig({
        roleMapping: [{ claim: 'groups', value: 'admins', role: 'SUPER' }],
      });

      const user = await createTestUser({
        email: 'oidc-role@example.com',
        role: 'USER',
      });

      const authOptions = await getAuthOptions();
      const signInCallback = authOptions.callbacks?.signIn as unknown as (args: {
        user?: { email?: string | null; id?: string | null; name?: string | null };
        account?: { provider?: string | null };
        profile?: Record<string, unknown> | null;
      }) => Promise<boolean>;

      const result = await signInCallback({
        user: { id: user.id, email: user.email, name: user.name },
        account: { provider: 'oidc' },
        profile: { groups: ['admins'] },
      });

      expect(result).toBe(true);

      const updated = await testPrisma.user.findUnique({
        where: { id: user.id },
        select: { role: true },
      });

      expect(updated?.role).toBe('USER');
    });

    it('syncs profile attributes from OIDC claims', async () => {
      await seedOidcConfig({
        profileMapping: {
          department: 'dept',
          jobTitle: 'title',
          avatarUrl: 'picture',
        },
      });

      const user = await createTestUser({
        email: 'oidc-user@example.com',
        department: 'Old Department',
        jobTitle: 'Old Title',
        avatarUrl: 'https://old.example.com/avatar.png',
      });

      const authOptions = await getAuthOptions();
      const signInCallback = authOptions.callbacks?.signIn as unknown as (args: {
        user?: { email?: string | null; id?: string | null; name?: string | null };
        account?: { provider?: string | null };
        profile?: Record<string, unknown> | null;
      }) => Promise<boolean>;

      const result = await signInCallback({
        user: { id: user.id, email: user.email, name: user.name },
        account: { provider: 'oidc' },
        profile: {
          dept: 'Engineering',
          title: 'Staff Engineer',
          picture: 'https://example.com/avatar.png',
        },
      });

      expect(result).toBe(true);

      const updated = await testPrisma.user.findUnique({
        where: { id: user.id },
        select: { department: true, jobTitle: true, avatarUrl: true, lastOidcSync: true },
      });

      expect(updated?.department).toBe('Engineering');
      expect(updated?.jobTitle).toBe('Staff Engineer');
      expect(updated?.avatarUrl).toBe('https://example.com/avatar.png');
      expect(updated?.lastOidcSync).not.toBeNull();
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
        data: { name: 'New Name', role: 'ADMIN' },
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
