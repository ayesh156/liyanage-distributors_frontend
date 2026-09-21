/**
 * Detects if a document number or description represents a cable bill.
 * Handles any casing, spacing, or punctuation variant (e.g., "(Cable Bill)",
 * "cable bill", "CABLE", "2599(Cable Bill)", "Manual Bill (Cable Bill)_1").
 *
 * @param {string} docNo - The document/invoice number to inspect
 * @param {string} [description=''] - Optional description to inspect
 * @returns {boolean} true if "cable" is present in lowercase search string
 */
export function isCableBill(docNo, description = '') {
  const target = `${docNo ?? ''} ${description ?? ''}`.toLowerCase();
  return target.includes('cable');
}

/**
 * Central helper to detect aged cable bills for bold dark-purple
 * highlighting across all invoice tables and reports.
 *
 * @param {string} docNo - The document/invoice number to inspect
 * @param {number} ageDays - The computed age in days
 * @param {string} [description=''] - Optional description
 * @returns {boolean} true if the document is a cable bill and age >= 45
 */
export function isAgedCableBill(docNo, ageDays, description = '') {
  const normalizedAge = Number(ageDays) || 0;
  return isCableBill(docNo, description) && normalizedAge >= 45;
}