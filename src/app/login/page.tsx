import LoginClient from './LoginClient';
import { getServerSession } from 'next-auth';
import { getAuthOptions } from '@/lib/auth';
import { getOidcConfig } from '@/lib/oidc-config';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

type SearchParams = {
    callbackUrl?: string;
    error?: string;
    password?: string;
};

import prisma from '@/lib/prisma';

export default async function LoginPage({ searchParams }: { searchParams?: Promise<SearchParams> }) {
    // Bootstrap check: If no users exist, redirect to setup
    let userCount = 0;
    try {
        userCount = await prisma.user.count();
    } catch (error) {
        // If DB is not ready, we might want to let the login page load or show error
        // But for now, let's just log it and proceed to login
        console.error('Failed to check user count:', error);
    }

    // Redirect outside try-catch so Next.js redirect error can bubble up
    if (userCount === 0) {
        redirect('/setup');
    }

    const session = await getServerSession(await getAuthOptions());
    const ssoConfig = await getOidcConfig();
    const ssoEnabled = Boolean(ssoConfig);

    // Server-side check: If user is already authenticated, redirect them away
    if (session) {
        if (session?.user?.email) {
            try {
                const existingUser = await prisma.user.findUnique({
                    where: { email: session.user.email },
                    select: { id: true }
                });
                if (!existingUser) {
                    redirect('/api/auth/signout?callbackUrl=/login');
                }
            } catch (error) {
                console.error('[Login Page] Failed to verify session user:', error);
            }
        }
        const awaitedSearchParams = await searchParams;
        const callbackUrl = typeof awaitedSearchParams?.callbackUrl === 'string'
            ? awaitedSearchParams.callbackUrl
            : '/';
        // Only redirect to callbackUrl if it's a valid internal path
        const redirectUrl = callbackUrl.startsWith('/') && !callbackUrl.startsWith('/login')
            ? callbackUrl
            : '/'; // Default to dashboard
        redirect(redirectUrl);
    }

    const awaitedSearchParams = await searchParams;
    const callbackUrl = typeof awaitedSearchParams?.callbackUrl === 'string' ? awaitedSearchParams.callbackUrl : '/';
    const errorCode = typeof awaitedSearchParams?.error === 'string' ? awaitedSearchParams.error : null;
    const passwordSet = awaitedSearchParams?.password === '1';

    return (
        <LoginClient callbackUrl={callbackUrl} errorCode={errorCode} passwordSet={passwordSet} ssoEnabled={ssoEnabled} />
    );
}
