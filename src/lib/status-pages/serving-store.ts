import 'server-only';
import type { Prisma } from '@prisma/client';
import prisma from '@/lib/prisma';
import {
  addOperationalMetric,
  observeOperationalHistogram,
} from '@/lib/metrics/operational/registry';

export interface StatusServingManifest {
  pageId: string;
  revision: string;
  enabled: boolean;
  revoked: boolean;
  snapshotKey: string;
}

export interface StatusPageServingStore {
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
  constructor(
    private readonly baseUrl: string,
    private readonly token: string
  ) {}

  private async request(path: string, init?: RequestInit) {
    return fetch(`${this.baseUrl.replace(/\/$/, '')}/${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${this.token}`,
        'Content-Type': 'application/json',
        ...init?.headers,
      },
      cache: 'no-store',
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
  return baseUrl && token
    ? new HttpStatusPageServingStore(baseUrl, token)
    : new PostgreSqlStatusPageServingStore();
}
