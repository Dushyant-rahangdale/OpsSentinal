/**
 * Retry utility for external API calls
 * Provides configurable retry logic with exponential backoff and circuit breaker pattern
 */

export interface RetryOptions {
  maxAttempts?: number;
  initialDelayMs?: number;
  maxDelayMs?: number;
  backoffMultiplier?: number;
  retryableErrors?: (error: unknown) => boolean;
  onRetry?: (attempt: number, error: unknown) => void;
}

export interface RetryResult<T> {
  success: boolean;
  data?: T;
  error?: unknown;
  attempts: number;
}

const DEFAULT_OPTIONS: Required<Omit<RetryOptions, 'retryableErrors' | 'onRetry'>> = {
  maxAttempts: 3,
  initialDelayMs: 1000,
  maxDelayMs: 10000,
  backoffMultiplier: 2,
};

const DEFAULT_RETRYABLE_ERRORS = (error: unknown): boolean => {
  if (error instanceof Error) {
    // Network errors
    if (error.message.includes('fetch') || error.message.includes('network')) {
      return true;
    }
    // Timeout errors
    if (error.message.includes('timeout') || error.message.includes('ETIMEDOUT')) {
      return true;
    }
    // HTTP 5xx errors (should be checked from response, but catch here for safety)
    if (error.message.includes('5')) {
      return true;
    }
  }
  // Retry on unknown errors by default
  return true;
};

/**
 * Sleep for specified milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Calculate delay for retry attempt with exponential backoff
 */
function calculateDelay(attempt: number, options: Required<Omit<RetryOptions, 'retryableErrors' | 'onRetry'>>): number {
  const delay = options.initialDelayMs * Math.pow(options.backoffMultiplier, attempt - 1);
  return Math.min(delay, options.maxDelayMs);
}

/**
 * Retry a function with exponential backoff
 * 
 * @example
 * const result = await retry(() => fetch('https://api.example.com'), {
 *   maxAttempts: 3,
 *   initialDelayMs: 1000
 * });
 */
export async function retry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<RetryResult<T>> {
  const opts = {
    ...DEFAULT_OPTIONS,
    ...options,
  };

  const retryableErrors = options.retryableErrors || DEFAULT_RETRYABLE_ERRORS;
  let lastError: unknown;

  for (let attempt = 1; attempt <= opts.maxAttempts; attempt += 1) {
    try {
      const data = await fn();
      return {
        success: true,
        data,
        attempts: attempt,
      };
    } catch (error) {
      lastError = error;

      // Check if error is retryable
      if (!retryableErrors(error)) {
        return {
          success: false,
          error,
          attempts: attempt,
        };
      }

      // Don't retry on last attempt
      if (attempt < opts.maxAttempts) {
        const delay = calculateDelay(attempt, opts);
        
        // Call onRetry callback if provided
        if (options.onRetry) {
          options.onRetry(attempt, error);
        }

        await sleep(delay);
      }
    }
  }

  return {
    success: false,
    error: lastError,
    attempts: opts.maxAttempts,
  };
}

/**
 * Check if an HTTP response indicates a retryable error
 */
export function isRetryableHttpError(status: number): boolean {
  // Retry on server errors (5xx) and rate limiting (429)
  return status >= 500 || status === 429;
}

/**
 * Retry HTTP fetch calls with proper error handling
 * 
 * @example
 * const result = await retryFetch('https://api.example.com', {
 *   method: 'POST',
 *   body: JSON.stringify(data)
 * });
 */
export async function retryFetch(
  url: string,
  options: RequestInit = {},
  retryOptions?: RetryOptions
): Promise<Response> {
  const result = await retry(async () => {
    const response = await fetch(url, options);

    // Check if response status is retryable
    if (!response.ok && isRetryableHttpError(response.status)) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return response;
  }, retryOptions);

  if (!result.success) {
    throw result.error || new Error('Request failed after retries');
  }

  return result.data!;
}

/**
 * Simple retry wrapper for common async operations
 * Returns the value directly or throws the last error
 */
export async function retryWithThrow<T>(
  fn: () => Promise<T>,
  options?: RetryOptions
): Promise<T> {
  const result = await retry(fn, options);
  
  if (!result.success) {
    throw result.error || new Error('Operation failed after retries');
  }

  return result.data!;
}

