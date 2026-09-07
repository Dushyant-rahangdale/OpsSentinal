import prisma from '@/lib/prisma';
import { getUserPermissions } from '@/lib/rbac';
import { redirect } from 'next/navigation';
import IncidentSlaPolicySettings from '@/components/incident-sla/IncidentSlaPolicySettings';

export const revalidate = 0;

export default async function IncidentSlaSettingsPage() {
  const permissions = await getUserPermissions();
  if (!permissions.authenticated || !permissions.capabilities.includes('admin.manage'))
    redirect('/settings');
  const policy = await prisma.incidentSlaPolicy.findFirst({
    where: { scopeKey: 'workspace' },
    orderBy: { version: 'desc' },
    include: { rules: true },
  });
  const viewPolicy = policy
    ? {
        version: policy.version,
        inheritWorkspace: policy.inheritWorkspace,
        baseAckTargetMs: policy.baseAckTargetMs,
        baseResolveTargetMs: policy.baseResolveTargetMs,
        rules: policy.rules.map(rule => ({
          priority: rule.priority,
          ackTargetMs: rule.ackTargetMs,
          resolveTargetMs: rule.resolveTargetMs,
          label: rule.label,
        })),
      }
    : null;
  return (
    <div className="mx-auto w-full max-w-4xl space-y-6 pb-12">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Incident Response SLA</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Set workspace defaults for acknowledgement and resolution targets.
        </p>
      </div>
      <IncidentSlaPolicySettings scopeKey="workspace" policy={viewPolicy} canManage />
    </div>
  );
}
