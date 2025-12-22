import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { trackPresetUsage } from '@/lib/search-presets';

/**
 * Track Preset Usage
 * POST /api/search-presets/[id]/use
 */
export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id } = await params;

        await trackPresetUsage(id, session.user.id);

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('Track preset usage error:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to track preset usage' },
            { status: 500 }
        );
    }
}

