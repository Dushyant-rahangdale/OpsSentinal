import prisma from '@/lib/prisma';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getUserPermissions } from '@/lib/rbac';
import { deleteService } from '../actions';

// UI Components
import { Card, CardContent } from '@/components/ui/shadcn/card';
import { Button } from '@/components/ui/shadcn/button';
import { Badge } from '@/components/ui/shadcn/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/shadcn/tabs';

// Icons
import {
  ChevronLeft,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Globe,
  Settings,
  Zap,
  Plus,
} from 'lucide-react';

// Custom Components
import IncidentList from '@/components/service/IncidentList';
import Pagination from '@/components/service/Pagination';
import DeleteServiceButton from '@/components/service/DeleteServiceButton';

const INCIDENTS_PER_PAGE = 20;

type ServiceDetailPageProps = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ page?: string; tab?: string }>;
};

function StatusBadge({ status }: { status: string }) {
  if (status === 'OPERATIONAL') {
    return (
      <Badge variant="success" size="sm" className="gap-1 pl-1 pr-2">
        <CheckCircle2 className="h-4 w-4 fill-emerald-500 text-white" />
        Operational
      </Badge>
    );
  }
  if (status === 'DEGRADED') {
    return (
      <Badge variant="warning" size="sm" className="gap-1 pl-1 pr-2">
        <AlertTriangle className="h-4 w-4 fill-yellow-500 text-white" />
        Degraded
      </Badge>
    );
  }
  if (status === 'CRITICAL') {
    return (
      <Badge variant="danger" size="sm" className="gap-1 pl-1 pr-2">
        <XCircle className="h-4 w-4 fill-red-500 text-white" />
        Critical
      </Badge>
    );
  }
  return (
    <Badge variant="neutral" size="sm">
      Unknown
    </Badge>
  );
}

export default async function ServiceDetailPage({ params, searchParams }: ServiceDetailPageProps) {
  const { id } = await params;
  const searchParamsResolved = await searchParams;
  const page = Math.max(1, parseInt(searchParamsResolved?.page || '1', 10));
  const tab = (searchParamsResolved?.tab as 'incidents' | 'history') || 'incidents';
  const skip = (page - 1) * INCIDENTS_PER_PAGE;

  // Define status filter based on active tab
  const incidentWhere =
    tab === 'incidents'
      ? { status: { notIn: ['RESOLVED', 'SNOOZED', 'SUPPRESSED'] as const } }
      : { status: 'RESOLVED' as const };

  // Parallelize data fetching
  const [serviceRaw, slaMetrics] = await Promise.all([
    // 1. Service Data (with filtering for the list)
    prisma.service.findUnique({
      where: { id },
      include: {
        team: true,
        policy: {
          select: { id: true, name: true },
        },
        incidents: {
          where: incidentWhere as any,
          include: {
            assignee: {
              select: { id: true, name: true, email: true },
            },
          },
          orderBy: { createdAt: 'desc' },
          skip,
          take: INCIDENTS_PER_PAGE,
        },
        _count: {
          select: { incidents: { where: incidentWhere as any } },
        },
      },
    }),

    // 2. SLA Metrics (30-day window to include active incidents)
    (async () => {
      const { calculateSLAMetrics } = await import('@/lib/sla-server');
      const slaWindowDays = 30;
      return calculateSLAMetrics({
        serviceId: id,
        windowDays: slaWindowDays,
        includeActiveIncidents: true,
      });
    })(),
  ]);

  if (!serviceRaw) {
    notFound();
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const service = serviceRaw as any;

  const dynamicStatus = (slaMetrics.dynamicStatus || 'OPERATIONAL') as
    | 'OPERATIONAL'
    | 'DEGRADED'
    | 'CRITICAL';

  // Use the filtered count for pagination
  const filteredTotalIncidents = service._count.incidents;
  const filteredTotalPages = Math.ceil(filteredTotalIncidents / INCIDENTS_PER_PAGE);

  const permissions = await getUserPermissions();
  const canDeleteService = permissions.isAdmin;

  // Calculate metrics
  const activeIncidentsCount = slaMetrics.activeIncidents;
  const allTimeTotalIncidents = slaMetrics.totalIncidents; // Correct total for metrics regardless of tab

  const slaCompliance = slaMetrics.resolveCompliance;
  const mttr = slaMetrics.mttr ? slaMetrics.mttr / 60 : undefined; // Convert minutes to hours

  // Calculate incident frequency (incidents per month) using strictly SLA server window
  const effectiveDurationDays =
    (slaMetrics.effectiveEnd.getTime() - slaMetrics.effectiveStart.getTime()) /
    (1000 * 60 * 60 * 24);
  const incidentsPerMonth =
    effectiveDurationDays > 0 ? (allTimeTotalIncidents / effectiveDurationDays) * 30 : 0;

  // Calculate Availability using MTBF (Mean Time Between Failures) relation: Availability = MTBF / (MTBF + MTTR)
  // Converting MTTR (minutes) to ms for consistent units
  const mtbfMs = slaMetrics.mtbfMs;
  const mttrMs = (slaMetrics.mttr || 0) * 60 * 1000;

  // Robust Availability Logic:
  // 1. If we have MTBF data, use the standard formula.
  // 2. If we have NO incidents ever (active or historical), 100% availability.
  // 3. If we have incidents but no MTBF (e.g. only 1 active incident ever), it's 0% (currently down) or undefined.
  //    Defaulting to 0% for "Service failure with no history" is safer than 100%.
  const hasEverHadIncidents = allTimeTotalIncidents > 0 || activeIncidentsCount > 0;

  const availability =
    mtbfMs && mtbfMs > 0 ? (mtbfMs / (mtbfMs + mttrMs)) * 100 : !hasEverHadIncidents ? 100 : 0;

  const deleteServiceWithId = deleteService.bind(null, service.id);

  return (
    <div className="mx-auto w-full max-w-[1440px] px-4 md:px-6 2xl:px-8 py-6 space-y-6 [zoom:0.8]">
      {/* Breadcrumb / Back Link */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link
          href="/services"
          className="hover:text-primary transition-colors flex items-center gap-1"
        >
          <ChevronLeft className="h-4 w-4" />
          Services
        </Link>
        <span className="opacity-30">/</span>
        <span className="font-medium text-foreground">{service.name}</span>
      </div>

      {/* Header Section */}
      <div className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground rounded-lg p-4 md:p-6 shadow-lg">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={dynamicStatus} />
              {service.team && (
                <Badge variant="secondary" size="xs" className="gap-1.5">
                  {service.team.name}
                </Badge>
              )}
              {service.slaTier && (
                <Badge variant="secondary" size="xs" className="gap-1.5">
                  SLA {service.slaTier}
                </Badge>
              )}
              {service.region && (
                <Badge variant="secondary" size="xs" className="gap-1.5">
                  <Globe className="h-3.5 w-3.5 opacity-70" />
                  {service.region}
                </Badge>
              )}
            </div>

            <div>
              <h1 className="text-2xl md:text-3xl font-bold">{service.name}</h1>
              {service.description && (
                <p className="text-xs md:text-sm opacity-90 max-w-3xl">{service.description}</p>
              )}
              <p className="text-[11px] md:text-xs opacity-80 mt-1">
                Metrics shown for the last 30 days.
              </p>
              <p className="text-[11px] md:text-xs opacity-80">
                Active incident counts exclude snoozed and suppressed incidents.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" className="gap-2 bg-white text-slate-900" asChild>
              <Link href={`/services/${id}/integrations`}>
                <Zap className="h-4 w-4" />
                Integrations
              </Link>
            </Button>
            <Button variant="outline" className="gap-2 bg-white text-slate-900" asChild>
              <Link href={`/services/${id}/settings`}>
                <Settings className="h-4 w-4" />
                Settings
              </Link>
            </Button>
            {canDeleteService && (
              <DeleteServiceButton
                action={deleteServiceWithId}
                serviceName={service.name}
                incidentCount={allTimeTotalIncidents}
                hasOpenIncidents={activeIncidentsCount > 0}
                className="bg-white hover:bg-red-50 border-white/40 text-red-600 hover:text-red-700 hover:border-red-200"
              />
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-4 mt-6">
          <Card className="bg-white/10 border-white/20 backdrop-blur">
            <CardContent className="p-3 md:p-4 text-center">
              <div className="text-xl md:text-2xl font-bold">{availability.toFixed(2)}%</div>
              <div className="text-[10px] md:text-xs opacity-90">Availability</div>
            </CardContent>
          </Card>
          <Card className="bg-white/10 border-white/20 backdrop-blur">
            <CardContent className="p-3 md:p-4 text-center">
              <div className="text-xl md:text-2xl font-bold">
                {mttr !== undefined
                  ? mttr < 1
                    ? `${Math.round(mttr * 60)}m`
                    : mttr < 24
                      ? `${mttr.toFixed(1)}h`
                      : `${(mttr / 24).toFixed(1)}d`
                  : '-'}
              </div>
              <div className="text-[10px] md:text-xs opacity-90">MTTR</div>
            </CardContent>
          </Card>
          <Card className="bg-white/10 border-white/20 backdrop-blur">
            <CardContent className="p-3 md:p-4 text-center">
              <div className="text-xl md:text-2xl font-bold">
                {incidentsPerMonth < 1 ? '<1' : incidentsPerMonth.toFixed(1)}
              </div>
              <div className="text-[10px] md:text-xs opacity-90">Incidents / month</div>
            </CardContent>
          </Card>
          <Card className="bg-white/10 border-white/20 backdrop-blur">
            <CardContent className="p-3 md:p-4 text-center">
              <div className="text-xl md:text-2xl font-bold">
                {slaCompliance !== null ? `${slaCompliance.toFixed(1)}%` : '-'}
              </div>
              <div className="text-[10px] md:text-xs opacity-90">SLA Compliance</div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Tabs defaultValue={tab} className="space-y-6">
        <TabsList className="bg-muted/50 p-1 rounded-xl">
          <TabsTrigger
            value="incidents"
            asChild
            className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm cursor-pointer"
          >
            <Link href={`/services/${id}?tab=incidents`}>Active Incidents</Link>
          </TabsTrigger>
          <TabsTrigger
            value="history"
            asChild
            className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm cursor-pointer"
          >
            <Link href={`/services/${id}?tab=history`}>Incident History</Link>
          </TabsTrigger>
          <TabsTrigger
            value="dependencies"
            className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm"
            disabled
          >
            Dependencies
          </TabsTrigger>
        </TabsList>

        <TabsContent value={tab} className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-slate-900">
                {tab === 'incidents' ? 'Active Incidents' : 'Incident History'}
              </h3>
              <p className="text-sm text-slate-500">
                {tab === 'incidents'
                  ? 'Viewing incidents currently affecting this service.'
                  : 'Viewing Resolved and Closed incidents.'}
              </p>
            </div>
            {tab === 'incidents' && (
              <Button className="gap-2" asChild>
                <Link href={`/incidents/create?serviceId=${id}`}>
                  <Plus className="h-4 w-4" />
                  Create Incident
                </Link>
              </Button>
            )}
          </div>

          <Card className="border-slate-200 shadow-sm overflow-hidden">
            <IncidentList
              incidents={(service as any).incidents.map((i: any) => ({
                id: i.id,
                title: i.title,
                status: i.status === 'RESOLVED' && tab === 'incidents' ? 'OPEN' : i.status, // Safety fallback, though query handles it
                urgency: i.urgency,
                priority: i.priority,
                createdAt: i.createdAt,
                resolvedAt: i.resolvedAt,
                assignee: i.assignee,
              }))}
              serviceId={id}
            />

            {filteredTotalPages > 1 && (
              <Pagination
                currentPage={page}
                totalPages={filteredTotalPages}
                totalItems={filteredTotalIncidents}
                itemsPerPage={INCIDENTS_PER_PAGE}
              />
            )}
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
