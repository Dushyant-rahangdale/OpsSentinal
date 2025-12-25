/**
 * Database query monitoring utilities
 * Tracks query performance and provides metrics for optimization
 */

interface QueryMetrics {
  query: string;
  duration: number;
  timestamp: Date;
  params?: unknown;
  error?: Error;
}

interface QueryStats {
  totalQueries: number;
  averageDuration: number;
  slowQueries: number;
  errorCount: number;
  queriesByType: Record<string, number>;
}

class QueryMonitor {
  private queries: QueryMetrics[] = [];
  private readonly maxQueries = 1000; // Keep last 1000 queries
  private readonly slowQueryThreshold = 100; // 100ms threshold for slow queries

  /**
   * Record a database query execution
   */
  recordQuery(query: string, duration: number, params?: unknown, error?: Error): void {
    const metric: QueryMetrics = {
      query: this.sanitizeQuery(query),
      duration,
      timestamp: new Date(),
      params,
      error,
    };

    this.queries.push(metric);

    // Keep only the last N queries
    if (this.queries.length > this.maxQueries) {
      this.queries.shift();
    }

    // Log slow queries
    if (duration > this.slowQueryThreshold) {
      console.warn(`[DB Monitor] Slow query detected: ${duration}ms`, {
        query: metric.query,
        params,
      });
    }

    // Log errors
    if (error) {
      // Extract error information more comprehensively
      let errorMessage = 'Unknown error';
      let errorStack: string | undefined;
      let errorCode: string | undefined;
      let errorMeta: unknown;
      
      if (error instanceof Error) {
        errorMessage = error.message || 'Error without message';
        errorStack = error.stack;
        
        // Handle Prisma errors specifically
        if ('code' in error) {
          errorCode = String(error.code);
        }
        if ('meta' in error) {
          errorMeta = error.meta;
        }
      } else {
        // Try to stringify non-Error objects
        try {
          errorMessage = JSON.stringify(error);
        } catch {
          errorMessage = String(error) || 'Non-serializable error';
        }
      }
      
      console.error(`[DB Monitor] Query error:`, {
        query: metric.query,
        message: errorMessage,
        code: errorCode,
        meta: errorMeta,
        stack: errorStack,
        params: params ? JSON.stringify(params, null, 2) : undefined,
        errorType: error?.constructor?.name || typeof error,
      });
    }
  }

  /**
   * Get query statistics
   */
  getStats(timeWindow?: number): QueryStats {
    const now = Date.now();
    const window = timeWindow ? now - timeWindow : undefined;

    const relevantQueries = window
      ? this.queries.filter(q => q.timestamp.getTime() >= window)
      : this.queries;

    if (relevantQueries.length === 0) {
      return {
        totalQueries: 0,
        averageDuration: 0,
        slowQueries: 0,
        errorCount: 0,
        queriesByType: {},
      };
    }

    const durations = relevantQueries.map(q => q.duration);
    const averageDuration = durations.reduce((a, b) => a + b, 0) / durations.length;
    const slowQueries = relevantQueries.filter(q => q.duration > this.slowQueryThreshold).length;
    const errorCount = relevantQueries.filter(q => q.error).length;

    // Group queries by type (SELECT, INSERT, UPDATE, DELETE)
    const queriesByType: Record<string, number> = {};
    relevantQueries.forEach(q => {
      const type = this.getQueryType(q.query);
      queriesByType[type] = (queriesByType[type] || 0) + 1;
    });

    return {
      totalQueries: relevantQueries.length,
      averageDuration: Math.round(averageDuration * 100) / 100,
      slowQueries,
      errorCount,
      queriesByType,
    };
  }

  /**
   * Get slow queries
   */
  getSlowQueries(threshold?: number, limit = 10): QueryMetrics[] {
    const actualThreshold = threshold || this.slowQueryThreshold;
    return this.queries
      .filter(q => q.duration > actualThreshold)
      .sort((a, b) => b.duration - a.duration)
      .slice(0, limit);
  }

  /**
   * Get recent errors
   */
  getRecentErrors(limit = 10): QueryMetrics[] {
    return this.queries
      .filter(q => q.error)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  /**
   * Clear query history
   */
  clear(): void {
    this.queries = [];
  }

  /**
   * Sanitize query for logging (remove sensitive data)
   */
  private sanitizeQuery(query: string): string {
    // Remove potential sensitive data from query strings
    return query
      .replace(/password\s*=\s*'[^']*'/gi, "password='***'")
      .replace(/password\s*=\s*"[^"]*"/gi, 'password="***"')
      .replace(/token\s*=\s*'[^']*'/gi, "token='***'")
      .replace(/token\s*=\s*"[^"]*"/gi, 'token="***"');
  }

  /**
   * Get query type from SQL
   */
  private getQueryType(query: string): string {
    const trimmed = query.trim().toUpperCase();
    if (trimmed.startsWith('SELECT')) return 'SELECT';
    if (trimmed.startsWith('INSERT')) return 'INSERT';
    if (trimmed.startsWith('UPDATE')) return 'UPDATE';
    if (trimmed.startsWith('DELETE')) return 'DELETE';
    if (trimmed.startsWith('CREATE')) return 'CREATE';
    if (trimmed.startsWith('ALTER')) return 'ALTER';
    if (trimmed.startsWith('DROP')) return 'DROP';
    return 'OTHER';
  }

  /**
   * Get query duration distribution for charting
   */
  getQueryDurationDistribution(timeWindow?: number) {
    let relevantQueries = this.queries; // Corrected from this.queryHistory

    if (timeWindow) {
      const cutoff = Date.now() - timeWindow;
      relevantQueries = relevantQueries.filter(q => q.timestamp.getTime() > cutoff);
    }

    const distribution = {
      '<10ms': 0,
      '10-100ms': 0,
      '100-500ms': 0,
      '500ms-1s': 0,
      '>1s': 0
    };

    relevantQueries.forEach(q => {
      if (q.duration < 10) distribution['<10ms']++;
      else if (q.duration < 100) distribution['10-100ms']++;
      else if (q.duration < 500) distribution['100-500ms']++;
      else if (q.duration < 1000) distribution['500ms-1s']++;
      else distribution['>1s']++;
    });

    // Convert to array for Recharts
    return Object.entries(distribution).map(([range, count]) => ({
      name: range,
      count
    }));
  }
}

// Singleton instance
const globalForMonitor = globalThis as unknown as { queryMonitor: QueryMonitor | undefined }

export const queryMonitor = globalForMonitor.queryMonitor ?? new QueryMonitor()

if (process.env.NODE_ENV !== 'production') {
  globalForMonitor.queryMonitor = queryMonitor
}

/**
 * Wrap a Prisma query to monitor its performance
 */
export async function monitorQuery<T>(
  queryName: string,
  queryFn: () => Promise<T>,
  params?: unknown
): Promise<T> {
  const startTime = Date.now();
  try {
    const result = await queryFn();
    const duration = Date.now() - startTime;
    queryMonitor.recordQuery(queryName, duration, params);
    return result;
  } catch (error) {
    const duration = Date.now() - startTime;
    queryMonitor.recordQuery(queryName, duration, params, error as Error);
    throw error;
  }
}

/**
 * Get current query statistics
 */
export function getQueryStats(timeWindow?: number): QueryStats {
  return queryMonitor.getStats(timeWindow);
}

/**
 * Get slow queries
 */
export function getSlowQueries(threshold?: number, limit = 10): QueryMetrics[] {
  return queryMonitor.getSlowQueries(threshold, limit);
}

/**
 * Get recent query errors
 */
export function getRecentQueryErrors(limit = 10): QueryMetrics[] {
  return queryMonitor.getRecentErrors(limit);
}

/**
 * Get query duration distribution
 */
export function getQueryDurationDistribution(timeWindow?: number) {
  return queryMonitor.getQueryDurationDistribution(timeWindow);
}


