import React from 'react';
import { getServerSession } from 'next-auth';
import { getAuthOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import MobileMoreContent from '@/components/mobile/MobileMoreContent';

export const dynamic = 'force-dynamic';

export default async function MobileMorePage() {
    const session = await getServerSession(await getAuthOptions());

    const user = session?.user?.email
        ? await prisma.user.findUnique({
            where: { email: session.user.email },
            select: { name: true, email: true, role: true },
        })
        : null;

    return (
        <MobileMoreContent
            name={user?.name || 'User'}
            email={user?.email || ''}
            role={user?.role || 'User'}
        />
    );
}
