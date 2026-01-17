/**
 * Secret Manager - Auto-generates and stores NEXTAUTH_SECRET
 *
 * This module eliminates the need for users to manually configure NEXTAUTH_SECRET
 * by auto-generating one on first run and storing it in the database.
 *
 * EDGE RUNTIME COMPATIBILITY NOTE:
 * This file is used by middleware.ts which runs on Edge Runtime.
 * Standard Prisma Client DOES NOT work on Edge Runtime.
 * Therefore, we have removed the database fallback for this specific module.
 *
 * Priority order:
 * 1. Environment variable NEXTAUTH_SECRET (Recommended for Production)
 * 2. Generate new ephemeral secret (Development/Fallback - Invalidates on restart)
 */

import { logger } from './logger';

// Use globalThis.crypto for Edge Runtime compatibility
function generateRandomBase64(length: number): string {
  if (typeof globalThis.crypto !== 'undefined' && globalThis.crypto.getRandomValues) {
    const array = new Uint8Array(length);
    globalThis.crypto.getRandomValues(array);
    // Use Buffer if available (Next.js Edge supports it), otherwise perform manual conversion
    if (typeof Buffer !== 'undefined') {
      return Buffer.from(array).toString('base64');
    }
    // Fallback for environments without Buffer but with crypto (unlikely in Next.js context but safe)
    let binary = '';
    for (let i = 0; i < length; i++) {
      binary += String.fromCharCode(array[i]);
    }
    return btoa(binary);
  }

  // Fallback for Node.js environments where global crypto might be missing (unlikely in strict mode but good for safety)
  // We use dynamic require to avoid static analysis picking up 'crypto' in Edge
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { randomBytes } = require('crypto');
    return randomBytes(length).toString('base64');
  } catch (_e) {
    // Should not happen in standard envs
    throw new Error('No crypto implementation available');
  }
}

// In-memory cache
let cachedSecret: string | null = null;

/**
 * Generates a cryptographically secure random secret
 */
function generateSecret(): string {
  return generateRandomBase64(32);
}

/**
 * Get the NextAuth secret
 *
 * This function:
 * 1. Returns env var if set
 * 2. Returns cached value if available
 * 3. Returns ephemeral generated secret (logging a warning)
 */
export async function getNextAuthSecret(): Promise<string> {
  // Priority 1: Environment variable override
  const envSecret = process.env.NEXTAUTH_SECRET;
  if (envSecret) {
    return envSecret;
  }

  // Priority 2: Return cached value
  if (cachedSecret) {
    return cachedSecret;
  }

  // NOTE: We removed Prisma database fallback for Edge Runtime compatibility.
  // Middleware (running on Edge) uses this file and cannot run Prisma Client.

  // Priority 3: Generate ephemeral secret
  logger.warn(
    '[SecretManager] NEXTAUTH_SECRET is not set in environment. Generating a TEMPORARY secret. Sessions will be invalidated on server restart. Please set NEXTAUTH_SECRET in your .env file.'
  );
  cachedSecret = generateSecret();

  return cachedSecret;
}
