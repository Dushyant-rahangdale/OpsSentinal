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
  roleMapping?: any;
  customScopes?: string | null;
  providerType?: string | null;
  providerLabel?: string | null;
  profileMapping?: Record<string, string> | null;
};

export type OidcConfig = {
  enabled: boolean;
  issuer: string;
  clientId: string;
  clientSecret: string;
  autoProvision: boolean;
  allowedDomains: string[];
  roleMapping?: any;
  customScopes?: string | null;
  providerType?: string | null;
  providerLabel?: string | null;
  profileMapping?: Record<string, string> | null;
};

export type OidcPublicConfig = {
  enabled: boolean;
  issuer: string | null;
  clientId: string | null;
  autoProvision: boolean;
  allowedDomains: string[];
  providerType?: string | null;
  providerLabel?: string | null;
};

function normalizeDomains(domains: string[]) {
  return domains.map(domain => domain.trim().toLowerCase()).filter(Boolean);
}

async function getOidcConfigRecord(): Promise<OidcConfigRecord | null> {
  try {
    const config = await prisma.oidcConfig.findFirst({
      orderBy: { updatedAt: 'desc' },
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
      allowedDomains: config.allowedDomains ?? [],
      roleMapping: config.roleMapping,
      customScopes: config.customScopes,
      providerType: config.providerType,
      providerLabel: config.providerLabel,
      profileMapping: config.profileMapping as Record<string, string> | null,
    };
  } catch (error) {
    // Database connection error or other Prisma errors
    // Return null to allow app to function without OIDC when DB is unavailable
    logger.error('[OIDC] Failed to fetch OIDC config from database', { error });
    return null;
  }
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
    const clientSecret = await decrypt(config.clientSecret);
    return {
      enabled: config.enabled,
      issuer: config.issuer,
      clientId: config.clientId,
      clientSecret,
      autoProvision: config.autoProvision,
      allowedDomains: normalizeDomains(config.allowedDomains),
      roleMapping: config.roleMapping,
      customScopes: config.customScopes,
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
    allowedDomains: normalizeDomains(config.allowedDomains),
    providerType: config.providerType,
    providerLabel: config.providerLabel,
  };
}

export async function checkOidcIntegrity(): Promise<{ ok: boolean; error?: string }> {
  const config = await getOidcConfigRecord();
  if (!config || !config.enabled) {
    return { ok: true }; // Not enabled, so technically healthy
  }

  if (!config.clientSecret) {
    return { ok: false, error: 'Client Secret is missing' };
  }

  try {
    await decrypt(config.clientSecret);
    return { ok: true };
  } catch (error) {
    logger.error('[OIDC] Integrity check failed', { error });
    return {
      ok: false,
      error: 'Failed to decrypt Client Secret. The Encryption Key may have changed.',
    };
  }
}
