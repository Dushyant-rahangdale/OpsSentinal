import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

/**
 * Web Vitals API Endpoint
 * 
 * Collects performance metrics from client-side Web Vitals.
 * In production, you might want to:
 * - Store metrics in a database
 * - Send to analytics service (Google Analytics, Vercel Analytics, etc.)
 * - Aggregate and alert on poor performance
 */

interface MetricItem {
  name: string;
  value: number;
  rating: string;
  url: string;
  timestamp: number;
  userId?: string;
}

// In-memory storage for development (replace with database in production)
const globalForMetrics = globalThis as unknown as { webVitalsMetrics: MetricItem[] | undefined }
const metricsStore: MetricItem[] = globalForMetrics.webVitalsMetrics || []

if (process.env.NODE_ENV !== 'production') {
  globalForMetrics.webVitalsMetrics = metricsStore
}

// Keep only last 1000 metrics to prevent memory issues
const MAX_METRICS = 1000;

export async function POST(req: NextRequest) {
  try {
    // Optional: Require authentication for production
    // const session = await getServerSession(authOptions);
    // if (!session) {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    // }

    const body = await req.json();
    const { name, value, rating, url, timestamp } = body;

    // Validate required fields
    if (!name || typeof value !== 'number' || !rating || !url) {
      return NextResponse.json(
        { error: 'Invalid metric data' },
        { status: 400 }
      );
    }

    // Get user session if available (optional)
    const session = await getServerSession(authOptions);
    const userId = session?.user?.email || 'anonymous';

    // Store metric
    const metric = {
      name,
      value,
      rating,
      url,
      timestamp,
      userId,
    };

    metricsStore.push(metric);

    // Keep only recent metrics
    if (metricsStore.length > MAX_METRICS) {
      metricsStore.shift();
    }

    // In production, you might want to:
    // 1. Store in database
    // 2. Send to analytics service
    // 3. Aggregate for dashboards
    // 4. Alert on poor performance

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error storing Web Vital:', error);
    return NextResponse.json(
      { error: 'Failed to store metric' },
      { status: 500 }
    );
  }
}

/**
 * GET endpoint to retrieve metrics (for admin dashboard)
 * Optional: Add this if you want to view metrics in the monitoring dashboard
 */
export async function GET(req: NextRequest) {
  try {
    // Require admin authentication
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = req.nextUrl.searchParams;
    const url = searchParams.get('url');
    const name = searchParams.get('name');
    const limit = parseInt(searchParams.get('limit') || '100');

    let filtered = [...metricsStore];

    // Filter by URL if provided
    if (url) {
      filtered = filtered.filter((m) => m.url === url);
    }

    // Filter by metric name if provided
    if (name) {
      filtered = filtered.filter((m) => m.name === name);
    }

    // Sort by timestamp (newest first) and limit
    filtered = filtered
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);

    // Calculate aggregates
    const aggregates = filtered.reduce(
      (acc, metric) => {
        if (!acc[metric.name]) {
          acc[metric.name] = {
            count: 0,
            sum: 0,
            min: Infinity,
            max: -Infinity,
            ratings: { good: 0, needsImprovement: 0, poor: 0 },
          };
        }

        const agg = acc[metric.name];
        agg.count++;
        agg.sum += metric.value;
        agg.min = Math.min(agg.min, metric.value);
        agg.max = Math.max(agg.max, metric.value);
        agg.ratings[metric.rating as 'good' | 'needsImprovement' | 'poor']++;

        return acc;
      },
      {} as Record<
        string,
        {
          count: number;
          sum: number;
          min: number;
          max: number;
          ratings: { good: number; needsImprovement: number; poor: number };
        }
      >
    );

    // Calculate averages
    const averages = Object.entries(aggregates).reduce(
      (acc, [name, agg]) => {
        acc[name] = {
          ...agg,
          avg: agg.sum / agg.count,
        };
        return acc;
      },
      {} as Record<
        string,
        {
          count: number;
          sum: number;
          min: number;
          max: number;
          avg: number;
          ratings: { good: number; needsImprovement: number; poor: number };
        }
      >
    );

    return NextResponse.json({
      metrics: filtered,
      aggregates: averages,
      total: metricsStore.length,
    });
  } catch (error) {
    console.error('Error retrieving Web Vitals:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve metrics' },
      { status: 500 }
    );
  }
}

