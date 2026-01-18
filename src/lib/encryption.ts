/**
 * Encryption utilities for sensitive data
 * Uses AES-256-CBC encryption
 */

import crypto from 'crypto';
import prisma from '@/lib/prisma';
import { logger } from './logger';

/**
 * Encrypt text using AES-256-CBC
 */
let cachedKey: string | null = null;
let cachedAt = 0;
const CACHE_TTL_MS = 5 * 60 * 1000;

export function getFingerprint(key: string): string {
  return crypto.createHash('sha256').update(key).digest('hex');
}

export async function validateEncryptionFingerprint(): Promise<boolean> {
  const currentKey = await getEncryptionKey();
  if (!currentKey) return false;

  const fingerprint = getFingerprint(currentKey);

  // Fetch stored fingerprint from SystemConfig (JSON store) to avoid schema changes
  const storedConfig = await prisma.systemConfig.findUnique({
    where: { key: 'encryption_fingerprint' },
  });

  if (!storedConfig) {
    // First run or migration: trust the current key and save its fingerprint
    await prisma.systemConfig.upsert({
      where: { key: 'encryption_fingerprint' },
      create: { key: 'encryption_fingerprint', value: { fingerprint } },
      update: { value: { fingerprint } },
    });
    return true;
  }

  const storedFingerprint = (storedConfig.value as any).fingerprint;

  if (storedFingerprint !== fingerprint) {
    logger.error('[Encryption] Key Mismatch! Current key does not match stored fingerprint.');
    return false;
  }

  return true;
}

function isValidHexKey(value: string) {
  return /^[0-9a-f]{64}$/i.test(value);
}

const CANARY_Plaintext = 'OPS_KNIGHT_CRYPTO_CHECK';

export async function validateCanary(keyHex: string): Promise<boolean> {
  try {
    const config = await prisma.systemConfig.findUnique({ where: { key: 'encryption_canary' } });

    // Bootstrap: If no canary exists, create one with the current key
    if (!config) {
      const encrypted = await encryptWithKey(CANARY_Plaintext, keyHex);
      await prisma.systemConfig.create({
        data: { key: 'encryption_canary', value: { encrypted } },
      });
      return true;
    }

    // Validate: Try to decrypt
    const encrypted = (config.value as any).encrypted;
    if (!encrypted) return false; // Should not happen

    const decrypted = await decryptWithKey(encrypted, keyHex);
    return decrypted === CANARY_Plaintext;
  } catch (error) {
    logger.error('[Encryption] Canary validation failed', { error });
    return false;
  }
}

export async function getEncryptionKey(): Promise<string | null> {
  const now = Date.now();
  if (cachedKey && now - cachedAt < CACHE_TTL_MS) {
    return cachedKey;
  }

  let activeKey: string | null = null;

  // 1. Try DB first (Source of Truth)
  try {
    const settings = await prisma.systemSettings.findUnique({
      where: { id: 'default' },
      select: { encryptionKey: true },
    });
    if (settings?.encryptionKey && isValidHexKey(settings.encryptionKey)) {
      activeKey = settings.encryptionKey;
    }
  } catch (e) {
    logger.error('Failed to fetch DB key', { error: e });
  }

  // 2. Fallback to Env
  if (!activeKey && process.env.ENCRYPTION_KEY) {
    activeKey = process.env.ENCRYPTION_KEY;
  }

  if (!activeKey) return null;

  // 3. Canary Check (The Safety Gate)
  // We only cache if the canary passes.
  const isSafe = await validateCanary(activeKey);
  if (!isSafe) {
    logger.error('CRITICAL: Encryption Key failed canary check. Entering Safe Mode.');
    return null; // Return null to disable encryption features rather than returning a bad key
  }

  cachedKey = activeKey;
  cachedAt = now;
  return activeKey;
}

export async function encryptWithKey(text: string, keyHex: string): Promise<string> {
  const algorithm = 'aes-256-cbc';
  if (!keyHex || !isValidHexKey(keyHex)) {
    throw new Error('Invalid encryption key provided');
  }
  const key = Buffer.from(keyHex, 'hex');
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(algorithm, key, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
}

export async function encrypt(text: string): Promise<string> {
  const keyHex = await getEncryptionKey();
  if (!keyHex) throw new Error('ENCRYPTION_KEY not configured');
  return encryptWithKey(text, keyHex);
}

export async function decryptWithKey(encryptedText: string, keyHex: string): Promise<string> {
  const algorithm = 'aes-256-cbc';
  if (!keyHex || !isValidHexKey(keyHex)) {
    throw new Error('Invalid encryption key provided');
  }
  const key = Buffer.from(keyHex, 'hex');
  const parts = encryptedText.split(':');

  if (parts.length !== 2 || !parts[0] || !parts[1]) {
    throw new Error('Invalid encrypted text format');
  }

  const iv = Buffer.from(parts[0], 'hex');
  const encrypted = parts[1];
  const decipher = crypto.createDecipheriv(algorithm, key, iv);
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

export async function decrypt(encryptedText: string): Promise<string> {
  try {
    const keyHex = await getEncryptionKey();
    if (!keyHex) throw new Error('ENCRYPTION_KEY not configured');
    return await decryptWithKey(encryptedText, keyHex);
  } catch (error) {
    logger.error('[Encryption] Decryption error', { error });
    throw new Error('Failed to decrypt token');
  }
}
