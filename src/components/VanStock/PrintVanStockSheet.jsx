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

  const currentDate = new Date().toLocaleDateString('en-LK', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const manifestDocNo = dailyManifest?.manifestNo || `MAN-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-01`;
  const manifestRev = dailyManifest?.manifestRevision || 1;
  const ownerSignature = ownerSignatureData || dailyManifest?.ownerSignatureData || DEFAULT_OWNER_SIGNATURE;

  const handlePrint = () => {
    window.print();
  };

  const modalContent = (
    <div className="fixed inset-0 z-[100] flex flex-col bg-slate-900/80 backdrop-blur-md overflow-y-auto print:bg-white print:p-0">
      {/* Top action bar â€” hidden during print */}
      <div className="no-print sticky top-0 z-10 flex items-center justify-between px-3 sm:px-6 py-2.5 sm:py-3 bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700 shadow-md">
        <div className="flex items-center gap-2">
          <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate">
            Daily Van Manifest ({manifestDocNo}) {manifestRev > 1 ? `â€¢ Rev #${manifestRev}` : ''}
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

      {/* A4 Sheet Viewport Container â€” Natural Scrollbar-Free Strict A4 Viewport */}
      <div className="flex-1 flex justify-center py-2 sm:py-3 px-2 sm:px-4 print:p-0 print:m-0 print:w-full print:max-w-full">
        <div
          id="van-stock-manifest-sheet"
          className="w-full max-w-[210mm] min-h-[297mm] bg-white text-slate-900 py-6 sm:py-8 px-4 sm:px-6 shadow-xl rounded-xl print:shadow-none print:rounded-none print:m-0 print:py-4 print:px-[6mm] print:w-full print:max-w-full text-xs overflow-visible"
          style={{ fontFamily: "'Inter', -apple-system, sans-serif" }}
        >
          {/* Header â€” Stationery Branding */}
          <div className="flex items-start justify-between border-b-2 border-slate-900 pb-3">
            <div className="flex items-center gap-3.5">
              <img
                src="/inv_logo.png"
                alt="Liyanage Distributors Logo"
                className="w-14 h-14 object-contain"
                onError={(e) => {
                  e.target.style.display = 'none';
                }}
              />
              <div>
                <h1 className="text-lg sm:text-xl font-extrabold uppercase tracking-tight text-slate-900">
                  Liyanage Distributors
                </h1>
                <p className="text-[11px] font-semibold text-slate-700">
                  Hardware & Electrical Goods Wholesaler & Regional Distributor
                </p>
                <p className="text-[10px] text-slate-500">
                  Hakmana Road, Deiyandara, Southern Province, Sri Lanka â€¢ Tel: 041-2268123 / 077-1112233
                </p>
              </div>
            </div>

            <div className="text-right flex-shrink-0">
              <span className="inline-block px-2.5 py-0.5 rounded border border-slate-900 text-slate-900 text-[10px] font-bold tracking-widest uppercase bg-transparent">
                Daily Load Manifest
              </span>
              <p className="mt-1 font-mono font-bold text-xs text-slate-900">
                {manifestDocNo}
                {manifestRev > 1 && (
                  <span className="ml-1 text-[10px] px-1 py-0.2 rounded border border-slate-400 font-normal">
                    R{manifestRev}
                  </span>
                )}
              </p>
              <p className="text-[10px] text-slate-600 mt-0.5">{currentDate}</p>
            </div>
          </div>

          {/* Vehicle & Dispatch Metadata Grid â€” Eco White Paper Design */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 my-3 p-2.5 rounded-lg bg-white border border-slate-300 text-[11px]">
            <div>
              <span className="text-[9px] uppercase text-slate-500 block font-semibold">Vehicle ID / Truck</span>
              <span className="font-bold text-slate-900">{vehicle.id} ({vehicle.plateNumber})</span>
            </div>
            <div>
              <span className="text-[9px] uppercase text-slate-500 block font-semibold">Operating Territory</span>
              <span className="font-bold text-slate-900">All Routes</span>
            </div>
            <div>
              <span className="text-[9px] uppercase text-slate-500 block font-semibold">Sales Representative</span>
              <span className="font-bold text-slate-900">{vehicle.repName}</span>
            </div>
            <div>
              <span className="text-[9px] uppercase text-slate-500 block font-semibold">Driver / Escort</span>
              <span className="font-bold text-slate-900">{vehicle.driver}</span>
            </div>
          </div>

          {/* Itemized Table â€” Executive Low-Ink Proportions with Explicit Colgroup (100% Total Width Allocation) */}
          <table className="table-fixed w-full border-collapse my-3 text-left">
            <colgroup>
              <col style={{ width: '4%' }} />
              <col style={{ width: '13%' }} />
              <col style={{ width: '33%' }} />
              <col style={{ width: '7%' }} />
              <col style={{ width: '10%' }} />
              <col style={{ width: '11%' }} />
              <col style={{ width: '12%' }} />
              <col style={{ width: '10%' }} />
            </colgroup>
            <thead>
              {/* Table Headers: Whitespace-normal, word-breaking, and tight leading ensure multi-line drop without clipping or exceeding A4 sheet width */}
              <tr className="border-y-2 border-slate-800 bg-transparent text-slate-900 text-[10px] uppercase font-bold tracking-wider">
                <th className="py-2 px-1 text-center whitespace-normal break-words leading-tight">#</th>
                <th className="py-2 px-2 text-left whitespace-normal break-words leading-tight">SKU</th>
                <th className="py-2 px-2 text-left whitespace-normal break-words leading-tight">Product Description</th>
                <th className="py-2 px-1 text-center whitespace-normal break-words leading-tight">Unit</th>
                <th className="py-2 px-2 text-right whitespace-normal break-words leading-tight">Loaded Qty</th>
                <th className="py-2 px-2 text-right whitespace-normal break-words leading-tight">Net Price</th>
                <th className="py-2 px-2 text-right whitespace-normal break-words leading-tight">Total Value</th>
                <th className="py-2 px-1 text-center whitespace-normal break-words leading-tight">Verification</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-300">
              {activeVanItems.map((item, index) => {
                const netPrice = calcNetUnitPrice(item.basePrice, item.companyDiscountPercent);
                const totalVal = calcTotalRealValue(netPrice, item.quantity);
                const isVerified = item.repChecked || item.status === 'APPROVED' || item.status === 'VERIFIED';

                return (
                  <tr key={item.id} className="bg-white hover:bg-transparent">
                    <td className="py-1.5 px-1 text-center text-slate-500 font-mono text-[10px]">
                      {index + 1}
                    </td>
                    <td className="py-1.5 px-2 whitespace-nowrap">
                      <span className="px-1.5 py-0.5 rounded border border-slate-300 text-slate-900 text-[10px] font-mono font-bold bg-transparent">
                        {item.sku}
                      </span>
                    </td>
                    <td className="py-1.5 px-2 text-slate-900 font-medium break-words leading-snug">
                      {item.productName}
                    </td>
                    <td className="py-1.5 px-1 text-center text-slate-600 whitespace-nowrap">
                      {item.unit}
                    </td>
                    <td className="py-1.5 px-2 text-right font-bold text-slate-900 font-mono whitespace-nowrap">
                      {item.quantity}
                    </td>
                    <td className="py-1.5 px-2 text-right font-mono text-slate-800 whitespace-nowrap">
                      {netPrice.toFixed(2)}
                    </td>
                    <td className="py-1.5 px-2 text-right font-mono font-bold text-slate-900 whitespace-nowrap">
                      {totalVal.toFixed(2)}
                    </td>
                    <td className="py-1.5 px-1 text-center whitespace-nowrap">
                      <span
                        className={`inline-block px-1.5 py-0.5 rounded text-[8px] font-bold uppercase border bg-transparent ${
                          isVerified
                            ? 'border-emerald-700 text-emerald-800'
                            : item.status === 'UNVERIFIED_BY_REP' || (item.discrepancyFlag && !item.repChecked)
                            ? 'border-rose-700 text-rose-800'
                            : 'border-amber-600 text-amber-700'
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
              <tr className="border-t-2 border-b-2 border-slate-800 bg-transparent font-bold text-[11px] text-slate-900">
                <td colSpan={4} className="py-2 px-2 text-right uppercase tracking-wider">
                  Total Loaded Inventory Summary:
                </td>
                <td className="py-2 px-2 text-right font-mono text-xs whitespace-nowrap">
                  {totalLoadedUnits} Units
                </td>
                <td className="py-2 px-2 text-right font-mono text-slate-600 whitespace-nowrap">
                  LKR Total:
                </td>
                <td className="py-2 px-2 text-right font-mono text-xs text-slate-900 font-black whitespace-nowrap">
                  {formatLKR(totalLoadedValue)}
                </td>
                <td></td>
              </tr>
            </tfoot>
          </table>

          {/* Verification Legal Notice â€” Minimal Border */}
          <div className="p-2.5 my-3 rounded border border-slate-300 bg-transparent text-[9.5px] text-slate-700 leading-relaxed">
            <strong>Dispatcher & Field Representative Acknowledgement:</strong> By signing below, the Warehouse Dispatcher certifies that physical quantities itemized above were inspected and loaded into vehicle {vehicle.plateNumber}. The Sales Representative accepts custodial responsibility for all loaded stock and agrees to account for sales invoices, undamaged returns, and quarantined defective goods.
          </div>

          {/* Dual Signature Blocks â€” Eco Alignment with Crisp Wet-Ink Renders */}
          <div className="grid grid-cols-2 gap-8 pt-4 mt-4 border-t border-slate-300">
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
                  <div className="text-[10px] text-slate-400 italic">Signature on file</div>
                )}
              </div>
              <div className="border-b border-dashed border-slate-500 w-3/4 mx-auto mb-1.5" />
              <p className="font-bold text-slate-900 text-[10.5px]">Warehouse Dispatcher / Owner Signature</p>
              <p className="text-[9.5px] text-slate-700 font-semibold">
                {dailyManifest?.ownerSignedBy || 'W. Liyanage (Managing Director / Owner)'}
              </p>
              <p className="text-[8.5px] text-slate-500 font-mono mt-0.5">
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
                  <div className="h-12 flex items-center justify-center text-[10px] text-slate-400 italic">
                    Awaiting field tablet sign-off
                  </div>
                )}
              </div>
              <div className="border-b border-dashed border-slate-500 w-3/4 mx-auto mb-1.5" />
              <p className="font-bold text-slate-900 text-[10.5px]">Sales Representative Signature</p>
              <p className="text-[9.5px] text-slate-700 font-semibold">
                {dailyManifest?.repSignedBy || vehicle.repName}
              </p>
              <p className="text-[8.5px] text-slate-500 font-mono mt-0.5">
                {dailyManifest?.repSignedAt
                  ? `Verified: ${new Date(dailyManifest.repSignedAt).toLocaleString()}`
                  : `Mobile: ${vehicle.repPhone}`}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const portalRoot = document.getElementById('print-report-portal');
  return portalRoot ? ReactDOM.createPortal(modalContent, portalRoot) : modalContent;
}
