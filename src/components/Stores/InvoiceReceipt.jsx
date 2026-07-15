import { forwardRef } from 'react';
import { companyInfo } from '../../data/mockData';
import { formatDateYMD } from '../../utils/date';

const formatCurrency = (val) =>
  `Rs. ${Number(val || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const formatDate = (dateStr) => formatDateYMD(dateStr);

const PAYMENT_MODE_LABEL = {
  cash:   'Cash',
  cheque: 'Cheque',
  check:  'Direct Bank Check',
  bank_slip: 'Bank Slip',
  credit: 'Credit',
};

const InvoiceReceipt = forwardRef(({ shop, transaction, shopOutstanding }, ref) => {
  const isInvoice = transaction.docType === 'Invoice';
  const modeLabel = PAYMENT_MODE_LABEL[transaction.paymentMode] || transaction.paymentMode || '—';
  const hasCheque = (transaction.paymentMode === 'cheque' || transaction.paymentMode === 'check' || transaction.paymentMode === 'bank_slip')
    && transaction.chequeNo;

  return (
    <div ref={ref} className="receipt-print" style={{
      width: '80mm',
      background: 'white',
      color: '#000',
      fontFamily: "'Courier New', monospace",
      fontSize: '10px',
      lineHeight: '1.45',
      padding: '5mm 3mm',
      margin: '0 auto',
    }}>
      <style>{`
        @media print {
          @page { margin: 0; size: 80mm auto; }
          body { margin: 0; padding: 0; }
          .receipt-print { padding: 3mm; }
        }
      `}</style>

      {/* ── Header ── */}
      <div style={{ textAlign: 'center', marginBottom: '4mm', borderBottom: '1px dashed #000', paddingBottom: '3mm' }}>
        <h2 style={{ margin: 0, fontSize: '13px', fontWeight: 'bold', letterSpacing: '1px' }}>
          LIYANAGE DISTRIBUTORS
        </h2>
        <p style={{ margin: '1px 0', fontSize: '7.5px', color: '#333' }}>{companyInfo.address}</p>
        <p style={{ margin: '1px 0', fontSize: '7.5px', color: '#333' }}>Tel: {companyInfo.tel}</p>
        <p style={{ margin: '3px 0 0', fontSize: '9px', fontWeight: 'bold', color: '#000' }}>
          ── {isInvoice ? 'INVOICE COPY' : 'PAYMENT RECEIPT'} ──
        </p>
      </div>

      {/* ── Store & Transaction Info ── */}
      <div style={{ marginBottom: '3mm' }}>
        <table style={{ width: '100%', fontSize: '9px' }}>
          <tbody>
            <tr>
              <td style={{ fontWeight: 'bold', width: '38%', padding: '1.5px 0', whiteSpace: 'nowrap' }}>
                {isInvoice ? 'Invoice No:' : 'Receipt No:'}
              </td>
              <td style={{ padding: '1.5px 0', fontFamily: 'monospace' }}>{transaction.receiptNo || transaction.docNo}</td>
            </tr>
            <tr>
              <td style={{ fontWeight: 'bold', padding: '1.5px 0' }}>Date:</td>
              <td style={{ padding: '1.5px 0' }}>{formatDate(transaction.date)}</td>
            </tr>
            <tr>
              <td style={{ fontWeight: 'bold', padding: '1.5px 0' }}>Store:</td>
              <td style={{ padding: '1.5px 0', fontWeight: 'bold' }}>{shop?.name || '—'}</td>
            </tr>
            <tr>
              <td style={{ fontWeight: 'bold', padding: '1.5px 0' }}>Route:</td>
              <td style={{ padding: '1.5px 0' }}>{shop?.route || '—'}</td>
            </tr>
            <tr>
              <td style={{ fontWeight: 'bold', padding: '1.5px 0' }}>Contact:</td>
              <td style={{ padding: '1.5px 0' }}>{shop?.contact || '—'}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* ── Sales Person (Invoice only) ── */}
      {isInvoice && transaction.salesPerson && (
        <div style={{ marginBottom: '3mm', borderTop: '1px dashed #ccc', paddingTop: '2mm' }}>
          <table style={{ width: '100%', fontSize: '9px' }}>
            <tbody>
              <tr>
                <td style={{ fontWeight: 'bold', width: '38%', padding: '1.5px 0' }}>Sales Rep:</td>
                <td style={{ padding: '1.5px 0' }}>{transaction.salesPerson}</td>
              </tr>
              {transaction.salesPersonPhone && (
                <tr>
                  <td style={{ fontWeight: 'bold', padding: '1.5px 0' }}>Rep Phone:</td>
                  <td style={{ padding: '1.5px 0' }}>{transaction.salesPersonPhone}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Payment Mode (Payment only) ── */}
      {!isInvoice && (
        <div style={{ marginBottom: '3mm', borderTop: '1px dashed #ccc', paddingTop: '2mm' }}>
          <table style={{ width: '100%', fontSize: '9px' }}>
            <tbody>
              <tr>
                <td style={{ fontWeight: 'bold', width: '38%', padding: '1.5px 0' }}>Pay Mode:</td>
                <td style={{ padding: '1.5px 0', fontWeight: 'bold' }}>{modeLabel}</td>
              </tr>
              {hasCheque && (
                <>
                  <tr>
                    <td style={{ fontWeight: 'bold', padding: '1.5px 0' }}>
                      {transaction.paymentMode === 'check' ? 'Check No:' : transaction.paymentMode === 'bank_slip' ? 'Slip No:' : 'Cheque No:'}
                    </td>
                    <td style={{ padding: '1.5px 0', fontFamily: 'monospace' }}>{transaction.chequeNo}</td>
                  </tr>
                  {transaction.bankName && (
                    <tr>
                      <td style={{ fontWeight: 'bold', padding: '1.5px 0' }}>Bank:</td>
                      <td style={{ padding: '1.5px 0' }}>{transaction.bankName}</td>
                    </tr>
                  )}
                </>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Description ── */}
      {transaction.description && (
        <div style={{ marginBottom: '3mm', borderTop: '1px dashed #ccc', borderBottom: '1px dashed #ccc', padding: '2mm 0' }}>
          <p style={{ margin: 0, fontSize: '8.5px' }}>
            <strong>Note:</strong> {transaction.description}
          </p>
        </div>
      )}

      {/* ── Amount ── */}
      <div style={{ marginBottom: '4mm', textAlign: 'center', borderTop: '1px solid #000', paddingTop: '3mm' }}>
        <div style={{ fontSize: '8px', color: '#555', marginBottom: '2px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          {isInvoice ? 'Invoice Total' : 'Amount Received'}
        </div>
        <div style={{
          fontSize: '20px',
          fontWeight: 'bold',
          color: isInvoice ? '#dc2626' : '#16a34a',
          letterSpacing: '1px',
        }}>
          {formatCurrency(transaction.amount)}
        </div>
      </div>

      {/* ── Outstanding Balance ── */}
      <div style={{ marginBottom: '3mm', borderTop: '1px dashed #000', paddingTop: '2mm' }}>
        <table style={{ width: '100%', fontSize: '9px' }}>
          <tbody>
            <tr>
              <td style={{ fontWeight: 'bold', padding: '1px 0' }}>Outstanding Balance:</td>
              <td style={{
                textAlign: 'right',
                fontWeight: 'bold',
                fontSize: '11px',
                color: (shopOutstanding || 0) > 0 ? '#dc2626' : '#16a34a',
              }}>
                {formatCurrency(shopOutstanding || 0)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* ── Footer ── */}
      <div style={{ textAlign: 'center', marginTop: '4mm', borderTop: '1px dashed #000', paddingTop: '3mm' }}>
        <p style={{ margin: '2px 0', fontSize: '9px', fontWeight: 'bold' }}>Thank you for your business!</p>
        <p style={{ margin: '1px 0', fontSize: '7.5px', color: '#555' }}>
          {companyInfo.name} • {companyInfo.tel}
        </p>
      </div>
    </div>
  );
});

InvoiceReceipt.displayName = 'InvoiceReceipt';
export default InvoiceReceipt;
