import type { OAuthConfig } from 'next-auth/providers/oauth';

type OIDCConfig = {
  clientId: string;
  clientSecret: string;
  issuer: string;
  customScopes?: string | null;
};

type OIDCProfile = {
  sub?: string;
  name?: string;
  preferred_username?: string;
  email?: string;
  [key: string]: any; // Allow indexing for custom claims
};

export default function OIDCProvider(config: OIDCConfig): OAuthConfig<OIDCProfile> {
  const issuer = config.issuer.replace(/\/$/, '');
  const scopes = `openid email profile ${config.customScopes || ''}`.trim();

  return {
    id: 'oidc',
    name: 'SSO',
    type: 'oauth',
    wellKnown: `${issuer}/.well-known/openid-configuration`,
    issuer,
    clientId: config.clientId,
    clientSecret: config.clientSecret,
    authorization: { params: { scope: scopes } },
    idToken: true,
    checks: ['pkce', 'state'],
    profile(profile) {
      return {
        id: profile.sub ?? '',
        name: profile.name ?? profile.preferred_username ?? profile.email ?? null,
        email: profile.email ?? null,
      };
    },
  };
}
