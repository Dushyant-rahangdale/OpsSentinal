import prisma from '@/lib/prisma';
import { getUserPermissions } from '@/lib/rbac';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import StepsList from '@/components/policies/StepsList';
import PolicyDeleteButton from '@/components/PolicyDeleteButton';
import {
  updatePolicy,
  addPolicyStep,
  updatePolicyStep,
  deletePolicyStep,
  movePolicyStep,
  reorderPolicySteps,
} from '../actions';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/shadcn/card';
import { Button } from '@/components/ui/shadcn/button';
import { ArrowLeft, Clock, ShieldCheck, Settings, AlertTriangle } from 'lucide-react';
import { Input } from '@/components/ui/shadcn/input';
import { Textarea } from '@/components/ui/shadcn/textarea';

export const revalidate = 30;

export default async function PolicyDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const resolvedSearchParams = await searchParams;
  const errorCode = resolvedSearchParams?.error;

  const [policy, users, teams, schedules, services] = await Promise.all([
    prisma.escalationPolicy.findUnique({
      where: { id },
      include: {
        steps: {
          include: {
            targetUser: true,
            targetTeam: true,
            targetSchedule: true,
          },
          orderBy: { stepOrder: 'asc' },
        },
        services: {
          include: { team: true },
          orderBy: { name: 'asc' },
        },
      },
    }),
    prisma.user.findMany({
      where: { status: 'ACTIVE', role: { in: ['ADMIN', 'RESPONDER'] } },
      select: { id: true, name: true, email: true },
      orderBy: { name: 'asc' },
    }),
    prisma.team.findMany({
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    }),
    prisma.onCallSchedule.findMany({
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    }),
    prisma.service.findMany({
      where: { escalationPolicyId: id },
      include: { team: true },
      orderBy: { name: 'asc' },
    }),
  ]);

  if (!policy) notFound();

  const permissions = await getUserPermissions();
  const canManagePolicies = permissions.isAdmin;

  return (
    <div className="w-full px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6 space-y-4 sm:space-y-6">
      {/* Header */}
      <div>
        <Link href="/policies">
          <Button
            variant="ghost"
            size="sm"
            className="pl-0 text-slate-500 mb-4 hover:text-slate-900"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Policies
          </Button>
        </Link>

        <div className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground rounded-lg p-4 md:p-6 shadow-lg">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
                  {policy.name}
                </h1>
              </div>
              <p className="text-primary-foreground/80 text-sm max-w-2xl">
                {policy.description || 'No description provided.'}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 md:gap-4 w-full lg:w-auto">
              <Card className="bg-white/10 border-white/20 backdrop-blur">
                <CardContent className="p-3 md:p-4 text-center">
                  <div className="text-xl md:text-2xl font-extrabold">{policy.steps.length}</div>
                  <div className="text-[10px] md:text-xs opacity-90">Steps</div>
                </CardContent>
              </Card>
              <Card className="bg-white/10 border-white/20 backdrop-blur">
                <CardContent className="p-3 md:p-4 text-center">
                  <div className="text-xl md:text-2xl font-extrabold text-green-200">
                    {services.length}
                  </div>
                  <div className="text-[10px] md:text-xs opacity-90">Services</div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>

      {errorCode === 'duplicate-policy' && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm font-medium flex items-center gap-2">
          <AlertTriangle className="h-4 w-4" />
          An escalation policy with this name already exists.
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main: Escalation Steps */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            {/* Header is inside StepsList or handled by it? 
                            Ideally StepsList manages the card content for list, but the container Card might be here.
                            Let's check StepsList... it HAS the Card Wrapper.
                            Wait, StepsList includes <Card>...</Card>.
                            So I should replace the entire Card block here with StepsList?
                            StepsList definition: export default function StepsList(...) { return <Card>...
                            Yes. So I should remove the <Card> wrapper here.
                        */}
            <StepsList
              initialSteps={policy.steps.map(step => ({
                ...step,
                targetTeam: step.targetTeam
                  ? {
                      ...step.targetTeam,
                      teamLead: (step.targetTeam as any).teamLead, // eslint-disable-line @typescript-eslint/no-explicit-any
                    }
                  : null,
              }))}
              policyId={policy.id}
              canManage={canManagePolicies}
              updateStep={updatePolicyStep}
              deleteStep={deletePolicyStep}
              moveStep={movePolicyStep}
              reorderSteps={reorderPolicySteps}
              addStep={addPolicyStep}
              users={users}
              teams={teams}
              schedules={schedules}
            />
          </Card>
        </div>

        {/* Sidebar: Settings & Usage */}
        <div className="space-y-6">
          {/* Settings */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Settings className="h-4 w-4 text-slate-500" />
                Policy Settings
              </CardTitle>
            </CardHeader>
            <CardContent>
              {canManagePolicies ? (
                <form action={updatePolicy.bind(null, policy.id)} className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-xs font-semibold uppercase text-slate-500">Name</label>
                    <Input name="name" defaultValue={policy.name} required />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-semibold uppercase text-slate-500">
                      Description
                    </label>
                    <Textarea
                      name="description"
                      defaultValue={policy.description || ''}
                      className="resize-none"
                      rows={3}
                    />
                  </div>
                  <Button type="submit" className="w-full">
                    Save Changes
                  </Button>
                </form>
              ) : (
                <div className="bg-slate-50 p-4 rounded-lg text-sm text-slate-500 italic">
                  You do not have permission to edit this policy.
                </div>
              )}
            </CardContent>
          </Card>

          {/* Services */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-slate-500" />
                Linked Services ({services.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {services.length === 0 ? (
                <p className="text-sm text-slate-500 italic">No services are using this policy.</p>
              ) : (
                <div className="space-y-2">
                  {services.map(service => (
                    <Link key={service.id} href={`/services/${service.id}`} className="block">
                      <div className="p-3 rounded-lg border border-slate-200 hover:border-primary/30 hover:bg-primary/5 transition-colors">
                        <div className="font-medium text-sm text-slate-900">{service.name}</div>
                        {service.team && (
                          <div className="text-xs text-slate-500 mt-0.5">{service.team.name}</div>
                        )}
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Delete */}
          {canManagePolicies && (
            <Card className="border-red-100 bg-red-50/30">
              <CardContent className="p-4">
                <h4 className="text-sm font-semibold text-red-900 mb-2">Danger Zone</h4>
                <PolicyDeleteButton
                  policyId={policy.id}
                  servicesUsingPolicy={services.map(s => ({ id: s.id, name: s.name }))}
                />
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
