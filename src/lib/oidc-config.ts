import prisma from '@/lib/prisma';
import { decrypt } from '@/lib/encryption';
import { logger } from '@/lib/logger';

type OidcConfigRecord = {
    enabled: boolean;
    issuer: string;
    clientId: string;
    clientSecret: string;
    autoProvision: boolean;
    allowedDomains: string[];
};

export type OidcConfig = {
    enabled: boolean;
    issuer: string;
    clientId: string;
    clientSecret: string;
    autoProvision: boolean;
    allowedDomains: string[];
};

export type OidcPublicConfig = {
    enabled: boolean;
    issuer: string | null;
    clientId: string | null;
    autoProvision: boolean;
    allowedDomains: string[];
};

function normalizeDomains(domains: string[]) {
    return domains
        .map((domain) => domain.trim().toLowerCase())
        .filter(Boolean);
}

async function getOidcConfigRecord(): Promise<OidcConfigRecord | null> {
    const config = await prisma.oidcConfig.findFirst({
        orderBy: { updatedAt: 'desc' }
    });

    if (!config) {
        return null;
    }

    return {
        enabled: config.enabled,
        issuer: config.issuer,
        clientId: config.clientId,
        clientSecret: config.clientSecret,
        autoProvision: config.autoProvision,
        allowedDomains: config.allowedDomains ?? []
    };
}

export async function getOidcConfig(): Promise<OidcConfig | null> {
    const config = await getOidcConfigRecord();
    if (!config || !config.enabled) {
        return null;
    }

    if (!config.issuer || !config.clientId || !config.clientSecret) {
        return null;
    }

    try {
        const clientSecret = decrypt(config.clientSecret);
        return {
            enabled: config.enabled,
            issuer: config.issuer,
            clientId: config.clientId,
            clientSecret,
            autoProvision: config.autoProvision,
            allowedDomains: normalizeDomains(config.allowedDomains)
        };
    } catch (error) {
        logger.error('[OIDC] Failed to decrypt client secret', { error });
        return null;
    }
}

export async function getOidcPublicConfig(): Promise<OidcPublicConfig | null> {
    const config = await getOidcConfigRecord();
    if (!config) {
        return null;
    }

    return {
        enabled: config.enabled,
        issuer: config.issuer || null,
        clientId: config.clientId || null,
        autoProvision: config.autoProvision,
        allowedDomains: normalizeDomains(config.allowedDomains)
    };
}
