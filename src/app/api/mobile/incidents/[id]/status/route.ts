import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';

import { getAuthOptions } from '@/lib/auth';
import { jsonError, jsonOk } from '@/lib/api-response';
import { logger } from '@/lib/logger';
import { updateIncidentStatus } from '@/app/(app)/incidents/actions';

const StatusSchema = z.object({
  status: z.enum(['OPEN', 'ACKNOWLEDGED', 'RESOLVED', 'SNOOZED', 'SUPPRESSED']),
});

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(await getAuthOptions());
    if (!session?.user?.email) {
      return jsonError('Unauthorized', 401);
    }

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return jsonError('Invalid JSON in request body.', 400);
    }

    const parsed = StatusSchema.safeParse(body);
    if (!parsed.success) {
      return jsonError('Invalid request body.', 400, { issues: parsed.error.issues });
    }

    await updateIncidentStatus(params.id, parsed.data.status);
    return jsonOk({ success: true }, 200);
  } catch (error) {
    logger.error('api.mobile.incident.update_failed', {
      component: 'mobile-incident-status',
      error,
      incidentId: params.id,
    });
    return jsonError('Failed to update incident.', 500);
  }
}
