import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Enforces the settings Γåö V3 contract boundary so the admin surface can never drift from what the
 * public page actually renders.
 *
 * Two failures this guards against:
 *  1. An internal-only concept (custom fields, assignees) silently leaking into a public surface.
 *  2. A public disclosure toggle quietly losing its wiring, so flipping it in settings stops
 *     affecting the published payload.
 */
const root = process.cwd();
const read = (relativePath: string) => readFileSync(join(root, relativePath), 'utf8');

// Settings that exist in the admin/DB but are deliberately NOT part of the public V3 contract.
const INTERNAL_ONLY =
  /showCustomFields|showIncidentAssignees|allowedCustomFields|customField|assignee/i;

const PUBLIC_PROJECTOR_FILES = [
  'src/lib/status-pages/snapshot.ts',
  'src/lib/status-page-public-data.ts',
  'src/lib/status-pages/presentation.ts',
  'src/lib/status-pages/event-projection.ts',
];

describe('status-page settings Γåö V3 parity', () => {
  it.each(PUBLIC_PROJECTOR_FILES)('%s never exposes internal-only settings publicly', file => {
    expect(INTERNAL_ONLY.test(read(file))).toBe(false);
  });

  it('keeps every public disclosure flag wired into the incident serializer', () => {
    const source = read('src/lib/status-page-public-data.ts');
    for (const flag of [
      'showIncidents',
      'showRecentIncidents',
      'showServiceMetrics',
      'showUptimeHistory',
      'showServiceSlaTier',
      'showTeamInformation',
      'showServiceOwners',
      'showIncidentDetails',
      'showIncidentTitles',
      'showIncidentDescriptions',
      'showAffectedServices',
      'showIncidentTimestamps',
      'showIncidentUrgency',
      'showPostIncidentReview',
    ]) {
      expect(source.includes(flag), `publicStatusVisibility must consume ${flag}`).toBe(true);
    }
  });

  it('keeps every page-level toggle wired into the projector', () => {
    const source = read('src/lib/status-pages/snapshot.ts');
    for (const flag of [
      'showServiceDescriptions',
      'showServiceRegions',
      'showAffectedServices',
      'showChangelog',
      'showPostIncidentReview',
      'enableUptimeExports',
      'uptimeExcellentThreshold',
      'uptimeGoodThreshold',
      'showSubscribe',
    ]) {
      expect(source.includes(flag), `projector must consume ${flag}`).toBe(true);
    }
  });
});
