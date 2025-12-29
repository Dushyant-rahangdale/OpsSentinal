import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { checkRateLimit } from './src/lib/rate-limit';

const PUBLIC_PATH_PREFIXES = ['/login', '/set-password', '/api', '/status', '/setup'];
const CORS_ALLOWED_ORIGINS = (process.env.CORS_ALLOWED_ORIGINS || '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
const API_RATE_LIMIT_MAX = Number(process.env.API_RATE_LIMIT_MAX || 300);
const API_RATE_LIMIT_WINDOW_MS = Number(process.env.API_RATE_LIMIT_WINDOW_MS || 60_000);

function isPublicPath(pathname: string) {
    // Exact matches for public paths
    if (PUBLIC_PATH_PREFIXES.some((path) => pathname === path || pathname.startsWith(`${path}/`))) {
        return true;
    }

    // Next.js and static files
    if (pathname.startsWith('/_next') || pathname.startsWith('/favicon.ico') || pathname.startsWith('/icon.svg')) {
        return true;
    }

    // Public static assets in /public folder (images, etc)
    // Only allow specific extensions to avoid leaking pages as static files
    return /\.(jpg|jpeg|png|gif|svg|ico|css|js|woff|woff2|ttf|eot)$/i.test(pathname);
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
    const response = NextResponse.next();
    const securityHeaders = getSecurityHeaders();
    Object.entries(securityHeaders).forEach(([key, value]) => {
        response.headers.set(key, value);
    });

    if (pathname.startsWith('/api')) {
        const originAllowed = origin && CORS_ALLOWED_ORIGINS.includes(origin);
        const applyRateLimit = !pathname.startsWith('/api/cron') && !pathname.startsWith('/api/events/stream');
        const clientId = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
            || req.headers.get('x-real-ip')
            || 'unknown';

        if (originAllowed) {
            const corsHeaders = {
                'Access-Control-Allow-Origin': origin,
                'Access-Control-Allow-Methods': 'GET,POST,PATCH,DELETE,OPTIONS',
                'Access-Control-Allow-Headers': 'Authorization, Content-Type, X-API-Key',
                'Access-Control-Allow-Credentials': 'true',
                'Vary': 'Origin'
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

    // Check authentication status
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    const isAuthenticated = !!token;

    // Handle authenticated users trying to access public auth pages
    if (isAuthenticated) {
        // Redirect authenticated users away from auth-related pages
        if (pathname === '/login' || pathname.startsWith('/login')) {
            // Redirect authenticated users away from login page
            const callbackUrl = req.nextUrl.searchParams.get('callbackUrl');
            const redirectUrl = callbackUrl && callbackUrl.startsWith('/') && !callbackUrl.startsWith('/login')
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
    url.pathname = '/login';
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
