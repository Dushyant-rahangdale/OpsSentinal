import type { IncidentStatus, IncidentUrgency } from '@prisma/client';

export interface IncidentListItem {
  id: string;
  title: string;
  status: IncidentStatus;
  escalationStatus: string | null;
  currentEscalationStep: number | null;
  nextEscalationAt: Date | null;
  priority: string | null;
  urgency: IncidentUrgency;
  createdAt: Date;
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
