import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { getAuthOptions } from '@/lib/auth';
import { assertResponderOrAbove } from '@/lib/rbac';
import prisma from '@/lib/prisma';
import { jsonError } from '@/lib/api-response';
import { logger } from '@/lib/logger';
import {
  IncidentStatus as IncidentStatusEnum,
  IncidentUrgency as IncidentUrgencyEnum,
} from '@prisma/client';
import type { IncidentStatus, IncidentUrgency } from '@prisma/client';
import { getUserTimeZone, formatDateTime } from '@/lib/timezone';

const incidentStatusValues = new Set<string>(Object.values(IncidentStatusEnum));
const incidentUrgencyValues = new Set<string>(Object.values(IncidentUrgencyEnum));

const normalizeIncidentStatusParam = (value: string | null): IncidentStatus | 'ALL' => {
  if (!value || value === 'ALL') return 'ALL';
  return incidentStatusValues.has(value) ? (value as IncidentStatus) : 'ALL';
};

const normalizeIncidentUrgencyParam = (value: string | null): IncidentUrgency | 'ALL' => {
  if (!value || value === 'ALL') return 'ALL';
  return incidentUrgencyValues.has(value) ? (value as IncidentUrgency) : 'ALL';
};

const formatMinutes = (ms: number | null) =>
  ms === null ? '--' : `${(ms / 1000 / 60).toFixed(1)}m`;
const formatPercent = (value: number) => `${value.toFixed(0)}%`;

function escapeCSV(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function generateCSV(data: any[][]): string {
  return data.map(row => row.map(escapeCSV).join(',')).join('\n');
}

function createProgressBar(value: number, max: number, length: number = 20): string {
  const percentage = max > 0 ? value / max : 0;
  const filled = Math.round(percentage * length);
  const empty = length - filled;
  // Use ASCII characters for better compatibility
  return '='.repeat(filled) + '-'.repeat(empty) + ` ${(percentage * 100).toFixed(1)}%`;
}

function formatDate(date: Date, timeZone: string): string {
  // Format as: Dec 21, 2025 09:31 PM in user's timezone
  return formatDateTime(date, timeZone, { format: 'datetime', hour12: true });
}

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(await getAuthOptions());
    if (!session) {
      return jsonError('Unauthorized', 401);
    }

    try {
      await assertResponderOrAbove();
    } catch (error) {
      return jsonError(error instanceof Error ? error.message : 'Unauthorized', 403);
    }

    // Get user timezone for date formatting
    const email = session?.user?.email ?? null;
    const user = email
      ? await prisma.user.findUnique({
          where: { email },
          select: { timeZone: true },
        })
      : null;
    const userTimeZone = getUserTimeZone(user ?? undefined);

    const searchParams = req.nextUrl.searchParams;

    const teamId =
      searchParams.get('team') && searchParams.get('team') !== 'ALL'
        ? searchParams.get('team')
        : null;
    const serviceId =
      searchParams.get('service') && searchParams.get('service') !== 'ALL'
        ? searchParams.get('service')
        : null;
    const assigneeId =
      searchParams.get('assignee') && searchParams.get('assignee') !== 'ALL'
        ? searchParams.get('assignee')
        : null;
    const statusFilter = normalizeIncidentStatusParam(searchParams.get('status'));
    const urgencyFilter = normalizeIncidentUrgencyParam(searchParams.get('urgency'));
    const windowDays = parseInt(searchParams.get('window') || '7', 10);

    const now = new Date();
    const recentStart = new Date(now);
    recentStart.setDate(now.getDate() - windowDays);

    // Build where clauses
    const serviceWhere = serviceId ? { serviceId } : teamId ? { service: { teamId } } : null;

    const statusWhere = statusFilter !== 'ALL' ? { status: statusFilter } : null;
    const urgencyWhere = urgencyFilter !== 'ALL' ? { urgency: urgencyFilter } : null;
    const assigneeWhere = assigneeId ? { assigneeId } : null;

    const recentIncidentWhere = {
      createdAt: { gte: recentStart },
      ...(serviceWhere ?? {}),
      ...(urgencyWhere ?? {}),
      ...(statusWhere ?? {}),
      ...(assigneeWhere ?? {}),
    };

    // Fetch data
    const [recentIncidents, services, teams, users, statusTrends, topServices] = await Promise.all([
      prisma.incident.findMany({
        where: recentIncidentWhere,
        include: {
          service: true,
          assignee: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.service.findMany({
        where: teamId ? { teamId } : undefined,
        include: { team: true },
      }),
      prisma.team.findMany(),
      prisma.user.findMany(),
      prisma.incident.groupBy({
        by: ['status'],
        where: recentIncidentWhere,
        _count: { _all: true },
      }),
      prisma.incident.groupBy({
        by: ['serviceId'],
        where: recentIncidentWhere,
        _count: { _all: true },
        orderBy: { _count: { id: 'desc' } },
        take: 10,
      }),
    ]);

    // Calculate metrics
    const totalIncidents = recentIncidents.length;
    const resolvedIncidents = recentIncidents.filter(i => i.status === 'RESOLVED');
    const openIncidents = recentIncidents.filter(i => i.status === 'OPEN');
    const highUrgencyCount = recentIncidents.filter(i => i.urgency === 'HIGH').length;

    // Calculate MTTA and MTTR (simplified)
    const ackEvents = await prisma.incidentEvent.findMany({
      where: {
        incidentId: { in: recentIncidents.map(i => i.id) },
        message: { contains: 'acknowledged', mode: 'insensitive' },
      },
      select: { incidentId: true, createdAt: true },
    });

    const ackByIncident = new Map<string, Date>();
    for (const ack of ackEvents) {
      if (!ackByIncident.has(ack.incidentId)) {
        ackByIncident.set(ack.incidentId, ack.createdAt);
      }
    }

    const ackDiffs: number[] = [];
    for (const incident of recentIncidents) {
      const ackedAt = ackByIncident.get(incident.id);
      if (ackedAt && incident.createdAt) {
        ackDiffs.push(ackedAt.getTime() - incident.createdAt.getTime());
      }
    }
    const mttaMs = ackDiffs.length
      ? ackDiffs.reduce((sum, diff) => sum + diff, 0) / ackDiffs.length
      : null;

    const resolvedDiffs = resolvedIncidents
      .map(i => {
        const resolvedAt = i.resolvedAt || i.updatedAt;
        return resolvedAt && i.createdAt ? resolvedAt.getTime() - i.createdAt.getTime() : null;
      })
      .filter((diff): diff is number => diff !== null);
    const mttrMs = resolvedDiffs.length
      ? resolvedDiffs.reduce((sum, diff) => sum + diff, 0) / resolvedDiffs.length
      : null;

    const resolutionRate = totalIncidents ? (resolvedIncidents.length / totalIncidents) * 100 : 0;
    const ackRate = totalIncidents ? (ackByIncident.size / totalIncidents) * 100 : 0;

    // Build CSV content with well-designed structure
    const csvRows: string[][] = [];

    // Header section with branding (using ASCII characters)
    csvRows.push(['===============================================================']);
    csvRows.push(['                    ANALYTICS REPORT']);
    csvRows.push(['              Operational Readiness Dashboard']);
    csvRows.push(['===============================================================']);
    csvRows.push(['']);
    csvRows.push(['Report Generated:', formatDate(now, userTimeZone)]);
    csvRows.push(['Time Window:', `Last ${windowDays} day${windowDays !== 1 ? 's' : ''}`]);
    csvRows.push([
      'Report Period:',
      `${formatDate(recentStart, userTimeZone)} to ${formatDate(now, userTimeZone)}`,
    ]);
    csvRows.push(['']);

    // Filter information
    csvRows.push(['---------------------------------------------------------------']);
    csvRows.push(['FILTERS APPLIED']);
    csvRows.push(['---------------------------------------------------------------']);
    const hasFilters =
      teamId || serviceId || assigneeId || statusFilter !== 'ALL' || urgencyFilter !== 'ALL';
    if (hasFilters) {
      if (teamId) {
        const team = teams.find(t => t.id === teamId);
        csvRows.push(['Team:', team?.name || teamId]);
      } else {
        csvRows.push(['Team:', 'All Teams']);
      }
      if (serviceId) {
        const service = services.find(s => s.id === serviceId);
        csvRows.push(['Service:', service?.name || serviceId]);
      } else {
        csvRows.push(['Service:', 'All Services']);
      }
      if (assigneeId) {
        const user = users.find(u => u.id === assigneeId);
        csvRows.push(['Assignee:', user?.name || user?.email || assigneeId]);
      } else {
        csvRows.push(['Assignee:', 'All Assignees']);
      }
      csvRows.push(['Status:', statusFilter === 'ALL' ? 'All Statuses' : statusFilter]);
      csvRows.push(['Urgency:', urgencyFilter === 'ALL' ? 'All Urgencies' : urgencyFilter]);
    } else {
      csvRows.push(['No filters applied - showing all data']);
    }
    csvRows.push(['']);

    // Summary metrics with visual separators
    csvRows.push(['---------------------------------------------------------------']);
    csvRows.push(['KEY PERFORMANCE INDICATORS (KPIs)']);
    csvRows.push(['---------------------------------------------------------------']);
    csvRows.push(['Metric', 'Value', 'Status']);

    // Add status indicators with ASCII-compatible characters
    const getStatusIndicator = (value: number, thresholds: { good: number; warning: number }) => {
      if (value >= thresholds.good) return '[OK] Good';
      if (value >= thresholds.warning) return '[!] Warning';
      return '[X] Needs Attention';
    };

    csvRows.push(['Total Incidents', totalIncidents.toString(), '']);
    csvRows.push([
      'Open Incidents',
      openIncidents.length.toString(),
      openIncidents.length > 10 ? '[!] High' : '[OK] Normal',
    ]);
    csvRows.push(['Resolved Incidents', resolvedIncidents.length.toString(), '']);
    csvRows.push([
      'High Urgency Incidents',
      highUrgencyCount.toString(),
      highUrgencyCount > 5 ? '[!] High' : '[OK] Normal',
    ]);

    // MTTA with visual indicator
    const mttaStatus =
      mttaMs && mttaMs < 15 * 60 * 1000
        ? '[OK] Good'
        : mttaMs && mttaMs < 30 * 60 * 1000
          ? '[!] Review'
          : '[X] Needs Attention';
    csvRows.push(['MTTA (Mean Time to Acknowledge)', formatMinutes(mttaMs), mttaStatus]);

    // MTTR with visual indicator
    const mttrStatus =
      mttrMs && mttrMs < 120 * 60 * 1000
        ? '[OK] Good'
        : mttrMs && mttrMs < 240 * 60 * 1000
          ? '[!] Review'
          : '[X] Needs Attention';
    csvRows.push(['MTTR (Mean Time to Resolve)', formatMinutes(mttrMs), mttrStatus]);

    csvRows.push([
      'Acknowledgment Rate',
      formatPercent(ackRate),
      getStatusIndicator(ackRate, { good: 90, warning: 70 }),
    ]);
    csvRows.push([
      'Resolution Rate',
      formatPercent(resolutionRate),
      getStatusIndicator(resolutionRate, { good: 80, warning: 60 }),
    ]);
    csvRows.push(['']);

    // Status breakdown with visual bars
    csvRows.push(['---------------------------------------------------------------']);
    csvRows.push(['INCIDENT STATUS BREAKDOWN']);
    csvRows.push(['---------------------------------------------------------------']);
    csvRows.push(['Status', 'Count', 'Percentage', 'Visual Bar']);
    const statusMap = new Map<IncidentStatus, number>(
      statusTrends.map(s => [s.status, s._count._all])
    );
    const statusOrder: IncidentStatus[] = [
      'OPEN',
      'ACKNOWLEDGED',
      'SNOOZED',
      'SUPPRESSED',
      'RESOLVED',
    ];
    const maxStatusCount = Math.max(...Array.from(statusMap.values()), 1);
    statusOrder.forEach(status => {
      const count = statusMap.get(status) || 0;
      const percentage = totalIncidents
        ? parseFloat(((count / totalIncidents) * 100).toFixed(1))
        : 0;
      const progressBar = createProgressBar(count, maxStatusCount, 30);
      csvRows.push([status, count.toString(), `${percentage.toFixed(1)}%`, progressBar]);
    });
    csvRows.push(['']);

    // Top services with ranking and visualization
    csvRows.push(['---------------------------------------------------------------']);
    csvRows.push(['TOP SERVICES BY INCIDENT COUNT']);
    csvRows.push(['---------------------------------------------------------------']);
    csvRows.push(['Rank', 'Service', 'Incident Count', 'Percentage', 'Visual Bar']);
    const serviceNameMap = new Map(services.map(s => [s.id, s.name]));
    const maxServiceCount =
      topServices.length > 0 ? Math.max(...topServices.map(s => s._count._all)) : 1;
    topServices.forEach((entry, index) => {
      const serviceName = serviceNameMap.get(entry.serviceId) || 'Unknown Service';
      const percentage = totalIncidents
        ? ((entry._count._all / totalIncidents) * 100).toFixed(1)
        : '0.0';
      const progressBar = createProgressBar(entry._count._all, maxServiceCount, 25);
      csvRows.push([
        `#${index + 1}`,
        serviceName,
        entry._count._all.toString(),
        `${percentage}%`,
        progressBar,
      ]);
    });
    csvRows.push(['']);

    // Detailed incident list with better formatting
    csvRows.push(['---------------------------------------------------------------']);
    csvRows.push(['DETAILED INCIDENT LIST']);
    csvRows.push(['---------------------------------------------------------------']);
    csvRows.push([
      'ID',
      'Title',
      'Service',
      'Status',
      'Urgency',
      'Assignee',
      'Created At',
      'Updated At',
      'Duration (hours)',
    ]);

    recentIncidents.forEach(incident => {
      const duration =
        incident.updatedAt && incident.createdAt
          ? (
              (incident.updatedAt.getTime() - incident.createdAt.getTime()) /
              1000 /
              60 /
              60
            ).toFixed(2)
          : '--';

      csvRows.push([
        incident.id,
        incident.title || '',
        incident.service?.name || 'Unknown',
        incident.status,
        incident.urgency,
        incident.assignee?.name || incident.assignee?.email || 'Unassigned',
        formatDate(incident.createdAt, userTimeZone),
        formatDate(incident.updatedAt, userTimeZone),
        duration,
      ]);
    });

    // Generate CSV with UTF-8 BOM for Excel compatibility
    const csvContent = generateCSV(csvRows);
    // Add UTF-8 BOM for proper Excel encoding
    const csvWithBOM = '\uFEFF' + csvContent;

    // Return response with proper encoding
    return new NextResponse(csvWithBOM, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="analytics-report-${new Date().toISOString().split('T')[0]}.csv"`,
        'Cache-Control': 'no-cache',
      },
    });
  } catch (error) {
    logger.error('api.analytics.export_error', {
      error: error instanceof Error ? error.message : String(error),
    });
    return jsonError('Failed to generate export', 500);
  }
}
