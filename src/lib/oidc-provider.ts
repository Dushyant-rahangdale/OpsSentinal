export type OidcProviderType = 'google' | 'okta' | 'azure' | 'auth0' | 'custom';

function isKnownProviderType(value: string | null | undefined): value is OidcProviderType {
  return (
    value === 'google' ||
    value === 'okta' ||
    value === 'azure' ||
    value === 'auth0' ||
    value === 'custom'
  );
}

/**
 * Detect the built-in provider family from an OIDC issuer hostname.
 *
 * Hostname matching is intentionally strict: provider detection is used by
 * authentication policy as well as UI branding, so lookalike hostnames must
 * never inherit provider-specific authentication behavior.
 */
export function detectOidcProviderType(
  issuerUrl: string | null | undefined
): OidcProviderType {
  if (!issuerUrl) return 'custom';

  let hostname: string;
  try {
    hostname = new URL(issuerUrl).hostname.toLowerCase();
  } catch {
    return 'custom';
  }

  if (
    hostname === 'accounts.google.com' ||
    hostname === 'googleapis.com' ||
    hostname.endsWith('.google.com') ||
    hostname.endsWith('.googleapis.com')
  ) {
    return 'google';
  }

  const oktaHosts = ['okta.com', 'okta-emea.com', 'oktapreview.com', 'okta-gov.com'];
  if (oktaHosts.some(host => hostname === host || hostname.endsWith(`.${host}`))) {
    return 'okta';
  }

  const microsoftHosts = [
    'login.microsoftonline.com',
    'login.microsoftonline.us',
    'login.partner.microsoftonline.cn',
    'login.microsoft.com',
    'sts.windows.net',
    'microsoftonline.com',
  ];
  if (microsoftHosts.some(host => hostname === host || hostname.endsWith(`.${host}`))) {
    return 'azure';
  }

  if (hostname === 'auth0.com' || hostname.endsWith('.auth0.com')) {
    return 'auth0';
  }

  return 'custom';
}

/**
 * The issuer is authoritative whenever it is available. A persisted provider
 * type is only a legacy fallback for rows that do not have an issuer. This is
 * important because provider type affects authentication policy and must not
 * be able to weaken that policy when it disagrees with the issuer hostname.
 *
 * The return is typed as string because persisted UI presets are extensible;
 * all values produced here are still constrained to OidcProviderType.
 */
export function normalizeOidcProviderType(
  storedProviderType: string | null | undefined,
  issuerUrl: string | null | undefined
): string {
  if (issuerUrl) return detectOidcProviderType(issuerUrl);
  return isKnownProviderType(storedProviderType) ? storedProviderType : 'custom';
}

/**
 * Microsoft Entra ID workforce tokens do not reliably include the standard
 * `email_verified` claim. Requiring that claim makes otherwise valid Entra
 * OIDC sign-ins fail. Other providers keep the operator-controlled strict
 * requirement.
 */
export function requiresOidcEmailVerifiedClaim(
  providerType: string | null | undefined,
  strictMode: boolean
): boolean {
  if (!strictMode) return false;
  return providerType !== 'azure';
}

/**
 * Email assurance used only when first linking an OIDC identity to an existing
 * OpsKnight account. Explicit `email_verified: false` is rejected for every
 * provider before this helper is consulted. Entra is allowed to omit the claim
 * because issuer + subject are cryptographically validated by OIDC; account
 * state can still require a fresh one-time administrator linking approval.
 */
export function hasOidcEmailLinkAssurance(
  providerType: string | null | undefined,
  emailVerifiedClaim: boolean | undefined
): boolean {
  return (
    emailVerifiedClaim === true ||
    (providerType === 'azure' && emailVerifiedClaim === undefined)
  );
}
