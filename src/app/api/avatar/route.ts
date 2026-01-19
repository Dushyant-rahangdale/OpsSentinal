import { NextRequest, NextResponse } from 'next/server';

/**
 * Avatar Proxy API Route
 *
 * This proxies DiceBear avatar requests through our own domain to avoid
 * CSP/infrastructure blocks in production environments.
 *
 * Usage: /api/avatar?style=big-smile&seed=user-123&backgroundColor=b91c1c&radius=50
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  const style = searchParams.get('style') || 'big-smile';
  const seed = searchParams.get('seed') || 'default';
  const backgroundColor = searchParams.get('backgroundColor') || '84cc16';
  const radius = searchParams.get('radius') || '50';
  const format = searchParams.get('format') || 'png';

  // Construct the DiceBear URL
  const dicebearUrl = `https://api.dicebear.com/9.x/${style}/${format}?seed=${encodeURIComponent(seed)}&backgroundColor=${backgroundColor}&radius=${radius}`;

  try {
    const response = await fetch(dicebearUrl, {
      headers: {
        Accept: 'image/*',
      },
      // Cache for 1 day
      next: { revalidate: 86400 },
    });

    if (!response.ok) {
      return NextResponse.json({ error: 'Failed to fetch avatar' }, { status: response.status });
    }

    const contentType = response.headers.get('content-type') || 'image/png';
    const buffer = await response.arrayBuffer();

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    console.error('Avatar proxy error:', error);
    return NextResponse.json({ error: 'Failed to proxy avatar' }, { status: 500 });
  }
}
