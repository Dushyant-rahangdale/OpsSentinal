import { createHash } from 'node:crypto';
import type { Prisma } from '@prisma/client';

export function parseStatusPageLogo(value: string) {
  if (value.length > 2_800_000) return null;
  const comma = value.indexOf(',');
  if (comma < 0) return null;
  const metadata = value.slice(0, comma);
  const types = new Map([
    ['data:image/png;base64', 'image/png'],
    ['data:image/jpeg;base64', 'image/jpeg'],
    ['data:image/gif;base64', 'image/gif'],
    ['data:image/webp;base64', 'image/webp'],
  ]);
  const mime = types.get(metadata);
  if (!mime) return null;
  const buffer = Buffer.from(value.slice(comma + 1), 'base64');
  if (!buffer.length || buffer.length > 2 * 1024 * 1024) return null;
  return { mime, buffer };
}

export async function externalizeStatusPageLogo(
  tx: Prisma.TransactionClient,
  pageId: string,
  branding: Record<string, unknown>
) {
  if (typeof branding.logoUrl !== 'string' || !branding.logoUrl.startsWith('data:'))
    return branding;
  const parsed = parseStatusPageLogo(branding.logoUrl);
  if (!parsed) throw new Error('Invalid status page logo.');
  const id = createHash('sha256').update(pageId).update(parsed.buffer).digest('hex');
  await tx.$executeRaw`
    INSERT INTO "StatusPageAsset" ("id", "statusPageId", "contentType", "data")
    VALUES (${id}, ${pageId}, ${parsed.mime}, ${parsed.buffer}) ON CONFLICT ("id") DO NOTHING
  `;
  return {
    ...branding,
    logoUrl: `/api/status-page/logo/${encodeURIComponent(pageId)}?asset=${id}`,
  };
}
