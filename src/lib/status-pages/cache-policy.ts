/**
 * Status pages can become private or redact fields at any time. Shared caches
 * may retain a representation, but must revalidate it before every reuse so a
 * previous public response can never outlive an access-policy change.
 */
export const PUBLIC_STATUS_CACHE_CONTROL =
  'public, max-age=0, s-maxage=0, must-revalidate, no-cache';
export const PRIVATE_STATUS_CACHE_CONTROL = 'private, no-store';
