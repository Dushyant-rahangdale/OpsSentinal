import fs from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('status platform migration safety', () => {
  it('keeps concurrent index creation outside the transactional migration', () => {
    const migration = fs.readFileSync(
      'prisma/migrations/20260909173000_status_platform_enterprise_contract/migration.sql',
      'utf8'
    );
    const onlineInstaller = fs.readFileSync(
      'scripts/create-status-platform-online-indexes.cjs',
      'utf8'
    );

    expect(migration).not.toContain('CREATE INDEX CONCURRENTLY');
    expect(onlineInstaller).toContain(
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_notification_tenant_fair_delivery"'
    );
    expect(onlineInstaller).toContain(
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS "StatusPageSubscription_statusPageId_state_idx"'
    );
  });
});
