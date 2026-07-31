/**
 * Central display-normalization helper for invoice / document numbers.
 * ═══════════════════════════════════════════════════════════════════════
 *
 * IMPORTANT — INTERNAL KEYS vs USER-FACING LABELS
 *
 * The database stores manual bills as internal keys that carry a
 * backend auto-increment suffix, for example:
 *
 *     Manual_bill_7
 *     Manual_bill_8
 *     Manual Bill_7
 *
 * The trailing `_<n>` / `-<n>` is an internal auto-increment index used
 * only for primary-key uniqueness. It MUST NEVER leak into user-facing
 * report tables, CSV exports, or print views.
 *
 * RULES
 * ─────
 * 1. Any string that matches the manual-bill family
 *    (Manual Bill / Manual_bill / Manual-bill / manual bill …) has its
 *    trailing separator + numeric index stripped, and renders in the
 *    canonical label form: "Manual Bill".
 *
 * 2. Parenthetical labels such as "(Cable Bill)" are customer-visible
 *    and MUST be preserved, e.g. "Manual Bill_7 (Cable Bill)" renders as
 *    "Manual Bill (Cable Bill)".
 *
 * 3. Regular numbered invoices (e.g. "2497", "2496", "INV-00123") are
 *    NOT manual bills and must pass through completely untouched.
 *
 * @param {*} value - Raw invoiceNo / docNo from the API or DB.
 * @returns {string} Sanitized, user-facing display string.
 */
const titleCase = (str) =>
  str
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');

export function normalizeInvoiceNo(value) {
  const invoiceNo = String(value ?? '').trim();
  if (!invoiceNo) return '—';

  // ── Manual bill family ─────────────────────────────────────────────────
  // Matches any casing/separator variant of "Manual Bill":
  //   Manual_bill | Manual Bill | Manual-bill | manual_bill | …
  // Optional trailing auto-increment index: _7 | -8 | _10 | 11 …
  // Optional preserved parenthetical label: (Cable Bill)
  const manualBillMatch = invoiceNo.match(
    /^(manual)[_\s-]*(bill)(?:[_\s-]*\d+)?(\s*\([^)]*\))?(?:[_\s-]*\d+)?$/i,
  );

  if (manualBillMatch) {
    const base = `${titleCase(manualBillMatch[1])} ${titleCase(manualBillMatch[2])}`;
    // Preserve the parenthetical label only — the numeric index is dropped.
    const label = manualBillMatch[3] ? ` ${manualBillMatch[3].trim()}` : '';
    return `${base}${label}`;
  }

  // Regular numbered invoices / any non-manual document pass through untouched.
  return invoiceNo;
}