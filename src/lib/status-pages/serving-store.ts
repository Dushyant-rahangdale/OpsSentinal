import 'server-only';
import type { Prisma } from '@prisma/client';
import prisma from '@/lib/prisma';
import {
  addOperationalMetric,
  observeOperationalHistogram,
} from '@/lib/metrics/operational/registry';
import { scalingFeatureEnabled } from '@/lib/scaling-feature-flags';
import { createHash } from 'node:crypto';
import { z } from 'zod';
import { logger } from '@/lib/logger';

export interface StatusServingManifest {
  pageId: string;
  revision: string;
  enabled: boolean;
  revoked: boolean;
  snapshotKey: string;
  publishedAt: string;
  schemaVersion: number;
  integrityHash: string;
}

export interface StatusServingRoute {
  pageId: string;
  slug: string | null;
  requireAuth: boolean;
  revision: string;
}

function isSafeStatusSlug(value: string): boolean {
  return (
    value.length > 0 &&
    value.length <= 128 &&
    value.split('-').every(part => part.length > 0 && /^[a-z0-9]+$/.test(part))
  );
}

const routeSchema = z.object({
  pageId: z.string().min(1).max(128).regex(/^[A-Za-z0-9_-]+$/),
  slug: z.string().refine(isSafeStatusSlug).nullable(),
  requireAuth: z.boolean(),
  revision: z.string().min(1).max(128).regex(/^[A-Za-z0-9._:-]+$/),
}).strict();

const manifestSchema = z.object({
  pageId: z.string(), revision: z.string(), enabled: z.boolean(), revoked: z.boolean(),
  snapshotKey: z.string(), publishedAt: z.string().datetime({ offset: true }),
  schemaVersion: z.number().int().positive(), integrityHash: z.string().regex(/^[a-f0-9]{64}$/),
});

export function statusSnapshotIntegrity(snapshot: Prisma.JsonValue) {
  return createHash('sha256').update(JSON.stringify(snapshot)).digest('hex');
}

export interface StatusPageServingStore {
  publishRoute(routeKey: string, route: StatusServingRoute): Promise<void>;
  removeRoute(routeKey: string): Promise<void>;
  resolveRoute(routeKey: string): Promise<StatusServingRoute | null>;
  publishManifest(manifest: StatusServingManifest): Promise<void>;
  publishSnapshot(pageId: string, revision: string, snapshot: Prisma.JsonValue): Promise<void>;
  readManifest(pageId: string): Promise<StatusServingManifest | null>;
  readSnapshot(pageId: string, revision: string): Promise<Prisma.JsonValue | null>;
  revoke(pageId: string): Promise<void>;
}

async function observed<T>(operation: string, task: () => Promise<T>): Promise<T> {
  const startedAt = performance.now();
  try {
    return await task();
  } catch (error) {
    addOperationalMetric('opsknight_status_serving_store_errors_total', 1, { operation });
    throw error;
  } finally {
    observeOperationalHistogram(
      'opsknight_status_serving_store_latency_seconds',
      (performance.now() - startedAt) / 1_000,
      { operation }
    );
  }
}

class PostgreSqlStatusPageServingStore implements StatusPageServingStore {
  async publishRoute(): Promise<void> {}
  async removeRoute(): Promise<void> {}
  async resolveRoute(routeKey: string): Promise<StatusServingRoute | null> {
    const page = await prisma.statusPage.findFirst({
      where: routeKey === 'default' ? { isDefault: true } : { slug: routeKey },
      select: {
        id: true,
        slug: true,
        requireAuth: true,
        snapshot: { select: { publishedRevision: true } },
      },
    });
    return page
      ? {
          pageId: page.id,
          slug: page.slug,
          requireAuth: page.requireAuth,
          revision: page.snapshot?.publishedRevision.toString() ?? '-1',
        }
      : null;
  }
  async publishManifest(): Promise<void> {}
  async publishSnapshot(): Promise<void> {}

  async readManifest(pageId: string): Promise<StatusServingManifest | null> {
    return observed('read_manifest', async () => {
      const row = await prisma.statusPageSnapshot.findUnique({ where: { statusPageId: pageId } });
      if (!row) return null;
      return {
        pageId,
        revision: row.publishedRevision.toString(),
        enabled: true,
        revoked: row.publishedRevision !== row.revision || !row.payload,
        snapshotKey: `${row.publishedRevision}.json`,
        publishedAt: row.generatedAt?.toISOString() ?? new Date(0).toISOString(),
        schemaVersion: 3,
        integrityHash: row.payload ? statusSnapshotIntegrity(row.payload) : '0'.repeat(64),
      };
    });
  }

  async readSnapshot(pageId: string, revision: string): Promise<Prisma.JsonValue | null> {
    return observed('read_snapshot', async () => {
      const row = await prisma.statusPageSnapshot.findUnique({
        where: { statusPageId: pageId },
        select: { payload: true, publishedRevision: true, revision: true },
      });
      return row &&
        row.revision === row.publishedRevision &&
        row.publishedRevision.toString() === revision
        ? row.payload
        : null;
    });
  }

  async revoke(pageId: string): Promise<void> {
    await prisma.statusPageSnapshot.updateMany({
      where: { statusPageId: pageId },
      data: { publishedRevision: BigInt(-1) },
    });
  }
}

class HttpStatusPageServingStore implements StatusPageServingStore {
  private readonly origin: URL;

  constructor(
    private readonly baseUrl: string,
    private readonly token: string
  ) {
    const origin = new URL(baseUrl);
    if (origin.protocol !== 'https:' || origin.username || origin.password) {
      throw new Error('STATUS_PAGE_SERVING_STORE_URL must be an HTTPS origin without credentials');
    }
    this.origin = origin;
  }

  private async request(path: string, init?: RequestInit) {
    const url = new URL(path, this.origin.pathname.endsWith('/') ? this.origin : `${this.origin}/`);
    if (url.origin !== this.origin.origin) throw new Error('Serving store request escaped its origin');
    const { assertSafeOutboundUrl, safeOutboundFetch } = await import('@/lib/network-security');
    await assertSafeOutboundUrl(url.toString());
    const signal = init?.signal ?? AbortSignal.timeout(10_000);
    return safeOutboundFetch(url.toString(), {
      ...init,
      signal,
      headers: {
        Authorization: `Bearer ${this.token}`,
        'Content-Type': 'application/json',
        ...init?.headers,
      },
      cache: 'no-store',
    });
  }

  async publishRoute(routeKey: string, route: StatusServingRoute): Promise<void> {
    await observed('publish_route', async () => {
      const response = await this.request(`status-pages/routes/${encodeURIComponent(routeKey)}`, {
        method: 'PUT',
        body: JSON.stringify(route),
      });
      if (!response.ok) throw new Error(`Serving store route publish failed (${response.status})`);
    });
  }

  async removeRoute(routeKey: string): Promise<void> {
    await observed('remove_route', async () => {
      const response = await this.request(`status-pages/routes/${encodeURIComponent(routeKey)}`, {
        method: 'DELETE',
      });
      if (!response.ok && response.status !== 404) {
        throw new Error(`Serving store route removal failed (${response.status})`);
      }
    });
  }

  async resolveRoute(routeKey: string): Promise<StatusServingRoute | null> {
    return observed('resolve_route', async () => {
      const response = await this.request(`status-pages/routes/${encodeURIComponent(routeKey)}`);
      if (response.status === 404) return null;
      if (!response.ok) throw new Error(`Serving store route lookup failed (${response.status})`);
      const parsed = routeSchema.safeParse(await response.json());
      return parsed.success ? parsed.data : null;
    });
  }

  async publishManifest(manifest: StatusServingManifest): Promise<void> {
    await observed('publish_manifest', async () => {
      const response = await this.request(`status-pages/${manifest.pageId}/manifest`, {
        method: 'PUT',
        body: JSON.stringify(manifest),
      });
      if (!response.ok)
        throw new Error(`Serving store manifest publish failed (${response.status})`);
    });
  }

  async publishSnapshot(
    pageId: string,
    revision: string,
    snapshot: Prisma.JsonValue
  ): Promise<void> {
    await observed('publish_snapshot', async () => {
      const response = await this.request(`status-pages/${pageId}/${revision}.json`, {
        method: 'PUT',
        body: JSON.stringify(snapshot),
      });
      if (!response.ok)
        throw new Error(`Serving store snapshot publish failed (${response.status})`);
    });
  }

  async readManifest(pageId: string): Promise<StatusServingManifest | null> {
    return observed('read_manifest', async () => {
      const response = await this.request(`status-pages/${pageId}/manifest`);
      if (response.status === 404) return null;
      if (!response.ok) throw new Error(`Serving store manifest read failed (${response.status})`);
      const parsed = manifestSchema.safeParse(await response.json());
      if (!parsed.success) {
        logger.error('status.serving_store.manifest_invalid', {
          pageId,
          issues: parsed.error.issues.map(issue => issue.path.join('.')),
        });
        return null;
      }
      return parsed.data;
    });
  }

  async readSnapshot(pageId: string, revision: string): Promise<Prisma.JsonValue | null> {
    return observed('read_snapshot', async () => {
      const response = await this.request(`status-pages/${pageId}/${revision}.json`);
      if (response.status === 404) return null;
      if (!response.ok) throw new Error(`Serving store snapshot read failed (${response.status})`);
      return (await response.json()) as Prisma.JsonValue;
    });
  }

  async revoke(pageId: string): Promise<void> {
    await this.publishManifest({
      pageId,
      revision: '-1',
      enabled: false,
      revoked: true,
      snapshotKey: '',
      publishedAt: new Date().toISOString(),
      schemaVersion: 3,
      integrityHash: '0'.repeat(64),
    });
  }
}

export function getStatusPageServingStore(): StatusPageServingStore {
  const baseUrl = process.env.STATUS_PAGE_SERVING_STORE_URL?.trim();
  const token = process.env.STATUS_PAGE_SERVING_STORE_TOKEN?.trim();
  return scalingFeatureEnabled('STATUS_PAGE_EXTERNAL_SERVING_STORE') && baseUrl && token
    ? new HttpStatusPageServingStore(baseUrl, token)
    : new PostgreSqlStatusPageServingStore();
}
