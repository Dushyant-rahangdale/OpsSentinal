import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { checkRateLimit } from './src/lib/rate-limit';

const PUBLIC_PATH_PREFIXES = ['/login', '/set-password', '/api', '/status'];
const CORS_ALLOWED_ORIGINS = (process.env.CORS_ALLOWED_ORIGINS || '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
const API_RATE_LIMIT_MAX = Number(process.env.API_RATE_LIMIT_MAX || 300);
const API_RATE_LIMIT_WINDOW_MS = Number(process.env.API_RATE_LIMIT_WINDOW_MS || 60_000);

function isPublicPath(pathname: string) {
    if (PUBLIC_PATH_PREFIXES.some((path) => pathname.startsWith(path))) {
        return true;
    }

    if (pathname.startsWith('/_next') || pathname.startsWith('/favicon.ico')) {
        return true;
    }

    return /\.[^/]+$/.test(pathname);
}

export async function middleware(req: NextRequest) {
    const { pathname } = req.nextUrl;
    const origin = req.headers.get('origin');

    if (pathname.startsWith('/api')) {
        const originAllowed = origin && CORS_ALLOWED_ORIGINS.includes(origin);
        const applyRateLimit = !pathname.startsWith('/api/cron') && !pathname.startsWith('/api/events/stream');

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
                const rateKey = `ip:${req.ip || 'unknown'}:${pathname}`;
                const rate = checkRateLimit(rateKey, API_RATE_LIMIT_MAX, API_RATE_LIMIT_WINDOW_MS);
                if (!rate.allowed) {
                    const retryAfter = Math.ceil((rate.resetAt - Date.now()) / 1000);
                    return NextResponse.json(
                        { error: 'Rate limit exceeded.' },
                        { status: 429, headers: { ...corsHeaders, 'Retry-After': String(retryAfter) } }
                    );
                }
            }

            const response = NextResponse.next();
            Object.entries(corsHeaders).forEach(([key, value]) => {
                response.headers.set(key, value);
            });
            return response;
        }

        if (applyRateLimit) {
            const rateKey = `ip:${req.ip || 'unknown'}:${pathname}`;
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

    if (isPublicPath(pathname)) {
        return NextResponse.next();
    }

    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });

    if (!token) {
        const url = req.nextUrl.clone();
        url.pathname = '/login';
        url.searchParams.set('callbackUrl', req.nextUrl.pathname + req.nextUrl.search);
        return NextResponse.redirect(url);
    }

    return NextResponse.next();
}

export const config = {
    matcher: ['/((?!_next/static|_next/image).*)']
};
