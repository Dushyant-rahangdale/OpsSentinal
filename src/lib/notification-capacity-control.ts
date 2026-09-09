import prisma from './prisma';

let cached: { expiresAt: number; bulkPaused: boolean } | undefined;

export async function isBulkNotificationDeliveryPaused(now = Date.now()) {
  if (cached && cached.expiresAt > now) return cached.bulkPaused;
  const record = await prisma.systemConfig.findUnique({
    where: { key: 'notification_capacity_control' },
    select: { value: true },
  });
  const value =
    record?.value && typeof record.value === 'object' && !Array.isArray(record.value)
      ? (record.value as Record<string, unknown>)
      : {};
  cached = { expiresAt: now + 5_000, bulkPaused: value.bulkPaused === true };
  return cached.bulkPaused;
}

export function invalidateNotificationCapacityControl() {
  cached = undefined;
}
