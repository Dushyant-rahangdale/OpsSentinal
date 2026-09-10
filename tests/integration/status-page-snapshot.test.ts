import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  testPrisma,
  resetDatabase,
  createTestStatusPage,
  createTestService,
  linkServiceToStatusPage,
  createTestIncident,
} from '../helpers/test-db';
import {
  getStatusPageSnapshot,
  rebuildStatusPageSnapshot,
  readStatusPageSnapshot,
} from '@/lib/status-pages/snapshot';

vi.mock('@/lib/sla-server', () => ({ calculateMultiServiceUptime: vi.fn().mockResolvedValue({}) }));
import { calculateMultiServiceUptime } from '@/lib/sla-server';

describe('durable status page projections', () => {
  beforeEach(resetDatabase);

  it('creates a dirty projection with the page and publishes no unmapped service', async () => {
    const page = await createTestStatusPage({ enabled: true });
    await createTestService('Internal');
    expect(await rebuildStatusPageSnapshot(page.id)).toBe(true);
    expect((await readStatusPageSnapshot(page.id))?.services).toEqual([]);
  });

  it('invalidates on source mutations and excludes internal incidents', async () => {
    const page = await createTestStatusPage({ enabled: true, showMetrics: false });
    const service = await createTestService('API');
    await linkServiceToStatusPage(page.id, service.id);
    await rebuildStatusPageSnapshot(page.id);
    const before = await readStatusPageSnapshot(page.id);
    await createTestIncident('Internal-only failure', service.id, { visibility: 'PRIVATE' });
    const rows = await testPrisma.$queryRaw<
      Array<{ revision: bigint; publishedRevision: bigint }>
    >`SELECT "revision", "publishedRevision" FROM "StatusPageSnapshot" WHERE "statusPageId" = ${page.id}`;
    expect(rows[0].revision).toBeGreaterThan(rows[0].publishedRevision);
    await rebuildStatusPageSnapshot(page.id);
    const after = await readStatusPageSnapshot(page.id);
    expect(after?.revision).not.toBe(before?.revision);
    expect(JSON.stringify(after)).not.toContain('Internal-only failure');
  });

  it('fails closed when a privacy-tightening rebuild is lock-contended', async () => {
    const page = await createTestStatusPage({ enabled: true });
    const service = await createTestService('API');
    await linkServiceToStatusPage(page.id, service.id);
    const incident = await createTestIncident('Public failure', service.id, {
      visibility: 'PUBLIC',
    });
    await rebuildStatusPageSnapshot(page.id);
    expect(JSON.stringify(await readStatusPageSnapshot(page.id))).toContain('Public failure');

    await testPrisma.incident.update({
      where: { id: incident.id },
      data: { visibility: 'PRIVATE' },
    });

    await testPrisma.$transaction(async tx => {
      const lock = await tx.$queryRaw<Array<{ acquired: boolean }>>`
        SELECT pg_try_advisory_xact_lock(hashtextextended(${`status-snapshot:${page.id}`}, 0)) AS acquired
      `;
      expect(lock[0]?.acquired).toBe(true);
      const projected = await getStatusPageSnapshot(page.id);
      expect(projected).toEqual({ snapshot: null, stale: true, servingState: 'FAIL_CLOSED' });
    });

    expect(JSON.stringify(await readStatusPageSnapshot(page.id))).toContain('Public failure');
  });

  it('fails closed when a privacy-tightening rebuild throws', async () => {
    const page = await createTestStatusPage({
      enabled: true,
      showMetrics: true,
      showServiceMetrics: true,
      showUptimeHistory: true,
    });
    const service = await createTestService('API');
    await linkServiceToStatusPage(page.id, service.id);
    const incident = await createTestIncident('Sensitive failure', service.id, {
      visibility: 'PUBLIC',
    });
    await rebuildStatusPageSnapshot(page.id);
    await testPrisma.incident.update({
      where: { id: incident.id },
      data: { visibility: 'PRIVATE' },
    });
    vi.mocked(calculateMultiServiceUptime).mockRejectedValueOnce(
      new Error('projection unavailable')
    );

    expect(await getStatusPageSnapshot(page.id)).toEqual({
      snapshot: null,
      stale: true,
      servingState: 'FAIL_CLOSED',
    });
    expect(JSON.stringify(await readStatusPageSnapshot(page.id))).toContain('Sensitive failure');
  });
});
