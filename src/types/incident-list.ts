import type { IncidentStatus, IncidentUrgency } from '@prisma/client';
import type { IncidentSlaProjectionInput } from '@/lib/incident-sla/types';

export interface IncidentListItem extends IncidentSlaProjectionInput {
  id: string;
  title: string;
  status: IncidentStatus;
  escalationStatus: string | null;
  currentEscalationStep: number | null;
  nextEscalationAt: Date | null;
  priority: string | null;
  urgency: IncidentUrgency;
  createdAt: Date;
  updatedAt?: Date | null;
  acknowledgedAt: Date | null;
  resolvedAt: Date | null;
  assigneeId: string | null;
  teamId: string | null;
  service: {
    id: string;
    name: string;
  };
  team: {
    id: string;
    name: string;
  } | null;
  assignee: {
    id: string;
    name: string;
    email: string;
    avatarUrl: string | null;
  } | null;
}
