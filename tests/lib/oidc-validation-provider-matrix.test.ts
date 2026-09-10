import { beforeEach, describe, expect, it, vi } from 'vitest';

const { assertSafeOutboundUrlMock } = vi.hoisted(() => ({
  assertSafeOutboundUrlMock: vi.fn(),
}));

vi.mock('@/lib/network-security', () => ({
  assertSafeOutboundUrl: assertSafeOutboundUrlMock,
}));

import { validateOidcConnection } from '@/lib/oidc-validation';

const metadata = {
  authorization_endpoint: 'https://idp.example.com/authorize',
  token_endpoint: 'https://idp.example.com/token',
  jwks_uri: 'https://idp.example.com/jwks',
  id_token_signing_alg_values_supported: ['RS256'],
};

function response(status: number, body: unknown = metadata) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: vi.fn().mockResolvedValue(body),
  } as unknown as Response;
}

describe('OIDC discovery provider matrix', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    assertSafeOutboundUrlMock.mockReset();
    assertSafeOutboundUrlMock.mockResolvedValue(undefined);
  });

  it.each([
    [
      'Google',
      'https://accounts.google.com',
      'https://accounts.google.com/.well-known/openid-configuration',
    ],
    [
      'Microsoft Entra ID',
      'https://login.microsoftonline.com/aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee/v2.0',
      'https://login.microsoftonline.com/aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee/v2.0/.well-known/openid-configuration',
    ],
    [
      'Okta',
      'https://acme.okta.com/oauth2/default',
      'https://acme.okta.com/oauth2/default/.well-known/openid-configuration',
    ],
    [
      'Auth0',
      'https://acme.us.auth0.com/',
      'https://acme.us.auth0.com/.well-known/openid-configuration',
    ],
    [
      'Custom OIDC',
      'https://identity.example.com/oidc',
      'https://identity.example.com/oidc/.well-known/openid-configuration',
    ],
  ])('validates %s discovery metadata', async (_provider, issuer, expectedDiscoveryUrl) => {
    const fetchMock = vi.fn().mockResolvedValue(response(200));
    vi.stubGlobal('fetch', fetchMock);

    const result = await validateOidcConnection(issuer);

    expect(result).toEqual({ isValid: true });
    expect(fetchMock).toHaveBeenCalledWith(
      expectedDiscoveryUrl,
      expect.objectContaining({ method: 'GET', redirect: 'manual' })
    );
    expect(assertSafeOutboundUrlMock).toHaveBeenCalledWith(expectedDiscoveryUrl, {
      requireHttps: true,
    });
  });

  it('rejects non-HTTPS issuers before network access', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const result = await validateOidcConnection('http://identity.example.com');

    expect(result.isValid).toBe(false);
    expect(result.error).toMatch(/HTTPS/i);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('rejects redirects from discovery to avoid validating a different issuer', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response(302)));

    const result = await validateOidcConnection('https://identity.example.com');

    expect(result.isValid).toBe(false);
    expect(result.error).toMatch(/redirect/i);
  });

  it('rejects metadata with unsafe endpoints', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        response(200, {
          ...metadata,
          token_endpoint: 'https://127.0.0.1/token',
        })
      )
    );
    assertSafeOutboundUrlMock.mockImplementation(async (url: string) => {
      if (url.includes('127.0.0.1')) throw new Error('restricted');
    });

    const result = await validateOidcConnection('https://identity.example.com');

    expect(result.isValid).toBe(false);
    expect(result.error).toMatch(/unsafe|non-HTTPS/i);
  });

  it('rejects providers without an approved asymmetric ID-token algorithm', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        response(200, {
          ...metadata,
          id_token_signing_alg_values_supported: ['HS256'],
        })
      )
    );

    const result = await validateOidcConnection('https://identity.example.com');

    expect(result.isValid).toBe(false);
    expect(result.error).toMatch(/RS256|ES256/);
  });
});
