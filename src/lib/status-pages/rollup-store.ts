import 'server-only';
import prisma from '@/lib/prisma';
import type { ServiceDailyHealth } from './rollup-engine';

function dayToDate(dateKey: string): Date {
  return new Date(`${dateKey}T00:00:00.000Z`);
}

/** Persist a service's daily health rollups. Idempotent: re-running a day overwrites it. */
export async function writeServiceDailyHealth(
  serviceId: string,
  records: ServiceDailyHealth[]
): Promise<void> {
  if (records.length === 0) return;
  await prisma.$transaction(
    records.map(record => {
      const data = {
        operationalMs: BigInt(Math.round(record.operationalMs)),
        degradedMs: BigInt(Math.round(record.degradedMs)),
        maintenanceMs: BigInt(Math.round(record.maintenanceMs)),
        partialOutageMs: BigInt(Math.round(record.partialOutageMs)),
        majorOutageMs: BigInt(Math.round(record.majorOutageMs)),
        unknownMs: BigInt(Math.round(record.unknownMs)),
        incidentCount: record.incidentCount,
      };
      return prisma.statusServiceDailyHealth.upsert({
        where: { serviceId_date: { serviceId, date: dayToDate(record.date) } },
        create: { serviceId, date: dayToDate(record.date), ...data },
        update: data,
      });
    })
  );
}

/** Read daily rollups for a window, grouped by service, oldest first. */
export async function readServiceDailyHealth(
  serviceIds: string[],
  start: Date,
  end: Date
): Promise<Map<string, ServiceDailyHealth[]>> {
  const byService = new Map<string, ServiceDailyHealth[]>();
  if (serviceIds.length === 0) return byService;
  const rows = await prisma.statusServiceDailyHealth.findMany({
    where: { serviceId: { in: serviceIds }, date: { gte: start, lt: end } },
    orderBy: [{ serviceId: 'asc' }, { date: 'asc' }],
  });
  for (const row of rows) {
    const list = byService.get(row.serviceId) ?? [];
    list.push({
      date: row.date.toISOString().slice(0, 10),
      operationalMs: Number(row.operationalMs),
      degradedMs: Number(row.degradedMs),
      maintenanceMs: Number(row.maintenanceMs),
      partialOutageMs: Number(row.partialOutageMs),
      majorOutageMs: Number(row.majorOutageMs),
      unknownMs: Number(row.unknownMs),
      incidentCount: row.incidentCount,
    });
    byService.set(row.serviceId, list);
  }
  return byService;
}
