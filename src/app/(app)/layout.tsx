import prisma from '@/lib/prisma';
import OperationalStatus from '@/components/OperationalStatus';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';

import Sidebar from '@/components/Sidebar';
import TopbarUserMenu from '@/components/TopbarUserMenu';
import { ToastProvider } from '@/components/ToastProvider';

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
  const userName = session?.user?.name ?? null;
  const userEmail = session?.user?.email ?? null;
  const userRole = (session?.user as any)?.role ?? null;

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
    <ToastProvider>
      <div className="app-shell">
        <Sidebar />
        <div className="content-shell">
          <header className="topbar">
            <div className="topbar-left">
              <OperationalStatus tone={statusTone} label={statusLabel} detail={statusDetail} />
            </div>
            <div className="topbar-right">
              <TopbarUserMenu name={userName} email={userEmail} role={userRole} />
            </div>
          </header>
          <div className="page-shell">
            {children}
          </div>
        </div>
      </div>
    </ToastProvider>
  );
}
