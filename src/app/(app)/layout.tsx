import prisma from '@/lib/prisma';
import OperationalStatus from '@/components/OperationalStatus';
import { getServerSession } from 'next-auth';
import { getAuthOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';

import Sidebar from '@/components/Sidebar';

import TopbarUserMenu from '@/components/TopbarUserMenu';
import SidebarSearch from '@/components/SidebarSearch';
import QuickActions from '@/components/QuickActions';
import TopbarNotifications from '@/components/TopbarNotifications';
import TopbarBreadcrumbs from '@/components/TopbarBreadcrumbs';
import GlobalKeyboardHandlerWrapper from '@/components/GlobalKeyboardHandlerWrapper';
import { ToastProvider } from '@/components/ToastProvider';
import AppErrorBoundary from './error-boundary';
import SkipLinks from '@/components/SkipLinks';
import { TimezoneProvider } from '@/contexts/TimezoneContext';
import { SidebarProvider } from '@/contexts/SidebarContext';
import { logger } from '@/lib/logger';
import SessionTimeoutWarning from '@/components/auth/SessionTimeoutWarning';

const isNextRedirectError = (error: unknown) => {
  if (!error || typeof error !== 'object') return false;
  const digest = (error as { digest?: unknown }).digest;
  return typeof digest === 'string' && digest.startsWith('NEXT_REDIRECT');
};

// Force all app routes to be dynamic - prevents static generation during build
// This is necessary because the app requires database access via middleware/auth
export const dynamic = 'force-dynamic';
export const revalidate = 30;

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(await getAuthOptions());
  if (!session?.user?.email) {
    let userCount = 0;
    try {
      userCount = await prisma.user.count();
    } catch (error) {
      if (!isNextRedirectError(error)) {
        logger.error('[App Layout] Failed to check user count', { component: 'layout', error });
      }
    }
    if (userCount === 0) {
      redirect('/setup');
    }
    // Force re-login with error flag to bypass middleware redirect loop
    redirect('/login?error=SessionExpired');
  }

  // Verify user still exists in database (handle DB resets)
  let dbUser;
  let dbError: unknown = null;
  try {
    dbUser = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: {
        id: true,
        role: true,
        name: true,
        email: true,
        timeZone: true,
        avatarUrl: true,
        gender: true,
      },
    });
  } catch (error) {
    dbError = error;
    // Database connection error - allow app to load with session data
    // This prevents complete app failure when DB is temporarily unavailable
    if (!isNextRedirectError(error)) {
      logger.error('[App Layout] Database connection error', { component: 'layout', error });
    }
    dbUser = null;
  }

  if (!dbError && !dbUser) {
    // Check if system is uninitialized
    let userCount = 0;
    try {
      userCount = await prisma.user.count();
    } catch (error) {
      if (!isNextRedirectError(error)) {
        logger.error('[App Layout] Failed to verify user count', { component: 'layout', error });
      }
    }
    if (userCount === 0) {
      redirect('/setup');
    }
    // Rare condition: User deleted or DB reset but others exist
    // Force signout to clear stale session
    redirect('/api/auth/signout?callbackUrl=/login?error=SessionExpired');
  }

  // Fetch latest user data from database to ensure name is always current
  // This ensures name changes reflect immediately in the topbar
  const userName = dbUser?.name || session?.user?.name || null;
  const userEmail = session?.user?.email ?? null;
  const userRole = dbUser?.role || (session?.user as any)?.role || null; // eslint-disable-line @typescript-eslint/no-explicit-any
  const userAvatar = dbUser?.avatarUrl || null;
  const userGender = dbUser?.gender || null;
  const userId = dbUser?.id || 'user';

  const canCreate = userRole === 'ADMIN' || userRole === 'RESPONDER';

  const { calculateSLAMetrics } = await import('@/lib/sla-server');
  // Fail-safe wrapper for global SLA metrics
  const slaMetrics = await calculateSLAMetrics().catch(err => {
    logger.error('[App Layout] Failed to load SLA metrics', { component: 'layout', error: err });
    return {
      totalIncidents: 0,
      openCount: 0,
      acknowledgedCount: 0,
      resolvedCount: 0,
      criticalCount: 0,
      highUrgencyCount: 0,
      mediumUrgencyCount: 0,
      lowUrgencyCount: 0,
      mttr: 0,
      mttd: 0,
      ackCompliance: 100,
      resolveCompliance: 100,
      statusMix: [],
      currentShifts: [],
      unassignedActive: 0,
      assigneeLoad: [],
      serviceMetrics: [],
      activeIncidentSummaries: [],
      heatmapData: [],
      isClipped: false,
      retentionDays: 30,
    };
  });
  const criticalOpenCount = slaMetrics.criticalCount;
  const mediumOpenCount = slaMetrics.mediumUrgencyCount;
  const lowOpenCount = slaMetrics.lowUrgencyCount;

  // Status Logic
  let statusTone: 'ok' | 'warning' | 'danger' = 'ok';
  let statusLabel = 'Green Corridor';
  let statusDetail = 'All systems fully operational';

  if (criticalOpenCount > 0) {
    statusTone = 'danger';
    statusLabel = 'Red Alert';
    statusDetail = `${criticalOpenCount} critical incidents active`;
  } else if (mediumOpenCount > 0) {
    statusTone = 'warning';
    statusLabel = 'Yellow Alert';
    statusDetail = `${mediumOpenCount} warning signs detected`;
  } else if (lowOpenCount > 0) {
    statusTone = 'ok'; // Keep green for low, but maybe detailed
    statusLabel = 'Systems Normal';
    statusDetail = `${lowOpenCount} low urgency items`;
  }

  const userTimeZone = dbUser?.timeZone || 'UTC';

  return (
    <AppErrorBoundary>
      <ToastProvider>
        <TimezoneProvider initialTimeZone={userTimeZone}>
          <SidebarProvider>
            <GlobalKeyboardHandlerWrapper />
            <SkipLinks />
            <div className="app-shell">
              <Sidebar
                userName={userName}
                userEmail={userEmail}
                userRole={userRole}
                userAvatar={userAvatar}
                userGender={userGender}
                userId={userId}
              />
              <div className="content-shell">
                <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background/95 px-6 backdrop-blur supports-[backdrop-filter]:bg-background/60 [zoom:0.8]">
                  <div className="flex items-center gap-4">
                    <OperationalStatus
                      tone={statusTone}
                      label={statusLabel}
                      detail={statusDetail}
                      criticalCount={criticalOpenCount}
                      mediumCount={mediumOpenCount}
                      lowCount={lowOpenCount}
                    />
                    <TopbarBreadcrumbs />
                  </div>
                  <div className="flex flex-1 items-center justify-center px-4">
                    <SidebarSearch />
                  </div>
                  <div className="flex items-center gap-4 ml-auto">
                    <TopbarNotifications />
                    <QuickActions canCreate={canCreate} />
                    <TopbarUserMenu
                      name={userName}
                      email={userEmail}
                      role={userRole}
                      avatarUrl={userAvatar}
                      gender={userGender}
                      userId={userId}
                    />
                  </div>
                </header>
                <main id="main-content" className="page-shell">
                  {children}
                </main>
              </div>
            </div>
          </SidebarProvider>
        </TimezoneProvider>
      </ToastProvider>
      <SessionTimeoutWarning warningMinutes={5} />
    </AppErrorBoundary>
  );
}
