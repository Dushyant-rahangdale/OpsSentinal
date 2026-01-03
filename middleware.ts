import { NextResponse, type NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { checkRateLimit } from './src/lib/rate-limit';
import { logger } from '@/lib/logger';

const PUBLIC_PATH_PREFIXES = [
  '/login',
  '/set-password',
  '/api',
  '/status',
  '/setup',
  '/logs',
  '/m',
];

/**
 * Detect mobile device from User-Agent header
 */
function isMobileUserAgent(userAgent: string | null): boolean {
  if (!userAgent) {
    logger.info('Mobile detection: No user agent');
    return false;
  }
  // Match common mobile device patterns
  const isMobile =
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile|mobile|CriOS/i.test(
      userAgent
    );
  logger.info('Mobile detection', { userAgent, isMobile });
  return isMobile;
}
const CORS_ALLOWED_ORIGINS = (process.env.CORS_ALLOWED_ORIGINS || '')
  .split(',')
  .map(value => value.trim())
  .filter(Boolean);
const API_RATE_LIMIT_MAX = Number(process.env.API_RATE_LIMIT_MAX || 300);
const API_RATE_LIMIT_WINDOW_MS = Number(process.env.API_RATE_LIMIT_WINDOW_MS || 60_000);
const STATUS_DOMAIN_CACHE_TTL = Number(process.env.STATUS_PAGE_DOMAIN_CACHE_TTL || 60);

function isPublicPath(pathname: string) {
  // Exact matches for public paths
  if (PUBLIC_PATH_PREFIXES.some(path => pathname === path || pathname.startsWith(`${path}/`))) {
    return true;
  }

  // Next.js and static files
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon.ico') ||
    pathname.startsWith('/icon.svg')
  ) {
    return true;
  }

  // Public static assets in /public folder (images, etc)
  // Only allow specific extensions to avoid leaking pages as static files
  return /\.(jpg|jpeg|png|gif|svg|ico|css|js|woff|woff2|ttf|eot)$/i.test(pathname);
}

function normalizeHostname(value?: string | null) {
  if (!value) return '';
  return value.split(':')[0]?.trim().toLowerCase() || '';
}

function parseHostname(value?: string | null) {
  if (!value) return '';
  const trimmed = value.trim();
  if (!trimmed) return '';
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    try {
      return normalizeHostname(new URL(trimmed).host);
    } catch {
      return '';
    }
  }
  return normalizeHostname(trimmed);
}

function buildSubdomainHost(subdomain: string, appHost: string) {
  const cleanSubdomain = parseHostname(subdomain);
  if (!cleanSubdomain) return '';
  if (cleanSubdomain.includes('.')) {
    return cleanSubdomain;
  }
  const baseHost = normalizeHostname(appHost);
  if (!baseHost) return '';
  return `${cleanSubdomain}.${baseHost}`;
}

async function fetchStatusDomainConfig(origin: string) {
  try {
    const response = await fetch(`${origin}/api/status-page/domains`, {
      next: { revalidate: STATUS_DOMAIN_CACHE_TTL },
      headers: { 'x-internal-request': 'status-domain-check' },
    });
    if (!response.ok) {
      return null;
    }
    return (await response.json()) as {
      enabled: boolean;
      subdomain?: string | null;
      customDomain?: string | null;
      appHost?: string | null;
    };
  } catch {
    return null;
  }
}

/**
 * Security headers to apply to all responses
 */
function getSecurityHeaders(): Record<string, string> {
  const isProduction = process.env.NODE_ENV === 'production';

  return {
    // Prevent MIME type sniffing
    'X-Content-Type-Options': 'nosniff',
    // Prevent clickjacking
    'X-Frame-Options': 'DENY',
    // XSS protection (legacy but still useful)
    'X-XSS-Protection': '1; mode=block',
    // Referrer policy
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    // Permissions policy (formerly Feature-Policy)
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
    // Content Security Policy (basic)
    'Content-Security-Policy': [
      "default-src 'self'",
      "script-src 'self' 'unsafe-eval' 'unsafe-inline'", // Next.js requires unsafe-eval
      "style-src 'self' 'unsafe-inline'", // Next.js requires unsafe-inline for styles
      "img-src 'self' data: https:",
      "font-src 'self' data:",
      "connect-src 'self'",
      "frame-ancestors 'none'",
    ].join('; '),
    // HSTS (only in production with HTTPS)
    ...(isProduction && {
      'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
    }),
  };
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const origin = req.headers.get('origin');

  // Create response with security headers
  const start = Date.now();
  const response = NextResponse.next();
  const securityHeaders = getSecurityHeaders();
  Object.entries(securityHeaders).forEach(([key, value]) => {
    response.headers.set(key, value);
  });

  // Fire-and-Forget Telemetry (Non-blocking)
  // We calculate duration based on processing time up to here.
  // Note: In Next.js middleware, we can't easily hook 'after' response is sent without custom server,
  // so this measures middleware + routing overhead, which is a good proxy for latency.
  // For full execution time, we'd need to wrap API handlers, but this is a great global catch-all.
  const duration = Date.now() - start;
  import('./src/middleware/telemetry-middleware')
    .then(({ recordRequestTelemetry }) => {
      recordRequestTelemetry(req, response.status, duration);
    })
    .catch(err => logger.error('Telemetry Load Error', { error: err }));

  // ===== MOBILE DEVICE REDIRECT =====
  // Redirect mobile users to /m/* routes for optimized mobile experience
  const userAgent = req.headers.get('user-agent');
  const isMobile = isMobileUserAgent(userAgent);
  const preferDesktop = req.cookies.get('prefer-desktop')?.value === 'true';

  // Redirect mobile users to mobile routes, unless:
  // - Already on mobile route (/m/*)
  // - User prefers desktop (cookie set)
  // - Accessing API, static files, or setup pages
  const shouldRedirectToMobile =
    isMobile &&
    !preferDesktop &&
    !pathname.startsWith('/m') &&
    !pathname.startsWith('/api') &&
    !pathname.startsWith('/setup') &&
    !pathname.startsWith('/_next') &&
    !pathname.startsWith('/favicon') &&
    !/\.(jpg|jpeg|png|gif|svg|ico|css|js|woff|woff2|ttf|eot)$/i.test(pathname);

  if (shouldRedirectToMobile) {
    const mobileUrl = req.nextUrl.clone();
    // Map desktop routes to mobile equivalents
    if (pathname === '/') {
      mobileUrl.pathname = '/m';
    } else if (pathname === '/login') {
      // Special redirect for login page
      mobileUrl.pathname = '/m/login';
    } else if (pathname === '/forgot-password') {
      // Special redirect for forgot password page
      mobileUrl.pathname = '/m/forgot-password';
    } else {
      mobileUrl.pathname = `/m${pathname}`;
    }
    const redirectResponse = NextResponse.redirect(mobileUrl);
    Object.entries(securityHeaders).forEach(([key, value]) => {
      redirectResponse.headers.set(key, value);
    });
    return redirectResponse;
  }

  // STRICT CHECK: If on mobile, prohibit access to desktop pages if not explicitly opted in
  // This covers case where user manually types /incidents
  if (
    isMobile &&
    !preferDesktop &&
    !pathname.startsWith('/m') &&
    !pathname.startsWith('/api') &&
    !pathname.startsWith('/login') &&
    !pathname.startsWith('/_next') &&
    !isPublicPath(pathname)
  ) {
    const mobileUrl = req.nextUrl.clone();
    mobileUrl.pathname = '/m'; // Send to mobile home or attempt mapping
    // Attempt mapping
    if (pathname !== '/') mobileUrl.pathname = `/m${pathname}`;

    const redirectResponse = NextResponse.redirect(mobileUrl);
    Object.entries(securityHeaders).forEach(([key, value]) => {
      redirectResponse.headers.set(key, value);
    });
    return redirectResponse;
  }

  if (pathname.startsWith('/api')) {
    const originAllowed = origin && CORS_ALLOWED_ORIGINS.includes(origin);
    const applyRateLimit =
      !pathname.startsWith('/api/cron') && !pathname.startsWith('/api/events/stream');
    const clientId =
      req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      req.headers.get('x-real-ip') ||
      'unknown';

    if (originAllowed) {
      const corsHeaders = {
        'Access-Control-Allow-Origin': origin,
        'Access-Control-Allow-Methods': 'GET,POST,PATCH,DELETE,OPTIONS',
        'Access-Control-Allow-Headers': 'Authorization, Content-Type, X-API-Key',
        'Access-Control-Allow-Credentials': 'true',
        Vary: 'Origin',
      };

      if (req.method === 'OPTIONS') {
        return new NextResponse(null, { status: 204, headers: corsHeaders });
      }

      if (applyRateLimit) {
        const rateKey = `ip:${clientId}:${pathname}`;
        const rate = checkRateLimit(rateKey, API_RATE_LIMIT_MAX, API_RATE_LIMIT_WINDOW_MS);
        if (!rate.allowed) {
          const retryAfter = Math.ceil((rate.resetAt - Date.now()) / 1000);
          return NextResponse.json(
            { error: 'Rate limit exceeded.' },
            { status: 429, headers: { ...corsHeaders, 'Retry-After': String(retryAfter) } }
          );
        }
      }

      const apiResponse = NextResponse.next();
      // Apply CORS headers
      Object.entries(corsHeaders).forEach(([key, value]) => {
        apiResponse.headers.set(key, value);
      });
      // Apply security headers
      Object.entries(securityHeaders).forEach(([key, value]) => {
        apiResponse.headers.set(key, value);
      });
      return apiResponse;
    }

    if (applyRateLimit) {
      const rateKey = `ip:${clientId}:${pathname}`;
      const rate = checkRateLimit(rateKey, API_RATE_LIMIT_MAX, API_RATE_LIMIT_WINDOW_MS);
      if (!rate.allowed) {
        const retryAfter = Math.ceil((rate.resetAt - Date.now()) / 1000);
        return NextResponse.json(
          { error: 'Rate limit exceeded.' },
          { status: 429, headers: { 'Retry-After': String(retryAfter) } }
        );
      }
    }
  }

  if (pathname.startsWith('/api/status-page/domains')) {
    return response;
  }

  const statusConfig = await fetchStatusDomainConfig(req.nextUrl.origin);
  if (statusConfig?.enabled) {
    const hostname = normalizeHostname(req.headers.get('host'));
    const allowedHosts = new Set<string>();
    if (statusConfig.subdomain && statusConfig.appHost) {
      const subdomainHost = buildSubdomainHost(statusConfig.subdomain, statusConfig.appHost);
      if (subdomainHost) {
        allowedHosts.add(subdomainHost);
      }
    }
    if (statusConfig.customDomain) {
      const customHost = parseHostname(statusConfig.customDomain);
      if (customHost) {
        allowedHosts.add(customHost);
      }
    }
    if (hostname && allowedHosts.has(hostname)) {
      if (!pathname.startsWith('/api') && !pathname.startsWith('/status')) {
        const url = req.nextUrl.clone();
        url.pathname = '/status';
        const rewriteResponse = NextResponse.rewrite(url);
        Object.entries(securityHeaders).forEach(([key, value]) => {
          rewriteResponse.headers.set(key, value);
        });
        return rewriteResponse;
      }
      return response;
    }
  }

  // Check authentication status
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  const isAuthenticated = !!token;

  // Handle authenticated users trying to access public auth pages
  if (isAuthenticated) {
    // Redirect authenticated users away from auth-related pages
    if (pathname === '/login' || pathname.startsWith('/login')) {
      // Redirect authenticated users away from login page
      const callbackUrl = req.nextUrl.searchParams.get('callbackUrl');
      const redirectUrl =
        callbackUrl && callbackUrl.startsWith('/') && !callbackUrl.startsWith('/login')
          ? callbackUrl
          : '/'; // Default to dashboard
      const redirectResponse = NextResponse.redirect(new URL(redirectUrl, req.url));
      // Apply security headers to redirect
      Object.entries(securityHeaders).forEach(([key, value]) => {
        redirectResponse.headers.set(key, value);
      });
      return redirectResponse;
    }
    if (pathname === '/setup') {
      // Redirect authenticated users away from setup page (bootstrap only)
      const redirectResponse = NextResponse.redirect(new URL('/', req.url));
      // Apply security headers to redirect
      Object.entries(securityHeaders).forEach(([key, value]) => {
        redirectResponse.headers.set(key, value);
      });
      return redirectResponse;
    }
    // Authenticated user accessing protected route - allow
    return response;
  }

  // Handle unauthenticated users
  if (isPublicPath(pathname)) {
    // Allow access to public paths
    return response;
  }

  // Allow the root page to render for unauthenticated users
  // This allows the root page's server component to decide whether to redirect to /login or /setup
  // based on whether users exist in the database.
  // if (pathname === '/') {
  //    return response;
  // }

  // Unauthenticated user trying to access protected route - redirect to login
  const url = req.nextUrl.clone();
  // Redirect mobile users to mobile login page
  url.pathname = isMobile && !preferDesktop ? '/m/login' : '/login';
  url.searchParams.set('callbackUrl', req.nextUrl.pathname + req.nextUrl.search);
  const redirectResponse = NextResponse.redirect(url);
  // Apply security headers to redirect
  Object.entries(securityHeaders).forEach(([key, value]) => {
    redirectResponse.headers.set(key, value);
  });
  return redirectResponse;
}

export const config = {
  // Match all request paths except for the ones starting with:
  // - _next/static (static files)
  // - _next/image (image optimization files)
  // - favicon.ico (favicon file)
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
