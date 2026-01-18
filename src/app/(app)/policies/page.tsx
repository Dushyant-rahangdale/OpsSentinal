import prisma from '@/lib/prisma';
import { getUserPermissions } from '@/lib/rbac';
import Link from 'next/link';
import PolicyListTable from '@/components/policies/PolicyListTable';
import { Card, CardContent } from '@/components/ui/shadcn/card';
import { Button } from '@/components/ui/shadcn/button';
import { Plus, ShieldAlert, BarChart3, LayoutList } from 'lucide-react';

export const revalidate = 30;

export default async function PoliciesPage({
  searchParams,
}: {
  searchParams?: Promise<{ error?: string }>;
}) {
  const [policies, users, teams] = await Promise.all([
    prisma.escalationPolicy.findMany({
      include: {
        steps: {
          orderBy: { stepOrder: 'asc' },
        },
        services: {
          select: { id: true, name: true },
        },
      },
      orderBy: { name: 'asc' },
    }),
    prisma.user.findMany({
      where: { status: 'ACTIVE', role: { in: ['ADMIN', 'RESPONDER'] } },
      select: { id: true, name: true, email: true },
      orderBy: { name: 'asc' },
    }),
    prisma.team.findMany({
      orderBy: { name: 'asc' },
      select: { id: true, name: true },
    }),
  ]);

  const permissions = await getUserPermissions();
  const canCreatePolicy = permissions.isAdmin;
  const resolvedSearchParams = await searchParams;
  const errorCode = resolvedSearchParams?.error;

  // Stats
  const totalPolicies = policies.length;
  const policiesInUse = policies.filter(p => p.services.length > 0).length;
  const totalSteps = policies.reduce((acc, p) => acc + p.steps.length, 0);

  // Transform for display
  const policyListItems = policies.map(p => ({
    id: p.id,
    name: p.name,
    description: p.description,
    stepCount: p.steps.length,
    serviceCount: p.services.length,
    services: p.services,
  }));

  return (
    <div className="w-full px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6 space-y-4 sm:space-y-6">
      {/* Header with Stats */}
      <div className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground rounded-lg p-4 md:p-6 shadow-lg">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight flex items-center gap-2">
              <ShieldAlert className="h-6 w-6 md:h-8 md:w-8" />
              Escalation Policies
            </h1>
            <p className="text-xs md:text-sm opacity-90 mt-1">
              Define who gets notified when incidents occur and in what order.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-2 md:gap-4 w-full lg:w-auto">
            <Card className="bg-white/10 border-white/20 backdrop-blur">
              <CardContent className="p-3 md:p-4 text-center">
                <div className="text-xl md:text-2xl font-extrabold">{totalPolicies}</div>
                <div className="text-[10px] md:text-xs opacity-90">Total Policies</div>
              </CardContent>
            </Card>
            <Card className="bg-white/10 border-white/20 backdrop-blur">
              <CardContent className="p-3 md:p-4 text-center">
                <div className="text-xl md:text-2xl font-extrabold text-green-200">
                  {policiesInUse}
                </div>
                <div className="text-[10px] md:text-xs opacity-90">In Use</div>
              </CardContent>
            </Card>
            <Card className="bg-white/10 border-white/20 backdrop-blur">
              <CardContent className="p-3 md:p-4 text-center">
                <div className="text-xl md:text-2xl font-extrabold text-blue-200">{totalSteps}</div>
                <div className="text-[10px] md:text-xs opacity-90">Total Steps</div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {errorCode === 'duplicate-policy' && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm font-medium">
          An escalation policy with this name already exists. Please choose a unique name.
        </div>
      )}

      {/* Main Content */}
      <div className="space-y-4 md:space-y-5">
        {/* Actions Bar */}
        <div className="flex items-center justify-between">
          <div className="text-sm text-slate-500 font-medium">Manage your escalation rules</div>
          {canCreatePolicy && (
            <Button asChild className="shadow-sm">
              <Link href="/policies/create">
                <Plus className="mr-2 h-4 w-4" />
                Create Policy
              </Link>
            </Button>
          )}
        </div>

        {/* List */}
        <Card>
          <CardContent className="p-3 md:p-4 lg:p-5 bg-slate-50/50 min-h-[400px]">
            <PolicyListTable policies={policyListItems} canManagePolicies={canCreatePolicy} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
