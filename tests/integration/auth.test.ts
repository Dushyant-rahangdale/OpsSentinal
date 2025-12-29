import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getAuthOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import bcrypt from 'bcryptjs';

vi.mock('bcryptjs');

describe('Authentication Logic', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('CredentialsProvider authorize', () => {
        it('should return user for correct credentials', async () => {
            const authOptions = await getAuthOptions();
            const provider = authOptions.providers.find(p => p.id === 'credentials') as any;

            const passwordHash = 'hashed-pw';
            vi.mocked(prisma.user.findUnique).mockResolvedValue({
                id: 'u1',
                email: 'test@example.com',
                passwordHash,
                role: 'ADMIN',
                status: 'ACTIVE'
            } as any);
            vi.mocked(bcrypt.compare).mockResolvedValue(true as any);

            const result = await provider.authorize({
                email: 'test@example.com',
                password: 'password123'
            }, {} as any);

            expect(result).toEqual({
                id: 'u1',
                name: undefined,
                email: 'test@example.com',
                role: 'ADMIN'
            });
        });

        it('should return null for invalid password', async () => {
            const authOptions = await getAuthOptions();
            const provider = authOptions.providers.find(p => p.id === 'credentials') as any;

            vi.mocked(prisma.user.findUnique).mockResolvedValue({
                id: 'u1',
                passwordHash: 'hash',
                status: 'ACTIVE'
            } as any);
            vi.mocked(bcrypt.compare).mockResolvedValue(false as any);

            const result = await provider.authorize({
                email: 'test@example.com',
                password: 'wrong'
            }, {} as any);

            expect(result).toBeNull();
        });

        it('should return null for disabled user', async () => {
            const authOptions = await getAuthOptions();
            const provider = authOptions.providers.find(p => p.id === 'credentials') as any;

            vi.mocked(prisma.user.findUnique).mockResolvedValue({
                id: 'u1',
                passwordHash: 'hash',
                status: 'DISABLED'
            } as any);

            const result = await provider.authorize({
                email: 'test@example.com',
                password: 'password'
            }, {} as any);

            expect(result).toBeNull();
        });

        it('should activate invited user on successful login', async () => {
            const authOptions = await getAuthOptions();
            const provider = authOptions.providers.find(p => p.id === 'credentials') as any;

            vi.mocked(prisma.user.findUnique).mockResolvedValue({
                id: 'u1',
                email: 'invited@example.com',
                passwordHash: 'hash',
                status: 'INVITED'
            } as any);
            vi.mocked(bcrypt.compare).mockResolvedValue(true as any);

            await provider.authorize({
                email: 'invited@example.com',
                password: 'password'
            }, {} as any);

            expect(prisma.user.update).toHaveBeenCalledWith(expect.objectContaining({
                where: { email: 'invited@example.com' },
                data: expect.objectContaining({ status: 'ACTIVE' })
            }));
        });
    });

    describe('Callbacks', () => {
        it('jwt callback should update token from DB', async () => {
            const authOptions = await getAuthOptions();
            const token = { sub: 'u1', role: 'USER' };

            vi.mocked(prisma.user.findUnique).mockResolvedValue({
                id: 'u1',
                name: 'New Name',
                email: 'new@example.com',
                role: 'ADMIN'
            } as any);

            const result = await (authOptions.callbacks?.jwt as any)({ token });

            expect(result.role).toBe('ADMIN');
            expect(result.name).toBe('New Name');
        });

        it('session callback should include role and id', async () => {
            const authOptions = await getAuthOptions();
            const session = { user: { name: 'Test' } };
            const token = { sub: 'u1', role: 'ADMIN', name: 'Updated' };

            const result = await (authOptions.callbacks?.session as any)({ session, token });

            expect(result.user.role).toBe('ADMIN');
            expect(result.user.id).toBe('u1');
            expect(result.user.name).toBe('Updated');
        });
    });
});
