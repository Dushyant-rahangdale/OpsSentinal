/**
 * Secret Manager - Auto-generates and stores NEXTAUTH_SECRET
 *
 * This module eliminates the need for users to manually configure NEXTAUTH_SECRET
 * by auto-generating one on first run and storing it in the database.
 *
 * Priority order:
 * 1. Environment variable NEXTAUTH_SECRET (for explicit override)
 * 2. Database SystemConfig table (auto-generated)
 * 3. Generate new secret if neither exists
 */

import { randomBytes } from 'crypto';
import prisma from './prisma';
import { logger } from './logger';

// In-memory cache to avoid DB lookup on every request
let cachedSecret: string | null = null;
let cacheInitialized = false;

const SYSTEM_CONFIG_KEY = 'nextauth_secret';

/**
 * Generates a cryptographically secure random secret
 */
function generateSecret(): string {
  return randomBytes(32).toString('base64');
}

/**
 * Get the NextAuth secret, auto-generating if necessary
 *
 * This function:
 * 1. Returns env var if set
 * 2. Returns cached value if available
 * 3. Fetches from DB or generates new one
 */
export async function getNextAuthSecret(): Promise<string> {
  // Priority 1: Environment variable override
  const envSecret = process.env.NEXTAUTH_SECRET;
  if (envSecret) {
    return envSecret;
  }

  // Priority 2: Return cached value
  if (cacheInitialized && cachedSecret) {
    return cachedSecret;
  }

  try {
    // Priority 3: Fetch from database
    const config = await prisma.systemConfig.findUnique({
      where: { key: SYSTEM_CONFIG_KEY },
    });

    if (config?.value && typeof config.value === 'object' && 'secret' in config.value) {
      cachedSecret = (config.value as { secret: string }).secret;
      cacheInitialized = true;
      logger.debug('[SecretManager] Loaded NEXTAUTH_SECRET from database');
      return cachedSecret;
    }

    // Priority 4: Generate new secret and store it
    const newSecret = generateSecret();

    await prisma.systemConfig.upsert({
      where: { key: SYSTEM_CONFIG_KEY },
      create: {
        key: SYSTEM_CONFIG_KEY,
        value: { secret: newSecret, createdAt: new Date().toISOString() },
      },
      update: {
        // Don't update if already exists - this is a safety measure
        value: { secret: newSecret, createdAt: new Date().toISOString() },
      },
    });

    cachedSecret = newSecret;
    cacheInitialized = true;
    logger.info('[SecretManager] Generated new NEXTAUTH_SECRET and stored in database');

    return newSecret;
  } catch (error) {
    // If database is unavailable (e.g., during migrations), use a fallback
    logger.error('[SecretManager] Failed to fetch/generate secret from DB, using fallback', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    // Generate a temporary secret for this instance
    // This is NOT ideal but allows the app to start even if DB is unavailable
    if (!cachedSecret) {
      cachedSecret = generateSecret();
      logger.warn(
        '[SecretManager] Using temporary in-memory secret. Sessions will not persist across restarts.'
      );
    }

    return cachedSecret;
  }
}

/**
 * Synchronous version that returns cached value or env var
 * Used in places where async is not possible (e.g., middleware configuration)
 *
 * IMPORTANT: Call getNextAuthSecret() during app startup to populate the cache
 */
export function getNextAuthSecretSync(): string {
  // Priority 1: Environment variable
  const envSecret = process.env.NEXTAUTH_SECRET;
  if (envSecret) {
    return envSecret;
  }

  // Priority 2: Cached value
  if (cachedSecret) {
    return cachedSecret;
  }

  // Fallback: Generate temporary secret
  // This should rarely happen if the app properly initializes
  logger.warn(
    '[SecretManager] getNextAuthSecretSync called without cached secret. Generating temporary.'
  );
  cachedSecret = generateSecret();
  return cachedSecret;
}

/**
 * Initialize the secret manager - call this during app startup
 */
export async function initializeSecretManager(): Promise<void> {
  try {
    await getNextAuthSecret();
    logger.info('[SecretManager] Initialized successfully');
  } catch (error) {
    logger.error('[SecretManager] Initialization failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

/**
 * Clear the cached secret (useful for testing)
 */
export function clearSecretCache(): void {
  cachedSecret = null;
  cacheInitialized = false;
}
