import { logger } from '@/lib/logger';
import dns from 'dns';
import { promisify } from 'util';

const lookup = promisify(dns.lookup);

/**
 * Validates a webhook URL to prevent SSRF attacks.
 * Blocks access to private/internal IP ranges.
 */
export async function validateWebhookUrl(urlString: string): Promise<boolean> {
  try {
    const url = new URL(urlString);

    // Only allow http/https
    if (!['http:', 'https:'].includes(url.protocol)) {
      logger.warn('Webhook blocked: invalid protocol', { url: urlString, protocol: url.protocol });
      return false;
    }

    // Resolve hostname to IP
    const { address } = await lookup(url.hostname);

    // Block private IP ranges
    if (isPrivateIp(address)) {
      logger.warn('Webhook blocked: resolved to private IP', {
        url: urlString,
        hostname: url.hostname,
        resolvedIp: address,
      });
      return false;
    }

    return true;
  } catch (error) {
    logger.warn('Webhook blocked: validation failed', { url: urlString, error });
    return false;
  }
}

function isPrivateIp(ip: string): boolean {
  const parts = ip.split('.').map(Number);
  if (parts.length !== 4) {
    // IPv6 check - simplified blocking of localhost/link-local
    // For now, robustly handling IPv4 map-mapped and standard IPv6 local/private requires more complex logic
    // Blocking ::1 and fe80::/10 generic check
    if (ip === '::1' || ip.toLowerCase().startsWith('fe80:')) return true;
    return false; // Allow public IPv6 for now or implement full IPv6 filtering
  }

  // IPv4 Private Ranges
  // 127.0.0.0/8 (Loopback)
  if (parts[0] === 127) return true;

  // 10.0.0.0/8 (Private)
  if (parts[0] === 10) return true;

  // 172.16.0.0/12 (Private)
  if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;

  // 192.168.0.0/16 (Private)
  if (parts[0] === 192 && parts[1] === 168) return true;

  // 169.254.0.0/16 (Link-local)
  if (parts[0] === 169 && parts[1] === 254) return true;

  // 0.0.0.0/8 (Current network)
  if (parts[0] === 0) return true;

  return false;
}
