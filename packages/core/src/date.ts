/**
 * Smart flexible date-time parser and formatter.
 * Handles Indian, British, ISO, and standard human formats:
 * - "21/11/2026, 07:00 PM"
 * - "21/11/2026, 10:00 PM"
 * - "21/11/2026 19:00"
 * - "21 Nov 2026, 7:00 PM"
 * - "2026-11-21 19:00"
 * - "2026-11-21T19:00"
 * - "tomorrow 7pm"
 */

export function parseFlexibleDateTime(input?: string | null): Date | null {
  if (!input || typeof input !== 'string') return null;
  const s = input.trim();
  if (!s) return null;

  const lower = s.toLowerCase();

  // Relative shortcuts: "today", "tomorrow"
  if (lower.startsWith('today') || lower.startsWith('tomorrow')) {
    const d = new Date();
    if (lower.startsWith('tomorrow')) d.setDate(d.getDate() + 1);
    const timeMatch = lower.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/);
    if (timeMatch) {
      let h = parseInt(timeMatch[1], 10);
      const m = timeMatch[2] ? parseInt(timeMatch[2], 10) : 0;
      const mer = timeMatch[3];
      if (mer === 'pm' && h < 12) h += 12;
      if (mer === 'am' && h === 12) h = 0;
      d.setHours(h, m, 0, 0);
      return d;
    }
  }

  // If already standard ISO or date string, and not purely DD/MM/YYYY
  const isDmyPattern = /^\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}/.test(s);
  if (!isDmyPattern) {
    const d = new Date(s);
    if (!isNaN(d.getTime())) return d;
  }

  // Normalize string: replace commas with space, condense whitespace
  const clean = s.replace(/,/g, ' ').replace(/\s+/g, ' ').trim();

  // Pattern 1: DD/MM/YYYY or DD-MM-YYYY or DD.MM.YYYY
  const dmyRegex = /^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})(?:\s+(\d{1,2})(?::(\d{2}))?(?::(\d{2}))?\s*(am|pm)?)?$/i;
  const dmyMatch = clean.match(dmyRegex);
  if (dmyMatch) {
    let day = parseInt(dmyMatch[1], 10);
    let month = parseInt(dmyMatch[2], 10);
    let year = parseInt(dmyMatch[3], 10);
    if (year < 100) year += 2000;

    // Disambiguate if month > 12 and day <= 12
    if (month > 12 && day <= 12) {
      const temp = day;
      day = month;
      month = temp;
    }

    let hours = dmyMatch[4] ? parseInt(dmyMatch[4], 10) : 19;
    const minutes = dmyMatch[5] ? parseInt(dmyMatch[5], 10) : 0;
    const seconds = dmyMatch[6] ? parseInt(dmyMatch[6], 10) : 0;
    const meridiem = dmyMatch[7] ? dmyMatch[7].toUpperCase() : null;

    if (meridiem === 'PM' && hours < 12) hours += 12;
    if (meridiem === 'AM' && hours === 12) hours = 0;

    const parsed = new Date(year, month - 1, day, hours, minutes, seconds);
    if (!isNaN(parsed.getTime())) return parsed;
  }

  // Pattern 2: YYYY-MM-DD or YYYY/MM/DD
  const ymdRegex = /^(\d{4})[\/\-\.](\d{1,2})[\/\-\.](\d{1,2})(?:[\sT]+(\d{1,2})(?::(\d{2}))?(?::(\d{2}))?\s*(am|pm)?)?$/i;
  const ymdMatch = clean.match(ymdRegex);
  if (ymdMatch) {
    const year = parseInt(ymdMatch[1], 10);
    const month = parseInt(ymdMatch[2], 10);
    const day = parseInt(ymdMatch[3], 10);
    let hours = ymdMatch[4] ? parseInt(ymdMatch[4], 10) : 19;
    const minutes = ymdMatch[5] ? parseInt(ymdMatch[5], 10) : 0;
    const seconds = ymdMatch[6] ? parseInt(ymdMatch[6], 10) : 0;
    const meridiem = ymdMatch[7] ? ymdMatch[7].toUpperCase() : null;

    if (meridiem === 'PM' && hours < 12) hours += 12;
    if (meridiem === 'AM' && hours === 12) hours = 0;

    const parsed = new Date(year, month - 1, day, hours, minutes, seconds);
    if (!isNaN(parsed.getTime())) return parsed;
  }

  // Fallback native
  const fallback = new Date(clean);
  if (!isNaN(fallback.getTime())) return fallback;

  return null;
}

export function formatForHumanInput(d: Date | string): string {
  try {
    const date = typeof d === 'string' ? new Date(d) : d;
    if (isNaN(date.getTime())) return '';
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    let hours = date.getHours();
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const meridiem = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12;
    const formattedHours = String(hours).padStart(2, '0');
    return `${day}/${month}/${year}, ${formattedHours}:${minutes} ${meridiem}`;
  } catch {
    return '';
  }
}

export function formatPreviewDateTime(d: Date | string): string {
  try {
    const date = typeof d === 'string' ? new Date(d) : d;
    if (isNaN(date.getTime())) return '';
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  } catch {
    return '';
  }
}

export function getPresetDateTime(type: 'tomorrow' | 'saturday' | 'nextWeek', hour = 19): string {
  const d = new Date();
  if (type === 'tomorrow') {
    d.setDate(d.getDate() + 1);
  } else if (type === 'saturday') {
    const day = d.getDay();
    const diff = (6 - day + 7) % 7 || 7;
    d.setDate(d.getDate() + diff);
  } else if (type === 'nextWeek') {
    d.setDate(d.getDate() + 7);
  }
  d.setHours(hour, 0, 0, 0);
  return formatForHumanInput(d);
}
