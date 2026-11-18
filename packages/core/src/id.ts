/**
 * Generates human-friendly Booking reference e.g., "FF-2026-X89J"
 * Universal: works in both Browser and Node.js
 */
export function generateBookingReference(year = new Date().getFullYear()): string {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'; // exclude confusing chars like 0/O, 1/I
  let code = '';
  for (let i = 0; i < 4; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return `FF-${year}-${code}`;
}

/**
 * Generates human-friendly Ticket Number e.g., "TKT-9J8A-42"
 * Universal: works in both Browser and Node.js
 */
export function generateTicketNumber(tierShort = 'TKT'): string {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  let rand = '';
  for (let i = 0; i < 4; i++) {
    rand += chars[Math.floor(Math.random() * chars.length)];
  }
  const suffix = Math.floor(10 + Math.random() * 90);
  return `${tierShort.toUpperCase().substring(0, 4)}-${rand}-${suffix}`;
}

/**
 * Generate standard UUID v4
 * Universal: Uses Web Crypto API when available, with RFC4122 fallback
 */
export function generateUUID(): string {
  if (typeof globalThis !== 'undefined' && globalThis.crypto && typeof globalThis.crypto.randomUUID === 'function') {
    return globalThis.crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
