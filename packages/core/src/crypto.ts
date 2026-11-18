import crypto from 'crypto';

const DEFAULT_SECRET = process.env.FIREFLY_TICKET_SECRET || 'firefly-default-dev-signature-secret-key-2026';

/**
 * Generates an HMAC SHA256 signature for ticket payloads
 */
export function signTicketPayload(ticketId: string, eventId: string, token: string, secret = DEFAULT_SECRET): string {
  const data = `${ticketId}:${eventId}:${token}`;
  return crypto.createHmac('sha256', secret).update(data).digest('hex').substring(0, 32);
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
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  } catch {
    return false;
  }
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
 * Generates high-entropy crypto random hex token
 */
export function generateSecureToken(bytes = 16): string {
  return crypto.randomBytes(bytes).toString('hex');
}
