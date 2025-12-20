import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

const PUBLIC_PATH_PREFIXES = ['/login', '/set-password', '/api'];

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
