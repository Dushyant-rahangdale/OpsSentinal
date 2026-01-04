import prisma from '@/lib/prisma';
import { calculateSLAMetrics } from '@/lib/sla-server';

/**
 * Centralized Widget Data Provider - SIMPLIFIED VERSION
 * Single source of truth for all dashboard widget data
 * Note: Some features simplified due to schema limitations
 */

export interface ActiveIncidentData {
  id: string;
  title: string;
  status: string;
  urgency: 'HIGH' | 'MEDIUM' | 'LOW';
  createdAt: Date;
  acknowledgedAt: Date | null;
  resolvedAt: Date | null;
  serviceId: string;
  serviceName: string;
  assigneeId: string | null;
  assigneeName: string | null;
  slaAckDeadline: Date | null;
  slaResolveDeadline: Date | null;
}

export interface OnCallStatus {
  isOnCall: boolean;
  shiftStart: Date | null;
  shiftEnd: Date | null;
  assignedIncidents: number;
}

export interface SLAMetrics {
  mtta: number; // minutes
  mttr: number; // minutes
  ackCompliance: number; // percentage
  resolveCompliance: number; // percentage
  trendMtta: 'up' | 'down' | 'stable';
  trendMttr: 'up' | 'down' | 'stable';
}

export interface ServiceHealthData {
  id: string;
  name: string;
  status: 'OPERATIONAL' | 'DEGRADED' | 'PARTIAL_OUTAGE' | 'MAJOR_OUTAGE' | 'MAINTENANCE';
  activeIncidents: number;
  criticalIncidents: number;
}

export interface ActivityEvent {
  id: string;
  message: string;
  timestamp: Date;
  incidentId: string;
}

export interface WorkloadData {
  userId: string;
  userName: string;
  activeIncidents: number;
  criticalIncidents: number;
  isOnCall: boolean;
  isOverloaded: boolean;
}

export interface WidgetDataContext {
  activeIncidents: ActiveIncidentData[];
  slaBreachAlerts: ActiveIncidentData[]; // Incidents close to SLA breach
  userOnCall: OnCallStatus;
  slaMetrics: SLAMetrics;
  serviceHealth: ServiceHealthData[];
  recentActivity: ActivityEvent[];
  teamWorkload: WorkloadData[];
  lastUpdated: Date;
}

/**
 * Get all widget data in a single optimized query
 */
export async function getWidgetData(userId: string, userRole: string): Promise<WidgetDataContext> {
  const now = new Date();

  // Determine scope based on role
  const isAdmin = userRole === 'ADMIN' || userRole === 'RESPONDER';

  // Build incident filter - use OPEN and ACKNOWLEDGED (not TRIGGERED)
  const incidentWhere: any = {
    status: { in: ['OPEN', 'ACKNOWLEDGED'] },
  };

  // Fetch active incidents with SLA info
  const activeIncidents = await prisma.incident.findMany({
    where: incidentWhere,
    select: {
      id: true,
      title: true,
      status: true,
      urgency: true,
      createdAt: true,
      acknowledgedAt: true,
      resolvedAt: true,
      service: {
        select: {
          id: true,
          name: true,
          targetAckMinutes: true,
          targetResolveMinutes: true,
        },
      },
      assignee: {
        select: {
          id: true,
          name: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
    take: 100,
  });

  // Calculate SLA deadlines and map to ActiveIncidentData
  const activeIncidentsData: ActiveIncidentData[] = activeIncidents.map(inc => {
    const slaAckDeadline =
      inc.service.targetAckMinutes && !inc.acknowledgedAt
        ? new Date(inc.createdAt.getTime() + inc.service.targetAckMinutes * 60000)
        : null;

    const slaResolveDeadline =
      inc.service.targetResolveMinutes && !inc.resolvedAt
        ? new Date(inc.createdAt.getTime() + inc.service.targetResolveMinutes * 60000)
        : null;

    return {
      id: inc.id,
      title: inc.title,
      status: inc.status,
      urgency: inc.urgency as 'HIGH' | 'MEDIUM' | 'LOW',
      createdAt: inc.createdAt,
      acknowledgedAt: inc.acknowledgedAt,
      resolvedAt: inc.resolvedAt,
      serviceId: inc.service.id,
      serviceName: inc.service.name,
      assigneeId: inc.assignee?.id || null,
      assigneeName: inc.assignee?.name || null,
      slaAckDeadline,
      slaResolveDeadline,
    };
  });

  // Identify SLA breach alerts (within 15 min for ACK, 30 min for Resolve)
  const slaBreachAlerts = activeIncidentsData.filter(inc => {
    if (inc.slaAckDeadline && !inc.acknowledgedAt) {
      const timeToAckBreach = inc.slaAckDeadline.getTime() - now.getTime();
      if (timeToAckBreach > 0 && timeToAckBreach <= 15 * 60000) return true;
    }
    if (inc.slaResolveDeadline && !inc.resolvedAt) {
      const timeToResolveBreach = inc.slaResolveDeadline.getTime() - now.getTime();
      if (timeToResolveBreach > 0 && timeToResolveBreach <= 30 * 60000) return true;
    }
    return false;
  });

  // Get user's on-call status
  const activeShifts = await prisma.onCallShift.findMany({
    where: {
      userId,
      start: { lte: now },
      end: { gte: now },
    },
    orderBy: { start: 'asc' },
    take: 1,
  });

  const currentShift = activeShifts[0];
  const userOnCall: OnCallStatus = currentShift
    ? {
        isOnCall: true,
        shiftStart: currentShift.start,
        shiftEnd: currentShift.end,
        assignedIncidents: activeIncidentsData.filter(i => i.assigneeId === userId).length,
      }
    : {
        isOnCall: false,
        shiftStart: null,
        shiftEnd: null,
        assignedIncidents: activeIncidentsData.filter(i => i.assigneeId === userId).length,
      };

  // Calculate SLA metrics using existing function
  const slaMetricsRaw = await calculateSLAMetrics({ useOrScope: true });

  // Determine trends (comparing with previous period) - handle null values
  const currentMtta = slaMetricsRaw.mtta || 0;
  const prevMtta = slaMetricsRaw.previousPeriod.mtta || 0;
  const currentMttr = slaMetricsRaw.mttr || 0;
  const prevMttr = slaMetricsRaw.previousPeriod.mttr || 0;

  const trendMtta = currentMtta < prevMtta ? 'down' : currentMtta > prevMtta ? 'up' : 'stable';
  const trendMttr = currentMttr < prevMttr ? 'down' : currentMttr > prevMttr ? 'up' : 'stable';

  const slaMetrics: SLAMetrics = {
    mtta: currentMtta,
    mttr: currentMttr,
    ackCompliance: slaMetricsRaw.ackCompliance,
    resolveCompliance: slaMetricsRaw.resolveCompliance,
    trendMtta,
    trendMttr,
  };

  // Get service health
  const services = await prisma.service.findMany({
    select: {
      id: true,
      name: true,
      status: true,
    },
  });

  const serviceHealth: ServiceHealthData[] = services.map(service => {
    const serviceIncidents = activeIncidentsData.filter(i => i.serviceId === service.id);
    const criticalCount = serviceIncidents.filter(i => i.urgency === 'HIGH').length;

    return {
      id: service.id,
      name: service.name,
      status: service.status as any,
      activeIncidents: serviceIncidents.length,
      criticalIncidents: criticalCount,
    };
  });

  // Get recent activity (last 10 events from IncidentEvent table)
  const recentIncidentEvents = await prisma.incidentEvent.findMany({
    take: 10,
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      message: true,
      createdAt: true,
      incidentId: true,
    },
  });

  const recentActivity: ActivityEvent[] = recentIncidentEvents.map(event => ({
    id: event.id,
    message: event.message,
    timestamp: event.createdAt,
    incidentId: event.incidentId,
  }));

  // Get team workload
  const teamMembers = await prisma.user.findMany({
    take: 20, // Limit to top 20 users
    select: {
      id: true,
      name: true,
    },
  });

  const teamWorkload: WorkloadData[] = await Promise.all(
    teamMembers.map(async member => {
      const memberIncidents = activeIncidentsData.filter(i => i.assigneeId === member.id);
      const criticalCount = memberIncidents.filter(i => i.urgency === 'HIGH').length;

      // Check if user is currently on-call
      const onCallShifts = await prisma.onCallShift.count({
        where: {
          userId: member.id,
          start: { lte: now },
          end: { gte: now },
        },
      });

      return {
        userId: member.id,
        userName: member.name || 'Unknown',
        activeIncidents: memberIncidents.length,
        criticalIncidents: criticalCount,
        isOnCall: onCallShifts > 0,
        isOverloaded: memberIncidents.length > 5, // Configurable threshold
      };
    })
  );

  return {
    activeIncidents: activeIncidentsData,
    slaBreachAlerts,
    userOnCall,
    slaMetrics,
    serviceHealth,
    recentActivity,
    teamWorkload: teamWorkload
      .filter(w => w.activeIncidents > 0 || w.isOnCall)
      .sort((a, b) => b.activeIncidents - a.activeIncidents),
    lastUpdated: now,
  };
}
