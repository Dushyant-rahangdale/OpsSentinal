import fs from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('status platform migration safety', () => {
  it('builds indexes on existing hot tables without blocking writes', () => {
    const migration = fs.readFileSync(
      'prisma/migrations/20260909173000_status_platform_enterprise_contract/migration.sql',
      'utf8'
    );

    expect(migration).toContain(
      'CREATE INDEX CONCURRENTLY "idx_notification_tenant_fair_delivery"'
    );
    expect(migration).toContain(
      'CREATE INDEX CONCURRENTLY "StatusPageSubscription_statusPageId_state_idx"'
    );
  });
});
