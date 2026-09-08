import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { calculateSLAMetrics, checkIncidentSLA } from '@/lib/sla-server';
import { projectIncidentSlaState } from '@/lib/incident-sla/state';
import { generateDailyRollup, queryRollupMetrics } from '@/lib/metric-rollup';
import { clearRetentionPolicyCache } from '@/lib/retention-policy';
import { resetDatabase, testPrisma } from '../helpers/test-db';

const describeIfRealDB =
  process.env.VITEST_USE_REAL_DB === '1' || process.env.CI ? describe : describe.skip;

describeIfRealDB('SLA aggregation threshold parity', { timeout: 60_000 }, () => {
  beforeEach(async () => {
    await resetDatabase();
    clearRetentionPolicyCache();
  });

  afterAll(async () => {
    await testPrisma.$disconnect();
  });

  it('returns identical pause-aware MTTA below and above the SQL threshold', async () => {
    const service = await testPrisma.service.create({
      data: { name: `SLA parity ${crypto.randomUUID()}` },
    });
    const createdAt = new Date(Date.now() - 60 * 60_000);
    const acknowledgedAt = new Date(createdAt.getTime() + 30 * 60_000);
    const pauseStartedAt = new Date(createdAt.getTime() + 5 * 60_000);
    const pauseEndedAt = new Date(createdAt.getTime() + 15 * 60_000);

    const insertIncidents = async (start: number, count: number) => {
      const ids = Array.from(
        { length: count },
        (_, offset) => `sla-parity-${start + offset}-${crypto.randomUUID()}`
      );
      await testPrisma.incident.createMany({
        data: ids.map(id => ({
          id,
          title: 'SLA aggregation parity',
          serviceId: service.id,
          status: 'ACKNOWLEDGED',
          priority: 'P2',
          createdAt,
          acknowledgedAt,
          slaAckElapsedMs: BigInt(20 * 60_000),
        })),
      });
      await testPrisma.incidentSlaPause.createMany({
        data: ids.flatMap(incidentId => [
          { incidentId, startedAt: pauseStartedAt, endedAt: pauseEndedAt },
          // Deliberately overlaps the first interval. Both TS and SQL must
          // subtract the interval union (10 minutes), not the row sum (15).
          {
            incidentId,
            startedAt: new Date(createdAt.getTime() + 7 * 60_000),
            endedAt: new Date(createdAt.getTime() + 12 * 60_000),
          },
        ]),
      });
    };

    await insertIncidents(0, 499);
    const filters = {
      serviceId: service.id,
      startDate: new Date(createdAt.getTime() - 1),
      endDate: new Date(),
      userTimeZone: 'UTC',
      _forceLive: true,
    } as const;
    const belowThreshold = await calculateSLAMetrics(filters);

    await insertIncidents(499, 2);
    const aboveThreshold = await calculateSLAMetrics(filters);

    expect(belowThreshold.totalIncidents).toBe(499);
    expect(aboveThreshold.totalIncidents).toBe(501);
    expect(belowThreshold.mttd).toBeCloseTo(20, 8);
    expect(aboveThreshold.mttd).toBeCloseTo(belowThreshold.mttd ?? 0, 8);
    expect(aboveThreshold.ackRate).toBe(belowThreshold.ackRate);
  });

  it('keeps resolved-without-ACK compliance identical across projector, live, compatibility, and rollup engines', async () => {
    const service = await testPrisma.service.create({
      data: { name: `SLA semantic parity ${crypto.randomUUID()}` },
    });
    const createdAt = new Date();
    createdAt.setUTCDate(createdAt.getUTCDate() - 1);
    createdAt.setUTCHours(12, 0, 0, 0);
    const resolvedAt = new Date(createdAt.getTime() + 60_000);
    const incident = await testPrisma.incident.create({
      data: {
        title: 'Resolved without acknowledgement',
        serviceId: service.id,
        status: 'RESOLVED',
        createdAt,
        resolvedAt,
      },
    });
    const stored = await testPrisma.incident.findUniqueOrThrow({ where: { id: incident.id } });
    const projected = projectIncidentSlaState(stored, { now: resolvedAt });
    const live = await calculateSLAMetrics({
      serviceId: service.id,
      startDate: new Date(createdAt.getTime() - 1),
      endDate: new Date(resolvedAt.getTime() + 1),
      userTimeZone: 'UTC',
      _forceLive: true,
    });
    const compatible = await checkIncidentSLA(incident.id);

    await generateDailyRollup(createdAt, service.id);
    const historical = await queryRollupMetrics(createdAt, createdAt, {
      serviceId: service.id,
    });

    expect(projected.valid && projected.ack.status).toBe('BREACHED');
    expect(live.ackCompliance).toBe(0);
    expect(compatible.ackSLA.breached).toBe(true);
    expect(historical.ackCompliance).toBe(0);
  });
});
