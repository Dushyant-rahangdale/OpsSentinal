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
import { startCronScheduler } from '@/lib/cron-scheduler';

// Force all app routes to be dynamic - prevents static generation during build
// This is necessary because the app requires database access via middleware/auth
export const dynamic = 'force-dynamic';
export const revalidate = 30;

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  startCronScheduler();

  const session = await getServerSession(await getAuthOptions());
  if (!session?.user?.email) {
    try {
      const userCount = await prisma.user.count();
      if (userCount == 0) {
        redirect('/setup');
      }
    } catch (error) {
      console.error('[App Layout] Failed to check user count:', error);
    }
    redirect('/login');
  }

  // Verify user still exists in database (handle DB resets)
  let dbUser;
  try {
    dbUser = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true, role: true, name: true, email: true, timeZone: true }
    });

    if (!dbUser) {
      // Check if system is uninitialized
      const userCount = await prisma.user.count();
      if (userCount === 0) {
        redirect('/setup');
      }
      // Rare condition: User deleted or DB reset but others exist
      // Force signout to clear stale session
      redirect('/api/auth/signout?callbackUrl=/login');
    }
  } catch (error) {
    // Database connection error - allow app to load with session data
    // This prevents complete app failure when DB is temporarily unavailable
    console.error('[App Layout] Database connection error:', error);
    dbUser = null;
  }

  // Fetch latest user data from database to ensure name is always current
  // This ensures name changes reflect immediately in the topbar
  const userName = dbUser?.name || session?.user?.name || null;
  const userEmail = session?.user?.email ?? null;
  const userRole = dbUser?.role || (session?.user as any)?.role || null;

  const canCreate = userRole === 'ADMIN' || userRole === 'RESPONDER';

  const criticalOpenCount = await prisma.incident.count({
    where: {
      status: { not: 'RESOLVED' },
      urgency: 'HIGH'
    }
  });

  const statusTone = criticalOpenCount > 0 ? 'danger' : 'ok';
  const statusLabel = criticalOpenCount > 0 ? 'Red Alert' : 'Green Corridor';
  const statusDetail = criticalOpenCount > 0
    ? `${criticalOpenCount} critical open`
    : 'No critical incidents';

  const userTimeZone = dbUser?.timeZone || 'UTC';

  return (
    <AppErrorBoundary>
      <ToastProvider>
        <TimezoneProvider initialTimeZone={userTimeZone}>
          <GlobalKeyboardHandlerWrapper />
          <SkipLinks />
          <div className="app-shell">
            <Sidebar userName={userName} userEmail={userEmail} userRole={userRole} />
            <div className="content-shell">
              <header className="topbar-new">
                <div className="topbar-section topbar-section-left">
                  <OperationalStatus tone={statusTone} label={statusLabel} detail={statusDetail} />
                  <TopbarBreadcrumbs />
                </div>
                <div className="topbar-section topbar-section-center">
                  <div className="topbar-search-wrapper">
                    <SidebarSearch />
                  </div>
                </div>
                <div className="topbar-section topbar-section-right">
                  <TopbarNotifications />
                  <QuickActions canCreate={canCreate} />
                  <TopbarUserMenu name={userName} email={userEmail} role={userRole} />
                </div>
              </header>
              <main id="main-content" className="page-shell">
                {children}
              </main>
            </div>
          </div>
        </TimezoneProvider>
      </ToastProvider>
    </AppErrorBoundary>
  );
}
