import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  testPrisma,
  resetDatabase,
  createTestStatusPage,
  createTestService,
  linkServiceToStatusPage,
  createTestIncident,
} from '../helpers/test-db';
import { rebuildStatusPageSnapshot, readStatusPageSnapshot } from '@/lib/status-pages/snapshot';

vi.mock('@/lib/sla-server', () => ({ calculateMultiServiceUptime: vi.fn().mockResolvedValue({}) }));

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
});
