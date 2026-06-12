import { createHmac, timingSafeEqual } from 'node:crypto';

function toBase64Url(value: string): string {
  return Buffer.from(value)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

export function getN8nBridgeApiKeySecret(): string | null {
  return process.env.N8N_BRIDGE_API_KEY_SECRET?.trim() || null;
}

export function createN8nApiKey(walletAddress: string, secret = getN8nBridgeApiKeySecret()): string {
  if (!secret) {
    throw new Error('N8N_BRIDGE_API_KEY_SECRET is required');
  }

  return createHmac('sha256', secret).update(walletAddress).digest('hex');
}

export function validateN8nApiKey(
  walletAddress: string,
  key: string | undefined,
  secret = getN8nBridgeApiKeySecret(),
): boolean {
  if (!key || !secret) return false;

  const expected = createN8nApiKey(walletAddress, secret);
  const expectedBuffer = Buffer.from(expected, 'utf8');
  const providedBuffer = Buffer.from(key, 'utf8');

  if (expectedBuffer.length !== providedBuffer.length) return false;
  return timingSafeEqual(expectedBuffer, providedBuffer);
}

export function createN8nEmbedToken(
  walletAddress: string,
  ttlSeconds = 300,
  secret = getN8nBridgeApiKeySecret(),
): string {
  if (!secret) {
    throw new Error('N8N_BRIDGE_API_KEY_SECRET is required');
  }

  const now = Math.floor(Date.now() / 1000);
  const header = toBase64Url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = toBase64Url(
    JSON.stringify({
      sub: walletAddress,
      iat: now,
      exp: now + ttlSeconds,
    }),
  );
  const signature = createHmac('sha256', secret)
    .update(`${header}.${payload}`)
    .digest('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');

  return `${header}.${payload}.${signature}`;
}
