import 'server-only';
import type { Prisma } from '@prisma/client';
import prisma from '@/lib/prisma';
import {
  addOperationalMetric,
  observeOperationalHistogram,
} from '@/lib/metrics/operational/registry';
import { scalingFeatureEnabled } from '@/lib/scaling-feature-flags';

export interface StatusServingManifest {
  pageId: string;
  revision: string;
  enabled: boolean;
  revoked: boolean;
  snapshotKey: string;
}

export interface StatusPageServingStore {
  publishRoute(routeKey: string, pageId: string): Promise<void>;
  resolveRoute(routeKey: string): Promise<string | null>;
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
  async resolveRoute(routeKey: string): Promise<string | null> {
    const page = await prisma.statusPage.findFirst({
      where: routeKey === 'default' ? { isDefault: true } : { slug: routeKey },
      select: { id: true },
    });
    return page?.id ?? null;
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
    return safeOutboundFetch(url.toString(), {
      ...init,
      headers: {
        Authorization: `Bearer ${this.token}`,
        'Content-Type': 'application/json',
        ...init?.headers,
      },
      cache: 'no-store',
    });
  }

  async publishRoute(routeKey: string, pageId: string): Promise<void> {
    await observed('publish_route', async () => {
      const response = await this.request(`status-pages/routes/${encodeURIComponent(routeKey)}`, {
        method: 'PUT',
        body: JSON.stringify({ pageId }),
      });
      if (!response.ok) throw new Error(`Serving store route publish failed (${response.status})`);
    });
  }

  async resolveRoute(routeKey: string): Promise<string | null> {
    return observed('resolve_route', async () => {
      const response = await this.request(`status-pages/routes/${encodeURIComponent(routeKey)}`);
      if (response.status === 404) return null;
      if (!response.ok) throw new Error(`Serving store route lookup failed (${response.status})`);
      const payload = (await response.json()) as { pageId?: unknown };
      return typeof payload.pageId === 'string' ? payload.pageId : null;
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
      return (await response.json()) as StatusServingManifest;
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
