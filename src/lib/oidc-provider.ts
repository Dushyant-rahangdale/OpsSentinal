export type OidcProviderType = 'google' | 'okta' | 'azure' | 'auth0' | 'custom';

/**
 * Detect the built-in provider family from an OIDC issuer hostname.
 *
 * Hostname matching is intentionally strict: provider detection is used by
 * authentication policy as well as UI branding, so substring matches such as
 * `google.example.com` must never be treated as Google.
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

  if (
    hostname === 'okta.com' ||
    hostname.endsWith('.okta.com') ||
    hostname.endsWith('.okta-emea.com') ||
    hostname.includes('.okta.')
  ) {
    return 'okta';
  }

  const microsoftHosts = [
    'login.microsoftonline.com',
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

export function normalizeOidcProviderType(
  storedProviderType: string | null | undefined,
  issuerUrl: string | null | undefined
): OidcProviderType {
  if (
    storedProviderType === 'google' ||
    storedProviderType === 'okta' ||
    storedProviderType === 'azure' ||
    storedProviderType === 'auth0' ||
    storedProviderType === 'custom'
  ) {
    return storedProviderType;
  }
  return detectOidcProviderType(issuerUrl);
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
 * because issuer + subject are cryptographically validated by OIDC and ACTIVE
 * account linking still requires the one-time admin approval.
 */
export function hasOidcEmailLinkAssurance(
  providerType: string | null | undefined,
  emailVerifiedClaim: boolean | undefined
): boolean {
  return emailVerifiedClaim === true ||
    (providerType === 'azure' && emailVerifiedClaim === undefined);
}
