import { createHash, randomBytes } from 'crypto';

const DEFAULT_SECRET = process.env.API_KEY_SECRET || process.env.NEXTAUTH_SECRET || '';

export function generateApiKey() {
    const raw = randomBytes(32).toString('base64url');
    const token = `ok_${raw}`;
    return {
        token,
        prefix: token.slice(0, 8),
        tokenHash: hashToken(token)
    };
}

export function hashToken(token: string) {
    const hash = createHash('sha256');
    hash.update(`${DEFAULT_SECRET}:${token}`);
    return hash.digest('hex');
}
