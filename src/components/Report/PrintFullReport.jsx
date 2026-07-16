import React, { useMemo } from 'react';
import useAppStore from '../../hooks/useAppStore';
import { buildStatementLedger, filterOutstandingTransactions, getChequeCellMeta } from '../../services/statementLedger';
import { formatDateYMD } from '../../utils/date';

/**
 * PrintFullReport — Premium Multi-Shop Outstanding Report
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * REFACTORED 2026-07-09 — CRITICAL SYNCHRONISATION with single-shop
 * OutstandingStatementPrintView data hydration layer.
 *
 *   • Payment expansion: each invoice's payments[] array is expanded into
 *     individual credit line-items with isolated, non-cumulative due values.
 *   • Post Dated Cheques: accreditation section derived from actual payment
 *     records with docType 'Payment' or explicit chequeNo and bank strings,
 *     sourced from full parent API collection (not viewport slice).
 *   • Ledger calculations: per-invoice Due tracks isolated difference
 *     (Amount - Received) without cumulative row-by-row carry-forward.
 *   • Currency formatting: localized Sri Lankan corporate Rs. styling.
 *
 * Shared print layout used by BOTH print paths:
 *
 *   1. Full Master Report  (/report page → OutstandingReport.jsx)
 *      <PrintFullReport isFullReport={true} />
 *      • Reads ALL shops from global store (no prop override needed).
 *      • Hides per-store "Outstanding Statement As At:" heading + salutation.
 *      • Omits the Post Dated Cheques in hand section entirely.
 *      • Store blocks flow naturally across A4 pages (break-inside: auto).
 *
 *   2. Single Hardware Store Statement  (InvoiceHistory → StoresManager)
 *      <PrintFullReport isFullReport={false} shopOverride={shop} transactionsOverride={txns} />
 *      • Uses injected shop + transaction arrays instead of the store.
 *      • Shows the heading + salutation for the client letter format.
 *      • Same table layout, same totals, same B&W print styles.
 *
 * Props
 * ─────
 * isFullReport          {boolean}   true = master report, false = single store letter
 * shopOverride          {object}    Single shop object (single-store path only)
 * transactionsOverride  {array}     Transactions for that shop (single-store path only)
 */
const toMoneyNumber = (value) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 0;
  return parseFloat(numeric.toFixed(2));
};

const formatCurrency = (val) => {
  const normalized = toMoneyNumber(val);
  const sign = normalized < 0 ? '-' : '';
  return `${sign}Rs. ${Math.abs(normalized).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const formatAmount = (val) => Number(val || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const formatCreditAmount = (val) => `- ${Math.abs(Number(val || 0)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const formatDateFull = (dateStr) => formatDateYMD(dateStr);

const formatDate = (dateStr) => formatDateYMD(dateStr);

const normalizeInvoiceNo = (value) => {
  const invoiceNo = String(value ?? '').trim();
  if (/^Manual_bill(_\d+)?$/i.test(invoiceNo)) {
    return 'Manual_bill';
  }
  return invoiceNo || '—';
};

const computeAgeDays = (dateStr) => {
  if (!dateStr) return 0;
  const postingDate = new Date(dateStr);
  if (Number.isNaN(postingDate.getTime())) return 0;
  const elapsedDays = Math.max(0, Math.floor((new Date() - postingDate) / (1000 * 60 * 60 * 24)));
  return elapsedDays;
};

const applyStrictAgeFilter = (rows = [], thresholdDays = 60) => {
  if (!Array.isArray(rows) || rows.length === 0) return [];

  // ── CASE-INSENSITIVE KEY NORMALIZER ──────────────────────────────────────
  // Collapses any casing/separator variant of an invoice token (spaces,
  // dashes, underscores) into a single uniform lowercase underscore-
  // separated string before it is joined with shopId. This guarantees that
  // "Manual Bill", "Manual-bill", "Manual_bill", and "manual_bill" all
  // resolve to the same "manual_bill" bucket in both the payment totals map
  // and the aged-invoice lookup set.
  const normalizeKeyToken = (value) =>
    String(value ?? '')
      .trim()
      .toLowerCase()
      .replace(/[\s\-_]+/g, '_');

  // ── CRITICAL REFACTOR 2026-07-15: Consolidate payments into invoice rows
  //    instead of keeping separate payment rows ──
  // Build a composite key from shopId + the normalised invoice token.
  // Raw API report snapshots (reportRowsOverride) don't carry a `parentKey`
  // at all, so relying on `row.parentKey` alone collapses every row onto
  // the same "undefined" bucket and breaks the reduction. The normalisation
  // step additionally ensures casing and separator variants never produce
  // split buckets for the same logical invoice.
  const buildRowKey = (row) => {
    const shopPart = String(row.shopId ?? '').trim();
    // Safely resolve the invoice token across both data shapes:
    // snapshot rows use docNo/invoiceId; ledger rows use parentKey/id.
    // Normalise the token so casing variants collapse to one key.
    const rawInvoiceNo = String(row.docNo || row.invoiceId || '').trim();
    const invoiceNo = normalizeKeyToken(rawInvoiceNo) || normalizeKeyToken(String(row.parentKey || row.id || '').trim());
    return `${shopPart}_${invoiceNo}`;
  };

  // Identify invoice rows that are >= threshold days old
  // Safe dual-field predicate: snapshot rows carry docType, ledger rows carry lineType
  const agedInvoices = rows.filter(
    (row) => (row.lineType === 'Invoice' || row.docType === 'Invoice') && computeAgeDays(row?.date) >= thresholdDays,
  );

  if (agedInvoices.length === 0) return [];

  const agedInvoiceKeys = new Set(agedInvoices.map(buildRowKey));

  // Build a payment totals map: composite key → total received sum.
  // Seed it with any amount already netted onto the invoice row itself
  // (the case for pre-consolidated snapshot rows, which have no separate
  // Payment-type siblings), then add any genuine Payment-type rows found.
  const paymentTotalsByKey = {};
  agedInvoices.forEach((row) => {
    const key = buildRowKey(row);
    const alreadyReceived = toMoneyNumber(row.received || 0);
    if (alreadyReceived > 0) {
      paymentTotalsByKey[key] = toMoneyNumber((paymentTotalsByKey[key] || 0) + alreadyReceived);
    }
  });
  rows.forEach((row) => {
    // Safe dual-field predicate: snapshot rows carry docType, ledger rows carry lineType
    const isPaymentRow = (
      row.lineType === 'Payment' ||
      row.docType === 'Payment' ||
      row.docType === 'Payment (Cash)'
    );
    if (!isPaymentRow || !agedInvoiceKeys.has(buildRowKey(row))) return;
    const key = buildRowKey(row);
    paymentTotalsByKey[key] = toMoneyNumber((paymentTotalsByKey[key] || 0) + toMoneyNumber(row.received || 0));
  });

  // Return consolidated invoice rows with payments summed into `received`
  return agedInvoices.map((invoiceRow) => {
    const key = buildRowKey(invoiceRow);
    const totalReceived = toMoneyNumber(paymentTotalsByKey[key] || 0);
    const invoiceAmount = toMoneyNumber(invoiceRow.amount);
    const updatedBalanceDue = Math.max(0, invoiceAmount - totalReceived);

    return {
      ...invoiceRow,
      received: totalReceived,
      balanceDue: updatedBalanceDue,
      finalOutstanding: updatedBalanceDue,
    };
  }).filter((row) => toMoneyNumber(row.balanceDue) > 0);
};

const calculateVisibleOutstanding = (rows = []) => {
  if (!Array.isArray(rows) || rows.length === 0) return 0;

  return toMoneyNumber(
    rows
      // Safe dual-field predicate: snapshot rows carry docType, ledger rows carry lineType
      .filter((row) => (row.lineType === 'Invoice' || row.docType === 'Invoice'))
      .reduce((sum, row) => sum + Math.max(0, toMoneyNumber(row?.finalOutstanding ?? row?.balanceDue ?? 0)), 0),
  );
};

const getPrintRowAgeTierClassName = (ageDays) => {
  const normalizedAge = Number(ageDays) || 0;
  if (normalizedAge >= 60) return 'age-row-tier-60';
  if (normalizedAge >= 45) return 'age-row-tier-mid';
  return 'age-row-tier-under45';
};

const getPrintRowTypographyStyle = (ageDays) => {
  const normalizedAge = Number(ageDays) || 0;
  if (normalizedAge >= 60) {
    return { color: '#dc2626', fontWeight: 700 };
  }
  if (normalizedAge >= 45) {
    return { color: '#000000', fontWeight: 400 };
  }
  return { color: '#000000', fontWeight: 400 };
};

const getDisplayDocumentType = (row) => {
  if (!row) return '—';
  // Safe dual-field check: snapshot rows use docType, ledger rows use lineType
  if (row.lineType === 'Invoice' || row.docType === 'Invoice') return 'Invoice';
  if (
    row.lineType === 'Payment' ||
    row.docType === 'Payment' ||
    row.docType === 'Payment (Cash)'
  ) return 'Payment';
  return row.documentTypeLabel || '—';
};

const PrintFullReport = ({
  isFullReport = false,
  olderThan60Days = false,
  shopOverride = null,
  transactionsOverride = null,
  reportRowsOverride = null,
  marketOutstandingTotalOverride = null,
}) => {
  const globalShops        = useAppStore((state) => state.shops)        || [];
  const globalTransactions = useAppStore((state) => state.transactions) || [];
  const shouldShowPdcSection = !isFullReport;

  const snapshotTransactions = Array.isArray(reportRowsOverride) ? reportRowsOverride : null;
  const snapshotShopIds = snapshotTransactions
    ? Array.from(new Set(snapshotTransactions.map((row) => String(row.shopId)).filter(Boolean)))
    : [];
  const snapshotShops = snapshotShopIds
    .map((shopId) => globalShops.find((shop) => String(shop.id) === String(shopId)))
    .filter(Boolean);

  // ── Data source decision ────────────────────────────────────────────────
  const activeShops = (isFullReport && snapshotShops.length > 0)
    ? snapshotShops
    : shopOverride
    ? [shopOverride]
    : globalShops;

  const activeTransactions = (isFullReport && snapshotTransactions)
    ? snapshotTransactions
    : transactionsOverride
    ? transactionsOverride
    : globalTransactions;

  const shopReportData = useMemo(() => {
    // ── SNAPSHOT MODE DETECTION ──────────────────────────────────────────
    // reportRowsOverride rows are pre-consolidated snapshots: amount,
    // received, and balanceDue are already netted per invoice by the
    // OutstandingReport layer BEFORE this component receives them.
    // Running buildStatementLedger on these rows would treat the already-
    // reconciled `received` field as raw payment amounts and re-subtract
    // them, producing the inflated Rs. 1,472,952.00 grand total bug.
    // The snapshot branch MUST completely bypass buildStatementLedger and
    // filterOutstandingTransactions and assign rows directly.
    const isSnapshotMode = isFullReport && !!reportRowsOverride;

    return activeShops.map((shop) => {
      let statementRows;
      let totalOutstanding;
      let sortedTransactions;

      if (isSnapshotMode) {
        // ── SNAPSHOT BRANCH: Direct pass-through, NO ledger pipeline ──────
        // Filter the snapshot array strictly by shopId. Do NOT apply
        // filterOutstandingTransactions or buildStatementLedger — both
        // expect un-consolidated raw payment arrays and will corrupt the
        // already-netted balanceDue / received values on snapshot rows.
        const shopRows = (reportRowsOverride || []).filter(
          (row) => String(row.shopId) === String(shop.id),
        );

        // Sort chronologically for display consistency.
        sortedTransactions = [...shopRows].sort((a, b) => new Date(a.date) - new Date(b.date));

        // Assign directly — preserve every field the snapshot already
        // computed (received, balanceDue, amount, docNo, date, etc.).
        // Resolve lineType from whichever field the snapshot provides:
        // snapshot rows set docType, ledger rows set lineType.
        statementRows = sortedTransactions.map((row, idx) => {
          let resolvedLineType;
          if (row.docType === 'Invoice' || row.lineType === 'Invoice') {
            resolvedLineType = 'Invoice';
          } else if (
            row.docType === 'Payment' ||
            row.docType === 'Payment (Cash)' ||
            row.lineType === 'Payment'
          ) {
            resolvedLineType = 'Payment';
          } else {
            resolvedLineType = row.lineType || 'Invoice';
          }
          return {
            ...row,
            key: row.id || `${shop.id}-${row.docNo || 'row'}-${idx}`,
            lineType: resolvedLineType,
            received: toMoneyNumber(row.received || 0),
            balanceDue: toMoneyNumber(row.balanceDue || 0),
          };
        }).filter((row) => toMoneyNumber(row.balanceDue) > 0);

        // Reduce totalOutstanding directly from the filtered snapshot rows.
        // Each row's balanceDue is already payment-deducted — sum directly,
        // do NOT re-run any ledger carry-forward logic here.
        // Both the accumulator AND the current row value are wrapped in
        // toMoneyNumber to prevent floating-point drift from leaking into
        // per-store and grand-total aggregations.
        totalOutstanding = statementRows.reduce(
          (sum, r) => toMoneyNumber(toMoneyNumber(sum) + toMoneyNumber(r.balanceDue)),
          0,
        );
      } else {
        // ── LEGACY BRANCH: Raw transaction ledger pipeline ─────────────────
        // Used only for the single-store statement view where transactions
        // arrive as raw un-consolidated records from the global store or
        // transactionsOverride prop. buildStatementLedger is correct here.
        const shopTx = activeTransactions.filter(
          (t) => String(t.shopId) === String(shop.id),
        );
        const outstandingTransactions = filterOutstandingTransactions(shopTx);
        const ledgerResult = buildStatementLedger(outstandingTransactions, new Date());
        statementRows = ledgerResult.statementRows;
        totalOutstanding = ledgerResult.totalOutstanding;
        sortedTransactions = [...outstandingTransactions].sort((a, b) => new Date(a.date) - new Date(b.date));
      }

      const visibleStatementRows = olderThan60Days
        ? applyStrictAgeFilter(statementRows, 60)
        : statementRows;
      const visibleTotalOutstanding = olderThan60Days
        ? calculateVisibleOutstanding(visibleStatementRows)
        : totalOutstanding;

      let postDatedCheques = [];

      if (shouldShowPdcSection) {
        // ── Post Dated Cheques for this shop — derived from ALL payment records ──
        const collectedCheques = [];
        sortedTransactions.forEach((t) => {
          if (t.payments && t.payments.length > 0) {
            t.payments.forEach((p) => {
              const chequeNo = (p.chequeNo || t.chequeNo || '').trim();
              const bankName = (p.bankName || t.bankName || '').trim();
              // A payment is a PDC if it has a cheque number AND a bank name
              // OR if the payment method explicitly indicates cheque
              const isChequePayment = (
                (chequeNo && chequeNo !== '—' && chequeNo !== '-') &&
                (bankName && bankName !== '—' && bankName !== '-' && bankName !== '')
              ) || (p.paymentMode === 'cheque' || p.paymentMode === 'check' || p.paymentMode === 'bank_slip');

              if (isChequePayment) {
                collectedCheques.push({
                  id: p.id || `${t.id}-pdc-${collectedCheques.length}`,
                  chequeNo: chequeNo || p.chequeNo || '—',
                  bankName: bankName || p.bankName || '—',
                  chequeDate: p.date || t.date,
                  amount: Number(p.amount) || 0,
                });
              }
            });
          }
          // Also check the invoice itself for direct cheque info
          if (t.docType === 'Payment') {
            const cqNo = (t.chequeNo || '').trim();
            const bkName = (t.bankName || '').trim();
            if (cqNo && cqNo !== '—' && cqNo !== '-' && bkName && bkName !== '—' && bkName !== '-') {
              collectedCheques.push({
                id: t.id ? `pd-${t.id}` : `pd-${collectedCheques.length}`,
                chequeNo: cqNo,
                bankName: bkName,
                chequeDate: t.date,
                amount: Number(t.amount) || 0,
              });
            }
          }
        });

        // Deduplicate by chequeNo+bankName+amount
        const seen = new Set();
        postDatedCheques = collectedCheques.filter((c) => {
          const key = `${c.chequeNo}|${c.bankName}|${c.amount}`;
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });
      }

      return { shop, statementRows: visibleStatementRows, totalOutstanding: visibleTotalOutstanding, postDatedCheques };
    }).filter(({ totalOutstanding, statementRows }) => totalOutstanding > 0 && statementRows.length > 0);
  }, [activeShops, activeTransactions, olderThan60Days]);

  const groupByRoute = useMemo(() => {
    return shopReportData.reduce((acc, item) => {
      const routeKey = String(item.shop?.route || 'Unassigned Route').trim() || 'Unassigned Route';
      if (!acc[routeKey]) {
        acc[routeKey] = [];
      }
      acc[routeKey].push(item);
      return acc;
    }, {});
  }, [shopReportData]);

  const groupedRouteEntries = useMemo(() => {
    return Object.entries(groupByRoute).sort(([leftRoute], [rightRoute]) => leftRoute.localeCompare(rightRoute));
  }, [groupByRoute]);

  const grandTotal = shopReportData.reduce(
    (sum, data) => sum + Math.max(0, data.totalOutstanding),
    0,
  );

  // Hard-bind: use marketOutstandingTotalOverride when it is a strictly
  // positive finite number. This prevents the layout from recalculating
  // or displaying a stale inflated total when a snapshot total is passed
  // in. A zero or null override falls back to the locally computed
  // grandTotal so the component still works for the non-snapshot path.
  // The strict positivity guard blocks fallback-drift leaks where a stale
  // or zero override would silently allow the inflated grandTotal to
  // surface in the footer.
  const finalMarketOutstanding =
    Number.isFinite(Number(marketOutstandingTotalOverride)) &&
    Number(marketOutstandingTotalOverride) > 0
      ? toMoneyNumber(marketOutstandingTotalOverride)
      : toMoneyNumber(grandTotal);

  const companyName = 'Liyanage Distributors';
  const companyAddress = 'Hakmana Road, Deiyandara.';
  const companyTel = '070-5237647 / 071-5944711';

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        @media screen {
          .mans-lanka-master-print {
            visibility: hidden !important;
            pointer-events: none !important;
            position: absolute !important;
            top: 0 !important;
            left: 0 !important;
            width: 210mm !important;
            height: 0 !important;
            overflow: hidden !important;
            z-index: -1 !important;
          }

          .print-only {
            display: none !important;
          }

          .route-print-shell,
          .print-table-meta-row {
            display: none !important;
          }
        }

        @media print {
          @page { margin: 10mm 12mm; size: A4 portrait; }
          table { display: table !important; width: 100% !important; table-layout: auto !important; border-collapse: collapse !important; }
          thead { display: table-header-group !important; break-inside: avoid !important; }
          tbody { display: table-row-group !important; }
          tr { display: table-row !important; page-break-inside: avoid !important; break-inside: avoid !important; }
          th, td { display: table-cell !important; }

          html, body, #root,
          #layout-main, #layout-main > div,
          .min-h-screen,
          div[class*="bg-slate-"],
          div[class*="overflow-"],
          div[class*="space-y-"] {
            height: auto !important;
            min-height: 0 !important;
            max-height: none !important;
            overflow: visible !important;
            background: transparent !important;
            position: static !important;
          }

          .mans-lanka-master-print {
            display: block !important;
            visibility: visible !important;
            position: relative !important;
            top: auto !important;
            left: auto !important;
            width: 100% !important;
            height: auto !important;
            min-height: 0 !important;
            max-height: none !important;
            overflow: visible !important;
            z-index: 9999999 !important;
            background: #ffffff !important;
            background-color: #ffffff !important;
            color: #000000 !important;
            margin: 0 !important;
            padding: 0 !important;
            box-sizing: border-box !important;
          }

          .mans-lanka-master-print,
          .mans-lanka-master-print .store-table-flow,
          .mans-lanka-master-print .store-table-flow > div,
          .mans-lanka-master-print .store-page-block,
          .mans-lanka-master-print .store-header-meta-banner,
          .mans-lanka-master-print .store-header-meta-banner > div,
          .mans-lanka-master-print .final-summary-block {
            display: block !important;
            overflow: visible !important;
            height: auto !important;
            max-height: none !important;
            position: relative !important;
            float: none !important;
            clear: both !important;
          }

          .mans-lanka-master-print table {
            border: none !important;
            border-collapse: collapse !important;
            border-spacing: 0 !important;
          }

          .mans-lanka-master-print .store-ledger-table {
            display: table !important;
            width: 100% !important;
            table-layout: auto !important;
            border-collapse: collapse !important;
          }

          .mans-lanka-master-print .store-ledger-table thead {
            display: table-header-group !important;
            break-inside: avoid !important;
          }

          .mans-lanka-master-print .store-ledger-table tbody {
            display: table-row-group !important;
          }

          .mans-lanka-master-print .store-ledger-table tr {
            display: table-row !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }

          .mans-lanka-master-print .store-ledger-table th,
          .mans-lanka-master-print .store-ledger-table td {
            display: table-cell !important;
          }

          .mans-lanka-master-print th,
          .mans-lanka-master-print td {
            border: none !important;
            border-left: none !important;
            border-right: none !important;
            border-top: none !important;
            border-bottom: 1px solid #cbd5e1 !important;
            padding: 12px 8px !important;
          }

          .mans-lanka-master-print .store-ledger-table tr.age-row-tier-under45 > td.age-row-cell {
            color: #000000 !important;
            font-weight: 400 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          .mans-lanka-master-print .store-ledger-table tr.age-row-tier-mid > td.age-row-cell {
            color: #000000 !important;
            font-weight: 400 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          .mans-lanka-master-print .store-ledger-table tr.age-row-tier-60 > td.age-row-cell {
            color: #dc2626 !important;
            font-weight: 700 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          .mans-lanka-master-print .store-ledger-table tr.age-row-tier-under45 > td.age-row-cell-received,
          .mans-lanka-master-print .store-ledger-table tr.age-row-tier-mid > td.age-row-cell-received,
          .mans-lanka-master-print .store-ledger-table tr.age-row-tier-60 > td.age-row-cell-received {
            color: #000000 !important;
            font-weight: 700 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          .store-page-block {
            display: block !important;
            position: relative !important;
            float: none !important;
            clear: both !important;
            width: 100% !important;
            height: auto !important;
            overflow: visible !important;
            margin-bottom: 14px !important;
            padding: 8px 0 0 0 !important;
            page-break-inside: auto !important;
            break-inside: auto !important;
            background: #ffffff !important;
            color: #000000 !important;
          }

          .route-section-block {
            display: block !important;
            width: 100% !important;
            page-break-inside: auto !important;
            break-inside: auto !important;
          }

          .route-print-shell {
            display: table !important;
            width: 100% !important;
            border-collapse: collapse !important;
            table-layout: fixed !important;
            border: none !important;
          }

          .route-print-shell thead {
            display: table-header-group !important;
          }

          .route-print-shell tbody {
            display: table-row-group !important;
          }

          .route-print-shell .route-store-shell-row {
            display: table-row !important;
            page-break-inside: auto !important;
            break-inside: auto !important;
          }

          .route-print-shell .route-store-shell-cell {
            display: table-cell !important;
            border: none !important;
            padding: 0 !important;
          }

          .store-header-meta-banner {
            page-break-after: avoid !important;
            break-after: avoid-page !important;
          }

          .print-only {
            display: block !important;
          }

          .print-route-meta-row th {
            color: #2563eb !important;
            font-weight: 700 !important;
            font-size: 14pt !important;
            letter-spacing: 0.08em !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          .print-table-meta-row {
            display: table-row !important;
          }

          .print-table-meta-row th {
            text-align: left !important;
            border: none !important;
            padding: 0 0 8px 0 !important;
            background: transparent !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          .print-shop-meta-row th {
            color: #111827 !important;
            font-weight: 700 !important;
            font-size: 12pt !important;
            letter-spacing: 0.01em !important;
            padding-bottom: 10px !important;
          }

          .overdue-title-strong {
            color: #dc2626 !important;
            font-weight: 700 !important;
            font-size: 24px !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          .store-header-meta-banner {
            page-break-after: avoid !important;
            break-after: avoid-page !important;
            margin-bottom: 8px !important;
          }

          .store-shop-title {
            color: #111827 !important;
            font-weight: 700 !important;
            font-size: 14pt !important;
            line-height: 1.2 !important;
          }

          .store-shop-meta {
            color: #334155 !important;
            font-size: 8.5pt !important;
            margin-top: 2px !important;
          }

          .store-ledger-table,
          .store-ledger-table tbody,
          .store-total-outstanding-row,
          .store-pdc-table,
          .store-pdc-table tbody {
            page-break-inside: auto !important;
            break-inside: auto !important;
          }

          .final-summary-block {
            display: block !important;
            position: relative !important;
            float: none !important;
            clear: both !important;
            width: 100% !important;
            height: auto !important;
            overflow: visible !important;
            page-break-before: auto !important;
            break-before: auto !important;
            page-break-after: avoid !important;
            break-after: avoid !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            background: #ffffff !important;
            color: #000000 !important;
          }
        }
      `}} />

      {/* ── PRINT CANVAS ─────────────────────────────────────────────────── */}
      <div className="mans-lanka-master-print" style={{
        fontFamily: "'Segoe UI', 'Helvetica Neue', Arial, sans-serif",
        color: '#000000',
        fontSize: '10pt',
        lineHeight: '1.3',
      }}>

        {/* ═══════════════════════════════════════════════════════════════════
            PHASE 1: Document Header
            ═══════════════════════════════════════════════════════════════════ */}

        {/* ── 1a. "OUTSTANDING REPORT" bold serif heading ── */}
        {isFullReport && (
          <div style={{
            textAlign: 'center',
            marginBottom: '14px',
            paddingBottom: '10px',
            borderBottom: '2px solid #1a1a2e',
          }}>
            <h1 style={{
              fontFamily: "'Times New Roman', 'Georgia', 'Palatino Linotype', 'Book Antiqua', serif",
              fontSize: '18pt',
              fontWeight: 900,
              margin: 0,
              letterSpacing: '1px',
              color: '#1a1a2e',
              textTransform: 'uppercase',
            }}>
              Outstanding Report
            </h1>
          </div>
        )}

        {/* ── 1b. PREMIUM HEADER BANNER ── */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '10px 14px',
          marginBottom: '20px',
          borderBottom: '3px solid #1a1a2e',
          background: '#ffffff',
          borderRadius: '6px',
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
            flex: 1,
            textAlign: 'left',
          }}>
            <img
              src="/inv_logo.png"
              alt="Liyanage Distributors"
              style={{
                height: '56px',
                width: 'auto',
                objectFit: 'contain',
                display: 'block',
              }}
            />
            <div>
              <h1 style={{
                fontSize: '16pt',
                fontWeight: 900,
                margin: 0,
                lineHeight: 1.1,
                letterSpacing: '0.5px',
                color: '#1a1a2e',
              }}>
                {companyName}
              </h1>
              <p style={{
                fontSize: '8pt',
                margin: '2px 0 0 0',
                color: '#333',
                lineHeight: 1.3,
              }}>
                {companyAddress} | Tel: {companyTel}
              </p>
            </div>
          </div>

          <div style={{
            flexShrink: 0,
            textAlign: 'center',
            padding: '4px 14px',
            border: '2px solid #1a1a2e',
            borderRadius: '4px',
            backgroundColor: '#1a1a2e',
          }}>
            <span style={{
              fontSize: '12pt',
              fontWeight: 800,
              letterSpacing: '1px',
              textTransform: 'uppercase',
              color: '#ffffff',
            }}>
              {isFullReport ? 'REPORT' : 'STATEMENT'}
            </span>
          </div>
        </div>

        {olderThan60Days && (
          <div className="overdue-title-strong text-red-600 font-bold text-2xl mb-4">60 day Overdue</div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════
            PHASE 2: Per-shop blocks — fully hydrated data from DB
            ═══════════════════════════════════════════════════════════════════ */}

        {groupedRouteEntries.map(([routeName, routeEntries]) => (
          <div key={routeName} className="route-section-block">
            {routeEntries.map(({ shop, statementRows, totalOutstanding, postDatedCheques }) => (
              <div key={`${routeName}-${shop.id}`} className="store-page-block">

            {/* ── 2a. Single-store heading + salutation (only for non-full report) ── */}
            {!isFullReport && (
              <div className="store-header-meta-banner">
                <div style={{
                  padding: '6px 0',
                  marginBottom: '8px',
                  borderBottom: '1px dashed #888',
                  width: '100%',
                  lineHeight: '1.6',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}>
                  <span style={{
                    fontWeight: 800,
                    fontSize: '11pt',
                    color: '#1a1a2e',
                  }}>
                    {shop.name || '—'}
                  </span>
                  <span style={{
                    fontSize: '9pt',
                    color: '#444',
                    marginLeft: '8px',
                  }}>
                    — {shop.address || shop.route || '—'}
                  </span>
                  <span style={{
                    fontSize: '9pt',
                    color: '#555',
                    marginLeft: '6px',
                  }}>
                    | {shop.route || '—'}
                  </span>
                  <span style={{
                    fontSize: '9pt',
                    color: '#555',
                    marginLeft: '6px',
                  }}>
                    | Tel: {shop.contact || shop.phone || '—'}
                  </span>
                </div>
                <div style={{ marginBottom: '8px' }}>
                  <h2 style={{
                    fontSize: '12pt',
                    fontWeight: 800,
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    textDecoration: 'underline',
                    marginBottom: '6px',
                    color: '#000000',
                  }}>
                    Outstanding Statement As At: {formatDateFull(new Date().toISOString().split('T')[0])}
                  </h2>
                  <p style={{
                    textAlign: 'justify',
                    lineHeight: '1.5',
                    fontSize: '9pt',
                    color: '#000000',
                    margin: 0,
                  }}>
                    Dear Sir, Please find below the outstanding balance as at the above-mentioned
                    date and kindly make arrangements to forward the full payment at your earliest
                    convenience. All cheques should be drawn in favour of{' '}
                    <strong>Liyanage Distributors</strong>.
                  </p>
                </div>
              </div>
            )}

            {/* ── 2c. ITEMIZED LEDGER GRID ── */}
            <div className="store-table-flow">
            <table className="store-ledger-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '9pt', border: 'none' }}>
              <thead>
                <tr className="print-table-meta-row print-route-meta-row">
                  <th colSpan={8}>Route: {routeName}</th>
                </tr>
                <tr className="print-table-meta-row" style={{ display: 'table-row' }}>
                  <th colSpan={8} style={{
                    textAlign: 'left',
                    border: 'none',
                    padding: '0 0 10px 0',
                    background: 'transparent',
                    lineHeight: '1.6',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}>
                    <span style={{
                      fontWeight: 800,
                      fontSize: '11pt',
                      color: '#1a1a2e',
                    }}>
                      {shop.name || '—'}
                    </span>
                    <span style={{
                      fontSize: '9pt',
                      color: '#444',
                      fontWeight: 500,
                      marginLeft: '8px',
                    }}>
                      — {shop.address || shop.route || '—'}
                    </span><span style={{
                      fontSize: '9pt',
                      color: '#555',
                      marginLeft: '6px',
                    }}>
                      | Tel: {shop.contact || shop.phone || '—'}
                    </span>
                  </th>
                </tr>
                <tr className="print-column-header-row" style={{
                  borderTop: 'none',
                  borderBottom: '1px solid #cbd5e1',
                  backgroundColor: 'transparent',
                  color: '#475569',
                }}>
                  <th style={{ padding: '12px 8px', textAlign: 'left', fontWeight: 600, color: '#475569', border: 'none' }}>Posting Date</th>
                  <th style={{ padding: '12px 8px', textAlign: 'left', fontWeight: 600, color: '#475569', border: 'none' }}>Invoice No</th>
                  <th style={{ padding: '12px 8px', textAlign: 'left', fontWeight: 600, color: '#475569', border: 'none' }}>Doc Type</th>
                  <th style={{ padding: '12px 8px', textAlign: 'left', fontWeight: 600, color: '#475569', border: 'none' }}>Cheque No</th>
                  <th style={{ padding: '12px 8px', textAlign: 'right', fontWeight: 600, color: '#475569', border: 'none' }}>Amount (Rs.)</th>
                  <th style={{ padding: '12px 8px', textAlign: 'right', fontWeight: 600, color: '#475569', border: 'none' }}>Received (Credits) (Rs.)</th>
                  <th style={{ padding: '12px 8px', textAlign: 'right', fontWeight: 600, color: '#475569', border: 'none' }}>Balance Due (Rs.)</th>
                  <th style={{ padding: '12px 8px', textAlign: 'right', fontWeight: 600, color: '#475569', border: 'none' }}>Age (Days)</th>
                </tr>
              </thead>
              <tbody>
                {statementRows.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ padding: '12px 8px', textAlign: 'center', borderBottom: '1px solid #e2e8f0', border: 'none' }}>
                      No outstanding transactions
                    </td>
                  </tr>
                ) : (
                  statementRows.map((row) => {
                    const chequeMeta = getChequeCellMeta(row);
                    // Safe dual-field predicate for cheque meta rendering
                    const shouldRenderChequeMeta = (
                      row.lineType === 'Payment' ||
                      row.docType === 'Payment' ||
                      row.docType === 'Payment (Cash)'
                    ) && chequeMeta.showChequeMeta;
                    const elapsedDays = computeAgeDays(row.date);
                    const rowAgeTierClassName = getPrintRowAgeTierClassName(elapsedDays);
                    const rowTypographyStyle = getPrintRowTypographyStyle(elapsedDays);

                    return (
                    <tr key={row.key} className={rowAgeTierClassName} style={{
                      borderBottom: '1px solid #e2e8f0',
                      backgroundColor: 'transparent',
                      border: 'none',
                    }}>
                      <td className="age-row-cell" style={{ padding: '12px 8px', border: 'none', ...rowTypographyStyle }}>{formatDate(row.date)}</td>
                      <td className="age-row-cell" style={{ padding: '12px 8px', fontFamily: "'Courier New', monospace", border: 'none', ...rowTypographyStyle }}>{normalizeInvoiceNo(row.docNo)}</td>
                      <td className="age-row-cell" style={{ padding: '12px 8px', border: 'none', ...rowTypographyStyle }}>{getDisplayDocumentType(row)}</td>
                      <td className="age-row-cell" style={{ padding: '12px 8px', fontFamily: "'Courier New', monospace", fontSize: '8pt', border: 'none', ...rowTypographyStyle }}>
                        {shouldRenderChequeMeta ? (
                          <>
                            <div>{chequeMeta.chequeNo}</div>
                            {chequeMeta.bankBranchLabel ? (
                              <div style={{ fontSize: '10px', marginTop: '2px', color: 'inherit', fontWeight: 'inherit' }}>{chequeMeta.bankBranchLabel}</div>
                            ) : null}
                          </>
                        ) : '—'}
                      </td>
                      <td className="age-row-cell" style={{
                        textAlign: 'right',
                        padding: '12px 8px',
                        fontFamily: "'Courier New', monospace",
                        border: 'none',
                        ...rowTypographyStyle,
                      }}>
                        {formatAmount(row.amount)}
                      </td>
                      <td className="age-row-cell age-row-cell-received font-bold text-gray-900" style={{
                        textAlign: 'right',
                        padding: '12px 8px',
                        fontFamily: "'Courier New', monospace",
                        border: 'none',
                        fontWeight: 700,
                        color: '#111827',
                      }}>
                        {row.received > 0 ? formatCreditAmount(row.received) : '—'}
                      </td>
                      <td className="age-row-cell" style={{
                        textAlign: 'right',
                        padding: '12px 8px',
                        fontFamily: "'Courier New', monospace",
                        border: 'none',
                        ...rowTypographyStyle,
                      }}>
                        {formatAmount(Number(row.balanceDue) || 0)}
                      </td>
                      <td className="age-row-cell" style={{ textAlign: 'right', padding: '12px 8px', border: 'none', ...rowTypographyStyle }}>{elapsedDays}d</td>
                    </tr>
                  )})
                )}
                <tr className="store-total-outstanding-row" style={{
                  borderTop: '1px solid #cbd5e1',
                  borderBottom: 'none',
                  backgroundColor: 'transparent',
                  color: '#1e293b',
                }}>
                  <td
                    colSpan={6}
                    style={{
                      textAlign: 'right',
                      fontWeight: 800,
                      fontSize: '10pt',
                      padding: '12px 8px',
                      color: '#1e293b',
                      border: 'none',
                    }}
                  >
                    Total Outstanding:
                  </td>
                  <td
                    style={{
                      textAlign: 'right',
                      fontWeight: 800,
                      fontSize: '10pt',
                      padding: '12px 8px',
                      fontFamily: "'Courier New', monospace",
                      color: '#1e293b',
                      border: 'none',
                    }}
                  >
                    {formatAmount(totalOutstanding > 0 ? totalOutstanding : 0)}
                  </td>
                  <td style={{ padding: '12px 8px', color: '#1e293b', border: 'none' }} />
                </tr>
              </tbody>
            </table>
            </div>

            {/* ── 2d. POST DATED CHEQUES SECTION ── */}
            {shouldShowPdcSection && postDatedCheques.length > 0 && (
              <div style={{ marginTop: '12px', marginBottom: '12px' }}>
                <div style={{
                  fontWeight: 700,
                  fontSize: '9pt',
                  marginBottom: '6px',
                  padding: '4px 6px',
                  backgroundColor: '#1a1a2e',
                  color: '#ffffff',
                  display: 'inline-block',
                }}>
                  Post Dated Cheques in hand:
                </div>
                <table className="store-pdc-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '8.5pt' }}>
                  <thead>
                    <tr style={{ borderTop: '1px solid #000000', borderBottom: '1px solid #000000' }}>
                      <th style={{ padding: '4px 6px', textAlign: 'left', fontWeight: 600 }}>Cheque No</th>
                      <th style={{ padding: '4px 6px', textAlign: 'left', fontWeight: 600 }}>Bank Branch</th>
                      <th style={{ padding: '4px 6px', textAlign: 'left', fontWeight: 600 }}>Cheque Date</th>
                      <th style={{ padding: '4px 6px', textAlign: 'right', fontWeight: 600 }}>Amount (Rs.)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {postDatedCheques.map((cheque) => (
                      <tr key={cheque.id} style={{ borderBottom: '1px solid #ccc' }}>
                        <td style={{ padding: '3px 6px', textAlign: 'left', fontFamily: "'Courier New', monospace" }}>{cheque.chequeNo}</td>
                        <td style={{ padding: '3px 6px', textAlign: 'left' }}>{cheque.bankName}</td>
                        <td style={{ padding: '3px 6px', textAlign: 'left' }}>{formatDate(cheque.chequeDate)}</td>
                        <td style={{ padding: '3px 6px', textAlign: 'right', fontFamily: "'Courier New', monospace" }}>{formatAmount(cheque.amount)}</td>
                      </tr>
                    ))}
                    <tr style={{ borderTop: '1px solid #000000', fontWeight: 700 }}>
                      <td colSpan={3} style={{ padding: '4px 6px', textAlign: 'right' }}>Total PDC:</td>
                      <td style={{ padding: '4px 6px', textAlign: 'right', fontFamily: "'Courier New', monospace" }}>
                        {formatAmount(postDatedCheques.reduce((s, c) => s + c.amount, 0))}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}

              </div>
            ))}
          </div>
        ))}

        {/* ── FINAL MARKET OUTSTANDING — Grand total ─────────────────────── */}
        {isFullReport && (
          <div className="final-summary-block">
            <div style={{
              display: 'flex',
              justifyContent: 'flex-end',
              alignItems: 'center',
              fontWeight: 800,
              fontSize: '13pt',
              color: '#ffffff',
              backgroundColor: '#1a1a2e',
              borderTop: '3px solid #1a1a2e',
              borderBottom: '3px solid #1a1a2e',
              padding: '14px 12px',
              letterSpacing: '0.02em',
            }}>
              <span>Final Market Outstanding:</span>
              <span style={{ marginLeft: '16px', fontFamily: "'Courier New', monospace" }}>
                {formatCurrency(Math.round(finalMarketOutstanding))}
              </span>
            </div>
          </div>
        )}

      </div>
    </>
  );
};

export default PrintFullReport;