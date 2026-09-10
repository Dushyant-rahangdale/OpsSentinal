import type { OidcClaims } from '@/lib/oidc/provider-policy';

export function boundedStringClaim(
  claims: OidcClaims,
  name: string,
  maximumLength: number
): string | null {
  // eslint-disable-next-line security/detect-object-injection -- read-only lookup on an untrusted claims bag
  const value = claims[name];
  if (typeof value !== 'string') return null;
  const normalized = value.trim();
  if (!normalized || normalized.length > maximumLength) return null;
  return normalized;
}

export function boundedStringArrayClaim(
  claims: OidcClaims,
  name: string,
  limits: { maximumItems: number; maximumItemLength: number }
): string[] | null {
  // eslint-disable-next-line security/detect-object-injection -- read-only lookup on an untrusted claims bag
  const value = claims[name];
  if (!Array.isArray(value) || value.length > limits.maximumItems) return null;
  if (!value.every(item => typeof item === 'string' && item.length <= limits.maximumItemLength)) {
    return null;
  }
  return value;
}
