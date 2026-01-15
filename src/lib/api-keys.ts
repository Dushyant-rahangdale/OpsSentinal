import { createHash, randomBytes } from 'crypto';
import { getNextAuthSecretSync } from '@/lib/secret-manager';

function getDefaultSecret(): string {
  return process.env.API_KEY_SECRET || getNextAuthSecretSync();
}

export function generateApiKey() {
  const raw = randomBytes(32).toString('base64url');
  const token = `ok_${raw}`;
  return {
    token,
    prefix: token.slice(0, 8),
    tokenHash: hashToken(token),
  };
}

export function hashToken(token: string) {
  const hash = createHash('sha256');
  hash.update(`${getDefaultSecret()}:${token}`);
  return hash.digest('hex');
}
