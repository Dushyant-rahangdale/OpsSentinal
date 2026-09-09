import { describe, expect, it } from 'vitest';
import { PUBLIC_SERVICE_STATUSES } from '@/lib/status-pages/public-contract';
import { legacyPublicStatus } from '@/lib/status-pages/status-presentation';

describe('legacyPublicStatus', () => {
  it('folds both outage severities onto the old single value', () => {
    expect(legacyPublicStatus('PARTIAL_OUTAGE')).toBe('outage');
    expect(legacyPublicStatus('MAJOR_OUTAGE')).toBe('outage');
  });

  it('never reports an unverifiable service as healthy', () => {
    // An integrator switching on the old vocabulary must not read "we cannot verify this" as
    // operational; degraded is the closest honest value it understands.
    expect(legacyPublicStatus('UNKNOWN')).toBe('degraded');
  });

  it('passes through the values that already existed', () => {
    expect(legacyPublicStatus('OPERATIONAL')).toBe('operational');
    expect(legacyPublicStatus('DEGRADED')).toBe('degraded');
    expect(legacyPublicStatus('MAINTENANCE')).toBe('maintenance');
  });

  it('maps every canonical status into the old vocabulary', () => {
    const legacy = new Set(['operational', 'degraded', 'maintenance', 'outage']);
    for (const status of PUBLIC_SERVICE_STATUSES) {
      expect(legacy.has(legacyPublicStatus(status))).toBe(true);
    }
  });
});
