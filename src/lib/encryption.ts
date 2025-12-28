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

function isValidHexKey(value: string) {
  return /^[0-9a-f]{64}$/i.test(value);
}

export async function getEncryptionKey(): Promise<string | null> {
  if (process.env.ENCRYPTION_KEY) {
    return process.env.ENCRYPTION_KEY;
  }

  const now = Date.now();
  if (cachedKey && now - cachedAt < CACHE_TTL_MS) {
    return cachedKey;
  }

  try {
    const settings = await prisma.systemSettings.findUnique({
      where: { id: 'default' },
      select: { encryptionKey: true }
    });
    if (settings?.encryptionKey && isValidHexKey(settings.encryptionKey)) {
      cachedKey = settings.encryptionKey;
      cachedAt = now;
      return cachedKey;
    }
    if (settings?.encryptionKey) {
      logger.error('[Encryption] Invalid encryption key format in database');
    }
  } catch (error) {
    logger.error('[Encryption] Failed to fetch encryption key', { error });
  }

  return null;
}

export async function encrypt(text: string): Promise<string> {
  const algorithm = 'aes-256-cbc';
  const keyHex = await getEncryptionKey();
  if (!keyHex || !isValidHexKey(keyHex)) {
    throw new Error('ENCRYPTION_KEY not configured');
  }
  const key = Buffer.from(keyHex, 'hex');
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(algorithm, key, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
}

/**
 * Decrypt encrypted text
 */
export async function decrypt(encryptedText: string): Promise<string> {
  try {
    const algorithm = 'aes-256-cbc';
    const keyHex = await getEncryptionKey();
    if (!keyHex || !isValidHexKey(keyHex)) {
      throw new Error('ENCRYPTION_KEY not configured');
    }
    const key = Buffer.from(keyHex, 'hex');
    const parts = encryptedText.split(':');
    const iv = Buffer.from(parts[0], 'hex');
    const encrypted = parts[1];
    const decipher = crypto.createDecipheriv(algorithm, key, iv);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (error) {
    logger.error('[Encryption] Decryption error', { error });
    throw new Error('Failed to decrypt token');
  }
}

