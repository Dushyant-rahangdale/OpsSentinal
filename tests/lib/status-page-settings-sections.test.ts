import { describe, expect, it } from 'vitest';
import { statusPageSectionPatch } from '@/lib/status-pages/settings-sections';

describe('status page section mutation boundaries', () => {
  it('prevents an appearance save from carrying access or service changes', () => {
    expect(
      statusPageSectionPatch('appearance', {
        id: 'page',
        expectedUpdatedAt: '2026-09-07T00:00:00.000Z',
        branding: { primaryColor: '#000000' },
        requireAuth: false,
        serviceIds: ['internal'],
      })
    ).toEqual({
      id: 'page',
      expectedUpdatedAt: '2026-09-07T00:00:00.000Z',
      branding: { primaryColor: '#000000' },
    });
  });

  it('rejects sections that own their own independent controls', () => {
    expect(() => statusPageSectionPatch('subscribers', {})).toThrow();
  });
});
