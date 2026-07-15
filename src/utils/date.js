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
