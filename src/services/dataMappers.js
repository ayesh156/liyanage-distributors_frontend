/**
 * LIYANAGE DISTRIBUTORS - DATA MAPPERS
 * Transforms backend Prisma models into the frontend's expected shape.
 * This ensures backward compatibility with all existing React components.
 *
 * Pagination: API list endpoints return { success, data, pagination } where
 * pagination = { page, limit, totalPages, totalCount }.
 * This module extracts the data array and passes pagination metadata upstream.
 */

import { toIsoDateOnly } from '../utils/date';

/**
 * Extract the data array from a paginated API response.
 * Supports both { data: [...] } and { success: true, data: { data: [...] } } shapes.
 * If the response itself is an array (non-paginated fallback), returns it directly.
 */
export function extractData(response) {
  if (!response) return [];
  if (Array.isArray(response)) return response;
  if (Array.isArray(response.data)) return response.data;
  if (response.data && Array.isArray(response.data.data)) return response.data.data;
  return [];
}

/**
 * Extract pagination metadata from API response.
 * Returns { page, limit, totalPages, totalCount } or defaults.
 */
export function extractPagination(response) {
  if (!response) return { page: 1, limit: 15, totalPages: 0, totalCount: 0 };
  if (response.pagination) return response.pagination;
  if (response.data && response.data.pagination) return response.data.pagination;
  return { page: 1, limit: 15, totalPages: 0, totalCount: 0 };
}

function normalizePaymentMode(value) {
  return String(value || '').trim().toLowerCase().replace(/[-\s]+/g, '_');
}

function toMoneyNumber(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 0;
  return parseFloat(numeric.toFixed(2));
}

function computeBalanceDue(amount, received) {
  const computedBalanceDue = parseFloat((Number(amount) - Number(received)).toFixed(2));
  return Math.max(0, Number.isFinite(computedBalanceDue) ? computedBalanceDue : 0);
}

function resolveInvoiceBalanceDue(record = {}) {
  const backendBalanceDue = Number(record.balanceDue);
  if (Number.isFinite(backendBalanceDue)) {
    return Math.max(0, parseFloat(backendBalanceDue.toFixed(2)));
  }
  return computeBalanceDue(record.amount, record.received);
}

function resolvePaymentSelector(record = {}) {
  const normalizedType = normalizePaymentMode(record.paymentType);
  const normalizedMode = normalizePaymentMode(record.paymentMode);
  const normalizedMethod = normalizePaymentMode(record.paymentMethod);
  const normalizedDocType = normalizePaymentMode(record.docType);

  // Unified mapper: bank_transfer (canonical DB token) + bank_slip (legacy UI alias) → BANK_SLIP display
  if (
    normalizedType === 'bank_slip' ||
    normalizedMode === 'bank_slip' ||
    normalizedMethod === 'bank_slip' ||
    normalizedType === 'bank_slip_payment' ||
    normalizedMode === 'bank_slip_payment' ||
    normalizedMethod === 'bank_slip_payment' ||
    normalizedType === 'bank_transfer' ||
    normalizedMode === 'bank_transfer' ||
    normalizedMethod === 'bank_transfer' ||
    normalizedType === 'bankslip' ||
    normalizedMode === 'bankslip' ||
    normalizedMethod === 'bankslip'
  ) {
    return 'BANK_SLIP';
  }
  if (
    normalizedType === 'cheque' ||
    normalizedMode === 'cheque' ||
    normalizedMethod === 'cheque' ||
    normalizedType === 'cheque_payment' ||
    normalizedMode === 'cheque_payment' ||
    normalizedMethod === 'cheque_payment' ||
    normalizedMode === 'check' ||
    normalizedMethod === 'check'
  ) {
    return 'CHEQUE';
  }
  if (normalizedType === 'cash' || normalizedMode === 'cash' || normalizedMethod === 'cash' || normalizedDocType === 'cash_payment') {
    return 'CASH';
  }
  return 'CASH';
}

function hasChequeDetails(record = {}) {
  return Boolean(
    String(record.chequeNo || '').trim() ||
    String(record.bankName || '').trim() ||
    String(record.branchName || '').trim()
  );
}

/**
 * Map a backend Store object to the frontend's expected store shape.
 * Backend Store: { id, name, address, route, phone, createdAt, updatedAt, _count?, totalPaid? }
 * Frontend expects: { id, name, route, contact, address, salesPerson, salesPersonPhone, totalPaid, totalPayments, active }
 *
 * ══════════════════════════════════════════════════════════════════════════════
 * ID SAFETY NOTE: Store.id in Prisma is String @id @default(uuid()).
 * Always preserve as string end-to-end to prevent NaN routing parameters and
 * invalid backend lookup keys.
 * ══════════════════════════════════════════════════════════════════════════════
 */
export function mapStoreFromApi(backendStore) {
  const latestInvoiceSalesPerson = backendStore?.invoices?.[0]?.salesPerson;
  const assignedSalesPerson = backendStore?.salesPerson || latestInvoiceSalesPerson || null;
  const totalPaid = toMoneyNumber(backendStore?.totalPaid ?? backendStore?.totalPayments ?? 0);
  const normalizedInvoices = Array.isArray(backendStore?.invoices)
    ? backendStore.invoices.map((invoice) => ({
        id: invoice?.id ? String(invoice.id) : null,
        salesPerson: invoice?.salesPerson
          ? {
              id: invoice.salesPerson.id ? String(invoice.salesPerson.id) : null,
              name: invoice.salesPerson.name || '',
              phone: invoice.salesPerson.phone || '',
            }
          : null,
      }))
    : [];

  return {
    id: backendStore?.id ? String(backendStore.id) : null,
    storeCode: backendStore?.storeCode ? String(backendStore.storeCode) : '',
    name: backendStore.name,
    routeId:
      backendStore?.routeId != null
        ? Number(backendStore.routeId)
        : backendStore?.route?.id != null
          ? Number(backendStore.route.id)
          : null,
    route: backendStore?.route?.name || '',
    contact: backendStore.phone || '-',
    address: backendStore.address || '',
    salesPersonId:
      (backendStore?.salesPersonId ? String(backendStore.salesPersonId) : null) ||
      (backendStore?.salesPerson?.id ? String(backendStore.salesPerson.id) : null),
    salesPerson: backendStore?.salesPerson || null,
    salesPersonName: assignedSalesPerson?.name || '',
    salesPersonBackendId:
      (backendStore?.salesPersonId ? String(backendStore.salesPersonId) : null) ||
      (backendStore?.salesPerson?.id ? String(backendStore.salesPerson.id) : null),
    salesPersonPhone: assignedSalesPerson?.phone || '',
    totalPaid,
    totalPayments: totalPaid,
    invoiceCount: backendStore._count?.invoices || 0,
    invoices: normalizedInvoices,
    active: true,
  };
}

/**
 * Map backend Invoice to frontend invoice shape.
 * Backend Invoice: { id, documentNo, date, docType, description, amount, received, balanceDue, status, chequeNo, storeId, salesPersonId, store, salesPerson, payments }
 * Frontend expects: { id, shopId, date, docNo, amount, received, paymentMode, chequeNo, bankName, description, salesPerson, salesPersonPhone, route, payments }
 *
 * ══════════════════════════════════════════════════════════════════════════════
 * CRITICAL: Invoice.id is a UUID string in Prisma (String @id @default(uuid())).
 * NEVER parseInt() this value — doing so silently corrupts the UUID into a
 * leading-digit integer (e.g. "5a3b..." → 5), which then fails all subsequent
 * backend lookups with "Invoice 5 not found" (404).
 * ══════════════════════════════════════════════════════════════════════════════
 */
export function mapInvoiceFromApi(backendInvoice) {
  const backendPayments = Array.isArray(backendInvoice.payments) ? backendInvoice.payments : [];
  const latestPayment = backendPayments[0] || null;
  // Trust the payment method from backend - do NOT override based on bank field presence
  const derivedPaymentMode = normalizePaymentMode(
    backendInvoice.paymentMethod ||
    backendInvoice.paymentMode ||
    latestPayment?.paymentMethod ||
    latestPayment?.paymentMode ||
    ''
  );

  return {
    id: backendInvoice.id,
    shopId: backendInvoice.storeId ? String(backendInvoice.storeId) : null,
    date: toIsoDateOnly(backendInvoice.date, ''),
    docNo: backendInvoice.documentNo,
    docType: backendInvoice.docType || 'Invoice',
    amount: Number(backendInvoice.amount),
    received: Number(backendInvoice.received),
    balanceDue: resolveInvoiceBalanceDue(backendInvoice),
    status: backendInvoice.status,
    paymentMode: derivedPaymentMode || 'credit',
    chequeNo: backendInvoice.chequeNo || '',
    bankName: backendInvoice.bankName || '',
    branchName: backendInvoice.branchName || '',
    description: backendInvoice.description || '',
    salesPersonId: backendInvoice.salesPersonId ? String(backendInvoice.salesPersonId) : null,
    salesPersonBackendId: backendInvoice.salesPersonId ? String(backendInvoice.salesPersonId) : null,
    salesPerson: backendInvoice.salesPerson?.name || '',
    salesPersonPhone: backendInvoice.salesPerson?.phone || '',
    route: backendInvoice.store?.route?.name || '',
    shopName: backendInvoice.store?.name || '',
    payments: (backendInvoice.payments || []).map(mapPaymentFromApi),
  };
}

/**
 * Map backend Payment to frontend payment shape embedded in invoices.
 * Backend Payment: { id, date, amountPaid, description, paymentMethod, chequeNo }
 * Frontend expects: { id, date, amount, paymentMode, chequeNo, bankName, description }
 *
 * ══════════════════════════════════════════════════════════════════════════════
 * CRITICAL: Payment.id is a UUID string in Prisma (String @id @default(uuid())).
 * Preserve as-is — do NOT parseInt() which would corrupt the UUID.
 * ══════════════════════════════════════════════════════════════════════════════
 */
export function mapPaymentFromApi(backendPayment) {
  // Trust the payment method from backend - do NOT override based on bank field presence
  const derivedPaymentMode = normalizePaymentMode(
    backendPayment.paymentMethod ||
    backendPayment.paymentMode ||
    ''
  );

  return {
    id: backendPayment.id,
    date: toIsoDateOnly(backendPayment.date, ''),
    amount: Number(backendPayment.amountPaid),
    paymentMode: derivedPaymentMode || 'cash',
    paymentMethod: resolvePaymentSelector(backendPayment),
    chequeNo: backendPayment.chequeNo || '',
    bankName: backendPayment.bankName || '',
    branchName: backendPayment.branchName || '',
    description: backendPayment.description || '',
  };
}

/**
 * Map backend SalesPerson to frontend sales person shape.
 * Backend: { id, name, phone }
 * Frontend: { id, name, phone, nic, email, address }
 *
 * ══════════════════════════════════════════════════════════════════════════════
 * ID SAFETY NOTE: SalesPerson.id is a string identifier and must remain string
 * through state + payload mapping.
 * ══════════════════════════════════════════════════════════════════════════════
 */
export function mapSalesPersonFromApi(backendPerson) {
  return {
    id: backendPerson?.id ? String(backendPerson.id) : null,
    backendId: backendPerson?.id ? String(backendPerson.id) : null,
    name: backendPerson.name,
    phone: backendPerson.phone || '',
    nic: backendPerson.nic || '',
    email: backendPerson.email || '',
    address: backendPerson.address || '',
  };
}

/**
 * Map backend Route to frontend route shape.
 */
export function mapRouteFromApi(backendRoute) {
  const scheduleSource = backendRoute?.deliverySchedule;
  const routeDates = Array.isArray(scheduleSource)
    ? scheduleSource.map((day) => String(day || '').trim()).filter(Boolean)
    : [];

  return {
    id: backendRoute?.id != null ? Number(backendRoute.id) : null,
    routeCode: backendRoute?.routeCode ? String(backendRoute.routeCode) : '',
    name: backendRoute?.name || '',
    description: backendRoute?.areaCoverage || '',
    areaCoverage: backendRoute?.areaCoverage || '',
    routeDates,
    deliverySchedule: routeDates,
    createdAt: backendRoute?.createdAt || null,
    updatedAt: backendRoute?.updatedAt || null,
  };
}

/**
 * Map frontend Route form data to backend payload.
 */
export function mapRouteToApi(routeData) {
  const routeDates = Array.isArray(routeData?.routeDates)
    ? routeData.routeDates
    : Array.isArray(routeData?.deliverySchedule)
      ? routeData.deliverySchedule
      : [];

  return {
    name: String(routeData?.name || '').trim(),
    areaCoverage: String(routeData?.description || routeData?.areaCoverage || '').trim() || null,
    deliverySchedule: routeDates.map((day) => String(day || '').trim()).filter(Boolean),
  };
}

/**
 * Map frontend invoice data to backend create/update payload.
 */
export function mapInvoiceToApi(invoiceData) {
  const normalizedStoreId = String(invoiceData.shopBackendId || invoiceData.shopId || '').trim();
  const normalizedSalesPersonId = String(invoiceData.salesPersonBackendId || invoiceData.salesPersonId || '').trim();

  const paymentSelector = resolvePaymentSelector(invoiceData);
  const isBankBasedPayment = paymentSelector === 'CHEQUE' || paymentSelector === 'BANK_SLIP';

  return {
    storeId: normalizedStoreId,
    salesPersonId: normalizedSalesPersonId,
    date: invoiceData.date || new Date().toISOString(),
    docType: invoiceData.docType || 'Invoice',
    paymentMode: paymentSelector,
    paymentMethod: paymentSelector,
    description: invoiceData.description || '',
    amount: parseFloat(invoiceData.amount) || 0,
    received: parseFloat(invoiceData.received) || 0,
    // Bank fields are optional - include them even if empty when bank method selected
    chequeNo: isBankBasedPayment ? (invoiceData.chequeNo || '') : '',
    bankName: isBankBasedPayment ? (invoiceData.bankName || '') : '',
    branchName: isBankBasedPayment ? (invoiceData.branchName || '') : '',
    documentNo: invoiceData.docNo || null,
  };
}

/**
 * Map frontend payment collection data to backend collect payload.
 */
export function mapPaymentToApi(paymentData) {
  const paymentSelector = resolvePaymentSelector(paymentData);
  const isBankBasedPayment = paymentSelector === 'CHEQUE' || paymentSelector === 'BANK_SLIP';

  return {
    invoiceId: String(paymentData.invoiceId),
    date: paymentData.date,
    amountPaid: toMoneyNumber(paymentData.amount),
    paymentMode: paymentSelector,
    paymentMethod: paymentSelector,
    // Bank fields are optional - include them even if empty when bank method selected
    chequeNo: isBankBasedPayment ? (String(paymentData.chequeNo || '').trim() || '') : '',
    bankName: isBankBasedPayment ? (String(paymentData.bankName || '').trim() || '') : '',
    branchName: isBankBasedPayment ? (String(paymentData.branchName || '').trim() || '') : '',
    description: String(paymentData.description || '').trim(),
  };
}

/**
 * Map frontend store data to backend create/update payload.
 */
export function mapStoreToApi(storeData) {
  return {
    name: storeData.name,
    address: storeData.address || '',
    routeId: storeData.routeId ? Number(storeData.routeId) : null,
    phone: storeData.contact || '',
    salesPersonId: String(storeData.salesPersonBackendId || storeData.salesPersonId || '').trim() || null,
  };
}

/**
 * Map backend summary endpoint response to dashboard metrics shape.
 */
export function mapSummaryFromApi(backendSummary) {
  return {
    totalBilled: Number(backendSummary.totalBilled),
    totalReceived: Number(backendSummary.totalReceived),
    totalOutstanding: Number(backendSummary.totalOutstanding),
    count: backendSummary.count,
    paidCount: backendSummary.paidCount,
    pendingCount: backendSummary.pendingCount,
    overdueCount: backendSummary.overdueCount,
    collectionRate: backendSummary.collectionRate,
  };
}

/**
 * Build a shop id -> outstanding map from invoices array.
 */
export function computeShopOutstanding(invoices) {
  const map = {};
  invoices.forEach((inv) => {
    const invoiceBalance = resolveInvoiceBalanceDue(inv);
    map[inv.shopId] = toMoneyNumber((map[inv.shopId] || 0) + invoiceBalance);
  });
  return map;
}

/**
 * Map an outstanding report row from backend to frontend shape.
 * Backend: { date, documentNo, docType, description, amount, received, balanceDue, chequeNo, storeId, storeName, shopName }
 * Frontend: { date, docNo, docType, amount, received, balanceDue, ageDays, shopId, shopName, description, chequeNo, bankName, paymentMode }
 */
export function mapOutstandingRowFromApi(row) {
  const now = new Date();
  const postingDate = new Date(row.date);
  const ageDays = Math.floor((now - postingDate) / 86400000);
  // Trust the payment method from backend - do NOT override based on bank field presence
  const derivedPaymentMode = normalizePaymentMode(
    row.paymentMethod ||
    row.paymentMode ||
    ''
  );
  return {
    id: row.id || null,
    invoiceId: row.invoiceId || (row.docType === 'Payment' || row.docType === 'Payment (Cash)' ? (row.invoice?.id || null) : null),
    date: toIsoDateOnly(row.date, ''),
    docNo: row.documentNo,
    docType: row.docType || 'Invoice',
    amount: Number(row.amount),
    received: Number(row.received),
    balanceDue: resolveInvoiceBalanceDue(row),
    ageDays: ageDays >= 0 ? ageDays : 0,
    shopId: row.storeId ? String(row.storeId) : null,
    shopName: row.shopName || row.store?.name || 'Unknown',
    description: row.description || '',
    chequeNo: row.chequeNo || '',
    bankName: row.bankName || '',
    paymentMode: derivedPaymentMode || 'credit',
    paymentMethod: resolvePaymentSelector(row),
    payments: (row.payments || []).map(mapPaymentFromApi),
  };
}

/**
 * Map frontend invoice edit data to backend update payload.
 */
export function mapInvoiceUpdateToApi(invoiceData) {
  const paymentSelector = resolvePaymentSelector(invoiceData);
  const isBankBasedPayment = paymentSelector === 'CHEQUE' || paymentSelector === 'BANK_SLIP';

  const payload = {
    date: invoiceData.date || new Date().toISOString(),
    docType: invoiceData.docType || 'Invoice',
    paymentMode: paymentSelector,
    paymentMethod: paymentSelector,
    description: String(invoiceData.description || '').trim(),
    amount: parseFloat(invoiceData.amount) || 0,
    received: parseFloat(invoiceData.received) || 0,
    // Bank fields are optional - include them even if empty when bank method selected
    chequeNo: isBankBasedPayment ? (String(invoiceData.chequeNo || '').trim() || '') : '',
    bankName: isBankBasedPayment ? (String(invoiceData.bankName || '').trim() || '') : '',
    branchName: isBankBasedPayment ? (String(invoiceData.branchName || '').trim() || '') : '',
  };

  const normalizedDocNo = String(invoiceData.docNo || '').trim();
  if (normalizedDocNo) payload.documentNo = normalizedDocNo;

  return payload;
}