import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const read = (file: string) => fs.readFileSync(path.join(root, file), 'utf8');

describe('status-page administration isolation contract', () => {
  it('never provisions a page while rendering settings and remounts editors by page identity', () => {
    const legacy = read('src/app/(app)/settings/status-page/page.tsx');
    const workspace = read('src/app/(app)/settings/status-pages/[pageId]/page.tsx');
    expect(legacy).not.toContain('prisma.statusPage.create(');
    expect(legacy).toContain("'/settings/status-pages'");
    expect(workspace).toContain('key={statusPage.id}');
  });

  it('requires explicit page identity for every legacy settings update', () => {
    const route = read('src/app/api/settings/status-page/route.ts');
    const email = read('src/components/status-page/StatusPageEmailConfig.tsx');
    expect(route).toContain('if (!id)');
    expect(route).not.toContain(': await prisma.statusPage.findFirst');
    expect(email).toContain('id: statusPageId');
  });

  it('binds child mutations to both page and resource identity', () => {
    const webhooks = read('src/app/api/status-page/webhooks/route.ts');
    const subscribers = read('src/app/api/status-page/subscribers/route.ts');
    const announcements = read('src/app/api/settings/status-page/announcements/route.ts');
    const tokens = read('src/app/api/settings/status-page/api-tokens/route.ts');
    expect(webhooks).toContain('where: { id, statusPageId }');
    expect(subscribers).toContain('where: { id: subscriptionId, statusPageId }');
    expect(announcements).toContain('where: { id, statusPageId }');
    expect(tokens).toContain('where: { id, statusPageId }');
  });

  it('serializes and fences the default-page lifecycle', () => {
    const service = read('src/lib/status-pages/admin.ts');
    const migration = read(
      'prisma/migrations/20260906220000_status_page_default_invariant/migration.sql'
    );
    expect(service).toContain('pg_advisory_xact_lock');
    expect(service).toContain('STATUS_PAGE_DEFAULT_REPLACEMENT_REQUIRED');
    expect(migration).toContain('StatusPage_single_default_idx');
    expect(migration).toContain('WHERE "isDefault" = true');
  });

  it('cancels stale page-owned resource requests after navigation', () => {
    for (const file of [
      'src/components/status-page/StatusPageSubscribers.tsx',
      'src/components/status-page/StatusPageWebhooksSettings.tsx',
    ]) {
      const source = read(file);
      expect(source).toContain('new AbortController()');
      expect(source).toContain('controller.abort()');
    }
  });

  it('executes custom CSS only inside an isolated preview root', () => {
    const preview = read('src/components/status-page/StatusPageLivePreview.tsx');
    expect(preview).toContain("attachShadow({ mode: 'open' })");
    expect(preview).toContain('createPortal(');
    expect(preview.indexOf('dangerouslySetInnerHTML')).toBeGreaterThan(
      preview.indexOf('createPortal(')
    );
  });
});
