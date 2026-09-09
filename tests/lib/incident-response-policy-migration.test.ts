import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const migration = readFileSync(
  join(process.cwd(), 'prisma/migrations/20260908120000_incident_response_policy_v2/migration.sql'),
  'utf8'
);

describe('incident response policy v2 migration contract', () => {
  it('allocates published policy versions above sealed and draft rows', () => {
    expect(migration).toContain('ORDER BY "version" DESC LIMIT 1');
    expect(migration).toContain('COALESCE(MAX("version"), 0) + 1');
    expect(migration).toContain('MAX("version") + 1 AS "version"');
    expect(migration).toContain('COALESCE(existing."ackTargetMs", defaults.ack_ms)');
    expect(migration).toContain('FROM latest l JOIN next_versions n USING ("scopeKey")');
  });

  it('preserves historical severity-to-urgency behavior without auto-prioritizing alerts', () => {
    expect(migration).toContain("'critical',NULL,'HIGH'");
    expect(migration).toContain("'error',NULL,'MEDIUM'");
    expect(migration).toContain("'warning',NULL,'MEDIUM'");
    expect(migration).toContain("'info',NULL,'LOW'");
    expect(migration).toContain('incident_classification_scope CHECK ("scopeKey" = \'workspace\')');
  });
});
