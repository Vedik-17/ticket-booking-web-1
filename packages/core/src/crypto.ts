import crypto from 'crypto';

const DEFAULT_SECRET = process.env.FIREFLY_TICKET_SECRET || 'firefly-default-dev-signature-secret-key-2026';

/**
 * Deterministic hash fallback for browser contexts where Node's crypto is unavailable
 */
function fallbackHash(data: string, secret: string): string {
  let h1 = 0xdeadbeef ^ secret.length;
  let h2 = 0x41c64e6d ^ data.length;
  for (let i = 0; i < secret.length; i++) {
    const ch = secret.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  for (let i = 0; i < data.length; i++) {
    const ch = data.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2246822507);
    h2 = Math.imul(h2 ^ ch, 3266489909);
  }
  h1 ^= Math.imul(h1 ^ (h2 >>> 15), 2246822507);
  h2 ^= Math.imul(h2 ^ (h1 >>> 13), 3266489909);
  const p1 = (h1 >>> 0).toString(16).padStart(8, '0');
  const p2 = (h2 >>> 0).toString(16).padStart(8, '0');
  const p3 = ((h1 ^ h2) >>> 0).toString(16).padStart(8, '0');
  const p4 = ((h1 + h2) >>> 0).toString(16).padStart(8, '0');
  return `${p1}${p2}${p3}${p4}`;
}

/**
 * Constant-time string equality check (universal: works in browser and Node)
 */
function safeTimingEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

/**
 * Generates an HMAC SHA256 signature for ticket payloads (Node crypto with browser fallback)
 */
export function signTicketPayload(ticketId: string, eventId: string, token: string, secret = DEFAULT_SECRET): string {
  const data = `${ticketId}:${eventId}:${token}`;
  if (crypto && typeof crypto.createHmac === 'function') {
    return crypto.createHmac('sha256', secret).update(data).digest('hex').substring(0, 32);
  }
  return fallbackHash(data, secret);
}

/**
 * Validates whether the HMAC signature matches the ticket payload
 */
export function verifyTicketSignature(
  ticketId: string,
  eventId: string,
  token: string,
  signature: string,
  secret = DEFAULT_SECRET
): boolean {
  const expected = signTicketPayload(ticketId, eventId, token, secret);
  return safeTimingEqual(expected, signature);
}

/**
 * Encodes a verified QR payload string: "FF1.<ticketId>.<eventId>.<token>.<signature>"
 */
export function buildQrPayload(ticketId: string, eventId: string, token: string, secret = DEFAULT_SECRET): string {
  const sig = signTicketPayload(ticketId, eventId, token, secret);
  return `FF1.${ticketId}.${eventId}.${token}.${sig}`;
}

/**
 * Decodes and validates a QR payload format
 */
export function parseQrPayload(payload: string): {
  version: string;
  ticketId: string;
  eventId: string;
  token: string;
  signature: string;
} | null {
  if (!payload || !payload.startsWith('FF1.')) {
    return null;
  }

  const parts = payload.split('.');
  if (parts.length !== 5) {
    return null;
  }

  return {
    version: parts[0],
    ticketId: parts[1],
    eventId: parts[2],
    token: parts[3],
    signature: parts[4],
  };
}

/**
 * Generates high-entropy crypto random hex token (universal)
 */
export function generateSecureToken(byteCount = 16): string {
  if (typeof globalThis !== 'undefined' && globalThis.crypto && typeof globalThis.crypto.getRandomValues === 'function') {
    const arr = new Uint8Array(byteCount);
    globalThis.crypto.getRandomValues(arr);
    return Array.from(arr, (b) => b.toString(16).padStart(2, '0')).join('');
  }
  let str = '';
  for (let i = 0; i < byteCount; i++) {
    str += Math.floor(Math.random() * 256).toString(16).padStart(2, '0');
  }
  return str;
}
