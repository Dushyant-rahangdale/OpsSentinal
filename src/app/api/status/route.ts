import prisma from '@/lib/prisma';
import { jsonError, jsonOk } from '@/lib/api-response';
import { logger } from '@/lib/logger';
import { getServerSession } from 'next-auth';
import { getAuthOptions } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';
import { authorizeStatusApiRequest } from '@/lib/status-api-auth';
import { createHash } from 'node:crypto';
import { observeOperationalHistogram } from '@/lib/metrics/operational/registry';
import { getStatusPageSnapshot } from '@/lib/status-pages/snapshot';
import {
  PRIVATE_STATUS_CACHE_CONTROL,
  PUBLIC_STATUS_CACHE_CONTROL,
} from '@/lib/status-pages/cache-policy';

/**
 * Status Page API
 * Returns JSON data for status page integrations
 *
 * GET /api/status
 */
export async function GET(req: NextRequest) {
  return getStatusResponse(req);
}

export async function getStatusResponse(req: NextRequest, slug?: string) {
  const projectionStartedAt = performance.now();
  try {
    const statusPage = await prisma.statusPage.findFirst({
      where: slug ? { enabled: true, slug } : { enabled: true, isDefault: true },
      select: {
        id: true,
        updatedAt: true,
        maxIncidentsToShow: true,
        incidentHistoryDays: true,
        dataRetentionDays: true,
        enabled: true,
        requireAuth: true,
        statusApiRequireToken: true,
        statusApiRateLimitEnabled: true,
        statusApiRateLimitMax: true,
        statusApiRateLimitWindowSec: true,
        showServices: true,
        showIncidents: true,
        showMetrics: true,
        showIncidentDetails: true,
        showIncidentTitles: true,
        showIncidentDescriptions: true,
        showAffectedServices: true,
        showIncidentTimestamps: true,
        showServiceMetrics: true,
        showServiceRegions: true,
        showServiceOwners: true,
        showServiceSlaTier: true,
        showTeamInformation: true,
        showIncidentUrgency: true,
        showUptimeHistory: true,
        showRecentIncidents: true,
        services: {
          select: {
            serviceId: true,
            showOnPage: true,
            order: true,
          },
          orderBy: { order: 'asc' },
        },
        announcements: {
          where: {
            isActive: true,
            type: 'MAINTENANCE',
            startDate: { lte: new Date() },
            OR: [{ endDate: null }, { endDate: { gt: new Date() } }],
          },
          select: { affectedServiceIds: true, updatedAt: true },
        },
      },
    });

    if (!statusPage) {
      return jsonError('Status page not found or disabled', 404);
    }

    const authResult = await authorizeStatusApiRequest(req, statusPage.id, {
      requireToken: statusPage.statusApiRequireToken,
      rateLimitEnabled: statusPage.statusApiRateLimitEnabled,
      rateLimitMax: statusPage.statusApiRateLimitMax,
      rateLimitWindowSec: statusPage.statusApiRateLimitWindowSec,
    });
    if (!authResult.allowed) {
      if (authResult.status === 429) {
        return NextResponse.json(
          { error: authResult.error || 'Rate limit exceeded' },
          {
            status: 429,
            headers: authResult.retryAfter
              ? { 'Retry-After': String(authResult.retryAfter) }
              : undefined,
          }
        );
      }
      return jsonError(authResult.error || 'Unauthorized', authResult.status || 401);
    }

    // Check if authentication is required
    if (statusPage.requireAuth) {
      const session = await getServerSession(await getAuthOptions());
      if (!session) {
        return jsonError('Authentication required', 401);
      }
    }

    const projected = await getStatusPageSnapshot(statusPage.id);
    if (projected.snapshot) {
      const snapshot = projected.snapshot;
      const responseData = {
        status: snapshot.status,
        services: snapshot.services,
        incidents: snapshot.incidents,
        metrics: {
          uptime: Object.entries(snapshot.uptime).map(([serviceId, uptime]) => ({
            serviceId,
            uptime: Number(uptime.toFixed(3)),
          })),
        },
        retention: { historyDays: snapshot.historyDays },
        updatedAt: snapshot.generatedAt,
        projection: { revision: snapshot.revision, stale: projected.stale },
      };
      const headers: Record<string, string> = {
        'Cache-Control':
          statusPage.requireAuth || statusPage.statusApiRequireToken
            ? PRIVATE_STATUS_CACHE_CONTROL
            : PUBLIC_STATUS_CACHE_CONTROL,
        ...(projected.stale ? { Warning: '110 - "Response is stale"' } : {}),
      };
      const etag = `"${createHash('sha256').update(JSON.stringify(responseData)).digest('base64url')}"`;
      if (req.headers.get('if-none-match') === etag) {
        return new NextResponse(null, { status: 304, headers: { ...headers, ETag: etag } });
      }
      return jsonOk(responseData, 200, { ...headers, ETag: etag });
    }

    return jsonError('Published status information is temporarily unavailable', 503, undefined, {
      'Retry-After': '30',
      'Cache-Control': 'public, max-age=5, stale-if-error=30',
    });

    // Retained temporarily for compatibility while snapshot-only serving settles.
    // This guard also keeps the legacy fallback type-safe although it is unreachable.
    if (!statusPage) return jsonError('Status page not found or disabled', 404);
  } catch (error: unknown) {
    logger.error('api.status.error', {
      error: error instanceof Error ? error.message : String(error),
    });
    return jsonError('Failed to fetch status', 500);
  } finally {
    observeOperationalHistogram(
      'opsknight_status_page_projection_duration_seconds',
      (performance.now() - projectionStartedAt) / 1000,
      { surface: 'json' }
    );
  }
}
