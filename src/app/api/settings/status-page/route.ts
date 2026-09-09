import { NextRequest } from 'next/server';
import { revalidatePath } from 'next/cache';
import prisma from '@/lib/prisma';
import { assertAdmin } from '@/lib/rbac';
import { emitAuditEvent } from '@/lib/audit';
import { jsonError, jsonOk } from '@/lib/api-response';
import { AppError, isAppError } from '@/lib/errors';
import { prismaToAppError } from '@/lib/prisma-errors';
import { StatusPageSettingsSchema } from '@/lib/validation';
import { logger } from '@/lib/logger';
import { Prisma } from '@prisma/client';
import { assertStatusPageNameAvailable, UniqueNameConflictError } from '@/lib/unique-names';
import { externalizeStatusPageLogo } from '@/lib/status-pages/assets';
import { getStatusPageServingStore } from '@/lib/status-pages/serving-store';

function statusPageUniqueError(fields: string[]) {
  if (fields.includes('subdomain')) {
    return {
      code: 'VALIDATION_FAILED' as const,
      userMessage: 'This subdomain is already in use. Please choose a different one.',
      fields: [{ field: 'subdomain', code: 'duplicate', message: 'This subdomain is already in use. Please choose a different one.' }],
    };
  }
  if (fields.includes('customDomain')) {
    return {
      code: 'VALIDATION_FAILED' as const,
      userMessage: 'This custom domain is already in use. Please choose a different one.',
      fields: [{ field: 'customDomain', code: 'duplicate', message: 'This custom domain is already in use. Please choose a different one.' }],
    };
  }
  return { code: 'VALIDATION_FAILED' as const, userMessage: 'A record with this value already exists.' };
}

export async function POST(req: NextRequest) {
  try {
    const actor = await assertAdmin();

    let body: unknown;
    try {
      body = await req.json();
    } catch (error) {
      return jsonError(new AppError({ code: 'INVALID_JSON', cause: error }));
    }

    const parsed = StatusPageSettingsSchema.safeParse(body);
    if (!parsed.success) {
      return jsonError(
        new AppError({
          code: 'VALIDATION_FAILED',
          userMessage: 'Invalid request body.',
          fields: parsed.error.issues.map(issue => ({ field: issue.path.join('.') || 'request', code: issue.code, message: issue.message })),
        }),
        undefined,
        { issues: parsed.error.issues }
      );
    }

    const {
      id,
      expectedUpdatedAt,
      name,
      slug,
      organizationName,
      subdomain,
      customDomain,
      enabled,
      showServices,
      showIncidents,
      showMetrics,
      showSubscribe,
      uptimeExcellentThreshold,
      uptimeGoodThreshold,
      footerText,
      contactEmail,
      contactUrl,
      branding,
      serviceIds,
      serviceConfigs = {},
      privacyMode,
      showIncidentDetails,
      showIncidentTitles,
      showIncidentDescriptions,
      showAffectedServices,
      showIncidentTimestamps,
      showServiceMetrics,
      showServiceDescriptions,
      showServiceRegions,
      showServicesByRegion,
      showServiceOwners,
      showServiceSlaTier,
      showTeamInformation,
      showCustomFields,
      showIncidentAssignees,
      showIncidentUrgency,
      showUptimeHistory,
      showRecentIncidents,
      showChangelog,
      showRegionHeatmap,
      showPostIncidentReview,
      maxIncidentsToShow,
      incidentHistoryDays,
      allowedCustomFields,
      dataRetentionDays,
      requireAuth,
      authProvider,
      emailProvider,
      enableUptimeExports,
      statusApiRequireToken,
      statusApiRateLimitEnabled,
      statusApiRateLimitMax,
      statusApiRateLimitWindowSec,
    } = parsed.data;

    if (!id) {
      return jsonError(new AppError({ code: 'VALIDATION_FAILED', userMessage: 'Status page ID is required for every administrative update.', fields: [{ field: 'id', code: 'required', message: 'Status page ID is required.' }] }));
    }

    const statusPage = await prisma.statusPage.findUnique({ where: { id } });
    if (!statusPage) return jsonError('Status page not found.', 404);

    const effectiveExcellent = uptimeExcellentThreshold ?? statusPage.uptimeExcellentThreshold;
    const effectiveGood = uptimeGoodThreshold ?? statusPage.uptimeGoodThreshold;
    if (effectiveExcellent < effectiveGood) {
      return jsonError(new AppError({
        code: 'VALIDATION_FAILED',
        userMessage: 'Excellent uptime threshold must be greater than or equal to the good threshold.',
        fields: [{ field: 'uptimeExcellentThreshold', code: 'invalid', message: 'Must be greater than or equal to the good threshold.' }],
      }));
    }

    const hasField = (field: keyof typeof parsed.data) => Object.prototype.hasOwnProperty.call(parsed.data, field);
    const nullableText = (value: string | null | undefined) => value?.trim() || null;

    const updateData: Prisma.StatusPageUpdateInput = {
      slug: hasField('slug') ? slug || null : undefined,
      organizationName: hasField('organizationName') ? nullableText(organizationName) : undefined,
      subdomain: hasField('subdomain') ? nullableText(subdomain) : undefined,
      customDomain: hasField('customDomain') ? nullableText(customDomain) : undefined,
      enabled: hasField('enabled') ? enabled : undefined,
      showServices: hasField('showServices') ? showServices : undefined,
      showIncidents: hasField('showIncidents') ? showIncidents : undefined,
      showMetrics: hasField('showMetrics') ? showMetrics : undefined,
      showSubscribe: hasField('showSubscribe') ? showSubscribe : undefined,
      uptimeExcellentThreshold: uptimeExcellentThreshold ?? undefined,
      uptimeGoodThreshold: uptimeGoodThreshold ?? undefined,
      footerText: hasField('footerText') ? nullableText(footerText) : undefined,
      contactEmail: hasField('contactEmail') ? nullableText(contactEmail) : undefined,
      contactUrl: hasField('contactUrl') ? nullableText(contactUrl) : undefined,
    };

    if (name !== undefined && name !== null && name.trim().length > 0) {
      try {
        updateData.name = await assertStatusPageNameAvailable(name, { excludeId: statusPage.id });
      } catch (error) {
        if (error instanceof UniqueNameConflictError) {
          return jsonError(new AppError({ code: 'VALIDATION_FAILED', userMessage: 'A status page with this name already exists.', fields: [{ field: 'name', code: 'duplicate', message: 'A status page with this name already exists.' }] }));
        }
        return jsonError(new AppError({ code: 'VALIDATION_FAILED', userMessage: 'Invalid status page name.', fields: [{ field: 'name', code: 'invalid', message: 'Invalid status page name.' }], cause: error }));
      }
    }

    if (branding !== undefined) updateData.branding = branding === null ? Prisma.JsonNull : (branding as Prisma.InputJsonValue);
    if (privacyMode !== undefined) updateData.privacyMode = privacyMode;
    if (showIncidentDetails !== undefined) updateData.showIncidentDetails = showIncidentDetails;
    if (showIncidentTitles !== undefined) updateData.showIncidentTitles = showIncidentTitles;
    if (showIncidentDescriptions !== undefined) updateData.showIncidentDescriptions = showIncidentDescriptions;
    if (showAffectedServices !== undefined) updateData.showAffectedServices = showAffectedServices;
    if (showIncidentTimestamps !== undefined) updateData.showIncidentTimestamps = showIncidentTimestamps;
    if (showServiceMetrics !== undefined) updateData.showServiceMetrics = showServiceMetrics;
    if (showServiceDescriptions !== undefined) updateData.showServiceDescriptions = showServiceDescriptions;
    if (showServiceRegions !== undefined) updateData.showServiceRegions = showServiceRegions;
    if (showServicesByRegion !== undefined) updateData.showServicesByRegion = showServicesByRegion;
    if (showServiceOwners !== undefined) updateData.showServiceOwners = showServiceOwners;
    if (showServiceSlaTier !== undefined) updateData.showServiceSlaTier = showServiceSlaTier;
    if (showTeamInformation !== undefined) updateData.showTeamInformation = showTeamInformation;
    if (showCustomFields !== undefined) updateData.showCustomFields = showCustomFields;
    if (showIncidentAssignees !== undefined) updateData.showIncidentAssignees = showIncidentAssignees;
    if (showIncidentUrgency !== undefined) updateData.showIncidentUrgency = showIncidentUrgency;
    if (showUptimeHistory !== undefined) updateData.showUptimeHistory = showUptimeHistory;
    if (showRecentIncidents !== undefined) updateData.showRecentIncidents = showRecentIncidents;
    if (showChangelog !== undefined) updateData.showChangelog = showChangelog;
    if (showRegionHeatmap !== undefined) updateData.showRegionHeatmap = showRegionHeatmap;
    if (showPostIncidentReview !== undefined) updateData.showPostIncidentReview = showPostIncidentReview;
    if (maxIncidentsToShow !== undefined) updateData.maxIncidentsToShow = maxIncidentsToShow;
    if (incidentHistoryDays !== undefined) updateData.incidentHistoryDays = incidentHistoryDays;
    if (allowedCustomFields !== undefined) updateData.allowedCustomFields = allowedCustomFields === null ? Prisma.JsonNull : (allowedCustomFields as Prisma.InputJsonValue);
    if (dataRetentionDays !== undefined) updateData.dataRetentionDays = dataRetentionDays;
    if (requireAuth !== undefined) updateData.requireAuth = requireAuth;
    if (authProvider !== undefined) updateData.authProvider = authProvider && authProvider.trim() ? authProvider.trim() : null;
    if (emailProvider !== undefined) updateData.emailProvider = emailProvider && emailProvider.trim() ? emailProvider.trim() : null;
    if (enableUptimeExports !== undefined) updateData.enableUptimeExports = enableUptimeExports;
    if (statusApiRequireToken !== undefined) updateData.statusApiRequireToken = statusApiRequireToken;
    if (statusApiRateLimitEnabled !== undefined) updateData.statusApiRateLimitEnabled = statusApiRateLimitEnabled;
    if (statusApiRateLimitMax !== undefined) updateData.statusApiRateLimitMax = statusApiRateLimitMax;
    if (statusApiRateLimitWindowSec !== undefined) updateData.statusApiRateLimitWindowSec = statusApiRateLimitWindowSec;

    await getStatusPageServingStore().revoke(statusPage.id);
    const updated = await prisma.$transaction(async tx => {
      if (branding && typeof branding === 'object') {
        updateData.branding = (await externalizeStatusPageLogo(tx, statusPage.id, branding)) as Prisma.InputJsonValue;
      }

      const saved = await tx.statusPage.update({
        where: { id: statusPage.id, updatedAt: expectedUpdatedAt ? new Date(expectedUpdatedAt) : statusPage.updatedAt },
        data: updateData,
      });

      if (serviceIds !== undefined) {
        await tx.statusPageService.deleteMany({ where: { statusPageId: statusPage.id } });
        if (serviceIds.length > 0) {
          await tx.statusPageService.createMany({
            data: serviceIds.map((serviceId: string) => {
              const config = Reflect.get(serviceConfigs, serviceId) || {};
              return {
                statusPageId: statusPage.id,
                serviceId,
                displayName: config.displayName || null,
                order: config.order || 0,
                showOnPage: config.showOnPage !== false,
              };
            }),
          });
        }
      }

      await emitAuditEvent(
        {
          action: 'status_page.config.updated',
          source: 'UI',
          target: { type: 'STATUS_PAGE', id: statusPage.id },
          actor: { type: 'USER', id: actor.id, email: actor.email, name: actor.name },
          oldValue: { updatedAt: statusPage.updatedAt.toISOString() },
          newValue: { updatedAt: saved.updatedAt.toISOString() },
          metadata: {
            changedFields: Object.keys(updateData),
            serviceMappingsChanged: serviceIds !== undefined,
            expectedUpdatedAt: expectedUpdatedAt || statusPage.updatedAt.toISOString(),
          },
        },
        tx
      );

      return saved;
    });

    revalidatePath('/status');
    revalidatePath('/');

    logger.info('api.status_page.updated', { statusPageId: statusPage.id });
    return jsonOk({ success: true, updatedAt: updated.updatedAt.toISOString() }, 200);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      return jsonError(new AppError({ code: 'STATUS_PAGE_STALE', cause: error }));
    }
    const prismaError = prismaToAppError(error, { unique: statusPageUniqueError });
    if (prismaError) return jsonError(prismaError);
    if (isAppError(error)) return jsonError(error);
    logger.error('api.status_page.update_error', { error });
    return jsonError('Failed to update status page', 500);
  }
}
