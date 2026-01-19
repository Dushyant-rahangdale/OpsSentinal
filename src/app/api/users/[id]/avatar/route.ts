import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

/**
 * GET /api/users/[id]/avatar
 * Serves the user's avatar image from the database.
 * Optimized with aggressive caching headers.
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  try {
    const userAvatar = await prisma.userAvatar.findUnique({
      where: { userId: id },
      select: { data: true, mimeType: true },
    });

    if (!userAvatar) {
      return new NextResponse(null, { status: 404 });
    }

    // Convert Buffer to Uint8Array for NextResponse compatibility
    const uint8Array = new Uint8Array(userAvatar.data);

    return new NextResponse(uint8Array, {
      headers: {
        'Content-Type': userAvatar.mimeType,
        // Aggressive caching: 1 year, immutable (browser won't revalidate)
        // Cache invalidation is done by changing the URL query param (?t=timestamp)
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    console.error('Error fetching avatar:', error);
    return NextResponse.json({ error: 'Failed to fetch avatar' }, { status: 500 });
  }
}
