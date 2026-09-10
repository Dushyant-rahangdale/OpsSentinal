import { describe, expect, it } from 'vitest';
import { getOidcProviderPolicy } from '@/lib/oidc/provider-policy';

describe('OIDC provider security policy registry', () => {
  it('derives Entra relaxation only from a validated Microsoft authority', () => {
    expect(
      getOidcProviderPolicy(
        'https://login.microsoftonline.com/tenant/v2.0'
      ).allowsMissingEmailVerified()
    ).toBe(true);
    expect(
      getOidcProviderPolicy('https://login.example.com/tenant/v2.0').allowsMissingEmailVerified()
    ).toBe(false);
  });

  it('locks Google security policy to the canonical issuer', () => {
    const policy = getOidcProviderPolicy('https://accounts.google.com');
    expect(policy.family).toBe('google');
    expect(policy.validateIssuer(new URL('https://accounts.google.com'))).toBe(true);
    expect(policy.validateIssuer(new URL('https://evil.google.com'))).toBe(false);
  });

  it('enforces Auth0 enterprise token algorithms independently of custom UI labels', () => {
    expect(getOidcProviderPolicy('https://tenant.auth0.com').acceptedIdTokenAlgorithms).toEqual([
      'RS256',
    ]);
    expect(getOidcProviderPolicy('https://login.example.com').acceptedIdTokenAlgorithms).toEqual([
      'RS256',
      'ES256',
    ]);
  });
});
