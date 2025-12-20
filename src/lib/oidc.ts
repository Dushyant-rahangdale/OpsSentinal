import type { OAuthConfig } from 'next-auth/providers/oauth';

type OIDCConfig = {
    clientId: string;
    clientSecret: string;
    issuer: string;
};

type OIDCProfile = {
    sub?: string;
    name?: string;
    preferred_username?: string;
    email?: string;
};

export default function OIDCProvider(config: OIDCConfig): OAuthConfig<OIDCProfile> {
    const issuer = config.issuer.replace(/\/$/, '');

    return {
        id: 'oidc',
        name: 'SSO',
        type: 'oauth',
        wellKnown: `${issuer}/.well-known/openid-configuration`,
        issuer,
        clientId: config.clientId,
        clientSecret: config.clientSecret,
        authorization: { params: { scope: 'openid email profile' } },
        idToken: true,
        checks: ['pkce', 'state'],
        profile(profile) {
            return {
                id: profile.sub ?? '',
                name: profile.name ?? profile.preferred_username ?? profile.email ?? null,
                email: profile.email ?? null
            };
        }
    };
}
