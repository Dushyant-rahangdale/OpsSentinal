import type { NextAuthOptions, User } from 'next-auth';
import OIDCProvider from '@/lib/oidc';
import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import prisma from '@/lib/prisma';
import { runSerializableTransaction } from '@/lib/db-utils';
import { logger } from '@/lib/logger';
import { getOidcConfig } from '@/lib/oidc-config';
import { hasOidcEmailLinkAssurance, requiresOidcEmailVerifiedClaim } from '@/lib/oidc-provider';
import { getDefaultAvatar } from '@/lib/avatar';
import {
  SESSION_TOKEN_COOKIE_NAME,
  CALLBACK_URL_COOKIE_NAME,
  CSRF_TOKEN_COOKIE_NAME,
  PKCE_CODE_VERIFIER_COOKIE_NAME,
  STATE_COOKIE_NAME,
  NONCE_COOKIE_NAME,
  useSecureCookies,
} from '@/lib/auth-cookies';

function getJwtUserRefreshTtlMs() {
  const raw = process.env.JWT_USER_REFRESH_TTL_MS ?? '60000';
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 60000;
}

import type { JWT } from 'next-auth/jwt';

// Augmented types to avoid 'any' usage
type AugmentedJWT = JWT & {
  tokenVersion?: number;
  userFetchedAt?: number;
  error?: string;
  avatarUrl?: string | null;
  gender?: string | null;
  role?: string;
  /** True when user opted into "Remember Me" at login. Used to pick the JWT exp cap. */
  rememberMe?: boolean;
};

type AugmentedUser = User & {
  tokenVersion?: number;
  role?: string;
  rememberMe?: boolean;
};

function isOidcEmailVerifiedStrict() {
  return (process.env.OIDC_REQUIRE_EMAIL_VERIFIED_STRICT ?? 'true').toLowerCase() === 'true';
}

const AUTH_OPTIONS_CACHE_TTL_MS = Number.parseInt(
  process.env.AUTH_OPTIONS_CACHE_TTL_MS ?? '5000',
  10
);

function safeTtlMs(value: number, fallback: number) {
  if (!Number.isFinite(value) || value < 0) return fallback;
  return value;
}

const AUTH_TTL_MS = safeTtlMs(AUTH_OPTIONS_CACHE_TTL_MS, 5000);

function normalizeIssuer(issuer: string) {
  return issuer.replace(/\/$/, '');
}

function coerceBooleanClaim(value: unknown): boolean | undefined {
  if (value === true) return true;
  if (value === false) return false;
  if (typeof value === 'string') {
    const v = value.trim().toLowerCase();
    if (v === 'true') return true;
    if (v === 'false') return false;
  }
  if (typeof value === 'number') {
    if (value === 1) return true;
    if (value === 0) return false;
  }
  return undefined;
}

function clearSessionToken(token: AugmentedJWT, reason: string) {
  token.error = reason;
  delete token.sub;
  delete token.role;
  delete token.email;
  delete token.name;
  return token;
}

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
    // Session design (modelled on PagerDuty / Linear / Slack):
    //   - No time-based "you've been idle, log back in" on any client.
    //   - Mobile clients ALWAYS get the long ceiling so push-notification
    //     listeners don't silently fall off because a timer expired
    //     without the user noticing. Mobile UA forces rememberMe=true
    //     in the authorize() call below.
    //   - Web without "Remember Me" still gets 7 days (matches most ops
    //     tools' default), but with sliding refresh — any activity in
    //     that window resets the timer.
    //   - Web with "Remember Me" gets the long ceiling.
    //   - The only way to log a user out is server-side revocation:
    //     `tokenVersion` is bumped (user disabled, password reset,
    //     deletion) and the next JWT callback rejects the stale token.
    const sessionMaxAgeSeconds = 60 * 60 * 24 * 7; // 7 days (web, no Remember Me)
    const rememberMeMaxAgeSeconds = 60 * 60 * 24 * 365; // 1 year (web + RM, all mobile)
    const sessionUpdateAgeSeconds = 60 * 60; // sliding refresh at most hourly

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
      // Session cap is `rememberMeMaxAgeSeconds` (30 days) so a
      // remember-me JWT can outlive 7 days. Non-remember-me sessions
      // are still pinned to 7 days via the JWT's own `exp` set in the
      // jwt callback below — NextAuth respects whichever is shorter.
      session: {
        strategy: 'jwt',
        maxAge: rememberMeMaxAgeSeconds,
        updateAge: sessionUpdateAgeSeconds,
      },
      jwt: { maxAge: rememberMeMaxAgeSeconds },
      // Explicit cookie config (see src/lib/auth-cookies.ts).
      // We derive `secure` and the `__Secure-` / `__Host-` prefixes from
      // NEXTAUTH_URL rather than relying on NextAuth's request-based protocol
      // detection, which is unreliable behind Cloudflare Tunnel.
      useSecureCookies,
      cookies: {
        sessionToken: {
          name: SESSION_TOKEN_COOKIE_NAME,
          options: {
            httpOnly: true,
            sameSite: 'lax',
            path: '/',
            secure: useSecureCookies,
          },
        },
        callbackUrl: {
          name: CALLBACK_URL_COOKIE_NAME,
          options: {
            sameSite: 'lax',
            path: '/',
            secure: useSecureCookies,
          },
        },
        csrfToken: {
          name: CSRF_TOKEN_COOKIE_NAME,
          options: {
            httpOnly: true,
            sameSite: 'lax',
            path: '/',
            secure: useSecureCookies,
          },
        },
        pkceCodeVerifier: {
          name: PKCE_CODE_VERIFIER_COOKIE_NAME,
          options: {
            httpOnly: true,
            sameSite: 'lax',
            path: '/',
            secure: useSecureCookies,
            maxAge: 900,
          },
        },
        state: {
          name: STATE_COOKIE_NAME,
          options: {
            httpOnly: true,
            sameSite: 'lax',
            path: '/',
            secure: useSecureCookies,
            maxAge: 900,
          },
        },
        nonce: {
          name: NONCE_COOKIE_NAME,
          options: {
            httpOnly: true,
            sameSite: 'lax',
            path: '/',
            secure: useSecureCookies,
            maxAge: 900,
          },
        },
      },
      // Host headers affect OAuth callback construction. Trust them only when an
      // operator explicitly opts in for a correctly configured reverse proxy.
      trustHost: process.env.AUTH_TRUST_HOST?.toLowerCase() === 'true',
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
            rememberMe: { label: 'Remember Me', type: 'text' },
          },
          async authorize(credentials, req) {
            // Import security modules
            const { checkLoginAttempt, recordFailedAttempt, resetLoginAttempts, isValidEmail } =
              await import('@/lib/login-security');
            const { logLoginSuccess, logLoginFailed, logLoginBlocked } =
              await import('@/lib/login-audit');

            const email = credentials?.email?.toLowerCase().trim() || '';
            const password = credentials?.password || '';
            const userAgentHeader = (req?.headers?.['user-agent'] as string) || '';
            // Mobile clients (PWA on iOS/Android, native wrappers, etc.)
            // are forced into Remember Me. We never want push-notification
            // listeners to silently fall off because a 7-day timer expired
            // — see the session-design comment in getAuthOptions().
            const isMobileClient =
              /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile|mobile|CriOS/i.test(
                userAgentHeader
              );
            const rememberMe = credentials?.rememberMe === 'true' || isMobileClient;
            // Get IP from request headers (best effort)
            const { getClientIp } = await import('@/lib/client-ip');
            const ip = getClientIp(req?.headers);
            const userAgent = userAgentHeader || 'Unknown';

            logger.debug('[Auth-Debug] Authorize started', {
              component: 'auth:credentials',
              email,
              ip,
            });

            // Server-side email validation
            if (!email || !isValidEmail(email)) {
              await logLoginFailed(email || 'unknown', ip, userAgent, 'INVALID_EMAIL_FORMAT');
              return null;
            }

            if (!password) {
              await logLoginFailed(email, ip, userAgent, 'INVALID_CREDENTIALS');
              return null;
            }

            // Shared across application instances; the progressive local
            // lockout below remains useful for its user-facing lockout timing.
            const { checkRateLimit } = await import('@/lib/rate-limit');
            const distributedAttempt = await checkRateLimit(
              `auth:credentials:${email}:${ip}`,
              20,
              15 * 60 * 1000
            );
            const accountAttempt = await checkRateLimit(
              `auth:credentials:account:${email}`,
              10,
              15 * 60 * 1000
            );
            if (!distributedAttempt.allowed || !accountAttempt.allowed) {
              await logLoginBlocked(
                email,
                ip,
                userAgent,
                'RATE_LIMITED',
                Math.max(
                  0,
                  Math.max(distributedAttempt.resetAt, accountAttempt.resetAt) - Date.now()
                )
              );
              return null;
            }

            // Check rate limiting / lockout
            const attemptCheck = checkLoginAttempt(email, ip);
            if (!attemptCheck.allowed) {
              await logLoginBlocked(
                email,
                ip,
                userAgent,
                'ACCOUNT_LOCKED',
                attemptCheck.lockoutDurationMs || undefined
              );
              console.warn('[Auth] Login blocked - account locked', {
                email,
                ip,
                lockedUntil: attemptCheck.lockedUntil?.toISOString(),
              });
              return null;
            }

            const user = await prisma.user.findUnique({ where: { email } });
            if (!user || !user.passwordHash) {
              recordFailedAttempt(email, ip);
              await logLoginFailed(email, ip, userAgent, 'USER_NOT_FOUND');
              logger.debug('[Auth-Debug] User not found or no password hash', {
                component: 'auth:credentials',
                email,
              });
              return null;
            }

            // Check if user is disabled
            if (user.status === 'DISABLED') {
              await logLoginFailed(email, ip, userAgent, 'USER_DISABLED');
              return null;
            }

            const isValid = await bcrypt.compare(password, user.passwordHash);
            if (!isValid) {
              const result = recordFailedAttempt(email, ip);
              await logLoginFailed(
                email,
                ip,
                userAgent,
                'INVALID_CREDENTIALS',
                result.attemptCount
              );

              if (result.locked) {
                console.warn('[Auth] Account locked after failed attempts', {
                  email,
                  attemptCount: result.attemptCount,
                  lockoutDurationMs: result.lockoutDurationMs,
                });
              }
              logger.debug('[Auth-Debug] Invalid Password', {
                component: 'auth:credentials',
                email,
              });
              return null;
            }

            // Success - reset attempts and log
            resetLoginAttempts(email, ip);
            await logLoginSuccess(email, user.id, ip, userAgent, 'credentials');

            // Log remember me usage (Note: extending session maxAge dynamically requires JWT callback changes)
            if (rememberMe) {
              logger.debug('[Auth] User requested "Remember Me"', { email });
            }

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

            logger.debug('[Auth-Debug] Authorize Success', {
              component: 'auth:credentials',
              id: user.id,
              tokenVersion: user.tokenVersion,
            });

            // Stash the rememberMe flag onto the user object so the
            // jwt callback can pick it up and cap the JWT exp at the
            // appropriate value (7d default, 30d when set).
            return {
              id: user.id,
              name: user.name,
              email: user.email,
              role: user.role,
              tokenVersion: user.tokenVersion,
              rememberMe,
            } as User & { rememberMe: boolean };
          },
        }),
      ],
      pages: {
        signIn: '/login',
        signOut: '/auth/signout',
      },
      callbacks: {
        async jwt({ token, user, account, trigger, session: _session }) {
          // Debug: Log incoming token state
          logger.debug('[Auth-Debug] JWT callback started', {
            component: 'auth:jwt',
            hasSub: !!token.sub,
            sub: token.sub,
            trigger: trigger || 'none',
          });

          // Initial sign in
          if (user && account) {
            delete (token as AugmentedJWT).error;
            logger.debug('[Auth-Debug] Initial Sign In', {
              component: 'auth:jwt',
              userId: user.id,
              provider: account.provider,
            });
            // ... (keep existing initial sign-in logic)
            // For OIDC, we must look up the user in the DB to get the internal CUID and current role
            // The 'user' object from OIDC is just the profile, so 'user.id' is the OIDC 'sub' (not our DB ID)
            if (account.provider === 'oidc' && user.email) {
              try {
                const activeConfig = await getOidcConfig();
                const issuer = activeConfig?.issuer ? normalizeIssuer(activeConfig.issuer) : null;
                const subject = account.providerAccountId || user.id || null;

                // Prefer stable identity link (issuer + subject) over email-only lookup.
                const identity =
                  issuer && subject
                    ? await prisma.oidcIdentity.findUnique({
                        where: { issuer_subject: { issuer, subject } },
                      })
                    : null;

                const dbUser = identity
                  ? await prisma.user.findUnique({ where: { id: identity.userId } })
                  : await prisma.user.findUnique({
                      where: { email: user.email.toLowerCase() },
                    });

                if (dbUser) {
                  token.sub = dbUser.id; // Use internal CUID
                  token.role = dbUser.role;
                  token.name = dbUser.name;
                  token.email = dbUser.email;
                  // Include tokenVersion so we can revoke sessions later
                  (token as AugmentedJWT).tokenVersion = dbUser.tokenVersion ?? 0;
                } else {
                  // This should technically not happen if signIn passed, but just in case
                  logger.error('[Auth] JWT callback - OIDC user not found in DB', {
                    component: 'auth:jwt',
                    email: user.email,
                  });
                }
              } catch (error) {
                logger.error('[Auth] JWT callback - DB lookup failed', {
                  component: 'auth:jwt',
                  error,
                });
              }
            } else {
              // For Credentials, 'user' comes from authorize() and is already the DB user object
              delete (token as AugmentedJWT).error;
              token.role = (user as AugmentedUser).role;
              token.sub = user.id;
              token.name = user.name;
              token.email = user.email;
              (token as AugmentedJWT).tokenVersion = (user as AugmentedUser).tokenVersion ?? 0;
              (token as AugmentedJWT).rememberMe = (user as AugmentedUser).rememberMe === true;
            }

            // Pick the JWT exp cap based on rememberMe. The session
            // cookie itself uses the 30-day NextAuth maxAge so the
            // browser will hold either token; the JWT's own `exp`
            // claim is what makes verification fail at 7 days for
            // non-remember-me sessions.
            const remember = (token as AugmentedJWT).rememberMe === true;
            const ttlSeconds = remember ? rememberMeMaxAgeSeconds : sessionMaxAgeSeconds;
            token.exp = Math.floor(Date.now() / 1000) + ttlSeconds;
          }
          // The user provided in the jwt callback is the one returned by the `authorize` function
          // or the OIDC provider. We need to ensure `token.sub` is set to our internal user ID
          // and `token.role` is set correctly.
          // This block handles the initial population of the token from the `user` object.
          else if (user) {
            delete (token as AugmentedJWT).error;
            logger.debug('[Auth-Debug] Initial Sign In (Fallback)', {
              component: 'auth:jwt',
              userId: user.id || (user as AugmentedUser).id,
            });
            token.role = (user as AugmentedUser).role;
            token.sub = user.id ?? (user as AugmentedUser).id ?? token.sub;
            token.name = user.name;
            token.email = user.email;
            (token as AugmentedJWT).tokenVersion = (user as AugmentedUser).tokenVersion ?? 0;
          }

          // Handle client-side update() calls
          // If trigger is "update", we can accept partial updates from the client if needed,
          // OR simply force a refresh (which is safer/better).
          // We'll treat trigger="update" as a signal to bypass cache.
          if (trigger === 'update') {
            // ...
          }
          // Fetch latest user data from database on each request to ensure name is up-to-date
          // This ensures name changes reflect immediately without requiring re-login
          if (token.sub && typeof token.sub === 'string') {
            // Session revocation: if the user increments tokenVersion, older JWTs are invalid.
            // Session revocation: if the user increments tokenVersion, older JWTs are invalid.
            const currentTokenVersion = (token as AugmentedJWT).tokenVersion;
            const lastFetchedAt = (token as AugmentedJWT).userFetchedAt;
            const ttlMs = getJwtUserRefreshTtlMs();

            // Skip DB fetch if cached AND NOT forced by update trigger
            if (trigger !== 'update' && lastFetchedAt && Date.now() - lastFetchedAt < ttlMs) {
              // Cached
            } else {
              try {
                const dbUser = await prisma.user.findUnique({
                  where: { id: token.sub },
                  select: {
                    name: true,
                    email: true,
                    role: true,
                    tokenVersion: true,
                    status: true,
                    avatarUrl: true,
                    gender: true,
                  },
                });

                if (dbUser) {
                  const dbTokenVersion =
                    typeof dbUser.tokenVersion === 'number' ? dbUser.tokenVersion : 0;
                  logger.debug('[Auth-Debug] User Check', {
                    component: 'auth:jwt',
                    dbId: token.sub,
                    dbVer: dbTokenVersion,
                    tokenVer: currentTokenVersion,
                  });

                  // If disabled, force logout.
                  if (dbUser.status === 'DISABLED') {
                    return clearSessionToken(token as AugmentedJWT, 'USER_DISABLED');
                  }

                  if (
                    typeof currentTokenVersion === 'number' &&
                    dbTokenVersion !== currentTokenVersion
                  ) {
                    logger.warn('[Auth-Debug] REVOKING SESSION: Version Mismatch', {
                      component: 'auth:jwt',
                      db: dbTokenVersion,
                      token: currentTokenVersion,
                    });
                    return clearSessionToken(token as AugmentedJWT, 'SESSION_REVOKED');
                  }

                  token.name = dbUser.name;
                  token.email = dbUser.email;
                  token.role = dbUser.role;
                  token.avatarUrl = dbUser.avatarUrl;
                  token.gender = dbUser.gender;
                  (token as AugmentedJWT).tokenVersion = dbTokenVersion;
                } else {
                  logger.debug('[Auth-Debug] User NOT FOUND in DB', {
                    component: 'auth:jwt',
                    id: token.sub,
                  });
                }
              } catch (error) {
                console.error('[Auth-Debug] DB Fetch Error', error);
              }
              (token as AugmentedJWT).userFetchedAt = Date.now();
            }
          } else {
            logger.debug('[Auth-Debug] No token.sub found!', { component: 'auth:jwt', token });
          }

          return token;
        },
        async session({ session, token }) {
          logger.debug('[Auth-Debug] Session callback', {
            component: 'auth:session',
            hasToken: !!token,
            sub: token?.sub,
            error: (token as AugmentedJWT)?.error,
          });

          if ((token as AugmentedJWT)?.error || !token.sub) {
            // Force unauthenticated session shape.
            (session as unknown as { user: unknown }).user = undefined;
            logger.warn('[Auth-Debug] Session CLEARED due to error/missing sub', {
              component: 'auth:session',
            });
            return session;
          }

          if (session.user) {
            (session.user as AugmentedUser).role = token.role;
            (session.user as AugmentedUser).id = token.sub;
            (session.user as AugmentedUser).tokenVersion =
              (token as AugmentedJWT).tokenVersion ?? 0;
            // Always use the latest name from token (which is fetched from DB)
            session.user.name = (token.name as string) || session.user.name;
            session.user.email = (token.email as string) || session.user.email;
            session.user.avatarUrl = token.avatarUrl;
            session.user.gender = token.gender;
            // Map to standard image field as well for compatibility
            session.user.image = token.avatarUrl || getDefaultAvatar(token.gender, token.sub);
          }

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

          if (account?.provider === 'oidc') {
            // ──────────────────────────────────────────────────────────────
            // IDENTITY-FIRST OIDC SIGN-IN
            //
            // The OIDC spec defines (issuer, subject) as the stable user
            // identifier — not email.  We resolve the identity link FIRST,
            // then fall back to email only for JIT provisioning or
            // invitation activation.
            // ──────────────────────────────────────────────────────────────
            const activeConfig = await getOidcConfig();
            if (!activeConfig) {
              logger.warn('[Auth] OIDC sign-in rejected: configuration missing or invalid', {
                component: 'auth:signIn',
                email,
              });
              return false;
            }

            // Reject an explicit negative verification claim for every provider.
            const emailVerifiedClaim = coerceBooleanClaim((profile as any)?.email_verified); // eslint-disable-line @typescript-eslint/no-explicit-any
            if (emailVerifiedClaim === false) {
              logger.warn('[Auth] OIDC sign-in rejected: email not verified by IdP', {
                component: 'auth:signIn',
                email,
              });
              return false;
            }
            if (
              requiresOidcEmailVerifiedClaim(
                activeConfig.providerType,
                isOidcEmailVerifiedStrict()
              ) &&
              emailVerifiedClaim !== true
            ) {
              logger.warn('[Auth] OIDC sign-in rejected: email_verified missing (strict mode)', {
                component: 'auth:signIn',
                email,
                providerType: activeConfig.providerType,
              });
              return false;
            }

            if (activeConfig.allowedDomains.length > 0) {
              const domain = email.split('@').pop()?.toLowerCase().trim() || '';
              if (!domain || domain === email) {
                logger.warn('[Auth] OIDC sign-in rejected: invalid email domain', {
                  component: 'auth:signIn',
                  email,
                });
                return false;
              }
              const normalizedAllowed = activeConfig.allowedDomains.map(d =>
                d.toLowerCase().trim()
              );
              if (!normalizedAllowed.includes(domain)) {
                logger.warn('[Auth] OIDC sign-in rejected: domain not allowed', {
                  component: 'auth:signIn',
                  email,
                  domain,
                  allowedDomains: activeConfig.allowedDomains,
                });
                return false;
              }
            }

            // ─── Step 1: Resolve (issuer, subject) identity ────────────────
            const issuer = normalizeIssuer(activeConfig.issuer);
            const subject =
              account?.providerAccountId ||
              (profile as any)?.sub || // eslint-disable-line @typescript-eslint/no-explicit-any
              null;

            if (!subject) {
              logger.warn('[Auth] OIDC sign-in rejected: stable subject claim missing', {
                component: 'auth:signIn',
                issuer,
                email,
              });
              return false;
            }

            let existingIdentity = await prisma.oidcIdentity.findUnique({
              where: { issuer_subject: { issuer, subject } },
            });

            type TargetUser = {
              id: string;
              email: string;
              status: string;
              role: string;
              name: string | null;
              department: string | null;
              jobTitle: string | null;
              avatarUrl: string | null;
            };
            let targetUser: TargetUser | null = null;

            if (existingIdentity) {
              // ─── Identity found → load user directly (fast path) ───────
              targetUser = await prisma.user.findUnique({
                where: { id: existingIdentity.userId },
                select: {
                  id: true,
                  email: true,
                  status: true,
                  role: true,
                  name: true,
                  department: true,
                  jobTitle: true,
                  avatarUrl: true,
                },
              });

              if (!targetUser || targetUser.status === 'DISABLED') {
                logger.warn('[Auth] OIDC sign-in rejected: linked user not found or disabled', {
                  component: 'auth:signIn',
                  issuer,
                  subject,
                  linkedUserId: existingIdentity.userId,
                });
                return false;
              }

              logger.debug('[Auth] OIDC identity resolved via issuer+sub', {
                component: 'auth:signIn',
                issuer,
                subject,
                userId: targetUser.id,
              });
            } else {
              // ─── Identity not found → fall back to email for JIT / invite ──
              const emailUser = await prisma.user.findUnique({
                where: { email },
                select: {
                  id: true,
                  email: true,
                  status: true,
                  role: true,
                  name: true,
                  department: true,
                  jobTitle: true,
                  avatarUrl: true,
                },
              });

              if (emailUser?.status === 'DISABLED') {
                logger.warn('[Auth] OIDC sign-in rejected: user disabled', {
                  component: 'auth:signIn',
                  provider: account?.provider,
                  email,
                });
                return false;
              }

              if (!emailUser) {
                // ─── JIT provisioning ──────────────────────────────────
                if (!activeConfig.autoProvision) {
                  logger.warn('[Auth] OIDC sign-in rejected: auto-provision disabled', {
                    component: 'auth:signIn',
                    email,
                  });
                  return false;
                }

                try {
                  const newUser = await prisma.user.create({
                    data: {
                      email,
                      name: user.name || email.split('@')[0],
                      role: 'USER',
                      status: 'ACTIVE',
                    },
                  });

                  logger.info('[Auth] Created new user via OIDC auto-provision', {
                    component: 'auth:signIn',
                    userId: newUser.id,
                    email,
                  });

                  targetUser = {
                    id: newUser.id,
                    email: newUser.email,
                    status: newUser.status,
                    role: newUser.role,
                    name: newUser.name,
                    department: null,
                    jobTitle: null,
                    avatarUrl: null,
                  };
                } catch (error) {
                  logger.error('[Auth] Failed to create OIDC user', {
                    component: 'auth:signIn',
                    error,
                  });
                  return false;
                }
              } else {
                targetUser = emailUser;
              }

              // ─── First-time identity linking (atomic) ────────────────
              const isInvitedUser = targetUser.status === 'INVITED';
              try {
                existingIdentity = await runSerializableTransaction(async tx => {
                  const currentTarget = await tx.user.findUnique({
                    where: { id: targetUser!.id },
                    select: { id: true, status: true },
                  });
                  if (!currentTarget || currentTarget.status === 'DISABLED') {
                    throw new Error('OIDC_TARGET_NOT_OPERATIONAL');
                  }

                  const linked = await tx.oidcIdentity.findUnique({
                    where: { issuer_subject: { issuer, subject } },
                  });
                  if (linked) {
                    if (linked.userId !== currentTarget.id) {
                      throw new Error('OIDC_IDENTITY_OWNED_BY_ANOTHER_USER');
                    }
                    return linked;
                  }

                  // Existing accounts must meet the provider-specific email
                  // assurance policy.
                  if (
                    emailUser &&
                    !hasOidcEmailLinkAssurance(activeConfig.providerType, emailVerifiedClaim)
                  ) {
                    throw new Error('OIDC_LINK_NOT_APPROVED');
                  }

                  const requiresLinkApproval =
                    Boolean(emailUser) &&
                    (currentTarget.status !== 'INVITED' || emailVerifiedClaim !== true);
                  if (requiresLinkApproval) {
                    const approval = await tx.oidcLinkingApproval.findFirst({
                      where: { userId: currentTarget.id, revokedAt: null },
                      select: { id: true, expiresAt: true },
                    });
                    if (!approval) throw new Error('OIDC_LINK_NOT_APPROVED');
                    // Check approval TTL if configured
                    if (approval.expiresAt && approval.expiresAt < new Date()) {
                      throw new Error('OIDC_LINK_APPROVAL_EXPIRED');
                    }
                    const consumed = await tx.oidcLinkingApproval.updateMany({
                      where: { id: approval.id, revokedAt: null },
                      data: { revokedAt: new Date() },
                    });
                    if (consumed.count !== 1) throw new Error('OIDC_LINK_NOT_APPROVED');
                  }

                  return tx.oidcIdentity.create({
                    data: { issuer, subject, email, userId: currentTarget.id },
                  });
                });
              } catch (error) {
                if (
                  error instanceof Error &&
                  (error.message === 'OIDC_LINK_NOT_APPROVED' ||
                    error.message === 'OIDC_LINK_APPROVAL_EXPIRED' ||
                    error.message === 'OIDC_TARGET_NOT_OPERATIONAL' ||
                    error.message === 'OIDC_IDENTITY_OWNED_BY_ANOTHER_USER')
                ) {
                  logger.warn(
                    '[Auth] OIDC sign-in blocked: account linking authorization changed',
                    {
                      component: 'auth:signIn',
                      email,
                      issuer,
                      subject,
                      reason: error.message,
                    }
                  );
                  return false;
                }
                throw error;
              }
              logger.info('[Auth] Linked OIDC identity to user', {
                component: 'auth:signIn',
                issuer,
                subject,
                userId: targetUser.id,
                isInvitedUser,
                adminProvisioned: !!emailUser,
              });
            }

            // At this point we have a valid targetUser and an existingIdentity
            if (!targetUser) {
              logger.error('[Auth] OIDC sign-in failed: no target user resolved', {
                component: 'auth:signIn',
                email,
              });
              return false;
            }

            if (targetUser.status === 'DISABLED') {
              logger.warn('[Auth] OIDC sign-in rejected: user is disabled', {
                component: 'auth:signIn',
                userId: targetUser.id,
                email,
              });
              return false;
            }

            const updateData: Record<string, unknown> = {};

            // Ensure user object has correct ID for JWT
            user.id = targetUser.id;

            // First successful SSO completes an outstanding invitation.
            if (targetUser.status === 'INVITED') {
              updateData.status = 'ACTIVE';
              updateData.invitedAt = null;
              updateData.deactivatedAt = null;
              logger.info('[Auth] Activating invited user via OIDC', {
                component: 'auth:signIn',
                userId: targetUser.id,
                previousStatus: targetUser.status,
              });
            }

            // ─── Role Evaluation (with de-provisioning) ──────────────
            // When role mapping is configured and NO rule matches, the
            // user's role is reset to USER.  This ensures removing a user
            // from an IdP group actually revokes the corresponding privilege.
            if (
              activeConfig.roleMapping &&
              Array.isArray(activeConfig.roleMapping) &&
              activeConfig.roleMapping.length > 0 &&
              (profile as any) // eslint-disable-line @typescript-eslint/no-explicit-any
            ) {
              const mapping = activeConfig.roleMapping as Array<{
                claim: string;
                value: string;
                role: 'ADMIN' | 'RESPONDER' | 'AUDITOR' | 'USER';
              }>;
              let matchedRole: string | null = null;

              for (const rule of mapping) {
                const claimValue = (profile as any)[rule.claim]; // eslint-disable-line @typescript-eslint/no-explicit-any
                let match = false;

                if (Array.isArray(claimValue)) {
                  match = claimValue.includes(rule.value);
                } else if (claimValue === rule.value) {
                  match = true;
                }

                if (match) {
                  matchedRole = rule.role;
                  break;
                }
              }

              if (matchedRole) {
                if (targetUser.role !== matchedRole) {
                  updateData.role = matchedRole;
                  logger.info('[Auth] OIDC role mapping applied', {
                    component: 'auth:signIn',
                    userId: targetUser.id,
                    oldRole: targetUser.role,
                    newRole: matchedRole,
                  });
                }
              } else {
                // No mapping matched → de-provision to USER if currently elevated
                if (targetUser.role !== 'USER') {
                  updateData.role = 'USER';
                  logger.info('[Auth] OIDC role de-provisioned: no mapping matched', {
                    component: 'auth:signIn',
                    userId: targetUser.id,
                    oldRole: targetUser.role,
                    newRole: 'USER',
                  });
                }
              }
            }

            // JIT Profile Sync
            if (
              activeConfig.profileMapping &&
              typeof activeConfig.profileMapping === 'object' &&
              profile
            ) {
              const mapping = activeConfig.profileMapping as Record<string, string>;
              const oidcProfile = profile as Record<string, unknown>;

              if (mapping.department && oidcProfile[mapping.department]) {
                const dept = String(oidcProfile[mapping.department]);
                if (dept && dept !== targetUser.department) {
                  updateData.department = dept;
                }
              }

              if (mapping.jobTitle && oidcProfile[mapping.jobTitle]) {
                const title = String(oidcProfile[mapping.jobTitle]);
                if (title && title !== targetUser.jobTitle) {
                  updateData.jobTitle = title;
                }
              }

              if (mapping.avatarUrl && oidcProfile[mapping.avatarUrl]) {
                const avatar = String(oidcProfile[mapping.avatarUrl]);
                let safeAvatar: string | null = null;
                try {
                  const parsedAvatar = new URL(avatar);
                  if (parsedAvatar.protocol === 'https:' && avatar.length <= 2048) {
                    safeAvatar = parsedAvatar.toString();
                  }
                } catch {
                  safeAvatar = null;
                }
                const isLocalUpload =
                  targetUser.avatarUrl?.startsWith('/api/users/') ||
                  targetUser.avatarUrl?.startsWith('/uploads/');

                if (safeAvatar && safeAvatar !== targetUser.avatarUrl && !isLocalUpload) {
                  updateData.avatarUrl = safeAvatar;
                }
              }

              if (updateData.department || updateData.jobTitle || updateData.avatarUrl) {
                updateData.lastOidcSync = new Date();
              }
            }

            if (updateData.role && updateData.role !== targetUser.role) {
              updateData.tokenVersion = { increment: 1 };
            }

            if (Object.keys(updateData).length > 0) {
              if (updateData.role && updateData.role !== targetUser.role) {
                const { updateUserSecurityState } = await import('@/lib/users/admin-invariants');
                const mappedRole = updateData.role as 'ADMIN' | 'RESPONDER' | 'AUDITOR' | 'USER';
                delete updateData.role;
                await updateUserSecurityState(targetUser.id, { role: mappedRole }, updateData);
              } else {
                await prisma.user.update({
                  where: { id: targetUser.id },
                  data: updateData,
                });
              }
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

            try {
              const { logLoginSuccess } = await import('@/lib/login-audit');
              const { headers } = await import('next/headers');
              const h = await headers();
              const ua = h.get('user-agent') || 'Unknown';
              const ip =
                h.get('x-forwarded-for')?.split(',')[0].trim() || h.get('x-real-ip') || 'Unknown';
              await logLoginSuccess(email, targetUser.id, ip, ua, 'oidc');
            } catch {
              // Non-critical audit logging failure
            }
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

export async function revokeUserSessions(userId: string) {
  // Increment tokenVersion to invalidate all JWT sessions for this user.
  await prisma.user.update({
    where: { id: userId },
    data: { tokenVersion: { increment: 1 } },
  });
}

/**
 * Internal helper to reset the auth options cache.
 * Intended for use in tests only.
 */
export function resetAuthOptionsCache() {
  authOptionsCache = undefined;
  authOptionsInFlight = undefined;
}
