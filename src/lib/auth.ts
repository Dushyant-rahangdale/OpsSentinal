import { PrismaAdapter } from '@next-auth/prisma-adapter';
import type { NextAuthOptions } from 'next-auth';
import OIDCProvider from '@/lib/oidc';
import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import prisma from '@/lib/prisma';
import { logger } from '@/lib/logger';

const oidcEnabled = Boolean(
    process.env.OIDC_CLIENT_ID &&
    process.env.OIDC_CLIENT_SECRET &&
    process.env.OIDC_ISSUER
);

export const authOptions: NextAuthOptions = {
    adapter: PrismaAdapter(prisma as any),
    session: { strategy: 'jwt' },
    providers: [
        ...(oidcEnabled
            ? [
                OIDCProvider({
                    clientId: process.env.OIDC_CLIENT_ID ?? '',
                    clientSecret: process.env.OIDC_CLIENT_SECRET ?? '',
                    issuer: process.env.OIDC_ISSUER ?? ''
                })
            ]
            : []),
        CredentialsProvider({
            name: 'Email & Password',
            credentials: {
                email: { label: 'Email', type: 'email' },
                password: { label: 'Password', type: 'password' }
            },
            async authorize(credentials) {
                const email = credentials?.email?.toLowerCase().trim();
                const password = credentials?.password || '';

                if (!email || !password) return null;

                const user = await prisma.user.findUnique({ where: { email } });
                if (!user || !user.passwordHash) {
                    return null;
                }

                // Check if user is disabled
                if (user.status === 'DISABLED') {
                    return null;
                }

                const isValid = await bcrypt.compare(password, user.passwordHash);
                if (!isValid) return null;

                // Update status to ACTIVE if it's INVITED (first login)
                if (user.status !== 'ACTIVE') {
                    await prisma.user.update({
                        where: { email: user.email },
                        data: {
                            status: 'ACTIVE',
                            invitedAt: null,
                            deactivatedAt: null
                        }
                    });
                }

                return {
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    role: user.role
                };
            }
        })
    ],
    pages: {
        signIn: '/login'
    },
    callbacks: {
        async jwt({ token, user, trigger }) {
            // Initial sign in - set user data
            if (user) {
                token.role = (user as any).role;
                token.sub = (user as any).id ?? token.sub;
                token.name = (user as any).name;
                token.email = (user as any).email;
            }

            // Fetch latest user data from database on each request to ensure name is up-to-date
            // This ensures name changes reflect immediately without requiring re-login
            if (token.sub && typeof token.sub === 'string') {
                try {
                    const dbUser = await prisma.user.findUnique({
                        where: { id: token.sub },
                        select: { name: true, email: true, role: true }
                    });

                    if (dbUser) {
                        token.name = dbUser.name;
                        token.email = dbUser.email;
                        token.role = dbUser.role;
                    }
                } catch (error) {
                    // If database fetch fails, keep existing token data
                    logger.error('Error fetching user data in JWT callback', {
                        error: error instanceof Error ? error.message : 'Unknown error'
                    });
                }
            }

            return token;
        },
        async session({ session, token }) {
            if (session.user) {
                (session.user as any).role = token.role;
                (session.user as any).id = token.sub;
                // Always use the latest name from token (which is fetched from DB)
                session.user.name = (token.name as string) || session.user.name;
                session.user.email = (token.email as string) || session.user.email;
            }
            return session;
        },
        async signIn({ user }) {
            if (!user?.email) return true;

            const existing = await prisma.user.findUnique({
                where: { email: user.email }
            });

            // Final check - prevent disabled users from signing in
            if (existing?.status === 'DISABLED') {
                return false;
            }

            return true;
        }
    }
};
