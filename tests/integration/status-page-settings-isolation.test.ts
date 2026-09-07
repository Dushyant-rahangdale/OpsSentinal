import { beforeEach, describe, expect, it, vi } from 'vitest';
import { POST } from '@/app/api/settings/status-page/route';
import {
  createTestService,
  createTestStatusPage,
  createTestUser,
  resetDatabase,
  testPrisma,
} from '../helpers/test-db';

const describeIfRealDB =
  process.env.VITEST_USE_REAL_DB === '1' || process.env.CI ? describe : describe.skip;

vi.mock('next-auth', () => ({ getServerSession: vi.fn() }));
vi.mock('@/lib/auth', () => ({ getAuthOptions: vi.fn() }));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
    child: vi.fn().mockReturnThis(),
  },
}));

import { getServerSession } from 'next-auth';

const settingsSelect = {
  enabled: true,
  showSubscribe: true,
  customDomain: true,
  subdomain: true,
  footerText: true,
  contactEmail: true,
  emailProvider: true,
  branding: true,
  privacyMode: true,
  showIncidentTitles: true,
  statusApiRequireToken: true,
  statusApiRateLimitEnabled: true,
} as const;

describeIfRealDB('status-page settings isolation', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    await resetDatabase();
    const admin = await createTestUser({ email: 'status-admin@example.com', role: 'ADMIN' });
    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: admin.id, email: admin.email, role: 'ADMIN', tokenVersion: 0 },
    } as never);
  });

  it('preserves omitted settings and isolates every settings section to the selected page', async () => {
    const pageA = await createTestStatusPage({
      name: 'Status Page A',
      enabled: true,
      showSubscribe: true,
      customDomain: 'status-a.example.com',
      subdomain: 'status-a',
      footerText: 'Page A footer',
      contactEmail: 'a@example.com',
      emailProvider: 'smtp',
      branding: { primaryColor: '#ff0000' },
      privacyMode: 'PUBLIC',
      showIncidentTitles: true,
      statusApiRequireToken: false,
      statusApiRateLimitEnabled: false,
    });
    const pageB = await createTestStatusPage({
      name: 'Status Page B',
      enabled: false,
      showSubscribe: false,
      customDomain: 'status-b.example.com',
      subdomain: 'status-b',
      footerText: 'Page B footer',
      contactEmail: 'b@example.com',
      emailProvider: 'smtp',
      branding: { primaryColor: '#0000ff' },
      privacyMode: 'PUBLIC',
      showIncidentTitles: true,
      statusApiRequireToken: false,
      statusApiRateLimitEnabled: false,
    });
    const serviceA = await createTestService('Payments');
    const serviceB = await createTestService('Platform');
    await testPrisma.statusPageService.create({
      data: { statusPageId: pageA.id, serviceId: serviceA.id },
    });

    const originalA = await testPrisma.statusPage.findUniqueOrThrow({
      where: { id: pageA.id },
      select: settingsSelect,
    });
    let expectedB = await testPrisma.statusPage.findUniqueOrThrow({
      where: { id: pageB.id },
      select: settingsSelect,
    });

    const patchAndAssert = async (patch: Record<string, unknown>) => {
      const response = await POST(
        new Request('http://localhost/api/settings/status-page', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ id: pageB.id, ...patch }),
        }) as never
      );
      expect(response.status).toBe(200);
      expectedB = { ...expectedB, ...patch } as typeof expectedB;
      expect(
        await testPrisma.statusPage.findUniqueOrThrow({
          where: { id: pageB.id },
          select: settingsSelect,
        })
      ).toEqual(expectedB);
      expect(
        await testPrisma.statusPage.findUniqueOrThrow({
          where: { id: pageA.id },
          select: settingsSelect,
        })
      ).toEqual(originalA);
    };

    await patchAndAssert({ emailProvider: 'ses' });
    await patchAndAssert({ branding: { primaryColor: '#00ff00' } });
    await patchAndAssert({ privacyMode: 'PRIVATE', showIncidentTitles: false });
    await patchAndAssert({ statusApiRequireToken: true, statusApiRateLimitEnabled: true });
    await patchAndAssert({ customDomain: 'new-status-b.example.com', subdomain: 'new-status-b' });
    await patchAndAssert({ showSubscribe: true });

    const serviceResponse = await POST(
      new Request('http://localhost/api/settings/status-page', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ id: pageB.id, serviceIds: [serviceB.id] }),
      }) as never
    );
    expect(serviceResponse.status).toBe(200);
    expect(
      await testPrisma.statusPage.findUniqueOrThrow({
        where: { id: pageB.id },
        select: settingsSelect,
      })
    ).toEqual(expectedB);
    expect(
      await testPrisma.statusPage.findUniqueOrThrow({
        where: { id: pageA.id },
        select: settingsSelect,
      })
    ).toEqual(originalA);
    expect(
      await testPrisma.statusPageService.findMany({
        where: { statusPageId: pageA.id },
        select: { serviceId: true },
      })
    ).toEqual([{ serviceId: serviceA.id }]);
    expect(
      await testPrisma.statusPageService.findMany({
        where: { statusPageId: pageB.id },
        select: { serviceId: true },
      })
    ).toEqual([{ serviceId: serviceB.id }]);
  });

  it('clears nullable text only when the field is explicitly submitted', async () => {
    const page = await createTestStatusPage({
      footerText: 'Keep me',
      contactEmail: 'status@example.com',
      customDomain: 'status.example.com',
    });

    const response = await POST(
      new Request('http://localhost/api/settings/status-page', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ id: page.id, footerText: '', contactEmail: '' }),
      }) as never
    );
    expect(response.status).toBe(200);

    expect(
      await testPrisma.statusPage.findUniqueOrThrow({
        where: { id: page.id },
        select: { footerText: true, contactEmail: true, customDomain: true },
      })
    ).toEqual({ footerText: null, contactEmail: null, customDomain: 'status.example.com' });
  });
});
