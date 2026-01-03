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
import './mobile-premium.css';
import PullToRefresh from '@/components/mobile/PullToRefresh';
import MobileSwipeNavigator from '@/components/mobile/MobileSwipeNavigator';
import MobileNetworkBanner from '@/components/mobile/MobileNetworkBanner';

export const dynamic = 'force-dynamic';

export default async function MobileLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(await getAuthOptions());

  if (!session?.user?.email) {
    redirect('/m/login');
  }

  // Check system status
  // Check system status
  const [criticalCount, lowUrgencyCount] = await Promise.all([
    prisma.incident.count({
      where: {
        status: { in: ['OPEN', 'ACKNOWLEDGED', 'SNOOZED', 'SUPPRESSED'] },
        urgency: 'HIGH',
      },
    }),
    prisma.incident.count({
      where: {
        status: { in: ['OPEN', 'ACKNOWLEDGED', 'SNOOZED', 'SUPPRESSED'] },
        urgency: 'LOW',
      },
    }),
  ]);

  const systemStatus: 'ok' | 'warning' | 'danger' =
    criticalCount > 0 ? 'danger' : lowUrgencyCount > 0 ? 'warning' : 'ok';

  return (
    <ToastProvider>
      <ThemeProvider attribute="data-theme" defaultTheme="system" enableSystem>
        <div className="mobile-shell" data-status={systemStatus}>
          <MobileHeader systemStatus={systemStatus} />
          <main className="mobile-content">
            <MobileNetworkBanner />
            <MobileSwipeNavigator>
              <PullToRefresh>{children}</PullToRefresh>
            </MobileSwipeNavigator>
          </main>
          <MobileNav />
        </div>
      </ThemeProvider>
    </ToastProvider>
  );
}
