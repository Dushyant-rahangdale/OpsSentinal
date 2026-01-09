'use client';

import Link from 'next/link';
import StatusBadge from './StatusBadge';
import EscalationStatusBadge from './EscalationStatusBadge';
import PriorityBadge from './PriorityBadge';
import AssigneeSection from './AssigneeSection';
import { Incident, Service } from '@prisma/client';
import { useTimezone } from '@/contexts/TimezoneContext';
import { formatDateTime } from '@/lib/timezone';
import { Card, CardContent } from '@/components/ui/shadcn/card';
import { Badge } from '@/components/ui/shadcn/badge';
import {
  ArrowLeft,
  Clock,
  CheckCircle2,
  AlertCircle,
  Server,
  AlertTriangle,
  Shield,
} from 'lucide-react';
import { cn } from '@/lib/utils';

type IncidentHeaderProps = {
  incident: Incident & {
    service: Service & {
      policy?: { id: string; name: string } | null;
    };
    assignee: { id: string; name: string; email: string } | null;
    team?: { id: string; name: string } | null;
  };
  users: Array<{ id: string; name: string; email: string }>;
  teams: Array<{ id: string; name: string }>;
  canManage: boolean;
};

export default function IncidentHeader({ incident, users, teams, canManage }: IncidentHeaderProps) {
  const { userTimeZone } = useTimezone();
  const incidentStatus = incident.status as any; // eslint-disable-line @typescript-eslint/no-explicit-any

  const getStatusDotColor = (status: string) => {
    switch (status) {
      case 'RESOLVED':
        return 'bg-green-500 ring-green-500/20';
      case 'ACKNOWLEDGED':
        return 'bg-amber-500 ring-amber-500/20';
      default:
        return 'bg-red-500 ring-red-500/20';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'RESOLVED':
        return <CheckCircle2 className="h-4 w-4 text-green-600" />;
      case 'ACKNOWLEDGED':
        return <Clock className="h-4 w-4 text-amber-600" />;
      default:
        return <AlertCircle className="h-4 w-4 text-red-600" />;
    }
  };

  return (
    <Card className="shadow-xl border-border/40 overflow-hidden relative bg-gradient-to-br from-card to-card/95">
      {/* Gradient Top Border */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary via-accent to-primary opacity-80" />

      <CardContent className="p-8">
        {/* Top Section */}
        <div className="flex justify-between items-start gap-6 mb-6 flex-wrap">
          <div className="flex-1 min-w-[300px]">
            {/* Back Link */}
            <Link
              href="/incidents"
              className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary font-medium transition-colors mb-4"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Incidents
            </Link>

            {/* Tags Row */}
            <div className="flex gap-3 items-center flex-wrap mb-4">
              <Badge className="text-xl font-bold bg-primary/10 text-primary hover:bg-primary/20 px-3 py-1">
                #{incident.id.slice(-5).toUpperCase()}
              </Badge>
              <StatusBadge status={incidentStatus} size="lg" showDot />
              {incident.escalationStatus && (
                <EscalationStatusBadge
                  status={incident.escalationStatus}
                  currentStep={incident.currentEscalationStep}
                  nextEscalationAt={incident.nextEscalationAt}
                />
              )}
              <PriorityBadge priority={incident.priority} size="lg" showLabel />
            </div>

            {/* Title */}
            <h1 className="text-3xl font-bold text-foreground mb-2 leading-tight tracking-tight">
              {incident.title}
            </h1>

            {/* Description */}
            {incident.description && (
              <p className="text-base text-muted-foreground max-w-3xl leading-relaxed">
                {incident.description}
              </p>
            )}
          </div>

          {/* Meta Panel */}
          <div className="flex flex-col items-end gap-2 bg-neutral-50 dark:bg-neutral-900 p-4 rounded-lg border border-border min-w-[180px]">
            <div className="flex items-center gap-2 w-full justify-end">
              <Clock className="h-3.5 w-3.5 text-muted-foreground" />
              <div className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">
                Created
              </div>
            </div>
            <div className="font-bold text-sm text-foreground">
              {formatDateTime(incident.createdAt, userTimeZone, { format: 'datetime' })}
            </div>

            {incident.acknowledgedAt && (
              <>
                <div className="flex items-center gap-2 w-full justify-end mt-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-amber-600" />
                  <div className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">
                    Acknowledged
                  </div>
                </div>
                <div className="font-bold text-sm text-amber-600">
                  {formatDateTime(incident.acknowledgedAt, userTimeZone, { format: 'datetime' })}
                </div>
              </>
            )}

            {incident.resolvedAt && (
              <>
                <div className="flex items-center gap-2 w-full justify-end mt-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
                  <div className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">
                    Resolved
                  </div>
                </div>
                <div className="font-bold text-sm text-green-600">
                  {formatDateTime(incident.resolvedAt, userTimeZone, { format: 'datetime' })}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Overview Header */}
        <div className="flex items-center gap-3 mb-4 pb-4 border-b border-border">
          <div
            className={cn('w-2.5 h-2.5 rounded-full ring-4', getStatusDotColor(incident.status))}
          />
          {getStatusIcon(incident.status)}
          <h2 className="text-sm text-muted-foreground uppercase tracking-wider font-bold">
            Incident Overview
          </h2>
        </div>

        {/* Info Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Service Card */}
          <div className="relative bg-card border-2 border-border rounded-lg p-4 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all overflow-hidden group">
            <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-primary to-primary/60" />
            <div className="flex items-center gap-2 mb-2">
              <Server className="h-4 w-4 text-primary" />
              <div className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">
                Service
              </div>
            </div>
            <Link
              href={`/services/${incident.serviceId}`}
              className="text-primary font-bold text-base hover:text-accent transition-colors inline-flex items-center gap-2 group-hover:gap-3"
            >
              <div className="w-2 h-2 rounded-full bg-accent" />
              {incident.service.name}
            </Link>
          </div>

          {/* Urgency Card */}
          <div className="relative bg-card border-2 border-border rounded-lg p-4 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-primary to-primary/60" />
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="h-4 w-4 text-primary" />
              <div className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">
                Urgency
              </div>
            </div>
            <div
              className={cn(
                'font-bold text-base flex items-center gap-2',
                incident.urgency === 'HIGH' ? 'text-red-600' : 'text-amber-600'
              )}
            >
              {incident.urgency}
            </div>
          </div>

          {/* Assignee Card */}
          <div className="relative bg-card border-2 border-border rounded-lg p-4 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-primary to-primary/60" />
            <div className="text-xs text-muted-foreground uppercase tracking-wider mb-2 font-semibold">
              Assignee
            </div>
            <AssigneeSection
              assignee={incident.assignee}
              team={incident.team || null}
              assigneeId={incident.assigneeId}
              teamId={incident.teamId}
              users={users}
              teams={teams}
              incidentId={incident.id}
              canManage={canManage}
              variant="header"
            />
          </div>

          {/* Escalation Policy Card */}
          {incident.service.policy && (
            <div className="relative bg-card border-2 border-border rounded-lg p-4 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all overflow-hidden group">
              <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-primary to-primary/60" />
              <div className="flex items-center gap-2 mb-2">
                <Shield className="h-4 w-4 text-primary" />
                <div className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">
                  Escalation Policy
                </div>
              </div>
              <Link
                href={`/policies/${incident.service.policy.id}`}
                className="text-primary font-bold text-base hover:text-accent transition-colors inline-flex items-center gap-2 group-hover:gap-3"
              >
                <div className="w-2 h-2 rounded-full bg-accent" />
                {incident.service.policy.name}
              </Link>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
