import prisma from '@/lib/prisma';
import OperationalStatus from '@/components/OperationalStatus';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';

import Sidebar from '@/components/Sidebar';
import TopbarUserMenu from '@/components/TopbarUserMenu';
import SidebarSearch from '@/components/SidebarSearch';
import QuickActions from '@/components/QuickActions';
import GlobalKeyboardHandlerWrapper from '@/components/GlobalKeyboardHandlerWrapper';
import { ToastProvider } from '@/components/ToastProvider';
import AppErrorBoundary from './error-boundary';
import { getUserPermissions } from '@/lib/rbac';

export const revalidate = 30;

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);
  if (!session) {
    redirect('/login');
  }
  
  // Fetch latest user data from database to ensure name is always current
  // This ensures name changes reflect immediately in the topbar
  const email = session?.user?.email ?? null;
  const dbUser = email ? await prisma.user.findUnique({
    where: { email },
    select: { name: true, role: true }
  }) : null;
  
  const userName = dbUser?.name || session?.user?.name || null;
  const userEmail = session?.user?.email ?? null;
  const userRole = dbUser?.role || (session?.user as any)?.role || null;

  const permissions = await getUserPermissions();
  const canCreate = permissions.isResponderOrAbove;

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

  return (
    <AppErrorBoundary>
      <ToastProvider>
        <GlobalKeyboardHandlerWrapper />
        <div className="app-shell">
          <Sidebar userName={userName} userEmail={userEmail} userRole={userRole} />
          <div className="content-shell">
            <header className="topbar-new">
              <div className="topbar-section topbar-section-center">
                <OperationalStatus tone={statusTone} label={statusLabel} detail={statusDetail} />
                <div className="topbar-search-wrapper">
                  <SidebarSearch />
                </div>
              </div>
              <div className="topbar-section topbar-section-right">
                <QuickActions canCreate={canCreate} />
                <TopbarUserMenu name={userName} email={userEmail} role={userRole} />
              </div>
            </header>
            <div className="page-shell">
              {children}
            </div>
          </div>
        </div>
      </ToastProvider>
    </AppErrorBoundary>
  );
}
