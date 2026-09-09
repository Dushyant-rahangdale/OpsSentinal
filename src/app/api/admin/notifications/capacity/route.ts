import { NextRequest } from 'next/server';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import prisma from '@/lib/prisma';
import { jsonError, jsonOk } from '@/lib/api-response';
import { getUserPermissions } from '@/lib/rbac';
import { invalidateNotificationCapacityControl } from '@/lib/notification-capacity-control';

const capacityUpdateSchema = z
  .object({
    bulkPaused: z.boolean(),
  })
  .strict();

export async function PATCH(request: NextRequest) {
  const permissions = await getUserPermissions();
  if (!permissions.authenticated) return jsonError('Authentication required', 401);
  if (!permissions.capabilities.includes('admin.manage')) {
    return jsonError('Admin access required', 403);
  }

  let input: unknown;
  try {
    input = await request.json();
  } catch {
    return jsonError('Invalid capacity update', 400);
  }
  const parsed = capacityUpdateSchema.safeParse(input);
  if (!parsed.success) return jsonError('Invalid capacity update', 400);

  const { bulkPaused } = parsed.data;
  await prisma.systemConfig.upsert({
    where: { key: 'notification_capacity_control' },
    create: {
      key: 'notification_capacity_control',
      value: { bulkPaused },
      updatedBy: permissions.id,
    },
    update: { value: { bulkPaused } as Prisma.InputJsonValue, updatedBy: permissions.id },
  });
  invalidateNotificationCapacityControl();
  return jsonOk({ bulkPaused });
}
