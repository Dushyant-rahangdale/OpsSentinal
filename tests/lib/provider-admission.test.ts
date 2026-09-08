import { beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({
  transaction: vi.fn(),
  executeRaw: vi.fn(),
  findUnique: vi.fn(),
  upsert: vi.fn(),
  update: vi.fn(),
  queryRaw: vi.fn(),
  deleteMany: vi.fn(),
}));
vi.mock('@/lib/prisma', () => ({
  __esModule: true,
  default: {
    $transaction: mocks.transaction,
    $executeRaw: mocks.executeRaw,
    $queryRaw: mocks.queryRaw,
    rateLimit: { deleteMany: mocks.deleteMany, findUnique: mocks.findUnique },
  },
}));
import {
  acquireProviderAdmission,
  acquireProviderConcurrency,
  deferProviderAdmission,
  releaseProviderConcurrency,
  resetProviderAdmissionForTests,
} from '@/lib/provider-admission';
describe('provider admission control', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetProviderAdmissionForTests();
  });
  it('opens a new distributed provider window', async () => {
    mocks.queryRaw.mockResolvedValue([{ granted: 8 }]);
    const now = new Date('2026-08-30T12:00:00.000Z');
    await expect(acquireProviderAdmission('EMAIL', 'default', now)).resolves.toEqual({
      allowed: true,
    });
    const query = mocks.queryRaw.mock.calls[0]?.[0] as { strings?: string[] };
    expect(query.strings?.join('?')).toContain('ProviderQuotaWindow');
    expect(query.strings?.join('?')).toContain('capacity.granted');
  });
  it('defers without consuming a provider request when the shared budget is full', async () => {
    const expiresAt = new Date('2026-08-30T12:00:01.500Z');
    mocks.queryRaw.mockResolvedValue([]);
    mocks.findUnique.mockResolvedValue({ key: 'provider:email:default', count: 8, expiresAt });
    await expect(
      acquireProviderAdmission('EMAIL', 'default', new Date('2026-08-30T12:00:00.500Z'))
    ).resolves.toEqual({
      allowed: false,
      retryAt: new Date('2026-08-30T12:00:01.000Z'),
      reason: 'RATE_LIMITED',
    });
    expect(mocks.queryRaw).toHaveBeenCalledTimes(1);
  });

  it('persists provider cooldowns monotonically', async () => {
    await deferProviderAdmission('SLACK', 'channel:C123', new Date('2026-08-30T12:01:00.000Z'));

    const query = mocks.executeRaw.mock.calls[0]?.[0] as { strings?: string[] };
    expect(query.strings?.join('?')).toContain('GREATEST');
    expect(query.strings?.join('?')).toContain('expiresAt');
  });

  it('claims and releases a distributed provider concurrency slot', async () => {
    mocks.queryRaw.mockResolvedValue([{ reservedSlots: 20 }]);
    const admission = await acquireProviderConcurrency('EMAIL', 'default');
    expect(admission.allowed).toBe(true);
    if (admission.allowed) await releaseProviderConcurrency(admission.leaseKey);
  });
});
