/**
 * Central helper to detect aged cable bills for green-highlighting
 * across all invoice tables and reports.
 *
 * @param {string} docNo - The document/invoice number to inspect
 * @param {number} ageDays - The computed age in days
 * @returns {boolean} true if the document contains "(Cable Bill)" and age >= 45
 */
export function isAgedCableBill(docNo, ageDays) {
  if (!docNo) return false;
  const normalizedAge = Number(ageDays) || 0;
  const isCable = /cable/i.test(docNo);
  return isCable && normalizedAge >= 45;
}