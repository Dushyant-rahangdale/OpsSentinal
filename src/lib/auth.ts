import type { NextAuthOptions } from 'next-auth';
import OIDCProvider from '@/lib/oidc';
import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import prisma from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { getOidcConfig } from '@/lib/oidc-config';

const AUTH_OPTIONS_CACHE_TTL_MS = Number.parseInt(
  process.env.AUTH_OPTIONS_CACHE_TTL_MS ?? '5000',
  10
);

function safeTtlMs(value: number, fallback: number) {
  if (!Number.isFinite(value) || value < 0) return fallback;
  return value;
}

const AUTH_TTL_MS = safeTtlMs(AUTH_OPTIONS_CACHE_TTL_MS, 5000);

let authOptionsCache:
  | {
      value: NextAuthOptions;
      expiresAt: number;
    }
  | undefined;
let authOptionsInFlight: Promise<NextAuthOptions> | undefined;

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 12);
}

export async function getAuthOptions(): Promise<NextAuthOptions> {
  const now = Date.now();
  // Module-level cache to avoid repeatedly constructing options (and reloading OIDC config)
  // across multiple server component renders / API calls within a short window.
  if (authOptionsCache && authOptionsCache.expiresAt > now) {
    return authOptionsCache.value;
  }

  if (authOptionsInFlight) {
    return authOptionsInFlight;
  }

  authOptionsInFlight = (async () => {
    const oidcConfig = await getOidcConfig();
    const sessionMaxAgeSeconds = 60 * 60 * 24 * 7;

    if (oidcConfig) {
      logger.info('[Auth] OIDC provider will be enabled', {
        component: 'auth',
        issuer: oidcConfig.issuer,
        clientId: oidcConfig.clientId,
      });
    } else {
      logger.debug('[Auth] OIDC provider not available, using credentials only', {
        component: 'auth',
      });
    }

    return {
      // No adapter - using pure JWT sessions (industry standard for OIDC)
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
        async jwt({ token, user, account }) {
          // Initial sign in
          if (user && account) {
            // For OIDC, we must look up the user in the DB to get the internal CUID and current role
            // The 'user' object from OIDC is just the profile, so 'user.id' is the OIDC 'sub' (not our DB ID)
            if (account.provider === 'oidc' && user.email) {
              try {
                const dbUser = await prisma.user.findUnique({
                  where: { email: user.email.toLowerCase() },
                });

                if (dbUser) {
                  token.sub = dbUser.id; // Use internal CUID
                  token.role = dbUser.role;
                  token.name = dbUser.name;
                  token.email = dbUser.email;
                  logger.info('[Auth] JWT callback - Mapped OIDC user to DB user', {
                    component: 'auth:jwt',
                    oidcSub: user.id,
                    dbUserId: dbUser.id,
                    email: user.email,
                  });
                } else {
                  // This should technically not happen if signIn passed, but just in case
                  logger.error('[Auth] JWT callback - OIDC user not found in DB', {
                    component: 'auth:jwt',
                    email: user.email,
                  });
                }
              } catch (error) {
                logger.error('[Auth] JWT callback - DB lookup failed', { error });
              }
            } else {
              // For Credentials, 'user' comes from authorize() and is already the DB user object
              token.role = (user as any).role; // eslint-disable-line @typescript-eslint/no-explicit-any
              token.sub = user.id;
              token.name = user.name;
              token.email = user.email;
            }
          }
          // The user provided in the jwt callback is the one returned by the `authorize` function
          // or the OIDC provider. We need to ensure `token.sub` is set to our internal user ID
          // and `token.role` is set correctly.
          // This block handles the initial population of the token from the `user` object.
          else if (user) {
            logger.debug('[Auth] JWT callback - initial sign in (credentials or OIDC fallback)', {
              component: 'auth:jwt',
              userId: (user as any).id,
              hasRole: !!(user as any).role,
              hasEmail: !!(user as any).email,
            });

            token.role = (user as any).role; // eslint-disable-line @typescript-eslint/no-explicit-any
            token.sub = (user as any).id ?? token.sub; // eslint-disable-line @typescript-eslint/no-explicit-any
            token.name = (user as any).name; // eslint-disable-line @typescript-eslint/no-explicit-any
            token.email = (user as any).email; // eslint-disable-line @typescript-eslint/no-explicit-any
          }

          // Fetch latest user data from database on each request to ensure name is up-to-date
          // This ensures name changes reflect immediately without requiring re-login
          if (token.sub && typeof token.sub === 'string') {
            try {
              logger.debug('[Auth] JWT callback - fetching user data', {
                component: 'auth:jwt',
                userId: token.sub,
              });

              const dbUser = await prisma.user.findUnique({
                where: { id: token.sub },
                select: { name: true, email: true, role: true },
              });

              if (dbUser) {
                token.name = dbUser.name;
                token.email = dbUser.email;
                token.role = dbUser.role;

                logger.debug('[Auth] JWT callback - user data updated', {
                  component: 'auth:jwt',
                  userId: token.sub,
                  role: dbUser.role,
                });
              } else {
                logger.warn('[Auth] JWT callback - user not found in database', {
                  component: 'auth:jwt',
                  userId: token.sub,
                });
              }
            } catch (error) {
              // If database fetch fails, keep existing token data
              logger.error('[Auth] Error fetching user data in JWT callback', {
                component: 'auth:jwt',
                error,
                errorMessage: error instanceof Error ? error.message : 'Unknown error',
              });
            }
          }

          logger.debug('[Auth] JWT callback complete', {
            component: 'auth:jwt',
            hasRole: !!token.role,
            hasSub: !!token.sub,
          });

          return token;
        },
        async session({ session, token }) {
          logger.debug('[Auth] Session callback started', {
            component: 'auth:session',
            hasUser: !!session.user,
            hasToken: !!token,
          });

          if (session.user) {
            (session.user as any).role = token.role; // eslint-disable-line @typescript-eslint/no-explicit-any
            (session.user as any).id = token.sub; // eslint-disable-line @typescript-eslint/no-explicit-any
            // Always use the latest name from token (which is fetched from DB)
            session.user.name = (token.name as string) || session.user.name;
            session.user.email = (token.email as string) || session.user.email;

            logger.debug('[Auth] Session callback - user data set', {
              component: 'auth:session',
              userId: token.sub,
              role: token.role,
              hasEmail: !!session.user.email,
            });
          }

          logger.debug('[Auth] Session callback complete', {
            component: 'auth:session',
          });

          return session;
        },
        async signIn({ user, account, profile }) {
          if (!user?.email) {
            logger.warn('[Auth] Sign-in rejected: missing email', {
              component: 'auth:signIn',
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
            logger.warn('[Auth] Sign-in rejected: user disabled', {
              component: 'auth:signIn',
              provider: account?.provider,
              email,
            });
            return false;
          }

          if (account?.provider === 'oidc') {
            logger.info('[Auth] OIDC sign-in attempt', {
              component: 'auth:signIn',
              email,
              userExists: !!existing,
              userId: user.id,
            });

            const activeConfig = await getOidcConfig();
            if (!activeConfig) {
              logger.warn('[Auth] OIDC sign-in rejected: configuration missing or invalid', {
                component: 'auth:signIn',
                email,
              });
              return false;
            }

            if (activeConfig.allowedDomains.length > 0) {
              const domain = email.split('@')[1] || '';
              if (!domain) {
                logger.warn('[Auth] OIDC sign-in rejected: invalid email domain', {
                  component: 'auth:signIn',
                  email,
                });
                return false;
              }
              if (!activeConfig.allowedDomains.includes(domain)) {
                logger.warn('[Auth] OIDC sign-in rejected: domain not allowed', {
                  component: 'auth:signIn',
                  email,
                  domain,
                  allowedDomains: activeConfig.allowedDomains,
                });
                return false;
              }
              logger.debug('[Auth] OIDC domain validation passed', {
                component: 'auth:signIn',
                email,
                domain,
              });
            }

            // Create new user if auto-provision is enabled
            if (!existing) {
              if (!activeConfig.autoProvision) {
                logger.warn('[Auth] OIDC sign-in rejected: auto-provision disabled', {
                  component: 'auth:signIn',
                  email,
                });
                return false;
              }

              // Create new user from OIDC profile
              try {
                const newUser = await prisma.user.create({
                  data: {
                    email,
                    name: user.name || email.split('@')[0],
                    role: 'USER', // Default role, can be overridden by role mapping below
                    status: 'ACTIVE',
                  },
                });

                logger.info('[Auth] Created new user via OIDC auto-provision', {
                  component: 'auth:signIn',
                  userId: newUser.id,
                  email,
                });

                // Update user object with new ID for JWT callback
                user.id = newUser.id;
              } catch (error) {
                logger.error('[Auth] Failed to create OIDC user', {
                  component: 'auth:signIn',
                  error,
                });
                return false;
              }
            }

            // Get user for updates (either existing or newly created)
            const targetUser = existing || (await prisma.user.findUnique({ where: { email } }));

            if (!targetUser) {
              logger.error('[Auth] OIDC user not found after creation', {
                component: 'auth:signIn',
                email,
              });
              return false;
            }

            const updateData: any = {};

            // Ensure user object has correct ID for JWT
            user.id = targetUser.id;

            // Reactivate if disabled
            if (targetUser.status !== 'ACTIVE') {
              updateData.status = 'ACTIVE';
              updateData.invitedAt = null;
              updateData.deactivatedAt = null;
              logger.info('[Auth] Reactivating user via OIDC', {
                component: 'auth:signIn',
                userId: targetUser.id,
                previousStatus: targetUser.status,
              });
            }

            // Role Evaluation
            if (
              activeConfig.roleMapping &&
              Array.isArray(activeConfig.roleMapping) &&
              (profile as any)
            ) {
              logger.debug('[Auth] Evaluating OIDC role mapping', {
                component: 'auth:signIn',
                ruleCount: activeConfig.roleMapping.length,
                currentRole: targetUser.role,
              });

              const mapping = activeConfig.roleMapping as Array<{
                claim: string;
                value: string;
                role: string;
              }>;
              const allowedRoles = new Set(['ADMIN', 'RESPONDER', 'USER']);
              for (const rule of mapping) {
                if (!allowedRoles.has(rule.role)) {
                  logger.warn('[Auth] OIDC role mapping ignored: invalid role', {
                    component: 'auth:signIn',
                    role: rule.role,
                    claim: rule.claim,
                  });
                  continue;
                }
                const claimValue = (profile as any)[rule.claim];
                let match = false;

                if (Array.isArray(claimValue)) {
                  match = claimValue.includes(rule.value);
                  logger.debug('[Auth] Checking array claim for role mapping', {
                    component: 'auth:signIn',
                    claim: rule.claim,
                    expectedValue: rule.value,
                    actualValues: claimValue,
                    matched: match,
                  });
                } else if (claimValue === rule.value) {
                  match = true;
                  logger.debug('[Auth] Checking scalar claim for role mapping', {
                    component: 'auth:signIn',
                    claim: rule.claim,
                    expectedValue: rule.value,
                    actualValue: claimValue,
                    matched: match,
                  });
                }

                if (match) {
                  if (targetUser.role !== rule.role) {
                    updateData.role = rule.role;
                    logger.info('[Auth] OIDC role mapping applied', {
                      component: 'auth:signIn',
                      userId: targetUser.id,
                      oldRole: targetUser.role,
                      newRole: rule.role,
                      matchedClaim: rule.claim,
                      matchedValue: rule.value,
                    });
                  }
                  break; // Stop at first match
                }
              }

              if (!updateData.role) {
                logger.debug('[Auth] No role mapping matched', {
                  component: 'auth:signIn',
                  availableClaims: Object.keys(profile as any),
                });
              }
            }

            // JIT Profile Sync - sync attributes from OIDC profile
            if (
              activeConfig.profileMapping &&
              typeof activeConfig.profileMapping === 'object' &&
              profile
            ) {
              logger.debug('[Auth] Evaluating OIDC profile sync', {
                component: 'auth:signIn',
                mappingKeys: Object.keys(activeConfig.profileMapping),
              });

              const mapping = activeConfig.profileMapping as Record<string, string>;
              const oidcProfile = profile as Record<string, unknown>;

              // Sync department
              if (mapping.department && oidcProfile[mapping.department]) {
                const dept = String(oidcProfile[mapping.department]);
                if (dept && dept !== targetUser.department) {
                  updateData.department = dept;
                  logger.debug('[Auth] Syncing department from OIDC', {
                    component: 'auth:signIn',
                    claimName: mapping.department,
                    newValue: dept,
                    oldValue: targetUser.department,
                  });
                }
              }

              // Sync job title
              if (mapping.jobTitle && oidcProfile[mapping.jobTitle]) {
                const title = String(oidcProfile[mapping.jobTitle]);
                if (title && title !== targetUser.jobTitle) {
                  updateData.jobTitle = title;
                  logger.debug('[Auth] Syncing job title from OIDC', {
                    component: 'auth:signIn',
                    claimName: mapping.jobTitle,
                    newValue: title,
                    oldValue: targetUser.jobTitle,
                  });
                }
              }

              // Sync avatar URL
              if (mapping.avatarUrl && oidcProfile[mapping.avatarUrl]) {
                const avatar = String(oidcProfile[mapping.avatarUrl]);
                if (avatar && avatar !== targetUser.avatarUrl) {
                  updateData.avatarUrl = avatar;
                  logger.debug('[Auth] Syncing avatar URL from OIDC', {
                    component: 'auth:signIn',
                    claimName: mapping.avatarUrl,
                    hasNewValue: !!avatar,
                  });
                }
              }

              // Update lastOidcSync timestamp if any profile data was synced
              if (updateData.department || updateData.jobTitle || updateData.avatarUrl) {
                updateData.lastOidcSync = new Date();
                logger.info('[Auth] OIDC profile sync completed', {
                  component: 'auth:signIn',
                  userId: targetUser.id,
                  syncedFields: Object.keys(updateData).filter(k =>
                    ['department', 'jobTitle', 'avatarUrl'].includes(k)
                  ),
                });
              }
            }

            if (Object.keys(updateData).length > 0) {
              await prisma.user.update({
                where: { id: targetUser.id },
                data: updateData,
              });
              logger.info('[Auth] Updated user from OIDC data', {
                component: 'auth:signIn',
                userId: targetUser.id,
                updatedFields: Object.keys(updateData),
              });
            }

            logger.info('[Auth] OIDC sign-in successful', {
              component: 'auth:signIn',
              email,
              userId: user.id,
            });
          }

          return true;
        },
      },
    };
  })();
  try {
    const value = await authOptionsInFlight;
    authOptionsCache = {
      value,
      expiresAt: Date.now() + AUTH_TTL_MS,
    };
    return value;
  } finally {
    authOptionsInFlight = undefined;
  }
}
