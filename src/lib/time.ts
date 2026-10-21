/**
 * Time utility for Gashtyar IT Operations
 * Always stores UTC strings, displays in Asia/Baghdad (UTC+03:00)
 */

export const BAGHDAD_TIMEZONE = 'Asia/Baghdad';
export const BAGHDAD_OFFSET_HOURS = 3;

/**
 * Returns current UTC ISO string
 */
export function nowUtc(): string {
  return new Date().toISOString();
}

/**
 * Formats a UTC ISO string into Baghdad time
 */
export function formatBaghdad(
  isoDateStr: string | null | undefined,
  formatStyle: 'full' | 'short' | 'time' | 'date' = 'full'
): string {
  if (!isoDateStr) return '—';

  try {
    const date = new Date(isoDateStr);
    if (isNaN(date.getTime())) return '—';

    const options: Intl.DateTimeFormatOptions = {
      timeZone: BAGHDAD_TIMEZONE,
    };

    switch (formatStyle) {
      case 'time':
        options.hour = '2-digit';
        options.minute = '2-digit';
        options.second = '2-digit';
        options.hour12 = false;
        break;
      case 'date':
        options.year = 'numeric';
        options.month = 'short';
        options.day = 'numeric';
        break;
      case 'short':
        options.month = 'short';
        options.day = 'numeric';
        options.hour = '2-digit';
        options.minute = '2-digit';
        options.hour12 = false;
        break;
      case 'full':
      default:
        options.year = 'numeric';
        options.month = 'short';
        options.day = 'numeric';
        options.hour = '2-digit';
        options.minute = '2-digit';
        options.hour12 = false;
        break;
    }

    return new Intl.DateTimeFormat('en-GB', options).format(date);
  } catch {
    return '—';
  }
}

/**
 * Returns human relative time (e.g., '15m ago', 'in 2h')
 */
export function formatRelative(isoDateStr: string | null | undefined): string {
  if (!isoDateStr) return '—';
  try {
    const date = new Date(isoDateStr);
    const now = new Date();
    const diffMs = date.getTime() - now.getTime();
    const isFuture = diffMs > 0;
    const diffSec = Math.floor(Math.abs(diffMs) / 1000);

    if (diffSec < 60) return isFuture ? 'in moments' : 'just now';
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return isFuture ? `in ${diffMin}m` : `${diffMin}m ago`;
    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) return isFuture ? `in ${diffHours}h` : `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return isFuture ? `in ${diffDays}d` : `${diffDays}d ago`;
  } catch {
    return '—';
  }
}

/**
 * Checks if a given timestamp is past current time
 */
export function isOverdue(isoDateStr: string | null | undefined): boolean {
  if (!isoDateStr) return false;
  try {
    const date = new Date(isoDateStr);
    return date.getTime() < Date.now();
  } catch {
    return false;
  }
}
