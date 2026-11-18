import crypto from 'crypto';

/**
 * Generates human-friendly Booking reference e.g., "FF-2026-X89J"
 */
export function generateBookingReference(year = new Date().getFullYear()): string {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'; // exclude confusing chars like 0/O, 1/I
  let code = '';
  const bytes = crypto.randomBytes(4);
  for (let i = 0; i < 4; i++) {
    code += chars[bytes[i] % chars.length];
  }
  return `FF-${year}-${code}`;
}

/**
 * Generates human-friendly Ticket Number e.g., "TKT-9J8A-42"
 */
export function generateTicketNumber(tierShort = 'TKT'): string {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  let rand = '';
  const bytes = crypto.randomBytes(4);
  for (let i = 0; i < 4; i++) {
    rand += chars[bytes[i] % chars.length];
  }
  const suffix = Math.floor(10 + Math.random() * 90);
  return `${tierShort.toUpperCase().substring(0, 4)}-${rand}-${suffix}`;
}

/**
 * Generate standard UUID v4
 */
export function generateUUID(): string {
  return crypto.randomUUID();
}
