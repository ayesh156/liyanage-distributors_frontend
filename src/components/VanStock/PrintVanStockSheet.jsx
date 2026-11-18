/**
 * @file PrintVanStockSheet.jsx
 * @description A4 Corporate Printable Load Manifest and Stock Audit Bill.
 * Adheres to strict A4 portrait specifications, official Liyanage Distributors stationery branding,
 * itemized table, total valuations, and dual signature blocks for dispatcher and field sales rep.
 * Features eco/low-ink print design, strict print portal isolation, and zero background bleed.
 */

import React, { useEffect } from 'react';
import ReactDOM from 'react-dom';
import { Printer, X } from 'lucide-react';
import useVanStockStore from '../../hooks/useVanStockStore';
import { calcNetUnitPrice, calcTotalRealValue, formatLKR, formatDateYYYYMMDD } from '../../data/vanStockData';
import { DEFAULT_OWNER_SIGNATURE } from '../../data/defaultOwnerSignature';

function formatPrintDateTime(d = new Date()) {
  const dt = d instanceof Date ? d : new Date(d);
  const yyyy = dt.getFullYear();
  const mm = String(dt.getMonth() + 1).padStart(2, '0');
  const dd = String(dt.getDate()).padStart(2, '0');
  let hours = dt.getHours();
  const mins = String(dt.getMinutes()).padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12 || 12;
  return `${yyyy}-${mm}-${dd} ${String(hours).padStart(2, '0')}:${mins} ${ampm}`;
}

export default function PrintVanStockSheet({ isOpen, onClose }) {
  const vanStock = useVanStockStore((s) => s.vanStock);
  const vehicle = useVanStockStore((s) => s.vehicle);
  const dailyManifest = useVanStockStore((s) => s.dailyManifest);
  const ownerSignatureData = useVanStockStore((s) => s.ownerSignatureData);

  // Toggle body print-modal-active class for strict print isolation
  useEffect(() => {
    if (isOpen) {
      document.body.classList.add('print-modal-active');
    } else {
      document.body.classList.remove('print-modal-active');
    }
    return () => {
      document.body.classList.remove('print-modal-active');
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const activeVanItems = vanStock.filter((v) => v.quantity > 0);

  const totalLoadedUnits = activeVanItems.reduce((sum, item) => sum + item.quantity, 0);
  const totalLoadedValue = activeVanItems.reduce((sum, item) => {
    const net = calcNetUnitPrice(item.basePrice, item.companyDiscountPercent);
    return sum + calcTotalRealValue(net, item.quantity);
  }, 0);

  function formatPrintDateTime(d) {
    const dt = d instanceof Date ? d : new Date(d);
    const yyyy = dt.getFullYear();
    const mm = String(dt.getMonth()+1).padStart(2,'0');
    const dd = String(dt.getDate()).padStart(2,'0');
    let hours = dt.getHours();
    const mins = String(dt.getMinutes()).padStart(2,'0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12;
    return `${yyyy}-${mm}-${dd} ${String(hours).padStart(2,'0')}:${mins} ${ampm}`;
  }

  const manifestDocNo = dailyManifest?.manifestNo || `MAN-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-01`;
  const manifestRev = dailyManifest?.manifestRevision || 1;
  const ownerSignature = ownerSignatureData || dailyManifest?.ownerSignatureData || DEFAULT_OWNER_SIGNATURE;

  const handlePrint = () => {
    window.print();
  };

  const modalContent = (
    <div className="fixed inset-0 z-[100] flex flex-col bg-slate-900/80 backdrop-blur-md overflow-y-auto print:bg-white print:p-0">
      {/* Top action bar - hidden during print */}
      <div className="no-print sticky top-0 z-10 flex items-center justify-between px-3 sm:px-6 py-2.5 sm:py-3 bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700 shadow-md">
        <div className="flex items-center gap-2">
          <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate">
            Daily Van Manifest ({manifestDocNo}) {manifestRev > 1 ? `* Rev #${manifestRev}` : ''}
          </span>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            type="button"
            onClick={handlePrint}
            className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 text-xs font-bold rounded-xl bg-accent-600 hover:bg-accent-700 text-white shadow-sm transition-all cursor-pointer active:scale-95 whitespace-nowrap"
          >
            <Printer size={15} />
            <span className="hidden sm:inline">Print Manifest (A4)</span>
            <span className="sm:hidden">Print</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 sm:p-2 rounded-xl text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer"
            title="Close Preview"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {/* A4 Sheet Viewport Container - Natural Scrollbar-Free Strict A4 Viewport */}
      <div className="flex-1 flex justify-center py-2 sm:py-3 px-2 sm:px-4 print:p-0 print:m-0 print:w-full print:max-w-full">
        <div
          id="van-stock-manifest-sheet"
          className="w-full max-w-[210mm] min-h-[297mm] bg-white text-black pt-3 pb-4 sm:pt-4 sm:pb-6 px-4 sm:px-6 shadow-xl rounded-xl print:shadow-none print:rounded-none print:m-0 print:pt-2 print:pb-3 print:px-[6mm] print:w-full print:max-w-full text-xs overflow-visible"
          style={{ fontFamily: "'Inter', -apple-system, sans-serif" }}
        >
          {/* Header - Stationery Branding (Compact Height & Bottom-Aligned Title Box) */}
          <div className="flex items-end justify-between border-b-2 border-black pb-1.5 pt-1">
            <div className="flex items-center gap-3">
              <img
                src="/inv_logo.png"
                alt="Liyanage Distributors Logo"
                className="w-12 h-12 object-contain"
                onError={(e) => {
                  e.target.style.display = 'none';
                }}
              />
              <div>
                <h1 className="text-xl font-extrabold uppercase tracking-tight text-black leading-tight">
                  Liyanage Distributors
                </h1>
                <p className="text-xs font-semibold text-black mt-0.5">
                  Hakmana Road, Deiyandara, Matara. * Tel: 070-5237647 / 071-5944711
                </p>
              </div>
            </div>

            <div className="text-right flex-shrink-0 self-end">
              <span className="inline-block px-2.5 py-0.5 rounded border-2 border-black text-black text-xs font-black tracking-widest uppercase bg-transparent">
                VAN STOCK REPORT
              </span>
              <p className="mt-0.5 font-mono font-bold text-xs text-black">
                {formatPrintDateTime(new Date())}
              </p>
            </div>
          </div>

          {/* Itemized Table - Executive Low-Ink Proportions with Explicit Colgroup (100% Total Width Allocation) */}
          <table className="table-fixed w-full border-collapse mt-2 mb-3 text-left">
            <colgroup>
              <col style={{ width: '4%' }} />
              <col style={{ width: '14%' }} />
              <col style={{ width: '38%' }} />
              <col style={{ width: '10%' }} />
              <col style={{ width: '11%' }} />
              <col style={{ width: '12%' }} />
              <col style={{ width: '11%' }} />
            </colgroup>
            <thead>
              {/* Table Headers: Whitespace-normal, word-breaking, and tight leading ensure multi-line drop without clipping or exceeding A4 sheet width */}
              <tr className="border-y-2 border-black bg-transparent text-[11px] font-bold text-black uppercase tracking-wider">
                <th className="py-2 px-1 text-center whitespace-normal break-words leading-tight text-[11px] font-bold text-black uppercase tracking-wider">#</th>
                <th className="py-2 px-2 text-left whitespace-normal break-words leading-tight text-[11px] font-bold text-black uppercase tracking-wider">SKU</th>
                <th className="py-2 px-2 text-left whitespace-normal break-words leading-tight text-[11px] font-bold text-black uppercase tracking-wider">Product Description</th>
                <th className="py-2 px-2 text-right whitespace-normal break-words leading-tight text-[11px] font-bold text-black uppercase tracking-wider">Loaded Qty</th>
                <th className="py-2 px-2 text-right whitespace-normal break-words leading-tight text-[11px] font-bold text-black uppercase tracking-wider">Net Price</th>
                <th className="py-2 px-2 text-right whitespace-normal break-words leading-tight text-[11px] font-bold text-black uppercase tracking-wider">Total Value</th>
                <th className="py-2 px-1 text-center whitespace-normal break-words leading-tight text-[11px] font-bold text-black uppercase tracking-wider">Verification</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-300">
              {activeVanItems.map((item, index) => {
                const netPrice = calcNetUnitPrice(item.basePrice, item.companyDiscountPercent);
                const totalVal = calcTotalRealValue(netPrice, item.quantity);
                const isVerified = item.repChecked || item.status === 'APPROVED' || item.status === 'VERIFIED';

                return (
                  <tr key={item.id} className="bg-white hover:bg-transparent">
                    <td className="py-1.5 px-1 text-center text-xs font-medium text-black font-mono">
                      {index + 1}
                    </td>
                    <td className="py-1.5 px-2 whitespace-nowrap">
                      <span className="px-1.5 py-0.5 rounded border border-black text-black text-xs font-mono font-bold bg-transparent">
                        {item.sku}
                      </span>
                    </td>
                    <td className="py-1.5 px-2 text-xs font-medium text-black break-words leading-snug">
                      {item.productName}
                    </td>
                    <td className="py-1.5 px-2 text-right font-bold text-black font-mono text-xs whitespace-nowrap">
                      {item.quantity}
                    </td>
                    <td className="py-1.5 px-2 text-right font-mono text-xs font-medium text-black whitespace-nowrap">
                      {netPrice.toFixed(2)}
                    </td>
                    <td className="py-1.5 px-2 text-right font-mono font-bold text-xs text-black whitespace-nowrap">
                      {totalVal.toFixed(2)}
                    </td>
                    <td className="py-1.5 px-1 text-center whitespace-nowrap">
                      <span
                        className={`inline-block px-1.5 py-0.5 rounded text-[9px] font-bold uppercase border bg-transparent ${
                          isVerified
                            ? 'border-black text-black'
                            : item.status === 'UNVERIFIED_BY_REP' || (item.discrepancyFlag && !item.repChecked)
                            ? 'border-black text-black'
                            : 'border-black text-black'
                        }`}
                      >
                        {isVerified
                          ? 'Verified'
                          : item.status === 'UNVERIFIED_BY_REP'
                          ? 'Unchecked'
                          : 'Pending'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-b-2 border-black bg-transparent text-xs font-bold text-black">
                <td colSpan={3} className="py-2 px-2 text-right uppercase tracking-wider text-xs font-bold text-black">
                  Total Loaded Inventory Summary:
                </td>
                <td className="py-2 px-2 text-right font-mono text-xs font-bold text-black whitespace-nowrap">
                  {totalLoadedUnits} Units
                </td>
                <td className="py-2 px-2 text-right font-mono text-xs font-bold text-black whitespace-nowrap">
                  LKR Total:
                </td>
                <td className="py-2 px-2 text-right font-mono text-xs font-bold text-black whitespace-nowrap">
                  {formatLKR(totalLoadedValue)}
                </td>
                <td></td>
              </tr>
            </tfoot>
          </table>

          {/* Dual Signature Blocks - Eco Alignment with Crisp Wet-Ink Renders */}
          <div className="grid grid-cols-2 gap-8 pt-4 mt-4 border-t border-black">
            {/* Owner / Dispatcher Signature Block */}
            <div className="text-center flex flex-col items-center">
              <div className="h-14 flex items-center justify-center mb-1">
                {ownerSignature ? (
                  <img
                    src={ownerSignature}
                    alt="Warehouse Dispatcher Signature"
                    className="max-h-12 max-w-[180px] object-contain filter contrast-125"
                  />
                ) : (
                  <div className="text-[11px] text-black font-medium italic">Signature on file</div>
                )}
              </div>
              <div className="border-b border-dashed border-black w-3/4 mx-auto mb-1.5" />
              <p className="text-xs font-bold text-black">Warehouse Dispatcher / Owner Signature</p>
              <p className="text-[11px] font-medium text-black">
                {dailyManifest?.ownerSignedBy || 'W. Liyanage (Managing Director / Owner)'}
              </p>
              <p className="text-[11px] font-medium text-black font-mono mt-0.5">
                Timestamp:{' '}
                {dailyManifest?.ownerSignedAt
                  ? formatDateYYYYMMDD(dailyManifest.ownerSignedAt, true)
                  : formatDateYYYYMMDD(new Date(), true)}
              </p>
            </div>

            {/* Sales Representative Signature Block */}
            <div className="text-center flex flex-col items-center">
              <div className="h-14 flex items-center justify-center mb-1">
                {dailyManifest?.repSignatureData ? (
                  <img
                    src={dailyManifest.repSignatureData}
                    alt="Sales Representative Signature"
                    className="max-h-12 max-w-[180px] object-contain filter contrast-125"
                  />
                ) : (
                  <div className="h-12 flex items-center justify-center text-[11px] text-black font-medium italic">
                    Awaiting field tablet sign-off
                  </div>
                )}
              </div>
              <div className="border-b border-dashed border-black w-3/4 mx-auto mb-1.5" />
              <p className="text-xs font-bold text-black">Sales Representative Signature</p>
              <p className="text-[11px] font-medium text-black">
                {dailyManifest?.repSignedBy || vehicle.repName}
              </p>
              <p className="text-[11px] font-medium text-black font-mono mt-0.5">
                {dailyManifest?.repSignedAt
                  ? `Verified: ${new Date(dailyManifest.repSignedAt).toLocaleString()}`
                  : `Mobile: ${vehicle.repPhone}`}
              </p>
            </div>
          </div>

          {/* Global Footer */}
          <div className="mt-8 pt-3 border-t border-black text-center">
            <p className="text-[10px] font-medium text-black text-center">
              System by: nebulainfinite.com - 0783233760
            </p>
          </div>
        </div>
      </div>
    </div>
  );

  const portalRoot = document.getElementById('print-report-portal');
  return portalRoot ? ReactDOM.createPortal(modalContent, portalRoot) : modalContent;
}
