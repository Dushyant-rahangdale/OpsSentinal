import fs from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('status-page administration isolation contract', () => {
  it('never provisions a page while rendering settings and remounts editors by page identity', () => {
    const legacy = fs.readFileSync('src/app/(app)/settings/status-page/page.tsx', 'utf8');
    const workspace = fs.readFileSync(
      'src/app/(app)/settings/status-pages/[pageId]/page.tsx',
      'utf8'
    );
    expect(legacy).not.toContain('prisma.statusPage.create(');
    expect(legacy).toContain("'/settings/status-pages'");
    expect(workspace).toContain('key={statusPage.id}');
  });

  it('requires explicit page identity for every legacy settings update', () => {
    const route = fs.readFileSync('src/app/api/settings/status-page/route.ts', 'utf8');
    const email = fs.readFileSync('src/components/status-page/StatusPageEmailConfig.tsx', 'utf8');
    expect(route).toContain('if (!id)');
    expect(route).not.toContain(': await prisma.statusPage.findFirst');
    expect(email).toContain('id: statusPageId');
  });

  it('binds child mutations to both page and resource identity', () => {
    const webhooks = fs.readFileSync('src/app/api/status-page/webhooks/route.ts', 'utf8');
    const subscribers = fs.readFileSync('src/app/api/status-page/subscribers/route.ts', 'utf8');
    const announcements = fs.readFileSync(
      'src/app/api/settings/status-page/announcements/route.ts',
      'utf8'
    );
    const tokens = fs.readFileSync('src/app/api/settings/status-page/api-tokens/route.ts', 'utf8');
    expect(webhooks).toContain('where: { id, statusPageId }');
    expect(subscribers).toContain('where: { id: subscriptionId, statusPageId }');
    expect(announcements).toContain('where: { id, statusPageId }');
    expect(tokens).toContain('where: { id, statusPageId }');
  });

  it('serializes and fences the default-page lifecycle', () => {
    const service = fs.readFileSync('src/lib/status-pages/admin.ts', 'utf8');
    const migration = fs.readFileSync(
      'prisma/migrations/20260906220000_status_page_default_invariant/migration.sql',
      'utf8'
    );
    expect(service).toContain('pg_advisory_xact_lock');
    expect(service).toContain('STATUS_PAGE_DEFAULT_REPLACEMENT_REQUIRED');
    expect(migration).toContain('StatusPage_single_default_idx');
    expect(migration).toContain('WHERE "isDefault" = true');
  });

  it('cancels stale page-owned resource requests after navigation', () => {
    const subscribers = fs.readFileSync(
      'src/components/status-page/StatusPageSubscribers.tsx',
      'utf8'
    );
    const webhooks = fs.readFileSync(
      'src/components/status-page/StatusPageWebhooksSettings.tsx',
      'utf8'
    );
    for (const source of [subscribers, webhooks]) {
      expect(source).toContain('new AbortController()');
      expect(source).toContain('controller.abort()');
    }
  });

  it('executes custom CSS only inside an isolated preview root', () => {
    const preview = fs.readFileSync('src/components/status-page/StatusPageLivePreview.tsx', 'utf8');
    expect(preview).toContain("attachShadow({ mode: 'open' })");
    expect(preview).toContain('createPortal(');
    expect(preview.indexOf('dangerouslySetInnerHTML')).toBeGreaterThan(
      preview.indexOf('createPortal(')
    );
  });
});
