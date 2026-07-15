import { useEffect, useMemo } from 'react';
import useAppStore from '../../hooks/useAppStore';
import { buildStatementLedger, getChequeCellMeta } from '../../services/statementLedger';
import { formatDateYMD } from '../../utils/date';

const formatAmount = (val) => Number(val || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const formatCreditAmount = (val) => `- ${Math.abs(Number(val || 0)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const formatDate = (dateStr) => formatDateYMD(dateStr);

const formatDateFull = (dateStr) => formatDateYMD(dateStr);

const computeAgeDays = (dateStr) => {
  if (!dateStr) return 0;
  const postingDate = new Date(dateStr);
  if (Number.isNaN(postingDate.getTime())) return 0;
  const elapsedDays = Math.max(0, Math.floor((new Date() - postingDate) / (1000 * 60 * 60 * 24)));
  return elapsedDays;
};

const getPrintRowAgeTierClassName = (ageDays) => {
  const normalizedAge = Number(ageDays) || 0;
  if (normalizedAge >= 60) return 'statement-age-row-tier-60';
  if (normalizedAge >= 45) return 'statement-age-row-tier-45';
  return 'statement-age-row-tier-under45';
};

const getPrintRowTypographyStyle = (ageDays) => {
  const normalizedAge = Number(ageDays) || 0;
  if (normalizedAge >= 60) {
    return { color: '#ff0000', fontWeight: 700 };
  }
  if (normalizedAge >= 45) {
    return { color: '#000000', fontWeight: 700 };
  }
  return { color: '#000000', fontWeight: 400 };
};

const getDisplayDocumentType = (row) => {
  if (!row) return '—';
  if (row.lineType === 'Invoice') return 'Invoice';
  return row.documentTypeLabel || '—';
};

export default function OutstandingStatementPrintView({ shop, transactions, outstanding, currentDate }) {
  const liveInvoices = useAppStore((state) => state.invoices) || [];
  const refreshing = useAppStore((state) => state.refreshing);

  const sourceTransactions = useMemo(() => {
    if (shop?.id && liveInvoices.length > 0) {
      return liveInvoices.filter((t) => String(t.shopId) === String(shop.id));
    }
    return transactions || [];
  }, [shop?.id, liveInvoices, transactions]);

  const boundTransactions = useMemo(
    () => (sourceTransactions || []).map((t) => ({
      ...t,
      payments: Array.isArray(t.payments) ? t.payments.map((p) => ({ ...p })) : [],
    })),
    [sourceTransactions],
  );

  const statementRows = useMemo(() => {
    const ledger = buildStatementLedger(boundTransactions, currentDate ? new Date(currentDate) : new Date());
    return ledger.statementRows;
  }, [boundTransactions, currentDate]);

  const totalOutstanding = useMemo(
    () => buildStatementLedger(boundTransactions, currentDate ? new Date(currentDate) : new Date()).totalOutstanding,
    [boundTransactions, currentDate],
  );

  // ── Post Dated Cheques — derived from actual payment records ────────────
  // Iterate through ALL transactions/payments looking for cheque-based payments
  const shopCheques = useMemo(() => {
    if (!boundTransactions || boundTransactions.length === 0) return [];

    const cheques = [];
    boundTransactions.forEach((t) => {
      // Check payments array on the invoice
      if (t.payments && t.payments.length > 0) {
        t.payments.forEach((p) => {
          const chequeNo = (p.chequeNo || t.chequeNo || '').trim();
          const bankName = (p.bankName || t.bankName || '').trim();
          const isChequePayment = (
            (chequeNo && chequeNo !== '—' && chequeNo !== '-') &&
            (bankName && bankName !== '—' && bankName !== '-' && bankName !== '')
          ) || (p.paymentMode === 'cheque' || p.paymentMode === 'check' || p.paymentMode === 'bank_slip');

          if (isChequePayment) {
            cheques.push({
              id: p.id || `${t.id}-pdc-${cheques.length}`,
              chequeNo: chequeNo || p.chequeNo || '—',
              bankName: bankName || p.bankName || '—',
              chequeDate: p.date || t.date,
              amount: Number(p.amount) || 0,
            });
          }
        });
      }
      // Also check the transaction itself for explicit cheque info
      if (t.docType === 'Payment') {
        const cqNo = (t.chequeNo || '').trim();
        const bkName = (t.bankName || '').trim();
        if (cqNo && cqNo !== '—' && cqNo !== '-' && bkName && bkName !== '—' && bkName !== '-') {
          cheques.push({
            id: t.id ? `pd-${t.id}` : `pd-${cheques.length}`,
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
    return cheques.filter((c) => {
      const key = `${c.chequeNo}|${c.bankName}|${c.amount}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [boundTransactions]);

  useEffect(() => {
    let raf2 = null;
    const emitReady = () => {
      window.dispatchEvent(new CustomEvent('statement-print-ready', {
        detail: {
          shopId: shop?.id ?? null,
          rowCount: statementRows.length,
          refreshing,
        },
      }));
    };

    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(emitReady);
    });

    return () => {
      cancelAnimationFrame(raf1);
      if (raf2 !== null) cancelAnimationFrame(raf2);
    };
  }, [shop?.id, statementRows, refreshing]);

  // Current date for display
  const now = currentDate ? new Date(currentDate) : new Date();
  const statementDate = formatDateFull(now.toISOString().split('T')[0]);

  // Company info
  const companyName = 'Liyanage Distributors';
  const companyAddress = 'Hakmana Road, Deiyandara.';
  const companyTel = '070-5237647 / 071-5944711';

  return (
    <div
      className="print-statement-root print-card-body print:static print:bg-white print:text-black print:p-8 print:z-[9999]"
      style={{
        fontFamily: "'Segoe UI', 'Helvetica Neue', Arial, sans-serif",
        color: '#000000',
        backgroundColor: '#ffffff',
        fontSize: '10pt',
        lineHeight: '1.3',
        maxWidth: '210mm',
        margin: '0 auto',
        padding: '0',
      }}
    >
      {/* CRITICAL: Inline @media print CSS */}
      <style>{`
        @media print {
          @page { margin: 10mm 12mm; size: A4 portrait; }
          table { display: table !important; width: 100% !important; table-layout: auto !important; border-collapse: collapse !important; }
          thead { display: table-header-group !important; break-inside: avoid !important; }
          tbody { display: table-row-group !important; }
          tr { display: table-row !important; page-break-inside: avoid !important; break-inside: avoid !important; }
          th, td { display: table-cell !important; }
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            width: 100% !important;
            height: auto !important;
            overflow: visible !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          body > :not(.print-statement-root):not(.print-portal-content) {
            display: none !important;
          }
          .print-portal-content {
            display: block !important;
          }
          * { color: #000000 !important; background: transparent !important; }
          .print-statement-root {
            display: block !important;
            width: 100% !important;
            background: #ffffff !important;
          }
          .print-statement-root,
          .print-statement-root .statement-table-flow,
          .print-statement-root .statement-table-flow > div,
          .print-statement-root .statement-block-wrapper,
          .print-statement-root .statement-header-meta-banner,
          .print-statement-root .statement-header-meta-banner > div {
            display: block !important;
            overflow: visible !important;
            height: auto !important;
            max-height: none !important;
            position: relative !important;
            float: none !important;
            clear: none !important;
          }
          .print-statement-root table {
            border: none !important;
            border-collapse: collapse !important;
            border-spacing: 0 !important;
          }
          .print-statement-root .statement-ledger-table {
            display: table !important;
            width: 100% !important;
            table-layout: auto !important;
            border-collapse: collapse !important;
          }
          .print-statement-root .statement-ledger-table thead {
            display: table-header-group !important;
            break-inside: avoid !important;
          }
          .print-statement-root .statement-ledger-table tbody {
            display: table-row-group !important;
          }
          .print-statement-root .statement-ledger-table tr {
            display: table-row !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          .print-statement-root .statement-ledger-table th,
          .print-statement-root .statement-ledger-table td {
            display: table-cell !important;
          }
          .print-statement-root .statement-header-meta-banner {
            page-break-after: avoid !important;
            break-after: avoid-page !important;
            margin-bottom: 8px !important;
          }
          .print-statement-root .statement-block-wrapper {
            page-break-inside: auto !important;
            break-inside: auto !important;
          }
          .print-statement-root .statement-ledger-table,
          .print-statement-root .statement-ledger-table tbody,
          .print-statement-root .statement-total-outstanding-row,
          .print-statement-root .statement-pdc-table,
          .print-statement-root .statement-pdc-table tbody {
            page-break-inside: auto !important;
            break-inside: auto !important;
          }
          .print-statement-root th,
          .print-statement-root td {
            border: none !important;
            border-left: none !important;
            border-right: none !important;
            border-top: none !important;
            border-bottom: 1px solid #cbd5e1 !important;
            padding: 12px 8px !important;
          }
          .no-print { display: none !important; }
          .print-only { display: block !important; }

          .print-statement-root .statement-ledger-table tr.statement-age-row-tier-under45 > td.statement-age-row-cell {
            color: #000000 !important;
            font-weight: 400 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          .print-statement-root .statement-ledger-table tr.statement-age-row-tier-45 > td.statement-age-row-cell {
            color: #000000 !important;
            font-weight: 700 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          .print-statement-root .statement-ledger-table tr.statement-age-row-tier-60 > td.statement-age-row-cell {
            color: #ff0000 !important;
            font-weight: 700 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }
        @media screen {
          .print-only { display: none !important; }
        }
      `}</style>

      {/* ===== HEADER BANNER ===== */}
      <div className="erp-header-banner" style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '10px 14px',
        marginBottom: '14px',
        borderBottom: '3px solid #1a1a2e',
        background: '#ffffff',
        borderRadius: '6px',
      }}>
        {/* LEFT: Logo + Company text in a unified flex row */}
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

        {/* RIGHT: STATEMENT badge */}
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
            STATEMENT
          </span>
        </div>
      </div>

      {/* ===== STATEMENT TITLE ===== */}
      <div style={{
        textAlign: 'center',
        marginBottom: '14px',
        padding: '6px 0',
        borderBottom: '1px solid #333',
        borderTop: '1px solid #333',
      }}>
        <h2 style={{
          fontSize: '13pt',
          fontWeight: 800,
          margin: 0,
          letterSpacing: '1px',
          textTransform: 'uppercase',
        }}>
          Outstanding Statement
        </h2>
        <p style={{
          fontSize: '9pt',
          margin: '2px 0 0 0',
          color: '#444',
          fontWeight: 600,
        }}>
          As At: {statementDate}
        </p>
      </div>

      <div className="statement-header-meta-banner">
        {/* ===== SHOP DETAILS - SINGLE-LINE DESCRIPTIVE SEQUENCE ===== */}
        <div style={{
          padding: '6px 0',
          marginBottom: '8px',
          borderBottom: '1px dashed #888',
          width: '100%',
          lineHeight: '1.6',
        }}>
          <span style={{ fontWeight: 800, fontSize: '11pt', color: '#1a1a2e' }}>
            {shop?.name || '—'}
          </span>
          <span style={{ fontSize: '9pt', color: '#444', marginLeft: '8px' }}>
            — {shop?.address || '—'}
          </span>
          <span style={{ fontSize: '9pt', color: '#555', marginLeft: '6px' }}>
            | {shop?.route || shop?.address || '—'}
          </span>
          <span style={{ fontSize: '9pt', color: '#555', marginLeft: '6px' }}>
            | Tel: {shop?.contact || '—'}
          </span>
        </div>

        {/* ===== SALUTATION ===== */}
        <div style={{ marginBottom: '8px', fontSize: '9pt', lineHeight: '1.5' }}>
          <span style={{ fontWeight: 700 }}>Dear Sir,</span>{' '}
          Please find below the out-standing balance as at above mentioned date and kindly
          make arrangements to forward the full payment at your earliest convenience.
        </div>
      </div>

      {/* ===== MAIN FINANCIAL TABLE ===== */}
      <div className="statement-table-flow">
      <div className="statement-block-wrapper">
      <table className="statement-ledger-table" style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '12px', fontSize: '8.5pt', border: 'none' }}>
        <thead>
          <tr style={{
            borderTop: 'none',
            borderBottom: '1px solid #cbd5e1',
            backgroundColor: 'transparent',
            color: '#475569',
          }}>
            <th style={{ padding: '12px 8px', textAlign: 'left', fontWeight: 600, color: '#475569', border: 'none' }}>Posting Date</th>
            <th style={{ padding: '12px 8px', textAlign: 'left', fontWeight: 600, color: '#475569', border: 'none' }}>Document No</th>
            <th style={{ padding: '12px 8px', textAlign: 'left', fontWeight: 600, color: '#475569', border: 'none' }}>Document Type</th>
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
                No transactions found
              </td>
            </tr>
          ) : (
            statementRows.map((row) => {
              const chequeMeta = getChequeCellMeta(row);
              const shouldRenderChequeMeta = row.lineType === 'Payment' && chequeMeta.showChequeMeta;
              const elapsedDays = computeAgeDays(row.date);
              const rowAgeTierClassName = getPrintRowAgeTierClassName(elapsedDays);
              const rowTypographyStyle = getPrintRowTypographyStyle(elapsedDays);

              return (
              <tr key={row.key} className={rowAgeTierClassName} style={{
                borderBottom: '1px solid #e2e8f0',
                backgroundColor: 'transparent',
                border: 'none',
              }}>
                <td className="statement-age-row-cell" style={{ padding: '12px 8px', textAlign: 'left', border: 'none', ...rowTypographyStyle }}>{formatDate(row.date)}</td>
                <td className="statement-age-row-cell" style={{ padding: '12px 8px', textAlign: 'left', fontFamily: "'Courier New', monospace", border: 'none', ...rowTypographyStyle }}>{row.docNo}</td>
                <td className="statement-age-row-cell" style={{ padding: '12px 8px', textAlign: 'left', border: 'none', ...rowTypographyStyle }}>{getDisplayDocumentType(row)}</td>
                <td className="statement-age-row-cell" style={{ padding: '12px 8px', textAlign: 'left', fontFamily: "'Courier New', monospace", fontSize: '8pt', border: 'none', ...rowTypographyStyle }}>
                  {shouldRenderChequeMeta ? (
                    <>
                      <div>{chequeMeta.chequeNo}</div>
                      {chequeMeta.bankBranchLabel ? (
                        <div style={{ fontSize: '10px', color: 'inherit', fontWeight: 'inherit', marginTop: '2px' }}>{chequeMeta.bankBranchLabel}</div>
                      ) : null}
                    </>
                  ) : '—'}
                </td>
                <td className="statement-age-row-cell" style={{ padding: '12px 8px', textAlign: 'right', fontFamily: "'Courier New', monospace", border: 'none', ...rowTypographyStyle }}>
                  {formatAmount(row.amount)}
                </td>
                <td className="statement-age-row-cell" style={{ padding: '12px 8px', textAlign: 'right', fontFamily: "'Courier New', monospace", border: 'none', ...rowTypographyStyle }}>
                  {row.lineType === 'Payment' ? formatCreditAmount(row.received) : '—'}
                </td>
                <td className="statement-age-row-cell" style={{ padding: '12px 8px', textAlign: 'right', fontFamily: "'Courier New', monospace", border: 'none', ...rowTypographyStyle }}>
                  {formatAmount(Number(row.balanceDue) || 0)}
                </td>
                <td className="statement-age-row-cell" style={{ padding: '12px 8px', textAlign: 'right', border: 'none', ...rowTypographyStyle }}>
                  {elapsedDays}d
                </td>
              </tr>
            )})
          )}
          <tr className="statement-total-outstanding-row">
            <td colSpan={6} style={{
              padding: '12px 8px',
              textAlign: 'right',
              fontWeight: 800,
              fontSize: '10pt',
              borderTop: '1px solid #cbd5e1',
              borderBottom: 'none',
              backgroundColor: 'transparent',
              color: '#1e293b',
              border: 'none',
            }}>
              Total Outstanding
            </td>
            <td colSpan={2} style={{
              padding: '12px 8px',
              textAlign: 'right',
              fontWeight: 800,
              fontSize: '10pt',
              fontFamily: "'Courier New', monospace",
              borderTop: '1px solid #cbd5e1',
              borderBottom: 'none',
              backgroundColor: 'transparent',
              color: '#1e293b',
              border: 'none',
            }}>
              {formatAmount(totalOutstanding > 0 ? totalOutstanding : 0)}
            </td>
          </tr>
        </tbody>
      </table>
      </div>
      </div>

      {/* ===== POST DATED CHEQUES SECTION ===== */}
      {shopCheques.length > 0 && (
        <div style={{ marginBottom: '12px' }}>
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
          <table className="statement-pdc-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '8.5pt' }}>
            <thead>
              <tr style={{ borderTop: '1px solid #000000', borderBottom: '1px solid #000000' }}>
                <th style={{ padding: '4px 6px', textAlign: 'left', fontWeight: 600 }}>Cheque No</th>
                <th style={{ padding: '4px 6px', textAlign: 'left', fontWeight: 600 }}>Bank Branch</th>
                <th style={{ padding: '4px 6px', textAlign: 'left', fontWeight: 600 }}>Cheque Date</th>
                <th style={{ padding: '4px 6px', textAlign: 'right', fontWeight: 600 }}>Amount (Rs.)</th>
              </tr>
            </thead>
            <tbody>
              {shopCheques.map((cheque) => (
                <tr key={cheque.id} style={{ borderBottom: '1px solid #ccc' }}>
                  <td style={{ padding: '3px 6px', textAlign: 'left', fontFamily: "'Courier New', monospace" }}>{cheque.chequeNo}</td>
                  <td style={{ padding: '3px 6px', textAlign: 'left' }}>{cheque.bankName || cheque.bankBranch || '—'}</td>
                  <td style={{ padding: '3px 6px', textAlign: 'left' }}>{formatDate(cheque.chequeDate)}</td>
                  <td style={{ padding: '3px 6px', textAlign: 'right', fontFamily: "'Courier New', monospace" }}>{formatAmount(cheque.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

    </div>
  );
}