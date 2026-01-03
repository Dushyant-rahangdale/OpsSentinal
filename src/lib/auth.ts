import { PrismaAdapter } from '@next-auth/prisma-adapter';
import type { NextAuthOptions } from 'next-auth';
import OIDCProvider from '@/lib/oidc';
import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import prisma from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { getOidcConfig } from '@/lib/oidc-config';

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 12);
}

export async function getAuthOptions(): Promise<NextAuthOptions> {
  const oidcConfig = await getOidcConfig();
  const sessionMaxAgeSeconds = 60 * 60 * 24 * 7;

  return {
    adapter: PrismaAdapter(prisma as any), // eslint-disable-line @typescript-eslint/no-explicit-any
    session: { strategy: 'jwt', maxAge: sessionMaxAgeSeconds },
    jwt: { maxAge: sessionMaxAgeSeconds },
    providers: [
      ...(oidcConfig
        ? [
            OIDCProvider({
              clientId: oidcConfig.clientId,
              clientSecret: oidcConfig.clientSecret,
              issuer: oidcConfig.issuer,
              customScopes: oidcConfig.customScopes ?? null,
            }),
          ]
        : []),
      CredentialsProvider({
        name: 'Email & Password',
        credentials: {
          email: { label: 'Email', type: 'email' },
          password: { label: 'Password', type: 'password' },
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
                deactivatedAt: null,
              },
            });
          }

          return {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
          };
        },
      }),
    ],
    pages: {
      signIn: '/login',
      signOut: '/auth/signout',
    },
    callbacks: {
      async jwt({ token, user }) {
        // Initial sign in - set user data
        if (user) {
          token.role = (user as any).role; // eslint-disable-line @typescript-eslint/no-explicit-any
          token.sub = (user as any).id ?? token.sub; // eslint-disable-line @typescript-eslint/no-explicit-any
          token.name = (user as any).name; // eslint-disable-line @typescript-eslint/no-explicit-any
          token.email = (user as any).email; // eslint-disable-line @typescript-eslint/no-explicit-any
        }

        // Fetch latest user data from database on each request to ensure name is up-to-date
        // This ensures name changes reflect immediately without requiring re-login
        if (token.sub && typeof token.sub === 'string') {
          try {
            const dbUser = await prisma.user.findUnique({
              where: { id: token.sub },
              select: { name: true, email: true, role: true },
            });

            if (dbUser) {
              token.name = dbUser.name;
              token.email = dbUser.email;
              token.role = dbUser.role;
            }
          } catch (error) {
            // If database fetch fails, keep existing token data
            logger.error('Error fetching user data in JWT callback', {
              error: error instanceof Error ? error.message : 'Unknown error',
            });
          }
        }

        return token;
      },
      async session({ session, token }) {
        if (session.user) {
          (session.user as any).role = token.role; // eslint-disable-line @typescript-eslint/no-explicit-any
          (session.user as any).id = token.sub; // eslint-disable-line @typescript-eslint/no-explicit-any
          // Always use the latest name from token (which is fetched from DB)
          session.user.name = (token.name as string) || session.user.name;
          session.user.email = (token.email as string) || session.user.email;
        }
        return session;
      },
      async signIn({ user, account, profile }) {
        if (!user?.email) {
          logger.warn('Sign-in rejected: missing email', {
            provider: account?.provider ?? 'unknown',
          });
          return false;
        }

        const email = user.email.toLowerCase();
        const existing = await prisma.user.findUnique({
          where: { email },
        });

        // Final check - prevent disabled users from signing in
        if (existing?.status === 'DISABLED') {
          logger.warn('Sign-in rejected: user disabled', { provider: account?.provider, email });
          return false;
        }

        if (account?.provider === 'oidc') {
          const activeConfig = await getOidcConfig();
          if (!activeConfig) {
            logger.warn('OIDC sign-in rejected: configuration missing or invalid', { email });
            return false;
          }

          if (activeConfig.allowedDomains.length > 0) {
            const domain = email.split('@')[1] || '';
            if (!domain) {
              logger.warn('OIDC sign-in rejected: invalid email domain', { email });
              return false;
            }
            if (!activeConfig.allowedDomains.includes(domain)) {
              logger.warn('OIDC sign-in rejected: domain not allowed', { email, domain });
              return false;
            }
          }

          if (!activeConfig.autoProvision && !existing) {
            logger.warn('OIDC sign-in rejected: auto-provision disabled', { email });
            if (user?.id) {
              try {
                await prisma.user.delete({ where: { id: user.id } });
              } catch (error) {
                logger.error('Failed to rollback OIDC user creation', { error });
              }
            }
            return false;
          }

          const targetUser =
            existing ||
            (user?.id ? await prisma.user.findUnique({ where: { id: user.id } }) : null);

          if (targetUser) {
            const updateData: any = {};

            // Reactivate if disabled
            if (targetUser.status !== 'ACTIVE') {
              updateData.status = 'ACTIVE';
              updateData.invitedAt = null;
              updateData.deactivatedAt = null;
            }

            // Role Evaluation
            if (
              activeConfig.roleMapping &&
              Array.isArray(activeConfig.roleMapping) &&
              (profile as any)
            ) {
              const mapping = activeConfig.roleMapping as Array<{
                claim: string;
                value: string;
                role: string;
              }>;
              const allowedRoles = new Set(['ADMIN', 'RESPONDER', 'USER']);
              for (const rule of mapping) {
                if (!allowedRoles.has(rule.role)) {
                  logger.warn('OIDC role mapping ignored: invalid role', {
                    role: rule.role,
                    claim: rule.claim,
                  });
                  continue;
                }
                const claimValue = (profile as any)[rule.claim];
                let match = false;

                if (Array.isArray(claimValue)) {
                  match = claimValue.includes(rule.value);
                } else if (claimValue === rule.value) {
                  match = true;
                }

                if (match) {
                  if (targetUser.role !== rule.role) {
                    updateData.role = rule.role;
                  }
                  break; // Stop at first match
                }
              }
            }

            // JIT Profile Sync - sync attributes from OIDC profile
            if (
              activeConfig.profileMapping &&
              typeof activeConfig.profileMapping === 'object' &&
              profile
            ) {
              const mapping = activeConfig.profileMapping as Record<string, string>;
              const oidcProfile = profile as Record<string, unknown>;

              // Sync department
              if (mapping.department && oidcProfile[mapping.department]) {
                const dept = String(oidcProfile[mapping.department]);
                if (dept && dept !== targetUser.department) {
                  updateData.department = dept;
                }
              }

              // Sync job title
              if (mapping.jobTitle && oidcProfile[mapping.jobTitle]) {
                const title = String(oidcProfile[mapping.jobTitle]);
                if (title && title !== targetUser.jobTitle) {
                  updateData.jobTitle = title;
                }
              }

              // Sync avatar URL
              if (mapping.avatarUrl && oidcProfile[mapping.avatarUrl]) {
                const avatar = String(oidcProfile[mapping.avatarUrl]);
                if (avatar && avatar !== targetUser.avatarUrl) {
                  updateData.avatarUrl = avatar;
                }
              }

              // Update lastOidcSync timestamp if any profile data was synced
              if (updateData.department || updateData.jobTitle || updateData.avatarUrl) {
                updateData.lastOidcSync = new Date();
              }
            }

            if (Object.keys(updateData).length > 0) {
              await prisma.user.update({
                where: { id: targetUser.id },
                data: updateData,
              });
            }
          }
        }

        return true;
      },
    },
  };
}
