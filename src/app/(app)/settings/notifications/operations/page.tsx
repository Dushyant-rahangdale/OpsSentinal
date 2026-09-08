import { redirect } from 'next/navigation';
import DetailHeroBanner from '@/components/ui/DetailHeroBanner';
import NotificationOperations from '@/components/settings/NotificationOperations';
import { getCurrentUser } from '@/lib/rbac';
import { Activity, BellRing, Radio } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/shadcn/button';
import { Badge } from '@/components/ui/shadcn/badge';
import NotificationCapacityOverview from '@/components/settings/NotificationCapacityOverview';
import { getProviderCapacity } from '@/lib/provider-capacity';
import prisma from '@/lib/prisma';

export default async function NotificationOperationsPage() {
  let user: Awaited<ReturnType<typeof getCurrentUser>>;
  try {
    user = await getCurrentUser();
  } catch {
    redirect('/login');
  }

  if (user.role !== 'ADMIN' && user.role !== 'AUDITOR') {
    redirect('/settings');
  }
  const channels = ['EMAIL', 'SMS', 'WHATSAPP', 'PUSH', 'SLACK', 'WEBHOOK'] as const;
  const [leases, campaigns, control] = await Promise.all([
    prisma.providerWorkerLease.count({ where: { expiresAt: { gt: new Date() } } }),
    prisma.notificationFanout.findMany({
      orderBy: { createdAt: 'desc' },
      take: 8,
      select: {
        id: true,
        sourceType: true,
        status: true,
        materializedTargets: true,
        completedTargets: true,
        failedTargets: true,
      },
    }),
    prisma.systemConfig.findUnique({ where: { key: 'notification_capacity_control' } }),
  ]);
  const controlValue =
    control?.value && typeof control.value === 'object' && !Array.isArray(control.value)
      ? (control.value as Record<string, unknown>)
      : {};

  return (
    <div className="space-y-6">
      {/* 1. Simple Grey Shaded Hero Banner */}
      <DetailHeroBanner
        breadcrumb={{
          label: user.role === 'ADMIN' ? 'Notification Providers' : 'Settings',
          href: user.role === 'ADMIN' ? '/settings/notifications' : '/settings',
          current: 'Operations',
        }}
        tag="Delivery Control Plane"
        title="Notification Operations"
        subtitle="Real-time delivery telemetry, queue health, error diagnostics, and recovery engine for all alert channels."
        icon={
          <div className="p-3 rounded-2xl bg-primary-foreground/15 text-primary-foreground border border-primary-foreground/20 shadow-inner">
            <Activity className="h-7 w-7" />
          </div>
        }
        badges={
          <div className="flex items-center gap-2">
            <Badge
              variant="outline"
              className="bg-primary-foreground/15 text-primary-foreground border-primary-foreground/20 text-[10px] font-bold uppercase tracking-wider"
            >
              Live Telemetry
            </Badge>
            <Badge
              variant="outline"
              className="bg-primary-foreground/15 text-primary-foreground border-primary-foreground/20 text-xs font-semibold"
            >
              {user.role === 'ADMIN' ? 'Admin Full Control' : 'Auditor Read-Only'}
            </Badge>
          </div>
        }
        actions={
          <div className="flex items-center gap-2">
            {user.role === 'ADMIN' && (
              <Button
                variant="outline"
                size="sm"
                asChild
                className="gap-2 bg-primary-foreground/10 hover:bg-primary-foreground/20 text-primary-foreground border-primary-foreground/20 text-xs font-semibold h-8 shadow-xs"
              >
                <Link href="/settings/notifications">
                  <BellRing className="h-3.5 w-3.5" />
                  Configure Providers
                </Link>
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              asChild
              className="gap-2 bg-primary-foreground/10 hover:bg-primary-foreground/20 text-primary-foreground border-primary-foreground/20 text-xs font-semibold h-8 shadow-xs"
            >
              <Link href="/settings/notifications/history">
                <Radio className="h-3.5 w-3.5" />
                Delivery History
              </Link>
            </Button>
          </div>
        }
      />

      <NotificationCapacityOverview
        capacities={channels.map(channel => ({ channel, ...getProviderCapacity(channel) }))}
        workerCount={leases}
        campaigns={campaigns}
        initialPaused={controlValue.bulkPaused === true}
        canManage={user.role === 'ADMIN'}
      />
      <NotificationOperations canRetry={user.role === 'ADMIN'} />
    </div>
  );
}
