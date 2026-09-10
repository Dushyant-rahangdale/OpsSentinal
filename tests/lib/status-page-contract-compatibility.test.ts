import { describe, expect, it } from 'vitest';
import { parsePublicStatusPageSnapshot } from '@/lib/status-pages/public-contract-schema';

const iso = '2026-09-10T00:00:00.000Z';

/** The smallest snapshot that must always remain parseable ΓÇö the frozen V3 required core. */
function minimal(overrides: Record<string, unknown> = {}) {
  return {
    schemaVersion: 3,
    pageId: 'page-1',
    revision: '1',
    generatedAt: iso,
    page: {
      id: 'page-1',
      name: 'Status',
      showSubscribe: true,
      showServicesByRegion: false,
      showRegionHeatmap: true,
      showPostIncidentReview: true,
      showChangelog: true,
      enableUptimeExports: false,
      isDefault: true,
      requireAuth: false,
      enabled: true,
      statusApiRequireToken: false,
      statusApiRateLimitEnabled: false,
      statusApiRateLimitMax: 120,
      statusApiRateLimitWindowSec: 60,
    },
    status: 'OPERATIONAL',
    services: [],
    regions: [],
    incidents: [],
    announcements: [],
    historyDays: 90,
    ...overrides,
  };
}

describe('V3 contract evolution policy', () => {
  it('keeps the frozen required core parseable and derives overall when absent', () => {
    const snapshot = parsePublicStatusPageSnapshot('page-1', minimal());
    expect(snapshot?.schemaVersion).toBe(3);
    expect(snapshot?.overall.status).toBe('OPERATIONAL');
  });

  it('accepts every additive optional section a newer projector may emit', () => {
    const snapshot = parsePublicStatusPageSnapshot(
      'page-1',
      minimal({
        maintenance: [{ id: 'm1', title: 'DB', state: 'IN_PROGRESS', startAt: iso, endAt: null }],
        changelog: [{ id: 'c1', title: 'v2', message: 'ship', publishedAt: iso }],
        retention: {
          requestedHistoryDays: 90,
          availableHistoryDays: 12,
          rangeStart: iso,
          rangeEnd: iso,
          coverage: 'PARTIAL',
        },
        freshness: { generatedAt: iso, revision: '1' },
      })
    );
    expect(snapshot?.maintenance).toHaveLength(1);
    expect(snapshot?.retention?.availableHistoryDays).toBe(12);
  });

  it('rejects an unknown top-level key so additive-only stays enforced at the boundary', () => {
    expect(parsePublicStatusPageSnapshot('page-1', minimal({ somethingNew: true }))).toBeNull();
  });

  it('rejects a payload whose pageId does not match the requested page', () => {
    expect(parsePublicStatusPageSnapshot('other-page', minimal())).toBeNull();
  });
});
