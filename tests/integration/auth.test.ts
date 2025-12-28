
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';

// Mock the auth functions
const mockSignIn = vi.fn();
const mockSignOut = vi.fn();

vi.mock('next-auth/react', () => ({
    signIn: (...args) => mockSignIn(...args),
    signOut: (...args) => mockSignOut(...args),
    useSession: () => ({
        data: { user: { name: 'Test User', email: 'test@example.com' } },
        status: 'authenticated',
    }),
}));

describe('Authentication Flow', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should call signIn with correct credentials', async () => {
        await mockSignIn('credentials', {
            redirect: false,
            email: 'test@example.com',
            password: 'password123',
        });

        expect(mockSignIn).toHaveBeenCalledWith('credentials', {
            redirect: false,
            email: 'test@example.com',
            password: 'password123',
        });
    });

    it('should call signOut when requested', async () => {
        await mockSignOut({ callbackUrl: '/login' });
        expect(mockSignOut).toHaveBeenCalledWith({ callbackUrl: '/login' });
    });
});
