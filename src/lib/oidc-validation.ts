import { logger } from '@/lib/logger';
import { assertSafeOutboundUrl, safeOutboundFetch } from '@/lib/network-security';

export type OidcValidationResult = {
  isValid: boolean;
  error?: string;
};

function hasQueryOrHash(urlObj: URL): boolean {
  const hasQuery = !!urlObj.search;
  const hasHash = !!urlObj.hash;
  return hasQuery || hasHash;
}

function isPrivateOrLocalHostname(hostname: string): boolean {
  const lower = hostname.toLowerCase();

  // Disallow obvious local names
  if (['localhost', '0.0.0.0', '127.0.0.1', '::1'].includes(lower)) {
    return true;
  }

  if (lower.endsWith('.local') || lower.endsWith('.internal')) {
    return true;
  }

  // Basic private IPv4 ranges
  if (/^10\./.test(lower)) return true;
  if (/^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(lower)) return true;
  if (/^192\.168\./.test(lower)) return true;

  return false;
}

/**
 * Normalize an issuer for comparison: strip trailing slashes and lowercase
 * the scheme+host (path remains case-sensitive per OIDC).
 */
function normalizeIssuerForComparison(issuer: string): string {
  const parsed = new URL(issuer);
  const scheme = parsed.protocol.toLowerCase();
  const host = parsed.host.toLowerCase();
  return `${scheme}//${host}${parsed.pathname.replace(/\/+$/, '')}`;
}

export async function validateOidcConnection(issuer: string): Promise<OidcValidationResult> {
  try {
    // 1. Parse and validate the input
    const trimmedIssuer = issuer?.trim();
    if (!trimmedIssuer) {
      return { isValid: false, error: 'Issuer URL is required.' };
    }

    // 2. Parse the URL — this validates structure
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(trimmedIssuer);
    } catch {
      return { isValid: false, error: 'Invalid Issuer URL format.' };
    }

    // 3. Enforce HTTPS
    if (parsedUrl.protocol !== 'https:') {
      return {
        isValid: false,
        error: 'OIDC issuer must use HTTPS for security. HTTP URLs are not allowed.',
      };
    }

    // 4. Reject URLs with queries or fragments
    if (hasQueryOrHash(parsedUrl)) {
      return {
        isValid: false,
        error: 'Issuer URL must not include a query string or fragment.',
      };
    }

    // 5. Extract and validate hostname
    const validatedHostname = parsedUrl.hostname.toLowerCase();
    const port = parsedUrl.port; // preserve non-standard ports

    if (!validatedHostname) {
      return { isValid: false, error: 'Issuer URL has no hostname.' };
    }

    if (isPrivateOrLocalHostname(validatedHostname)) {
      logger.warn(
        `[OIDC Validation] SSRF attempt blocked for internal hostname: ${validatedHostname}`
      );
      return {
        isValid: false,
        error: 'OIDC issuer cannot be an internal or private address.',
      };
    }

    // 5b. Microsoft Entra multi-tenant endpoints (`common` / `organizations`)
    // authenticate users from ANY Entra tenant.  Per Microsoft guidance,
    // applications must explicitly validate the tenant; without a tenant
    // allowlist model this is unsafe, so reject them and require a
    // tenant-specific issuer (e.g. https://login.microsoftonline.com/<tenant-id>).
    if (
      validatedHostname === 'login.microsoftonline.com' ||
      validatedHostname.endsWith('.login.microsoftonline.com')
    ) {
      const lastSegment = parsedUrl.pathname.split('/').filter(Boolean).pop()?.toLowerCase();
      if (lastSegment === 'common' || lastSegment === 'organizations') {
        logger.warn('[OIDC Validation] Entra multi-tenant endpoint rejected', {
          component: 'oidc-validation',
          hostname: validatedHostname,
          tenant: lastSegment,
        });
        return {
          isValid: false,
          error:
            'Microsoft Entra multi-tenant issuer endpoints (common / organizations) are not allowed. Configure a tenant-specific issuer URL (e.g. https://login.microsoftonline.com/<tenant-id>).',
        };
      }
    }

    // 6. Build the discovery URL from validated primitives.
    const cleanPath = parsedUrl.pathname.replace(/\/+$/, '');
    const pathSegments = cleanPath.split('/').filter(Boolean);
    if (pathSegments.some(seg => !/^[a-zA-Z0-9._-]+$/.test(seg))) {
      return {
        isValid: false,
        error: 'Issuer URL path contains invalid characters.',
      };
    }
    const safePath = pathSegments.join('/');
    const safeHost = port ? `${validatedHostname}:${port}` : validatedHostname;
    const discoveryUrl = safePath
      ? `https://${safeHost}/${safePath}/.well-known/openid-configuration`
      : `https://${safeHost}/.well-known/openid-configuration`;

    logger.info(`[OIDC Validation] Checking discovery URL: ${discoveryUrl}`);

    try {
      await assertSafeOutboundUrl(discoveryUrl, { requireHttps: true });
    } catch {
      return { isValid: false, error: 'OIDC issuer resolves to a restricted network address.' };
    }

    // Fetch through the same socket-resolving safe dispatcher used elsewhere,
    // closing the DNS-rebinding / TOCTOU gap between the URL check above and
    // the actual socket connection.
    const response = await safeOutboundFetch(discoveryUrl, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(5000),
    });

    if (response.status >= 300 && response.status < 400) {
      return {
        isValid: false,
        error: 'OIDC discovery redirects are not allowed. Configure the canonical issuer URL.',
      };
    }

    if (!response.ok) {
      logger.warn(`[OIDC Validation] Discovery failed with status: ${response.status}`);
      return {
        isValid: false,
        error: `Could not connect to Issuer URL (Status: ${response.status}). Please verify the URL.`,
      };
    }

    const config = await response.json();

    // 1. Issuer Check: the discovery document `issuer` value must exactly
    //    match the issuer used to retrieve the configuration (OIDC Discovery
    //    §4, RFC 8414 §2).  This prevents a compromised/incorrect discovery
    //    document from redirecting authentication flows to an unexpected IdP.
    if (typeof config.issuer !== 'string' || !config.issuer) {
      return {
        isValid: false,
        error: 'Issuer metadata is missing the required "issuer" field.',
      };
    }

    const expectedIssuer = normalizeIssuerForComparison(trimmedIssuer);
    const metadataIssuer = normalizeIssuerForComparison(config.issuer);
    if (metadataIssuer !== expectedIssuer) {
      logger.warn('[OIDC Validation] Discovery issuer mismatch', {
        component: 'oidc-validation',
        configuredIssuer: trimmedIssuer,
        metadataIssuer: config.issuer,
      });
      return {
        isValid: false,
        error:
          'Issuer metadata "issuer" field does not match the configured issuer URL. Configure the exact issuer returned by the identity provider.',
      };
    }

    // 2. Metadata Check: Verify required endpoints exist
    if (!config.authorization_endpoint || !config.token_endpoint || !config.jwks_uri) {
      return {
        isValid: false,
        error:
          'Issuer metadata is missing required endpoints (authorization_endpoint, token_endpoint, jwks_uri).',
      };
    }

    for (const endpoint of [
      config.authorization_endpoint,
      config.token_endpoint,
      config.jwks_uri,
    ]) {
      try {
        await assertSafeOutboundUrl(String(endpoint), { requireHttps: true });
      } catch {
        return {
          isValid: false,
          error: 'Issuer metadata contains an unsafe or non-HTTPS endpoint.',
        };
      }
    }

    // 3. Algorithm Check: permit asymmetric enterprise-safe algorithms only.
    if (Array.isArray(config.id_token_signing_alg_values_supported)) {
      const permittedAlgorithms = new Set(['RS256', 'ES256']);
      if (
        !config.id_token_signing_alg_values_supported.some((alg: unknown) =>
          permittedAlgorithms.has(String(alg))
        )
      ) {
        return {
          isValid: false,
          error: 'Identity Provider must support RS256 or ES256 ID-token signing.',
        };
      }
    }

    return { isValid: true };
  } catch (error) {
    logger.error('[OIDC Validation] Connection error', { error });

    // Distinguish between network errors and others
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    if (errorMessage.includes('fetch failed') || errorMessage.includes('timeout')) {
      return {
        isValid: false,
        error: 'Failed to connect to Issuer URL. Please check your network or the URL.',
      };
    }

    return {
      isValid: false,
      error: `Validation failed: ${errorMessage}`,
    };
  }
}
