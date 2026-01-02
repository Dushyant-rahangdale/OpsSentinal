import { NextRequest, NextResponse } from 'next/server';
import { getIncidentContext } from '@/lib/incident-enrichment';
import { getServerSession } from 'next-auth';
import { getAuthOptions } from '@/lib/auth';
import { logger } from '@/lib/logger';

/**
 * GET: Fetch telemetry context for an incident
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(await getAuthOptions());
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const windowMinutes = parseInt(searchParams.get('window') || '30', 10);

  try {
    const context = await getIncidentContext(id, windowMinutes);
    if (!context) {
      return NextResponse.json({ error: 'Incident not found' }, { status: 404 });
    }
    return NextResponse.json(context);
  } catch (error) {
    logger.error('api.incident_context.fetch_failed', {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ error: 'Failed to get context' }, { status: 500 });
  }
}
