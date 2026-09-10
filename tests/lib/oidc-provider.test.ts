import { describe, expect, it } from 'vitest';
import {
  detectOidcProviderType,
  hasOidcEmailLinkAssurance,
  normalizeOidcProviderType,
  requiresOidcEmailVerifiedClaim,
} from '@/lib/oidc-provider';

describe('OIDC provider compatibility policy', () => {
  it.each([
    ['https://accounts.google.com', 'google'],
    ['https://acme.okta.com/oauth2/default', 'okta'],
    ['https://login.microsoftonline.com/aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee/v2.0', 'azure'],
    ['https://acme.us.auth0.com/', 'auth0'],
    ['https://login.example.com/oidc', 'custom'],
  ])('detects %s as %s', (issuer, expected) => {
    expect(detectOidcProviderType(issuer)).toBe(expected);
  });

  it.each([
    'https://google.example.com',
    'https://okta.example.com',
    'https://microsoftonline.example.com',
    'https://auth0.example.com',
  ])('does not trust lookalike provider hostname %s', issuer => {
    expect(detectOidcProviderType(issuer)).toBe('custom');
  });

  it('prefers a valid persisted provider type and falls back to issuer detection', () => {
    expect(
      normalizeOidcProviderType(
        'azure',
        'https://login.microsoftonline.com/tenant-id/v2.0'
      )
    ).toBe('azure');
    expect(
      normalizeOidcProviderType(
        null,
        'https://login.microsoftonline.com/tenant-id/v2.0'
      )
    ).toBe('azure');
    expect(normalizeOidcProviderType('unexpected', 'https://accounts.google.com')).toBe('google');
  });

  it('allows Entra to omit email_verified even when strict mode is enabled', () => {
    expect(requiresOidcEmailVerifiedClaim('azure', true)).toBe(false);
    expect(requiresOidcEmailVerifiedClaim('google', true)).toBe(true);
    expect(requiresOidcEmailVerifiedClaim('custom', true)).toBe(true);
    expect(requiresOidcEmailVerifiedClaim('custom', false)).toBe(false);
  });

  it('treats a missing email_verified claim as sufficient only for Entra linking', () => {
    expect(hasOidcEmailLinkAssurance('azure', undefined)).toBe(true);
    expect(hasOidcEmailLinkAssurance('google', undefined)).toBe(false);
    expect(hasOidcEmailLinkAssurance('custom', undefined)).toBe(false);
    expect(hasOidcEmailLinkAssurance('custom', true)).toBe(true);
    expect(hasOidcEmailLinkAssurance('azure', false)).toBe(false);
  });
});
