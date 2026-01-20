import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { logger } from '@/lib/logger';

type RouteParams = {
  params: {
    id: string;
  };
};

function parseDataImage(dataUrl: string): { mime: string; buffer: Buffer } | null {
  const match = dataUrl.match(/^data:(image\/[a-zA-Z0-9.+-]+)(;base64)?,(.*)$/);
  if (!match) return null;
  const mime = match[1];
  const isBase64 = Boolean(match[2]);
  const payload = match[3] || '';
  try {
    if (isBase64) {
      return { mime, buffer: Buffer.from(payload, 'base64') };
    }
    const decoded = decodeURIComponent(payload);
    return { mime, buffer: Buffer.from(decoded, 'utf8') };
  } catch {
    return null;
  }
}

export async function GET(_req: Request, { params }: RouteParams) {
  const statusPageId = params.id;
  if (!statusPageId) {
    return NextResponse.json({ error: 'Missing status page ID.' }, { status: 400 });
  }

  try {
    const statusPage = await prisma.statusPage.findUnique({
      where: { id: statusPageId },
      select: { branding: true },
    });

    if (!statusPage?.branding || typeof statusPage.branding !== 'object') {
      return NextResponse.json({ error: 'Logo not found.' }, { status: 404 });
    }

    const branding = statusPage.branding as Record<string, unknown>;
    const logoUrl = typeof branding.logoUrl === 'string' ? branding.logoUrl : '';
    if (!logoUrl.startsWith('data:image/')) {
      return NextResponse.json({ error: 'Logo not found.' }, { status: 404 });
    }

    const parsed = parseDataImage(logoUrl);
    if (!parsed) {
      return NextResponse.json({ error: 'Invalid logo data.' }, { status: 400 });
    }

    const body = new Uint8Array(parsed.buffer);
    return new NextResponse(body, {
      status: 200,
      headers: {
        'Content-Type': parsed.mime,
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    logger.error('Failed to load status page logo', {
      error: error instanceof Error ? error.message : String(error),
      statusPageId,
    });
    return NextResponse.json({ error: 'Failed to load logo.' }, { status: 500 });
  }
}
