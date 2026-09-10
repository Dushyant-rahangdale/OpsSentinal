import { beforeEach, describe, expect, it, vi } from 'vitest';

const { assertSafeOutboundUrlMock, safeOutboundFetchMock } = vi.hoisted(() => ({
  assertSafeOutboundUrlMock: vi.fn(),
  safeOutboundFetchMock: vi.fn(),
}));

vi.mock('@/lib/network-security', () => ({
  assertSafeOutboundUrl: assertSafeOutboundUrlMock,
  safeOutboundFetch: safeOutboundFetchMock,
}));

import { validateOidcConnection } from '@/lib/oidc-validation';

function makeMetadata(issuer: string, overrides: Record<string, unknown> = {}) {
  return {
    authorization_endpoint: `${issuer}/authorize`,
    token_endpoint: `${issuer}/token`,
    jwks_uri: `${issuer}/jwks`,
    id_token_signing_alg_values_supported: ['RS256'],
    issuer,
    ...overrides,
  };
}

function response(status: number, body: unknown) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: vi.fn().mockResolvedValue(body),
  } as unknown as Response;
}

function setupValidFetch(status = 200, body: unknown) {
  safeOutboundFetchMock.mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: vi.fn().mockResolvedValue(body),
    headers: { get: vi.fn() },
  } as unknown as Response);
}

describe('OIDC discovery provider matrix', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    assertSafeOutboundUrlMock.mockReset();
    assertSafeOutboundUrlMock.mockResolvedValue(undefined);
    safeOutboundFetchMock.mockReset();
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
    setupValidFetch(200, makeMetadata(issuer));

    const result = await validateOidcConnection(issuer);

    expect(result).toEqual({ isValid: true });
    expect(safeOutboundFetchMock).toHaveBeenCalledWith(
      expectedDiscoveryUrl,
      expect.objectContaining({ method: 'GET' })
    );
    expect(assertSafeOutboundUrlMock).toHaveBeenCalledWith(expectedDiscoveryUrl, {
      requireHttps: true,
    });
  });

  it('rejects non-HTTPS issuers before network access', async () => {
    const result = await validateOidcConnection('http://identity.example.com');

    expect(result.isValid).toBe(false);
    expect(result.error).toMatch(/HTTPS/i);
    expect(safeOutboundFetchMock).not.toHaveBeenCalled();
  });

  it('rejects redirects from discovery to avoid validating a different issuer', async () => {
    setupValidFetch(302, makeMetadata('https://identity.example.com'));

    const result = await validateOidcConnection('https://identity.example.com');

    expect(result.isValid).toBe(false);
    expect(result.error).toMatch(/redirect/i);
  });

  it('rejects metadata with unsafe endpoints', async () => {
    setupValidFetch(
      200,
      makeMetadata('https://identity.example.com', {
        token_endpoint: 'https://127.0.0.1/token',
      })
    );
    assertSafeOutboundUrlMock.mockImplementation(async (url: string) => {
      if (url.includes('127.0.0.1')) throw new Error('restricted');
    });

    const result = await validateOidcConnection('https://identity.example.com');

    expect(result.isValid).toBe(false);
    expect(result.error).toMatch(/unsafe|non-HTTPS/i);
  });

  it('rejects providers without an approved asymmetric ID-token algorithm', async () => {
    setupValidFetch(
      200,
      makeMetadata('https://identity.example.com', {
        id_token_signing_alg_values_supported: ['HS256'],
      })
    );

    const result = await validateOidcConnection('https://identity.example.com');

    expect(result.isValid).toBe(false);
    expect(result.error).toMatch(/RS256|ES256/);
  });
});
