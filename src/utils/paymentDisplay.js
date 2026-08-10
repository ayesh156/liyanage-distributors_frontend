/**
 * LIYANAGE DISTRIBUTORS - PAYMENT DISPLAY HELPERS
 * Central formatting helpers for rendering payment method + date
 * metadata as subtle sub-text under outstanding report invoice rows.
 *
 * RULES
 * 1. Invoices with received === 0 AND no payments MUST NOT render payment info.
 * 2. The most recent payment drives the display text.
 * 3. Formats: "Payment: Cash (2026-07-17)" / "Payment: Bank Slip (2026-07-20)"
 *              / "Payment: Cheque #1234 (2026-07-22)"
 */

import { formatDateYMD } from './date';

const toMoneyNumber = (value) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? parseFloat(numeric.toFixed(2)) : 0;
};

export function getPaymentMethodLabel(paymentMethod) {
  const normalized = String(paymentMethod || '').trim().toLowerCase().replace(/[-_\s]+/g, '_');
  if (normalized === 'cheque' || normalized === 'check') return 'Cheque';
  if (normalized === 'bank_slip' || normalized === 'bankslip' || normalized === 'bank_transfer') return 'Bank Slip';
  if (normalized === 'credit') return 'Credit';
  if (normalized === 'card') return 'Card';
  return 'Cash';
}

export function formatPaymentDisplay(payment = {}) {
  if (!payment) return '';
  const methodLabel = getPaymentMethodLabel(payment.paymentMethod || payment.paymentMode || payment.method || '');
  const dateText = formatDateYMD(payment.date, '');
  const chequeNo = String(payment.chequeNo || '').trim();
  let label = `Payment: ${methodLabel}`;
  if (methodLabel === 'Cheque' && chequeNo && chequeNo !== '—' && chequeNo !== '-') {
    label = `Payment: Cheque #${chequeNo}`;
  }
  if (dateText) label += ` (${dateText})`;
  return label;
}

export function resolvePaymentDisplayInfo(row = {}) {
  if (!row) return null;
  const payments = Array.isArray(row.payments) ? row.payments : [];
  const hasReceivedCredit = toMoneyNumber(row.received || row.receivedAmount || 0) > 0;
  if (payments.length === 0 && !hasReceivedCredit) return null;
  if (payments.length > 0) {
    const sorted = [...payments].sort((a, b) => (new Date(b.date || 0) - new Date(a.date || 0)));
    return sorted[0];
  }
  const rowMethod = row.paymentMethod || row.paymentMode || '';
  if (!rowMethod && !row.chequeNo && !row.bankName) return null;
  return { paymentMethod: rowMethod, date: row.date || '', chequeNo: row.chequeNo || '', bankName: row.bankName || '' };
}

/**
 * ═══════════════════════════════════════════════════════════════════════
 * PAYMENT ROW RESOLUTION HELPERS (Doc Type display contract)
 * ═══════════════════════════════════════════════════════════════════════
 *
 * HARD RULE: Payment transaction rows in ALL reports MUST NEVER display
 * "Invoice" under the Doc Type column. Payment rows MUST explicitly
 * display "Payment (Cash)", "Payment (Bank Slip)", or "Payment (Cheque)".
 *
 * These helpers centralise that rule so `PrintFullReport.jsx` and
 * `OutstandingReport.jsx` resolve the Doc Type column identically.
 */

/**
 * Detect whether a statement row represents a Payment / Credit transaction.
 * Safe dual-field predicate covering every data shape:
 *   - Ledger rows:  lineType === 'Payment'
 *   - Snapshot rows: docType === 'Payment' | 'Payment (Cash)'
 *   - Flagged rows: isPayment === true
 *   - Payment child rows carrying an explicit receivedAmount credit
 */
export function isPaymentRowType(row = {}) {
  if (!row) return false;
  if (row.lineType === 'Payment' || row.isPayment === true) return true;
  const rawDocType = String(row.docType || '').trim();
  if (
    rawDocType === 'Payment' ||
    rawDocType === 'Payment (Cash)' ||
    rawDocType === 'Payment (Cheque)' ||
    rawDocType === 'Payment (Bank Slip)'
  ) {
    return true;
  }
  if (toMoneyNumber(row.receivedAmount || 0) > 0) return true;
  return false;
}

/**
 * Build the explicit Doc Type label for a Payment row.
 * Dynamically constructed from `paymentMethod` / `paymentMode` /
 * `paymentType`, or reused from an already-attached `documentTypeLabel`
 * (e.g. rows produced by flattenInvoicePaymentsToStatementRows).
 *
 *   - cash            → "Payment (Cash)"
 *   - bank_slip/transfer → "Payment (Bank Slip)"
 *   - cheque           → "Payment (Cheque)"
 *   - fallback         → "Payment"
 */
export function getPaymentDocTypeLabel(row = {}) {
  if (!row) return 'Payment';
  // Preferred: an explicit payment label already attached by the data layer
  // (flattenInvoicePaymentsToStatementRows / buildStatementLedger). Only
  // trust labels that actually begin with "Payment" — never "Invoice".
  const existingLabel = String(row.documentTypeLabel || '').trim();
  if (existingLabel && /^Payment/i.test(existingLabel)) {
    return existingLabel;
  }
  const methodLabel = getPaymentMethodLabel(
    row.paymentMethod || row.paymentMode || row.paymentType || row.method || '',
  );
  if (methodLabel && methodLabel !== 'Credit') {
    return `Payment (${methodLabel})`;
  }
  return 'Payment';
}

/**
 * Resolve the display value for a statement row's Doc Type column.
 * Payment rows ALWAYS resolve to their explicit payment label — never
 * "Invoice". Invoice rows resolve to "Invoice". Any other documentTypeLabel
 * (e.g. "Invoice (Cash)") is preserved.
 */
export function resolveRowDocTypeLabel(row = {}) {
  if (!row) return '—';
  if (isPaymentRowType(row)) {
    return getPaymentDocTypeLabel(row);
  }
  if (row.lineType === 'Invoice' || row.docType === 'Invoice') return 'Invoice';
  const label = String(row.documentTypeLabel || '').trim();
  if (label) return label;
  return '—';
}