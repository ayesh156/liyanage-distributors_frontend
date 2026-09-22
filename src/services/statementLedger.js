const toNumber = (value) => Number(value) || 0;

const roundCurrency = (value) => parseFloat(toNumber(value).toFixed(2));

const resolvePaymentMode = (paymentMode, chequeNo, bankName, branchName) => {
  const normalizedMode = String(paymentMode || '').trim().toLowerCase().replace(/[-_\s]+/g, '_');
  const hasChequeMeta = [chequeNo, bankName, branchName].some((value) => String(value || '').trim());

  // Unified mapper: bank_transfer (canonical DB token) + bank_slip (legacy UI alias) → Bank Slip display
  if (normalizedMode === 'bank_slip' || normalizedMode === 'bank_transfer' || normalizedMode === 'bankslip') {
    return 'Bank Slip';
  }

  if (normalizedMode === 'cheque' || normalizedMode === 'check' || hasChequeMeta) {
    return 'Cheque';
  }

  return 'Cash';
};

const sortByDateAsc = (left, right) => {
  const dateDiff = new Date(left.date) - new Date(right.date);
  if (dateDiff !== 0) return dateDiff;

  const leftPriority = left.docType === 'Payment' ? 1 : 0;
  const rightPriority = right.docType === 'Payment' ? 1 : 0;
  return leftPriority - rightPriority;
};

const getInvoiceFinalOutstanding = (transaction) => {
  const backendBalanceDue = Number(transaction?.balanceDue);
  if (Number.isFinite(backendBalanceDue)) {
    return parseFloat(Math.max(0, backendBalanceDue).toFixed(2));
  }

  const invoiceAmount = roundCurrency(transaction.amount);
  const totalReceived = Array.isArray(transaction.payments)
    ? transaction.payments.reduce((sum, payment) => roundCurrency(sum + toNumber(payment.amount)), 0)
    : 0;

  return parseFloat((Number(invoiceAmount) - Number(totalReceived)).toFixed(2));
};

const buildInvoiceRow = (transaction, now) => {
  const amount = roundCurrency(transaction.amount);
  const postingDate = new Date(transaction.date);
  const ageDays = Math.floor((now - postingDate) / (1000 * 60 * 60 * 24));
  const paymentMode = resolvePaymentMode(
    transaction.paymentMode,
    transaction.chequeNo,
    transaction.bankName,
    transaction.branchName,
  );

  // Extract route name safely from flat or relational transaction properties
  const resolvedRoute =
    transaction.route?.name ||
    transaction.store?.route?.name ||
    (typeof transaction.route === 'string' ? transaction.route : '') ||
    (typeof transaction.store?.route === 'string' ? transaction.store.route : '') ||
    'Unassigned Route';

  return {
    key: `invoice-${transaction.id || transaction.docNo || transaction.date}`,
    parentKey: transaction.id || transaction.docNo || transaction.date,
    date: transaction.date,
    docNo: transaction.docNo,
    lineType: 'Invoice',
    documentTypeLabel: `Invoice (${paymentMode})`,
    paymentMode,
    chequeNo: String(transaction.chequeNo || '').trim(),
    bankName: String(transaction.bankName || '').trim(),
    branchName: String(transaction.branchName || '').trim(),
    amount,
    received: 0,
    balanceDue: amount,
    finalOutstanding: amount,
    ageDays,
    description: transaction.description || '',
    // Preserve store and route metadata for grouping in Outstanding Report
    shopId: transaction.shopId || transaction.storeId || null,
    shopName: transaction.shopName || transaction.store?.name || 'Unknown',
    route: resolvedRoute,
    store: transaction.store || {
      id: transaction.shopId || transaction.storeId || null,
      name: transaction.shopName || transaction.store?.name || 'Unknown',
      route: resolvedRoute,
    },
  };
};

const buildPaymentRow = (transaction, payment, paymentIndex, priorBalanceDue, now) => {
  const paymentAmount = roundCurrency(payment.amount);
  const paymentDate = new Date(payment.date || transaction.date);
  const ageDays = Math.floor((now - paymentDate) / (1000 * 60 * 60 * 24));
  const paymentMode = resolvePaymentMode(
    payment.paymentMode || transaction.paymentMode,
    payment.chequeNo || transaction.chequeNo,
    payment.bankName || transaction.bankName,
    payment.branchName || transaction.branchName,
  );

  const openingAmount = roundCurrency(priorBalanceDue);
  const balanceDue = parseFloat((Number(openingAmount) - Number(paymentAmount)).toFixed(2));

  return {
    key: `payment-${transaction.id || transaction.docNo || transaction.date}-${payment.id || paymentIndex}`,
    parentKey: transaction.id || transaction.docNo || transaction.date,
    date: payment.date || transaction.date,
    docNo: transaction.docNo,
    lineType: 'Payment',
    documentTypeLabel: `Payment (${paymentMode})`,
    paymentMode,
    chequeNo: String(payment.chequeNo || '').trim(),
    bankName: String(payment.bankName || '').trim(),
    branchName: String(payment.branchName || '').trim(),
    amount: openingAmount,
    received: paymentAmount,
    balanceDue,
    finalOutstanding: balanceDue,
    ageDays,
    description: payment.description || '',
  };
};

const buildStandalonePaymentRow = (transaction, now) => {
  const paymentAmount = roundCurrency(transaction.amount);
  const postingDate = new Date(transaction.date);
  const ageDays = Math.floor((now - postingDate) / (1000 * 60 * 60 * 24));
  const paymentMode = resolvePaymentMode(
    transaction.paymentMode,
    transaction.chequeNo,
    transaction.bankName,
    transaction.branchName,
  );

  return {
    key: `standalone-payment-${transaction.id || transaction.docNo || transaction.date}`,
    parentKey: transaction.id || transaction.docNo || transaction.date,
    date: transaction.date,
    docNo: transaction.docNo,
    lineType: 'Payment',
    documentTypeLabel: `Payment (${paymentMode})`,
    paymentMode,
    chequeNo: String(transaction.chequeNo || '').trim(),
    bankName: String(transaction.bankName || '').trim(),
    branchName: String(transaction.branchName || '').trim(),
    amount: paymentAmount,
    received: paymentAmount,
    balanceDue: 0,
    finalOutstanding: 0,
    ageDays,
    description: transaction.description || '',
  };
};

/**
 * flattenInvoicePaymentsToStatementRows
 * ═══════════════════════════════════════════════════════════════════════
 * UNIFIED ROW FLATTENING (mirrors OutstandingStatementPrintView).
 *
 * Converts already-mapped outstanding-report invoice rows (which carry an
 * itemized `payments[]` history) into distinct statement rows:
 *
 *   Row 1 (Invoice Parent):
 *     date        = invoice date
 *     docNo       = invoice docNo (normalized at render via normalizeInvoiceNo)
 *     lineType    = 'Invoice'
 *     amount      = full invoice amount
 *     received    = 0
 *     balanceDue  = full invoice amount
 *
 *   Rows 2..N (Itemized Payment Rows, chronological):
 *     date        = payment date
 *     docNo       = same invoice docNo
 *     lineType    = 'Payment'
 *     documentTypeLabel = "Payment (Cash)" | "Payment (Cheque)" | "Payment (Bank Slip)"
 *     amount      = running balance before this payment
 *     received    = exact payment credit amount
 *     balanceDue  = running balance after deduction
 *
 * Standalone Payment rows and Invoice rows WITHOUT a payments[] array pass
 * through untouched so their authoritative net balanceDue/received fields
 * remain intact on screen and print.
 */
export const flattenInvoicePaymentsToStatementRows = (invoiceRows = []) => {
  const rows = [];

  (Array.isArray(invoiceRows) ? invoiceRows : []).forEach((invoice) => {
    if (!invoice) return;

    const rawDocType = String(invoice.docType || '').trim();
    const isPaymentDocument = rawDocType === 'Payment' || rawDocType === 'Payment (Cash)';
    const payments = Array.isArray(invoice.payments) ? invoice.payments : [];

    // ── Pass-through path ──────────────────────────────────────────────────
    if (isPaymentDocument || payments.length === 0) {
      rows.push({
        ...invoice,
        key: invoice.key || `row-${invoice.id || invoice.docNo || invoice.date || rows.length}`,
        lineType: isPaymentDocument ? 'Payment' : invoice.lineType || 'Invoice',
        // CRITICAL: A pass-through Payment document MUST NEVER retain the
        // parent/source docType 'Invoice' — it would mislabel the Doc Type
        // column in report tables. Force its docType back to 'Payment'.
        docType: isPaymentDocument ? 'Payment' : (invoice.docType || invoice.lineType || 'Invoice'),
      });
      return;
    }

    // ── Expand path: Invoice Parent + Itemized Payment History ─────────────
    const invoiceId = invoice.id || invoice.docNo || invoice.date;
    const invoiceAmount = roundCurrency(invoice.amount);

    // Shared wrapper that drops the raw `payments[]` array from expanded rows.
    // This keeps the output idempotent — re-running the flattener on already
    // flattened rows never re-expands the payment history a second time.
    const buildExpandedRow = (overrides) => {
      const { payments: _payments, ...base } = invoice;
      return { ...base, ...overrides };
    };

    // Row 1 — Invoice Parent (full amount, zero received, full balance)
    rows.push(buildExpandedRow({
      key: `invoice-${invoiceId}`,
      parentKey: invoiceId,
      lineType: 'Invoice',
      docType: 'Invoice',
      documentTypeLabel: 'Invoice',
      amount: invoiceAmount,
      received: 0,
      balanceDue: invoiceAmount,
      finalOutstanding: invoiceAmount,
    }));

    // Rows 2..N — Itemized Payment Rows (chronological)
    const sortedPayments = [...payments].sort(
      (left, right) => new Date(left.date || invoice.date) - new Date(right.date || invoice.date),
    );
    let priorBalanceDue = invoiceAmount;

    sortedPayments.forEach((payment, paymentIndex) => {
      const paymentAmount = roundCurrency(payment.amount);
      const paymentMode = resolvePaymentMode(
        payment.paymentMode || payment.paymentMethod,
        payment.chequeNo || invoice.chequeNo,
        payment.bankName || invoice.bankName,
        payment.branchName || invoice.branchName,
      );
      const nextBalanceDue = Math.max(0, roundCurrency(priorBalanceDue - paymentAmount));

      rows.push(buildExpandedRow({
        key: `payment-${invoiceId}-${payment.id || paymentIndex}`,
        parentKey: invoiceId,
        date: payment.date || invoice.date,
        lineType: 'Payment',
        // CRITICAL: Override the inherited parent docType ('Invoice') so
        // report Doc Type columns NEVER label payment rows as "Invoice".
        docType: 'Payment',
        documentTypeLabel: `Payment (${paymentMode})`,
        paymentMode,
        chequeNo: String(payment.chequeNo || '').trim(),
        bankName: String(payment.bankName || '').trim(),
        branchName: String(payment.branchName || '').trim(),
        amount: priorBalanceDue,
        received: paymentAmount,
        balanceDue: nextBalanceDue,
        finalOutstanding: nextBalanceDue,
        description: payment.description || '',
      }));

      priorBalanceDue = nextBalanceDue;
    });
  });

  return rows;
};

export const buildStatementLedger = (transactions = [], currentDate = new Date()) => {
  if (!Array.isArray(transactions) || transactions.length === 0) {
    return { statementRows: [], totalOutstanding: 0, invoiceSummaries: [] };
  }

  const now = currentDate instanceof Date ? currentDate : new Date(currentDate);
  const sortedTransactions = [...transactions].sort(sortByDateAsc);
  const statementRows = [];
  const invoiceSummaries = [];

  sortedTransactions.forEach((transaction) => {
    const isPaymentDocument = transaction.docType === 'Payment';

    if (isPaymentDocument) {
      statementRows.push(buildStandalonePaymentRow(transaction, now));
      return;
    }

    const invoiceRow = buildInvoiceRow(transaction, now);
    statementRows.push(invoiceRow);

    let priorBalanceDue = invoiceRow.balanceDue;
    const sortedPayments = Array.isArray(transaction.payments)
      ? [...transaction.payments].sort((left, right) => new Date(left.date || transaction.date) - new Date(right.date || transaction.date))
      : [];

    sortedPayments.forEach((payment, paymentIndex) => {
      const paymentRow = buildPaymentRow(transaction, payment, paymentIndex, priorBalanceDue, now);
      statementRows.push(paymentRow);
      priorBalanceDue = paymentRow.balanceDue;
    });

    const finalOutstanding = getInvoiceFinalOutstanding(transaction);

    invoiceRow.finalOutstanding = finalOutstanding;
    invoiceSummaries.push({
      parentKey: invoiceRow.parentKey,
      transaction,
      finalOutstanding,
      hasOutstanding: finalOutstanding > 0,
    });
  });

  const latestTrackBalances = statementRows.reduce((accumulator, row) => {
    if (row.lineType !== 'Invoice' && row.lineType !== 'Payment') {
      return accumulator;
    }

    accumulator.set(row.parentKey, parseFloat((Number(row.balanceDue) || 0).toFixed(2)));
    return accumulator;
  }, new Map());

  const totalOutstanding = roundCurrency(
    Array.from(latestTrackBalances.values()).reduce((sum, value) => sum + Math.max(0, value), 0),
  );

  return { statementRows, totalOutstanding, invoiceSummaries };
};

export const filterOutstandingTransactions = (transactions = []) => {
  if (!Array.isArray(transactions) || transactions.length === 0) {
    return [];
  }

  return transactions.filter((transaction) => {
    if (transaction.docType === 'Payment') {
      return false;
    }

    return getInvoiceFinalOutstanding(transaction) > 0;
  });
};

export const getChequeCellMeta = (row) => {
  const paymentMode = resolvePaymentMode(row?.paymentMode, row?.chequeNo, row?.bankName, row?.branchName);
  const chequeNo = String(row?.chequeNo || '').trim();
  const bankName = String(row?.bankName || '').trim();
  const branchName = String(row?.branchName || '').trim();

  if (paymentMode !== 'Cheque' && paymentMode !== 'Bank Slip') {
    return {
      paymentMode,
      chequeNo: '—',
      bankBranchLabel: '',
      showChequeMeta: false,
    };
  }

  return {
    paymentMode,
    chequeNo: chequeNo || '—',
    bankBranchLabel: [bankName, branchName].filter(Boolean).join(' • '),
    showChequeMeta: true,
  };
};