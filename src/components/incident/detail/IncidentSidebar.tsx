'use client';

import type { IncidentStatus, Service } from '@prisma/client';
import Link from 'next/link';
import StatusBadge from '../StatusBadge';
import SLAIndicator from '../SLAIndicator';
import IncidentQuickActions from '../IncidentQuickActions';
import IncidentStatusActions from './IncidentStatusActions';
import IncidentWatchers from './IncidentWatchers';
import IncidentTags from './IncidentTags';
import { Card, CardContent, CardHeader } from '@/components/ui/shadcn/card';
import { Button } from '@/components/ui/shadcn/button';
import { Badge } from '@/components/ui/shadcn/badge';
import { Zap, FileText, Activity } from 'lucide-react';

type IncidentSidebarProps = {
  incident: {
    id: string;
    status: IncidentStatus;
    assigneeId: string | null;
    assignee: { id: string; name: string; email: string } | null;
    service: {
      id: string;
      name: string;
      targetAckMinutes?: number | null;
      targetResolveMinutes?: number | null;
    };
    acknowledgedAt?: Date | null;
    resolvedAt?: Date | null;
    createdAt: Date;
    escalationStatus?: string | null;
    currentEscalationStep?: number | null;
    nextEscalationAt?: Date | null;
  };
  users: Array<{ id: string; name: string; email: string }>;
  watchers: Array<{
    id: string;
    user: { id: string; name: string; email: string };
    role: string;
  }>;
  tags: Array<{ id: string; name: string; color?: string | null }>;
  canManage: boolean;
  onAcknowledge: () => void;
  onUnacknowledge: () => void;
  onSnooze: () => void;
  onUnsnooze: () => void;
  onSuppress: () => void;
  onUnsuppress: () => void;
  onAddWatcher: (formData: FormData) => void;
  onRemoveWatcher: (formData: FormData) => void;
};

export default function IncidentSidebar({
  incident,
  users,
  watchers,
  tags,
  canManage,
  onAcknowledge,
  onUnacknowledge,
  onSnooze,
  onUnsnooze,
  onSuppress,
  onUnsuppress,
  onAddWatcher,
  onRemoveWatcher,
}: IncidentSidebarProps) {
  const incidentStatus = incident.status as any; // eslint-disable-line @typescript-eslint/no-explicit-any
  const incidentForSLA = incident as any; // eslint-disable-line @typescript-eslint/no-explicit-any
  const serviceForSLA = incident.service as Service;

  return (
    <div className="space-y-6">
      {/* Status & Actions Card */}
      <Card className="shadow-xl border-border/40 overflow-hidden bg-gradient-to-br from-card to-card/95">
        <CardHeader className="bg-gradient-to-r from-slate-600 via-slate-500 to-slate-600 text-white pb-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Zap className="h-5 w-5" />
              <h4 className="font-bold text-lg">Actions</h4>
            </div>
            <Badge className="bg-white/20 text-white border-white/30 hover:bg-white/30 backdrop-blur-sm text-xs uppercase tracking-wider">
              Controls
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="p-6 space-y-4">
          {/* Status Display */}
          <div className="flex items-center justify-between gap-3 p-3 rounded-lg bg-white border-2 border-border shadow-sm">
            <div>
              <div className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-1">
                Status
              </div>
              <div className="font-bold text-foreground text-base">{incident.status}</div>
            </div>
            <StatusBadge status={incidentStatus} size="md" showDot />
          </div>

          {/* Quick Actions */}
          <div>
            <IncidentQuickActions incidentId={incident.id} serviceId={incident.service.id} />
          </div>

          {/* Status Actions */}
          <IncidentStatusActions
            incidentId={incident.id}
            currentStatus={incident.status}
            onAcknowledge={onAcknowledge}
            onUnacknowledge={onUnacknowledge}
            onSnooze={onSnooze}
            onUnsnooze={onUnsnooze}
            onSuppress={onSuppress}
            onUnsuppress={onUnsuppress}
            canManage={canManage}
          />
        </CardContent>
      </Card>

      {/* SLA Indicator */}
      <SLAIndicator incident={incidentForSLA} service={serviceForSLA} showDetails={true} />

      {/* Watchers */}
      <IncidentWatchers
        watchers={watchers}
        users={users}
        canManage={canManage}
        onAddWatcher={onAddWatcher}
        onRemoveWatcher={onRemoveWatcher}
      />

      {/* Tags */}
      <Card className="shadow-xl border-border/40 overflow-hidden bg-gradient-to-br from-card to-card/95">
        <CardContent className="p-6">
          <IncidentTags incidentId={incident.id} tags={tags} canManage={canManage} />
        </CardContent>
      </Card>

      {/* Postmortem Section - Only show for resolved incidents */}
      {incident.status === 'RESOLVED' && (
        <Card className="shadow-xl border-border/40 overflow-hidden bg-gradient-to-br from-card to-card/95">
          <CardHeader className="bg-gradient-to-r from-green-600 via-green-500 to-green-600 text-white pb-4">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                <h4 className="font-bold text-lg">Postmortem</h4>
              </div>
              <Badge className="bg-white/20 text-white border-white/30 hover:bg-white/30 backdrop-blur-sm text-xs uppercase tracking-wider">
                Learning
              </Badge>
            </div>
          </CardHeader>

          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
              Document what happened, why it happened, and how to prevent it in the future.
            </p>
            <Link href={`/postmortems/${incident.id}`}>
              <Button className="w-full font-semibold shadow-md hover:shadow-lg transition-all">
                <FileText className="mr-2 h-4 w-4" />
                {canManage ? 'Create Postmortem' : 'View Postmortem'}
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
