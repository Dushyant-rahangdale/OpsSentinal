import prisma from '@/lib/prisma';
import { notFound } from 'next/navigation';
import { getUserPermissions } from '@/lib/rbac';
import {
  addNote,
  addWatcher,
  removeWatcher,
  resolveIncidentWithNote,
  updateIncidentStatus,
  updateIncidentUrgency,
} from '../actions';
import { getPostmortem } from '@/app/(app)/postmortems/actions';
import Link from 'next/link';
import IncidentHeader from '@/components/incident/IncidentHeader';
import IncidentSidebar from '@/components/incident/detail/IncidentSidebar';
import IncidentNotes from '@/components/incident/detail/IncidentNotes';
import IncidentTimeline from '@/components/incident/detail/IncidentTimeline';
import IncidentResolution from '@/components/incident/detail/IncidentResolution';
import IncidentCustomFields from '@/components/IncidentCustomFields';
import { Button } from '@/components/ui/shadcn/button';
import { Card, CardContent, CardHeader } from '@/components/ui/shadcn/card';
import { Badge } from '@/components/ui/shadcn/badge';
import { CheckCircle2, FileText } from 'lucide-react';

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

  return (
    <main className="w-full mx-auto p-4 md:p-6 max-w-[1600px]">
      {/* Header */}
      <div className="mb-6">
        <IncidentHeader
          incident={incident as any} // eslint-disable-line @typescript-eslint/no-explicit-any
          users={users}
          teams={teams}
          canManage={canManageIncident}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-6">
        {/* Main Content */}
        <div className="space-y-6">
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
            <Card className="shadow-xl border-border/40 overflow-hidden bg-gradient-to-br from-card to-card/95">
              <CardHeader className="bg-gradient-to-r from-green-600 via-green-500 to-green-600 text-white pb-5">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-lg bg-white/10 backdrop-blur-sm flex items-center justify-center border border-white/20 shadow-lg">
                    <FileText className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h4 className="text-lg font-bold mb-0.5">Postmortem</h4>
                    <p className="text-sm text-white/90">
                      Document lessons learned and improve incident response
                    </p>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="p-6">
                {postmortem ? (
                  <div className="space-y-4">
                    <div className="p-4 bg-green-50 border-2 border-green-200 rounded-lg">
                      <div className="flex items-center gap-2 text-green-700">
                        <CheckCircle2 className="h-5 w-5" />
                        <p className="text-sm font-semibold m-0">
                          Postmortem exists for this incident
                        </p>
                      </div>
                    </div>
                    <Link href={`/postmortems/${id}`}>
                      <Button className="w-full font-semibold shadow-md hover:shadow-lg transition-all">
                        View Postmortem
                      </Button>
                    </Link>
                  </div>
                ) : (
                  <Link href={`/postmortems/${id}`}>
                    <Button className="w-full font-semibold shadow-md hover:shadow-lg transition-all">
                      Create Postmortem
                    </Button>
                  </Link>
                )}
              </CardContent>
            </Card>
          )}

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

          {/* Custom Fields */}
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
        </div>

        {/* Sidebar */}
        <aside className="lg:sticky lg:top-6 h-fit">
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
        </aside>
      </div>
    </main>
  );
}
