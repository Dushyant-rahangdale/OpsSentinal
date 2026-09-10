import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

const runIntegration = Boolean(process.env.VITEST_USE_REAL_DB);
const describeIntegration =
  process.env.VITEST_USE_REAL_DB === '1' || process.env.CI ? describe : describe.skip;

import { resetDatabase, testPrisma } from '../helpers/test-db';

let ensureBootstrapAuthorization: typeof import('@/lib/bootstrap-security').ensureBootstrapAuthorization;
let parseBootstrapState: typeof import('@/lib/bootstrap-security').parseBootstrapState;
let BOOTSTRAP_CONFIG_KEY: typeof import('@/lib/bootstrap-security').BOOTSTRAP_CONFIG_KEY;

describeIntegration('Bootstrap authorization integration', () => {
  beforeAll(async () => {
    if (!runIntegration) return;
    vi.unmock('@/lib/prisma');
    vi.resetModules();
    ({
      ensureBootstrapAuthorization,
      parseBootstrapState,
      BOOTSTRAP_CONFIG_KEY,
    } = await import('@/lib/bootstrap-security'));
  });

  beforeEach(async () => {
    if (!runIntegration) return;
    await resetDatabase();
  });

  afterAll(async () => {
    await testPrisma.$disconnect();
  });

  it('converges concurrent replicas on exactly one live capability', async () => {
    if (!runIntegration) return;

    const stderr = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
    try {
      const results = await Promise.all(
        Array.from({ length: 20 }, () => ensureBootstrapAuthorization())
      );

      const rows = await testPrisma.systemConfig.findMany({
        where: { key: BOOTSTRAP_CONFIG_KEY },
        select: { value: true },
      });
      expect(rows).toHaveLength(1);

      const state = parseBootstrapState(rows[0]?.value);
      expect(state).not.toBeNull();
      expect(state?.usedAt).toBeNull();
      expect(state?.generation).toBe(1);
      expect(new Date(state!.expiresAt).getTime()).toBeGreaterThan(Date.now());

      const expiries = new Set(results.map(result => result.expiresAt.toISOString()));
      expect(expiries).toEqual(new Set([state!.expiresAt]));

      // Only the transaction that actually persisted the capability may emit it.
      const issued = stderr.mock.calls.filter(call =>
        String(call[0]).includes('[OpsKnight setup] One-time authorization code')
      );
      expect(issued).toHaveLength(1);
    } finally {
      stderr.mockRestore();
    }
  });
});
