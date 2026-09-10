import type { PublicStatusBranding } from './public-contract';

function str(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

/**
 * Normalize the stored branding JSON into the typed public contract shape.
 *
 * The persisted object accumulated aliases over time (`primary`/`primaryColor`,
 * `background`/`backgroundColor`, `text`/`textColor`, `logo`/`logoUrl`); the public contract
 * exposes a single canonical key for each so no consumer has to know the history. Returns null when
 * nothing brand-worthy is present, so the contract distinguishes "no branding" from an empty object.
 */
export function projectPublicBranding(value: unknown): PublicStatusBranding | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const source = value as Record<string, unknown>;
  const branding: PublicStatusBranding = {
    ...((str(source.logoUrl) ?? str(source.logo))
      ? { logoUrl: str(source.logoUrl) ?? str(source.logo) }
      : {}),
    ...(str(source.faviconUrl) ? { faviconUrl: str(source.faviconUrl) } : {}),
    ...((str(source.primaryColor) ?? str(source.primary))
      ? { primaryColor: str(source.primaryColor) ?? str(source.primary) }
      : {}),
    ...((str(source.backgroundColor) ?? str(source.background))
      ? { backgroundColor: str(source.backgroundColor) ?? str(source.background) }
      : {}),
    ...((str(source.textColor) ?? str(source.text))
      ? { textColor: str(source.textColor) ?? str(source.text) }
      : {}),
    ...(str(source.fontFamily) ? { fontFamily: str(source.fontFamily) } : {}),
    ...(str(source.metaTitle) ? { metaTitle: str(source.metaTitle) } : {}),
    ...(str(source.metaDescription) ? { metaDescription: str(source.metaDescription) } : {}),
    ...(str(source.customCss) ? { customCss: str(source.customCss) } : {}),
  };
  return Object.keys(branding).length > 0 ? branding : null;
}
