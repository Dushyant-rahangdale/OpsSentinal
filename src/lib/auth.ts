import { PrismaAdapter } from '@next-auth/prisma-adapter';
import type { NextAuthOptions } from 'next-auth';
import OIDCProvider from '@/lib/oidc';
import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import prisma from '@/lib/prisma';

const oidcEnabled = Boolean(
    process.env.OIDC_CLIENT_ID &&
    process.env.OIDC_CLIENT_SECRET &&
    process.env.OIDC_ISSUER
);

export const authOptions: NextAuthOptions = {
    adapter: PrismaAdapter(prisma),
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
                if (!user || !user.passwordHash || user.status !== 'ACTIVE') {
                    return null;
                }

                const isValid = await bcrypt.compare(password, user.passwordHash);
                if (!isValid) return null;

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
        async jwt({ token, user }) {
            if (user) {
                token.role = (user as any).role;
                token.sub = (user as any).id ?? token.sub;
            }
            return token;
        },
        async session({ session, token }) {
            if (session.user) {
                (session.user as any).role = token.role;
                (session.user as any).id = token.sub;
            }
            return session;
        },
        async signIn({ user }) {
            if (!user?.email) return true;

            const existing = await prisma.user.findUnique({
                where: { email: user.email }
            });

            if (existing?.status === 'DISABLED') {
                return false;
            }

            if (existing && existing.status !== 'ACTIVE') {
                await prisma.user.update({
                    where: { email: user.email },
                    data: {
                        status: 'ACTIVE',
                        invitedAt: null,
                        deactivatedAt: null
                    }
                });
            }

            return true;
        }
    }
};
