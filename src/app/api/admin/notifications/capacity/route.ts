import { NextRequest } from 'next/server';
import { Prisma } from '@prisma/client';
import prisma from '@/lib/prisma';
import { jsonError, jsonOk } from '@/lib/api-response';
import { getCurrentUser } from '@/lib/rbac';
import { invalidateNotificationCapacityControl } from '@/lib/notification-capacity-control';

export async function PATCH(request: NextRequest) {
  const user = await getCurrentUser().catch(() => null);
  if (!user) return jsonError('Authentication required', 401);
  if (user.role !== 'ADMIN') return jsonError('Admin access required', 403);
  const body = await request.json().catch(() => null);
  if (!body || typeof body.bulkPaused !== 'boolean')
    return jsonError('Invalid capacity update', 400);
  await prisma.systemConfig.upsert({
    where: { key: 'notification_capacity_control' },
    create: {
      key: 'notification_capacity_control',
      value: { bulkPaused: body.bulkPaused },
      updatedBy: user.id,
    },
    update: { value: { bulkPaused: body.bulkPaused } as Prisma.InputJsonValue, updatedBy: user.id },
  });
  invalidateNotificationCapacityControl();
  return jsonOk({ bulkPaused: body.bulkPaused });
}
