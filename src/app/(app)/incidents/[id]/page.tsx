import prisma from '@/lib/prisma';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getUserPermissions } from '@/lib/rbac';
import StatusBadge from '@/components/incident/StatusBadge';
import PriorityBadge from '@/components/incident/PriorityBadge';
import {
  addNote,
  addWatcher,
  removeWatcher,
  resolveIncidentWithNote,
  updateIncidentStatus,
  updateIncidentUrgency,
} from '../actions';
import { getPostmortem } from '@/app/(app)/postmortems/actions';
import IncidentHeader from '@/components/incident/IncidentHeader';
import IncidentSidebar from '@/components/incident/detail/IncidentSidebar';
import IncidentNotes from '@/components/incident/detail/IncidentNotes';
import IncidentTimeline from '@/components/incident/detail/IncidentTimeline';
import IncidentResolution from '@/components/incident/detail/IncidentResolution';
import IncidentCustomFields from '@/components/IncidentCustomFields';
import { Button } from '@/components/ui/shadcn/button';
import { Badge } from '@/components/ui/shadcn/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/shadcn/avatar';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/shadcn/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/shadcn/tabs';
import PrioritySelector from '@/components/incident/PrioritySelector';
import CopyButton from '@/components/common/CopyButton';
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Clock,
  FileText,
  History,
  MessageSquare,
  Settings2,
  Timer,
  Zap,
} from 'lucide-react';

export default async function IncidentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const incident = await prisma.incident.findUnique({
    where: { id },
    include: {
      service: {
        include: {
          policy: true,
        },
      },
      assignee: true,
      team: true,
      events: { orderBy: { createdAt: 'desc' } },
      notes: { include: { user: true }, orderBy: { createdAt: 'desc' } },
      watchers: { include: { user: true }, orderBy: { createdAt: 'asc' } },
      tags: { include: { tag: true }, orderBy: { createdAt: 'asc' } },
      customFieldValues: {
        include: {
          customField: true,
        },
      },
    },
  });

  if (!incident) notFound();

  const [users, teams, customFields] = await Promise.all([
    prisma.user.findMany(),
    prisma.team.findMany(),
    prisma.customField.findMany({ orderBy: { order: 'asc' } }),
  ]);
  const permissions = await getUserPermissions();
  const canManageIncident = permissions.isResponderOrAbove;

  // Check if postmortem exists for this incident
  const postmortem = incident.status === 'RESOLVED' ? await getPostmortem(id) : null;

  // Calculate time open
  const getTimeOpen = () => {
    const start = new Date(incident.createdAt);
    const end = incident.resolvedAt ? new Date(incident.resolvedAt) : new Date();
    const diffInMinutes = Math.floor((end.getTime() - start.getTime()) / 60000);
    if (diffInMinutes < 60) return `${diffInMinutes}m`;
    const hours = Math.floor(diffInMinutes / 60);
    const mins = diffInMinutes % 60;
    if (hours < 24) return `${hours}h ${mins}m`;
    const days = Math.floor(hours / 24);
    return `${days}d ${hours % 24}h`;
  };

  // Server actions
  async function handleAddNote(formData: FormData) {
    'use server';
    const content = formData.get('content') as string;
    await addNote(id, content);
  }

  async function handleAcknowledge() {
    'use server';
    await updateIncidentStatus(id, 'ACKNOWLEDGED');
  }

  async function handleUnacknowledge() {
    'use server';
    await updateIncidentStatus(id, 'OPEN');
  }

  async function handleSnooze() {
    'use server';
    await updateIncidentStatus(id, 'SNOOZED');
  }

  async function handleSuppress() {
    'use server';
    await updateIncidentStatus(id, 'SUPPRESSED');
  }

  async function handleUnsnooze() {
    'use server';
    await updateIncidentStatus(id, 'OPEN');
  }

  async function handleUnsuppress() {
    'use server';
    await updateIncidentStatus(id, 'OPEN');
  }

  async function handleResolve(formData: FormData) {
    'use server';
    const resolution = (formData.get('resolution') as string) || '';
    await resolveIncidentWithNote(id, resolution);
  }

  async function _handleUrgencyChange(formData: FormData) {
    'use server';
    const newUrgency = formData.get('urgency') as string;
    await updateIncidentUrgency(id, newUrgency);
  }

  async function handleAddWatcher(formData: FormData) {
    'use server';
    const watcherId = formData.get('watcherId') as string;
    const role = formData.get('watcherRole') as string;
    await addWatcher(id, watcherId, role);
  }

  async function handleRemoveWatcher(formData: FormData) {
    'use server';
    const watcherId = formData.get('watcherMemberId') as string;
    await removeWatcher(id, watcherId);
  }

  const getStatusColor = () => {
    switch (incident.status) {
      case 'RESOLVED':
        return 'from-green-600 to-emerald-700';
      case 'ACKNOWLEDGED':
        return 'from-amber-500 to-orange-600';
      case 'SNOOZED':
        return 'from-indigo-500 to-purple-600';
      case 'SUPPRESSED':
        return 'from-gray-500 to-slate-600';
      default:
        return 'from-red-600 to-rose-700';
    }
  };

  return (
    <div className="w-full px-4 py-6 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 [zoom:0.8]">
      {/* Modern Header - Clean and Compact */}
      <div
        className={`bg-gradient-to-r ${getStatusColor()} text-primary-foreground rounded-lg p-4 md:p-6 shadow-lg`}
      >
        {/* Title Row - Allow wrapping */}
        <div className="mb-4">
          {/* Breadcrumb */}
          <div className="flex items-center justify-between mb-2">
            <Link
              href="/incidents"
              className="inline-flex items-center gap-2 text-sm text-white/80 hover:text-white transition-colors group"
            >
              <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
              Back to Incidents
            </Link>
            <div className="flex items-center gap-1">
              <CopyButton
                text={id}
                label="Copy Incident ID"
                className="text-white/70 hover:text-white hover:bg-white/10"
              />
              <CopyButton
                text={`${typeof window !== 'undefined' ? window.location.origin : ''}/incidents/${id}`}
                icon="link"
                label="Copy Link"
                className="text-white/70 hover:text-white hover:bg-white/10"
              />
            </div>
          </div>

          <h1 className="text-lg md:text-xl lg:text-2xl font-bold flex items-start gap-2 leading-tight">
            <AlertCircle className="h-5 w-5 md:h-6 md:w-6 shrink-0 mt-0.5" />
            <span className="break-words mr-2">{incident.title}</span>
            <span className="inline-flex items-center px-2 py-0.5 rounded text-sm bg-white/20 text-white border border-white/20 font-mono">
              #{id.slice(0, 8)}
            </span>
          </h1>
        </div>

        {/* Stats Grid - Priority, Urgency, Assignee, Service */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mt-8">
          {/* Priority Card */}
          <Card className="bg-white/95 border-none shadow-sm backdrop-blur overflow-hidden group hover:shadow-md transition-all">
            <CardContent className="p-3">
              <PrioritySelector
                incidentId={incident.id}
                priority={incident.priority}
                canManage={canManageIncident}
              />
            </CardContent>
          </Card>

          {/* Urgency Card */}
          <Card className="bg-white/95 border-none shadow-sm backdrop-blur overflow-hidden hover:shadow-md transition-all">
            <CardContent className="p-3">
              <div className="flex items-center gap-2 mb-1.5 text-muted-foreground">
                <AlertCircle className="h-3.5 w-3.5" />
                <span className="text-[10px] font-bold uppercase tracking-wider">Urgency</span>
              </div>
              <div className="flex items-center justify-between">
                <span
                  className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-bold ${incident.urgency === 'HIGH' ? 'bg-red-50 text-red-700' : 'bg-blue-50 text-blue-700'}`}
                >
                  {incident.urgency}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Assignee Card */}
          <Card className="bg-white/95 border-none shadow-sm backdrop-blur overflow-hidden hover:shadow-md transition-all">
            <CardContent className="p-3">
              <div className="flex items-center gap-2 mb-1.5 text-muted-foreground">
                <span className="h-3.5 w-3.5 flex items-center justify-center">👤</span>
                <span className="text-[10px] font-bold uppercase tracking-wider">Assignee</span>
              </div>
              <div className="flex items-center gap-2">
                {incident.assignee ? (
                  <>
                    <Avatar className="h-5 w-5 border border-slate-200">
                      <AvatarImage src={incident.assignee.avatarUrl || undefined} />
                      <AvatarFallback className="text-[8px]">
                        {incident.assignee.name.substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className="font-semibold text-sm truncate text-slate-900">
                      {incident.assignee.name}
                    </span>
                  </>
                ) : (
                  <span className="text-sm text-slate-400 italic">Unassigned</span>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Service Card */}
          <Card className="bg-white/95 border-none shadow-sm backdrop-blur overflow-hidden hover:shadow-md transition-all">
            <CardContent className="p-3">
              <div className="flex items-center gap-2 mb-1.5 text-muted-foreground">
                <Zap className="h-3.5 w-3.5" />
                <span className="text-[10px] font-bold uppercase tracking-wider">Service</span>
              </div>
              <div className="font-semibold text-sm truncate text-slate-900">
                {incident.service.name}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Description Section - Enhanced with Better Styling */}
      {incident.description && (
        <Card className="border-l-4 border-l-primary bg-gradient-to-r from-primary/5 to-transparent">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" />
              Description
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="prose prose-sm prose-slate max-w-none">
              <p className="text-slate-700 leading-relaxed whitespace-pre-wrap break-words m-0">
                {incident.description}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Grid - Like Teams Page */}
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-4 md:gap-6">
        {/* Main Content - 3 columns */}
        <div className="xl:col-span-3 space-y-4 md:space-y-6">
          {/* Incident Details Card */}
          <IncidentHeader
            incident={incident as any} // eslint-disable-line @typescript-eslint/no-explicit-any
            users={users}
            teams={teams}
            canManage={canManageIncident}
          />

          {/* Tabbed Content */}
          <Card>
            <CardHeader className="pb-0">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Incident Details</CardTitle>
                  <CardDescription>View timeline, notes, and resolution details</CardDescription>
                </div>
                <Badge variant="outline" className="gap-1">
                  <Zap className="h-3 w-3" />
                  {incident.events.length} Events
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="overview" className="w-full mt-4">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="overview" className="gap-2">
                    <Settings2 className="h-4 w-4" />
                    <span className="hidden sm:inline">Overview</span>
                  </TabsTrigger>
                  <TabsTrigger value="timeline" className="gap-2">
                    <History className="h-4 w-4" />
                    <span className="hidden sm:inline">Timeline</span>
                  </TabsTrigger>
                </TabsList>

                <div className="mt-6">
                  <TabsContent value="overview" className="mt-0 space-y-6">
                    {/* Resolution Form */}
                    {incident.status !== 'RESOLVED' && (
                      <IncidentResolution
                        incidentId={incident.id}
                        canManage={canManageIncident}
                        onResolve={handleResolve}
                      />
                    )}

                    {/* Postmortem Section */}
                    {incident.status === 'RESOLVED' && (
                      <Card className="border-green-200 bg-green-50/50">
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2 text-green-900">
                            <FileText className="h-5 w-5" />
                            Postmortem
                          </CardTitle>
                          <CardDescription className="text-green-700">
                            Document lessons learned for this resolved incident
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          {postmortem ? (
                            <div className="flex items-center justify-between">
                              <span className="inline-flex items-center gap-1.5 text-sm font-medium text-green-700">
                                <CheckCircle2 className="h-4 w-4" />
                                Postmortem Filed
                              </span>
                              <Link href={`/postmortems/${id}`}>
                                <Button variant="outline" size="sm">
                                  View Report
                                </Button>
                              </Link>
                            </div>
                          ) : (
                            <Link href={`/postmortems/${id}`}>
                              <Button className="w-full md:w-auto">Create Postmortem</Button>
                            </Link>
                          )}
                        </CardContent>
                      </Card>
                    )}

                    {/* Custom Fields - Only show when fields are configured */}
                    {customFields.length > 0 && (
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-base">Custom Fields</CardTitle>
                          <CardDescription>Additional incident metadata</CardDescription>
                        </CardHeader>
                        <CardContent>
                          <IncidentCustomFields
                            incidentId={id}
                            customFieldValues={
                              incident.customFieldValues?.map(v => ({
                                id: v.id,
                                value: v.value,
                                customField: v.customField,
                              })) || []
                            }
                            allCustomFields={customFields}
                            canManage={canManageIncident}
                          />
                        </CardContent>
                      </Card>
                    )}

                    {/* Notes Section - Now in Overview for visibility */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base flex items-center gap-2">
                          <MessageSquare className="h-4 w-4" />
                          Notes & Updates
                          {incident.notes.length > 0 && (
                            <Badge variant="secondary" className="ml-auto">
                              {incident.notes.length}
                            </Badge>
                          )}
                        </CardTitle>
                        <CardDescription>
                          Communication and updates for this incident
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <IncidentNotes
                          notes={incident.notes.map(n => ({
                            id: n.id,
                            content: n.content,
                            user: n.user,
                            createdAt: n.createdAt,
                          }))}
                          canManage={canManageIncident}
                          onAddNote={handleAddNote}
                        />
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="timeline" className="mt-0">
                    <IncidentTimeline
                      events={incident.events.map(e => ({
                        id: e.id,
                        message: e.message,
                        createdAt: e.createdAt,
                      }))}
                      incidentCreatedAt={incident.createdAt}
                      incidentAcknowledgedAt={incident.acknowledgedAt}
                      incidentResolvedAt={incident.resolvedAt}
                    />
                  </TabsContent>
                </div>
              </Tabs>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar - 1 column */}
        <aside className="space-y-4 md:space-y-6">
          <IncidentSidebar
            incident={{
              id: incident.id,
              status: incident.status,
              assigneeId: incident.assigneeId,
              assignee: incident.assignee,
              service: incident.service,
              acknowledgedAt: incident.acknowledgedAt,
              resolvedAt: incident.resolvedAt,
              createdAt: incident.createdAt,
              escalationStatus: incident.escalationStatus,
              currentEscalationStep: incident.currentEscalationStep,
              nextEscalationAt: incident.nextEscalationAt,
            }}
            users={users}
            watchers={incident.watchers.map(w => ({
              id: w.id,
              user: w.user,
              role: w.role,
            }))}
            tags={incident.tags.map(t => ({
              id: t.tag.id,
              name: t.tag.name,
              color: t.tag.color,
            }))}
            canManage={canManageIncident}
            onAcknowledge={handleAcknowledge}
            onUnacknowledge={handleUnacknowledge}
            onSnooze={handleSnooze}
            onUnsnooze={handleUnsnooze}
            onSuppress={handleSuppress}
            onUnsuppress={handleUnsuppress}
            onAddWatcher={handleAddWatcher}
            onRemoveWatcher={handleRemoveWatcher}
          />

          {/* Quick Links - Like Teams Page */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Quick Links</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Link href={`/services/${incident.serviceId}`}>
                <Button variant="outline" className="w-full justify-start gap-2">
                  <Zap className="h-4 w-4" />
                  View Service
                </Button>
              </Link>
              <Link href={`/analytics?incident=${incident.id}`}>
                <Button variant="outline" className="w-full justify-start gap-2">
                  <Clock className="h-4 w-4" />
                  View in Analytics
                </Button>
              </Link>
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  );
}
