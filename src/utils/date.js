export function toIsoDateOnly(value, fallback = '') {
  if (!value) return fallback;

  if (typeof value === 'string') {
    const trimmed = value.trim();
    const ymdMatch = trimmed.match(/^(\d{4}-\d{2}-\d{2})/);
    if (ymdMatch) return ymdMatch[1];
  }

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return fallback;
  return date.toISOString().split('T')[0];
}

export function formatDateYMD(value, fallback = '—') {
  return toIsoDateOnly(value, fallback);
}


/**
 * Universal date formatter guaranteeing strict YYYY-MM-DD format with optional 12-hour time.
 * Standardizes timestamp display across tables, audit trails, and reports.
 *
 * @param {string|number|Date} value - Raw timestamp or date representation.
 * @param {boolean} [includeTime=false] - Whether to append 12-hour time format (hh:mm a).
 * @param {string} [fallback='N/A'] - Fallback string when date is invalid or missing.
 * @returns {string} Formatted string e.g. "2026-11-06" or "2026-11-06 10:45 AM".
 */
export function formatDateYYYYMMDD(value, includeTime = false, fallback = 'N/A') {
  if (!value) return fallback;
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return fallback;

  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const dateStr = `${year}-${month}-${day}`;

  if (!includeTime) return dateStr;
  const timeStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  return `${dateStr} ${timeStr}`;
}
