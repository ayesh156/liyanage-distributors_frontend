import React, { forwardRef, useMemo } from 'react';
import useAppStore from '../../hooks/useAppStore';
import { formatDateYMD } from '../../utils/date';

const formatCurrency = (val) =>
  `Rs. ${(val || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const formatDateShort = (dateStr) => {
  return formatDateYMD(dateStr);
};

const PAYMENT_MODE_LABEL = {
  credit: 'Credit',
  cash:   'Cash',
  cheque: 'Cheque',
  check:  'Direct Bank Check',
  bank_slip: 'Bank Slip',
};

const getPaymentMethodLabel = (payment = {}) => {
  const normalizedMode = String(
    payment.paymentMode || payment.paymentMethod || '',
  ).trim().toLowerCase();
  return PAYMENT_MODE_LABEL[normalizedMode] || (normalizedMode ? normalizedMode.toUpperCase() : 'Cash');
};

const formatChequeReference = (payment = {}) => {
  const normalizedMode = String(
    payment.paymentMode || payment.paymentMethod || '',
  ).trim().toLowerCase();
  const chequeRaw = String(payment.chequeNo || '').trim();
  const bankRaw = String(payment.bankName || '').trim();
  const isCheque = normalizedMode === 'cheque' || normalizedMode === 'check' || normalizedMode === 'bank_slip' || Boolean(chequeRaw || bankRaw);

  if (!isCheque) return '/';

  const formattedCheque = chequeRaw
    ? (normalizedMode === 'bank_slip' ? (chequeRaw.toUpperCase().startsWith('SLIP-') ? chequeRaw.toUpperCase() : `SLIP-${chequeRaw}`) : (chequeRaw.toUpperCase().startsWith('CHQ-') ? chequeRaw.toUpperCase() : `CHQ-${chequeRaw}`))
    : (normalizedMode === 'bank_slip' ? 'SLIP-—' : 'CHQ-—');

  return `${formattedCheque} / ${bankRaw || '—'}`;
};

/**
 * InvoicePrintView — ERP-style commercial invoice print sheet
 * ════════════════════════════════════════════════════════════
 *
 * Transformed from a basic receipt layout into a full ERP invoice
 * with dedicated metadata grid, accounting table matrix, signature
 * blocks, and professional summary stack.
 */
const InvoicePrintView = forwardRef(({ shop, transaction }, ref) => {
  const routes        = useAppStore((state) => state.routes) || [];
  const salesPersons  = useAppStore((state) => state.salesPersons) || [];

  // ── Derive route display name ────────────────────────────────────────────
  const routeLabel = useMemo(() => {
    if (!shop?.route) return '—';
    const found = routes.find(
      (r) => r.name.toLowerCase() === shop.route.toLowerCase(),
    );
    return found ? found.name : shop.route;
  }, [shop?.route, routes]);

  // ── Derive sales person name ─────────────────────────────────────────────
  const salesPersonLabel = useMemo(() => {
    if (transaction?.salesPerson) return transaction.salesPerson;
    if (typeof shop?.salesPerson === 'string') return shop.salesPerson;
    if (shop?.salesPerson?.name) return shop.salesPerson.name;
    if (shop?.salesPersonName) return shop.salesPersonName;
    // Try to match from the salesPersons list by shop's assigned salesPerson
    if (typeof shop?.salesPerson === 'string') {
      const found = salesPersons.find(
        (sp) => sp.name.toLowerCase() === shop.salesPerson.toLowerCase(),
      );
      return found ? found.name : shop.salesPerson;
    }
    return '—';
  }, [transaction?.salesPerson, shop?.salesPerson, shop?.salesPersonName, salesPersons]);

  // ── Transaction line item data ────────────────────────────────────────────
  const amount    = transaction?.amount  || 0;
  const modeLabel = PAYMENT_MODE_LABEL[transaction?.paymentMode] || transaction?.paymentMode || 'Credit';

  // Default ERP line-item fields (derived from flat transaction model)
  const lineItemQty   = transaction?.qty   || 1;
  const lineItemPrice = transaction?.price  || amount;
  const lineItemValue = lineItemQty * lineItemPrice;

  const balanceDue = useMemo(() => {
    const mappedBalanceDue = Number(transaction?.balanceDue);
    if (Number.isFinite(mappedBalanceDue)) {
      return Math.max(0, mappedBalanceDue);
    }
    const mappedAmount = Number(transaction?.amount) || 0;
    const mappedReceived = Number(transaction?.received) || 0;
    return Math.max(0, mappedAmount - mappedReceived);
  }, [transaction?.balanceDue, transaction?.amount, transaction?.received]);

  const paymentCollections = useMemo(() => {
    const directPayments = Array.isArray(transaction?.payments) ? transaction.payments : [];
    const partialLogs = Array.isArray(transaction?.partialPayments) ? transaction.partialPayments : [];
    const paymentHistory = Array.isArray(transaction?.paymentHistory) ? transaction.paymentHistory : [];
    const merged = [...directPayments, ...partialLogs, ...paymentHistory];

    return merged
      .filter((entry) => Number(entry?.amount || entry?.amountPaid || 0) > 0)
      .map((entry, index) => ({
        id: entry.id || `${entry.date || 'payment'}-${index}`,
        date: entry.date || transaction?.date,
        amount: Number(entry.amount || entry.amountPaid || 0),
        paymentMode: entry.paymentMode || entry.paymentMethod || transaction?.paymentMode || 'cash',
        paymentMethod: entry.paymentMethod || entry.paymentMode || transaction?.paymentMode || 'cash',
        chequeNo: entry.chequeNo || '',
        bankName: entry.bankName || '',
      }))
      .sort((a, b) => new Date(a.date) - new Date(b.date));
  }, [transaction]);

  const companyName    = 'Liyanage Distributors';
  const companyAddress = 'Hakmana Road, Deiyandara.';
  const companyTel     = '070-5237647 / 071-5944711';

  return (
    <div>
      <style>{`
        @media print {
          @page { margin: 8mm 10mm; size: A4 portrait; }
          body { margin: 0; padding: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }

          /* Ensure white background and black text on every element */
          .erp-invoice-sheet,
          .erp-invoice-sheet * {
            background: #ffffff !important;
            background-color: #ffffff !important;
            color: #000000 !important;
          }
          .erp-invoice-sheet table thead th {
            background: #ffffff !important;
            background-color: #ffffff !important;
            color: #1a1a2e !important;
            border-bottom: 1px solid #cbd5e1 !important;
          }
          .erp-invoice-sheet table {
            border: none !important;
            border-collapse: separate !important;
            border-spacing: 0 !important;
          }
          .erp-invoice-sheet th,
          .erp-invoice-sheet td {
            border: none !important;
            border-left: none !important;
            border-right: none !important;
            border-top: none !important;
            border-bottom: 1px solid #cbd5e1 !important;
            padding: 12px 8px !important;
          }
          .erp-invoice-sheet table thead th * {
            background: transparent !important;
            color: #1a1a2e !important;
          }
          .erp-invoice-sheet .erp-header-banner {
            background: #ffffff !important;
          }
          .erp-invoice-sheet .summary-strip {
            background: #ffffff !important;
            background-color: #ffffff !important;
            color: #1a1a2e !important;
            border-top: 2px solid #1a1a2e !important;
          }
          .erp-invoice-sheet .summary-strip * {
            background: transparent !important;
            color: #1a1a2e !important;
          }
          .erp-invoice-sheet .signature-line {
            border-top: 1px solid #000000 !important;
          }
          .erp-invoice-sheet,
          .erp-invoice-sheet .erp-footer-band,
          .erp-invoice-sheet .erp-total-card,
          .erp-invoice-sheet .erp-total-row {
            overflow: visible !important;
          }
          .erp-invoice-sheet .erp-footer-band {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
            padding-bottom: 6mm !important;
          }
          .erp-invoice-sheet .erp-total-card {
            width: 84mm !important;
            min-width: 84mm !important;
          }
          .erp-invoice-sheet .erp-total-row {
            display: flex !important;
            justify-content: space-between !important;
            align-items: center !important;
            gap: 8mm !important;
            width: 100% !important;
          }
          .erp-invoice-sheet .erp-total-value {
            min-width: 40mm !important;
            text-align: right !important;
          }
          .erp-invoice-sheet .erp-total-value,
          .erp-invoice-sheet .erp-total-amount {
            white-space: nowrap !important;
            min-width: 160px !important;
            overflow: visible !important;
            text-overflow: clip !important;
          }
        }

        /* Screen visibility toggle */
        @media screen {
          .erp-invoice-sheet {
            visibility: hidden !important;
            pointer-events: none !important;
            position: absolute !important;
            top: 0; left: 0;
            width: 210mm;
            height: 0;
            overflow: hidden;
            z-index: -1;
          }
        }
      `}</style>

      <div
        ref={ref}
        className="erp-invoice-sheet"
        style={{
          fontFamily: "'Segoe UI', 'Helvetica Neue', Arial, sans-serif",
          color: '#000000',
          fontSize: '9.5pt',
          lineHeight: '1.35',
          background: '#ffffff',
          padding: '0',
        }}
      >
        {/* ═════════════════════════════════════════════════════════════════╗
            HEADER BANNER — Company Logo + Name + Address  + INVOICE badge
            ╚════════════════════════════════════════════════════════════════╝ */}
        <div className="erp-header-banner" style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '10px 14px',
          marginBottom: '16px',
          borderBottom: '3px solid #1a1a2e',
          background: '#ffffff',
          borderRadius: '6px',
        }}>
          {/* ── LEFT: Logo + Company text in a unified flex row ── */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
            flex: 1,
            textAlign: 'left',
          }}>
            <div style={{
              height: '56px',
              width: '56px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}>
              <img
                src="/inv_logo.png"
                alt="Liyanage Distributors"
                style={{
                  maxHeight: '56px',
                  maxWidth: '56px',
                  width: 'auto',
                  height: 'auto',
                  objectFit: 'contain',
                }}
              />
            </div>
            <div style={{ marginLeft: '8px' }}>
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

          {/* ── RIGHT: INVOICE badge — dark box with white text ── */}
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
              INVOICE
            </span>
          </div>
        </div>

        {/* ═════════════════════════════════════════════════════════════════╗
            TWO-COLUMN METADATA GRID  (ERP Style)
            LEFT:   Outlet / Customer info
            RIGHT:  Invoice system details
            ╚════════════════════════════════════════════════════════════════╝ */}
        <div style={{
          display: 'flex',
          gap: '16px',
          marginBottom: '14px',
        }}>
          {/* ── LEFT COLUMN: Customer / Hardware Shop — Clean Vertical Stack ── */}
          <div style={{
            flex: '1 1 55%',
            padding: '8px 10px',
          }}>
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
            }}>
              {/* Line 1: Shop Name (bold headline) */}
              <div style={{
                fontSize: '12pt',
                fontWeight: 800,
                color: '#1a1a2e',
                lineHeight: 1.2,
              }}>
                {shop?.name || '—'}
              </div>
              {/* Line 2: Address */}
              <div style={{
                fontSize: '8.5pt',
                color: '#444',
                lineHeight: '1.5',
              }}>
                {shop?.address ? `Address: ${shop.address}` : '—'}
              </div>
              {/* Line 3: Route */}
              {routeLabel && (
                <div style={{
                  fontSize: '8.5pt',
                  color: '#444',
                  lineHeight: '1.5',
                }}>
                  Route: {routeLabel}
                </div>
              )}
              {/* Line 4: Phone No */}
              {(shop?.contact || shop?.phone) && (
                <div style={{
                  fontSize: '8.5pt',
                  color: '#444',
                  lineHeight: '1.5',
                }}>
                  Phone No: {shop?.contact || shop?.phone}
                </div>
              )}
            </div>
          </div>

          {/* ── RIGHT COLUMN: Minimal metadata lines (no borders) ── */}
          <div style={{
            flex: '1 1 45%',
            border: 'none',
            borderRadius: '0',
            padding: '8px 10px',
            backgroundColor: 'transparent',
          }}>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'auto 1fr',
              columnGap: '10px',
              rowGap: '6px',
              fontSize: '9pt',
              alignItems: 'baseline',
            }}>
              <span style={{ fontWeight: 800, color: '#1e293b', whiteSpace: 'nowrap' }}>Invoice No:</span>
              <span style={{ fontWeight: 700, fontFamily: "'Courier New', monospace", whiteSpace: 'nowrap' }}>
                {transaction?.docNo || '—'}
              </span>

              <span style={{ fontWeight: 800, color: '#1e293b', whiteSpace: 'nowrap' }}>Date:</span>
              <span style={{ whiteSpace: 'nowrap' }}>
                {formatDateShort(transaction?.date)} {transaction?.time || ''}
              </span>

              <span style={{ fontWeight: 800, color: '#1e293b', whiteSpace: 'nowrap' }}>Sales Person:</span>
              <span style={{ whiteSpace: 'nowrap' }}>{salesPersonLabel}</span>

              <span style={{ fontWeight: 800, color: '#1e293b', whiteSpace: 'nowrap' }}>Payment Mode:</span>
              <span style={{ whiteSpace: 'nowrap', fontWeight: 700 }}>
                {modeLabel}
                {transaction?.chequeNo && (
                  <span style={{ fontWeight: 400, fontSize: '8pt', marginLeft: '4px' }}>
                    ({transaction.chequeNo})
                  </span>
                )}
              </span>
            </div>
          </div>
        </div>

        {/* ═════════════════════════════════════════════════════════════════╗
            LEDGER ITEMS GRID  — Clean Minimalist Table
            Columns: # | Item Code & Description | QTY | Price | Value (Rs.)
            ╚════════════════════════════════════════════════════════════════╝ */}
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '12px', fontSize: '9pt', border: 'none', tableLayout: 'fixed' }}>
          <thead>
            <tr style={{
              borderTop: 'none',
              borderBottom: '1px solid #cbd5e1',
              backgroundColor: 'transparent',
            }}>
              <th style={{
                padding: '12px 8px',
                textAlign: 'center',
                fontWeight: 600,
                color: '#475569',
                width: '6%',
                border: 'none',
              }}>#</th>
              <th style={{
                padding: '12px 8px',
                textAlign: 'left',
                fontWeight: 600,
                color: '#475569',
                width: '48%',
                border: 'none',
              }}>Item Code & Description</th>
              <th style={{
                padding: '12px 8px',
                textAlign: 'right',
                fontWeight: 600,
                color: '#475569',
                width: '10%',
                border: 'none',
              }}>QTY</th>
              <th style={{
                padding: '12px 8px',
                textAlign: 'right',
                fontWeight: 600,
                color: '#475569',
                width: '14%',
                border: 'none',
              }}>Price</th>
              <th style={{
                padding: '12px 8px',
                textAlign: 'right',
                fontWeight: 600,
                color: '#475569',
                width: '22%',
                minWidth: '140px',
                whiteSpace: 'nowrap',
                border: 'none',
              }}>Value (Rs.)</th>
            </tr>
          </thead>
          <tbody>
            <tr style={{ backgroundColor: 'transparent', borderBottom: '1px solid #e2e8f0', border: 'none' }}>
              <td style={{
                padding: '12px 8px',
                textAlign: 'center',
                fontWeight: 700,
                fontSize: '10pt',
                border: 'none',
              }}>1</td>
              <td style={{
                padding: '12px 8px',
                border: 'none',
              }}>
                <span style={{ fontWeight: 600 }}>
                  {transaction?.description || 'Hardware & Electrical Supplies'}
                </span>
                {transaction?.code && (
                  <span style={{
                    display: 'block',
                    fontSize: '8pt',
                    color: '#64748b',
                    marginTop: '1px',
                  }}>
                    Code: {transaction.code}
                  </span>
                )}
              </td>
              <td style={{
                padding: '12px 8px',
                textAlign: 'right',
                fontFamily: "'Courier New', monospace",
                fontWeight: 600,
                border: 'none',
              }}>
                {lineItemQty.toLocaleString()}
              </td>
              <td style={{
                padding: '12px 8px',
                textAlign: 'right',
                fontFamily: "'Courier New', monospace",
                border: 'none',
              }}>
                {formatCurrency(lineItemPrice)}
              </td>
              <td style={{
                padding: '12px 8px',
                textAlign: 'right',
                fontFamily: "'Courier New', monospace",
                fontWeight: 700,
                fontSize: '10pt',
                whiteSpace: 'nowrap',
                border: 'none',
              }}>
                {formatCurrency(lineItemValue)}
              </td>
            </tr>
          </tbody>
        </table>

        {paymentCollections.length > 0 && (
          <div style={{ marginBottom: '14px' }}>
            <h3 style={{
              margin: '0 0 6px 0',
              fontSize: '9pt',
              fontWeight: 800,
              letterSpacing: '0.4px',
              color: '#1a1a2e',
              textTransform: 'uppercase',
            }}>
              Payment Collections History
            </h3>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '8.75pt', border: 'none', tableLayout: 'fixed' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #cbd5e1', backgroundColor: 'transparent' }}>
                  <th style={{ padding: '8px 8px', textAlign: 'left', fontWeight: 700, color: '#475569', width: '18%', border: 'none' }}>Date</th>
                  <th style={{ padding: '8px 8px', textAlign: 'left', fontWeight: 700, color: '#475569', width: '22%', border: 'none' }}>Payment Method</th>
                  <th style={{ padding: '8px 8px', textAlign: 'left', fontWeight: 700, color: '#475569', width: '38%', border: 'none' }}>Cheque / Bank Reference</th>
                  <th style={{ padding: '8px 8px', textAlign: 'right', fontWeight: 700, color: '#475569', width: '22%', whiteSpace: 'nowrap', border: 'none' }}>Amount Paid</th>
                </tr>
              </thead>
              <tbody>
                {paymentCollections.map((payment) => (
                  <tr key={payment.id} style={{ borderBottom: '1px solid #e2e8f0', backgroundColor: 'transparent' }}>
                    <td style={{ padding: '8px 8px', border: 'none' }}>{formatDateShort(payment.date)}</td>
                    <td style={{ padding: '8px 8px', border: 'none' }}>{getPaymentMethodLabel(payment)}</td>
                    <td style={{ padding: '8px 8px', border: 'none' }}>{formatChequeReference(payment)}</td>
                    <td style={{ padding: '8px 8px', textAlign: 'right', fontFamily: "'Courier New', monospace", whiteSpace: 'nowrap', border: 'none' }}>
                      {formatCurrency(payment.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* ═════════════════════════════════════════════════════════════════╗
            BOTTOM SECTION — Signature Block (LEFT) + Summary Stack (RIGHT)
            ╚════════════════════════════════════════════════════════════════╝ */}
        <div className="erp-footer-band" style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: '20px',
          marginBottom: '14px',
        }}>
          {/* ── LEFT: Signature block ── */}
          <div style={{
            flex: '1 1 55%',
          }}>
            <p style={{
              fontSize: '8pt',
              color: '#333',
              marginBottom: '14px',
              fontStyle: 'italic',
            }}>
              Accepted above items in order
            </p>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              gap: '12px',
              marginTop: '48px',
            }}>
              {['Customer Signature', 'Invoiced By', 'Authorized By'].map((label) => (
                <div key={label} style={{ flex: 1 }}>
                  <div className="signature-line" style={{
                    borderTop: '1px solid #333',
                    paddingTop: '4px',
                    marginBottom: '2px',
                    height: '10px',
                  }} />
                  <p style={{
                    fontSize: '7.5pt',
                    fontWeight: 700,
                    color: '#333',
                    margin: 0,
                    textAlign: 'center',
                  }}>{label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* ── RIGHT: Single highlighted total line ── */}
          <div className="erp-total-card" style={{
            flex: '0 0 84mm',
            minWidth: '84mm',
            border: 'none',
            borderRadius: '0',
            overflow: 'visible',
          }}>
            <div className="summary-strip erp-total-row" style={{
              backgroundColor: 'transparent',
              borderTop: '2px solid #1a1a2e',
              borderBottom: '2px solid #1a1a2e',
              padding: '12px 10px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: '12px',
              overflow: 'visible',
              width: '100%',
            }}>
              <span style={{
                fontWeight: 800,
                fontSize: '9pt',
                color: '#1e293b',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                whiteSpace: 'nowrap',
                flex: '1 1 auto',
              }}>
                Total Outstanding
              </span>
              <span className="erp-total-value erp-total-amount" style={{
                fontWeight: 800,
                fontSize: '10.5pt',
                fontFamily: "'Courier New', monospace",
                color: '#1e293b',
                textAlign: 'right',
                whiteSpace: 'nowrap',
                minWidth: '160px',
                display: 'inline-block',
              }}>
                {formatCurrency(balanceDue)}
              </span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
});

InvoicePrintView.displayName = 'InvoicePrintView';

export default InvoicePrintView;
