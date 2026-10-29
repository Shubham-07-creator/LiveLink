import { URL } from 'node:url';
import dns from 'node:dns/promises';

/**
 * Validates that a URL does NOT resolve to a private, loopback, or metadata IP address
 * Protects against Server-Side Request Forgery (SSRF)
 */
export async function validateSafeUrl(rawUrl: string): Promise<{ isSafe: boolean; error?: string }> {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return { isSafe: false, error: 'Invalid URL format' };
  }

  // Only allow HTTP and HTTPS
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return { isSafe: false, error: 'Only http and https protocols are permitted' };
  }

  const hostname = parsed.hostname.toLowerCase();

  // Block localhost aliases
  if (
    hostname === 'localhost' ||
    hostname.endsWith('.localhost') ||
    hostname === '127.0.0.1' ||
    hostname === '::1' ||
    hostname === '0.0.0.0'
  ) {
    return { isSafe: false, error: 'Access to loopback addresses is forbidden' };
  }

  // Block cloud metadata endpoints
  if (hostname === '169.254.169.254' || hostname === 'metadata.google.internal') {
    return { isSafe: false, error: 'Access to cloud instance metadata is forbidden' };
  }

  try {
    const lookup = await dns.lookup(hostname);
    const ip = lookup.address;

    // Check IPv4 private ranges
    if (isPrivateIPv4(ip)) {
      return { isSafe: false, error: `Access to internal network IP (${ip}) is forbidden` };
    }

    return { isSafe: true };
  } catch {
    return { isSafe: false, error: 'Could not resolve domain name' };
  }
}

function isPrivateIPv4(ip: string): boolean {
  const parts = ip.split('.').map(Number);
  if (parts.length !== 4 || parts.some(isNaN)) return true;

  // 10.0.0.0/8
  if (parts[0] === 10) return true;
  // 172.16.0.0/12
  if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;
  // 192.168.0.0/16
  if (parts[0] === 192 && parts[1] === 168) return true;
  // 127.0.0.0/8
  if (parts[0] === 127) return true;
  // 169.254.0.0/16 (Link Local)
  if (parts[0] === 169 && parts[1] === 254) return true;
  // 0.0.0.0/8
  if (parts[0] === 0) return true;

  return false;
}
