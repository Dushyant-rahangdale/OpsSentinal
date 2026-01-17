import { randomBytes, scryptSync } from 'crypto';
import { getNextAuthSecretSync } from './secret-manager';

function getDefaultSecret(): string {
  return process.env.API_KEY_SECRET || getNextAuthSecretSync();
}

export function generateApiKey() {
  const raw = randomBytes(32).toString('base64url');
  const token = `ok_${raw}`;
  return {
    token,
    prefix: token.slice(0, 8),
    tokenHash: hashTokenV2(token),
  };
}

/**
 * Legacy hash function (upgraded to use scrypt for stronger, slower hashing)
 * Kept only for backward-compatibility lookups and lazy migration.
 */
export function hashTokenV1(token: string) {
  const secret = getDefaultSecret();
  const derivedKey = scryptSync(token, secret, 32);
  return derivedKey.toString('hex');
}

/**
 * Secure hash function (Scrypt)
 * Used for all new keys and migrated keys.
 * High computational effort prevents brute-force.
 */
export function hashTokenV2(token: string) {
  // scryptSync(password, salt, keyLength, [options])
  const secret = getDefaultSecret();
  // Using the secret as salt is acceptable here as the secret is high-entropy
  const derivedKey = scryptSync(token, secret, 32);
  return derivedKey.toString('hex');
}

export const hashToken = hashTokenV2;
