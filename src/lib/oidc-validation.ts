import { logger } from '@/lib/logger';

export type OidcValidationResult = {
  isValid: boolean;
  error?: string;
};

export async function validateOidcConnection(issuer: string): Promise<OidcValidationResult> {
  try {
    // 1. Discovery Check: Fetch .well-known configuration
    // Ensure issuer doesn't end with slash to avoid double slash
    const normalizedIssuer = issuer.replace(/\/$/, '');
    const discoveryUrl = `${normalizedIssuer}/.well-known/openid-configuration`;

    logger.info(`[OIDC Validation] Checking discovery URL: ${discoveryUrl}`);

    const response = await fetch(discoveryUrl, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(5000), // 5s timeout
    });

    if (!response.ok) {
      logger.warn(`[OIDC Validation] Discovery failed with status: ${response.status}`);
      return {
        isValid: false,
        error: `Could not connect to Issuer URL (Status: ${response.status}). Please verify the URL.`,
      };
    }

    const config = await response.json();

    // 2. Metadata Check: Verify required endpoints exist
    if (!config.authorization_endpoint || !config.token_endpoint) {
      return {
        isValid: false,
        error:
          'Issuer metadata is missing required endpoints (authorization_endpoint, token_endpoint).',
      };
    }

    // 3. Algorithm Check: Verify RS256 support (NextAuth default)
    // Note: Some providers might not list it explicitly if they only support one, but it's good to check if array exists.
    if (Array.isArray(config.id_token_signing_alg_values_supported)) {
      if (!config.id_token_signing_alg_values_supported.includes('RS256')) {
        return {
          isValid: false,
          error: 'Identity Provider uses unsupported signing algorithms. RS256 is required.',
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
