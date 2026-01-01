import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { getAuthOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import MobileNav from '@/components/mobile/MobileNav';
import MobileHeader from '@/components/mobile/MobileHeader';
import { ToastProvider } from '@/components/ToastProvider';
import { ThemeProvider } from '@/components/providers/ThemeProvider';
import '@/app/globals.css';
import './mobile.css';
import PullToRefresh from '@/components/mobile/PullToRefresh';

export const dynamic = 'force-dynamic';

export default async function MobileLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const session = await getServerSession(await getAuthOptions());

    if (!session?.user?.email) {
        redirect('/login');
    }

    // Check system status
    const criticalCount = await prisma.incident.count({
        where: {
            status: { not: 'RESOLVED' },
            urgency: 'HIGH',
        },
    });

    const systemStatus: 'ok' | 'warning' | 'danger' =
        criticalCount > 0 ? 'danger' : 'ok';

    return (
        <ToastProvider>
            <ThemeProvider attribute="data-theme" defaultTheme="system" enableSystem>
                <div className="mobile-shell">
                    <MobileHeader systemStatus={systemStatus} />
                    <main className="mobile-content">
                        <PullToRefresh>
                            {children}
                        </PullToRefresh>
                    </main>
                    <MobileNav />
                </div>
            </ThemeProvider>
        </ToastProvider>
    );
}
