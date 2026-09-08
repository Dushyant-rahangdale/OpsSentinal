import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const migration = readFileSync(
  join(
    process.cwd(),
    'prisma/migrations/20260908120000_incident_response_policy_v2/migration.sql'
  ),
  'utf8'
);

describe('incident response policy v2 migration contract', () => {
  it('allocates the workspace SLA version from the latest sealed policy', () => {
    expect(migration).toContain('ORDER BY "version" DESC LIMIT 1');
    expect(migration).toContain('l."version" + 1');
    expect(migration).toContain('COALESCE(existing."ackTargetMs", defaults.ack_ms)');
    expect(migration).not.toContain("VALUES ('incident-sla-workspace-v2','workspace',2");
  });

  it('preserves historical severity-to-urgency behavior without auto-prioritizing alerts', () => {
    expect(migration).toContain("'critical',NULL,'HIGH'");
    expect(migration).toContain("'error',NULL,'MEDIUM'");
    expect(migration).toContain("'warning',NULL,'MEDIUM'");
    expect(migration).toContain("'info',NULL,'LOW'");
    expect(migration).toContain("incident_classification_scope CHECK (\"scopeKey\" = 'workspace')");
  });
});
