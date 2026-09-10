import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * The V3 UI must stay presentation-only: if a status/uptime/severity calculation ever creeps back
 * into these components, the frontend has quietly become a second status engine. This fails the
 * build before that can happen.
 */
const V3_DIR = join(process.cwd(), 'src/components/status-page/v3');

// Domain calculations that belong in the projector, never in React.
const FORBIDDEN: RegExp[] = [
  /calculate[A-Z]/,
  /deriveStatus|deriveOverall|convertUrgency|fabricate/i,
  /urgency\s*===|severity\s*===/i,
  /getWorstPublicStatus|worstKnownPublicStatus|publicStatusForIncidentUrgency|deriveOverallPublicHealth/,
  /\bprisma\b|@prisma\/client|buildStatusPageSnapshot/,
];

describe('V3 status UI has no second status engine', () => {
  const files = readdirSync(V3_DIR).filter(name => name.endsWith('.tsx'));

  it('ships at least the composed V3 surface', () => {
    expect(files).toContain('StatusPageV3.tsx');
    expect(files.length).toBeGreaterThanOrEqual(6);
  });

  it.each(files)('%s contains only presentation, no domain calculation', file => {
    const source = readFileSync(join(V3_DIR, file), 'utf8');
    for (const pattern of FORBIDDEN) {
      expect(pattern.test(source), `${file} must not contain ${pattern}`).toBe(false);
    }
  });
});
