import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { jsonError, jsonOk } from '@/lib/api-response';
import { logger } from '@/lib/logger';
import { authorizeStatusApiRequest } from '@/lib/status-api-auth';

/**
 * Get Status Page Historical Data
 * GET /api/status/history?serviceId=xxx&days=90
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const serviceId = searchParams.get('serviceId');
    const daysParam = searchParams.get('days');
    const days = daysParam ? parseInt(daysParam) : 90;

    const statusPage = await prisma.statusPage.findFirst({
      where: { enabled: true },
      include: {
        services: {
          include: {
            service: true,
          },
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

    const serviceIds = statusPage.services.filter(sp => sp.showOnPage).map(sp => sp.serviceId);

    const effectiveServiceIds =
      serviceIds.length > 0
        ? serviceId && serviceIds.includes(serviceId)
          ? [serviceId]
          : serviceIds
        : serviceId
          ? [serviceId]
          : [];

    if (effectiveServiceIds.length === 0) {
      return jsonOk({ incidents: [], services: [] }, 200);
    }

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const { calculateSLAMetrics } = await import('@/lib/sla-server');
    const metrics = await calculateSLAMetrics({
      serviceId: effectiveServiceIds,
      startDate,
      includeIncidents: true,
      incidentLimit: 100,
    });

    const incidents = metrics.recentIncidents || [];
    const services = metrics.serviceMetrics.map(s => ({ id: s.id, name: s.name }));

    return jsonOk(
      {
        incidents,
        services,
        period: {
          days,
          startDate: startDate.toISOString(),
          endDate: new Date().toISOString(),
        },
      },
      200
    );
  } catch (error: any) {
    logger.error('api.status.history.error', {
      error: error instanceof Error ? error.message : String(error),
    });
    return jsonError(error.message || 'Failed to fetch history', 500);
  }
}
