import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { getAuthOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import MobileNav from '@/components/mobile/MobileNav';
import MobileHeader from '@/components/mobile/MobileHeader';
import { ToastProvider } from '@/components/ToastProvider';
import '@/app/globals.css';
import './mobile.css';
import './mobile-premium.css';
import PullToRefresh from '@/components/mobile/PullToRefresh';
import MobileSwipeNavigator from '@/components/mobile/MobileSwipeNavigator';
import MobileNetworkBanner from '@/components/mobile/MobileNetworkBanner';
import { TimezoneProvider } from '@/contexts/TimezoneContext';
import { UserAvatarProvider } from '@/contexts/UserAvatarContext';
import { ThemeProvider } from '@/components/providers/ThemeProvider';

// Force all app routes to be dynamic
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function MobileLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(await getAuthOptions());

  if (!session?.user?.email) {
    redirect('/m/login');
  }

  // Fetch full user details to handle avatar/timezone
  const dbUser = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      avatarUrl: true,
      gender: true,
      timeZone: true,
    },
  });

  if (!dbUser) {
    // Session is stale or user was deleted
    redirect('/api/auth/signout?callbackUrl=/m/login');
  }

  // Incident Counts Logic (Same as Desktop)
  let criticalOpenCount = 0;
  let mediumOpenCount = 0;
  let lowOpenCount = 0;

  try {
    const openUrgencyCounts = await prisma.incident.groupBy({
      by: ['urgency'],
      where: {
        status: { notIn: ['RESOLVED', 'SNOOZED', 'SUPPRESSED'] as const },
      },
      _count: { _all: true },
    });

    for (const entry of openUrgencyCounts) {
      if (entry.urgency === 'HIGH') criticalOpenCount = entry._count._all;
      else if (entry.urgency === 'MEDIUM') mediumOpenCount = entry._count._all;
      else if (entry.urgency === 'LOW') lowOpenCount = entry._count._all;
    }
  } catch (error) {
    console.error('Failed to load incident counts', error);
  }

  // Determine System Status
  let systemStatus: 'ok' | 'warning' | 'danger' = 'ok';
  if (criticalOpenCount > 0) systemStatus = 'danger';
  else if (mediumOpenCount > 0) systemStatus = 'warning';

  return (
    <ToastProvider>
      <TimezoneProvider initialTimeZone={dbUser.timeZone || 'UTC'}>
        <UserAvatarProvider
          currentUserId={dbUser.id}
          currentUserAvatar={dbUser.avatarUrl}
          currentUserGender={dbUser.gender}
          currentUserName={dbUser.name || 'User'}
        >
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
        </UserAvatarProvider>
      </TimezoneProvider>
    </ToastProvider>
  );
}
