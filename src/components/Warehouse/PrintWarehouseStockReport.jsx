/**
 * @file PrintWarehouseStockReport.jsx
 * @description A4 Corporate Printable Central Warehouse Inventory Report.
 * Complies with strict A4 portrait specifications, official Liyanage Distributors stationery branding,
 * itemized on-hand warehouse inventory, unit counts, decimal discounts, net pricing, and total valuations.
 * Features eco/low-ink print design, strict print portal isolation (#print-report-portal),
 * and dedicated single right-aligned Warehouse Dispatcher / Owner signature block.
 */

import React, { useEffect } from 'react';
import ReactDOM from 'react-dom';
import { Printer, X } from 'lucide-react';
import useVanStockStore from '../../hooks/useVanStockStore';
import {
  calcNetUnitPrice,
  calcTotalRealValue,
  formatLKR,
  formatDateYYYYMMDD,
} from '../../data/vanStockData';
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

export default function PrintWarehouseStockReport({
  isOpen,
  onClose,
  items: propItems,
  categoryFilterLabel = 'All Categories',
  stockFilterLabel = 'All Stock Levels',
  searchQuery = '',
}) {
  const mainStoreStock = useVanStockStore((s) => s.mainStoreStock);
  const ownerSignatureData = useVanStockStore((s) => s.ownerSignatureData);
  const dailyManifest = useVanStockStore((s) => s.dailyManifest);
  const ownerSignature = ownerSignatureData || dailyManifest?.ownerSignatureData || DEFAULT_OWNER_SIGNATURE;

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

  const catalogItems = Array.isArray(propItems) ? propItems : mainStoreStock;

  const totalUnits = catalogItems.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);
  const totalValuation = catalogItems.reduce((sum, item) => {
    const net = calcNetUnitPrice(item.basePrice, item.companyDiscountPercent);
    return sum + calcTotalRealValue(net, item.quantity);
  }, 0);

  const reportDocNo = `WH-STK-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-01`;

  const handlePrint = () => {
    window.print();
  };

  // Safe early exit for closed modal after all React hooks have unconditionally evaluated
  if (!isOpen) return null;

  const modalContent = (
    <div className="fixed inset-0 z-[120] flex flex-col bg-slate-900/80 backdrop-blur-md overflow-y-auto print:bg-white print:p-0">
      {/* Action Toolbar - hidden during print */}
      <div className="no-print sticky top-0 z-10 flex items-center justify-between px-3 sm:px-6 py-2.5 sm:py-3 bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700 shadow-md">
        <div className="flex items-center gap-2">
          <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate">
            Warehouse Stock Report ({reportDocNo})
          </span>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            type="button"
            onClick={handlePrint}
            className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 text-xs font-bold rounded-xl bg-accent-600 hover:bg-accent-700 text-white shadow-sm transition-all cursor-pointer active:scale-95 whitespace-nowrap"
          >
            <Printer size={15} />
            <span className="hidden sm:inline">Print Stock Report (A4)</span>
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

      {/* A4 Sheet Viewport Container */}
      <div className="flex-1 flex justify-center py-2 sm:py-3 px-2 sm:px-4 print:p-0 print:m-0 print:w-full print:max-w-full">
        <div
          id="warehouse-stock-report-sheet"
          className="w-full max-w-[210mm] min-h-[297mm] bg-white text-black pt-3 pb-4 sm:pt-4 sm:pb-6 px-4 sm:px-6 shadow-xl rounded-xl print:shadow-none print:rounded-none print:m-0 print:pt-2 print:pb-3 print:px-[6mm] print:w-full print:max-w-full text-xs overflow-visible"
          style={{ fontFamily: "'Inter', -apple-system, sans-serif" }}
        >
          {/* Header - Corporate Stationery Branding */}
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
                WAREHOUSE STOCK REPORT
              </span>
              <p className="mt-0.5 font-mono text-[10px] text-black font-semibold">
                Scope: {categoryFilterLabel} | {stockFilterLabel}
                {searchQuery ? ` | Query: "${searchQuery}"` : ''}
              </p>
              <p className="font-mono font-bold text-xs text-black">
                Printed: {formatPrintDateTime(new Date())}
              </p>
            </div>
          </div>

          {/* Itemized Table - 100% Proportional Width Allocation */}
          <table className="table-fixed w-full border-collapse mt-2 mb-3 text-left">
            <colgroup>
              <col style={{ width: '4%' }} />
              <col style={{ width: '14%' }} />
              <col style={{ width: '28%' }} />
              <col style={{ width: '9%' }} />
              <col style={{ width: '9%' }} />
              <col style={{ width: '7%' }} />
              <col style={{ width: '9%' }} />
              <col style={{ width: '10%' }} />
              <col style={{ width: '10%' }} />
            </colgroup>
            <thead>
              <tr className="border-y-2 border-black bg-transparent text-[10px] font-bold text-black uppercase tracking-wider">
                <th className="py-2 px-1 text-center whitespace-nowrap leading-tight">#</th>
                <th className="py-2 px-2 text-left whitespace-nowrap leading-tight">SKU</th>
                <th className="py-2 px-2 text-left whitespace-normal break-words leading-tight">Product Description</th>
                <th className="py-2 px-2 text-right whitespace-nowrap leading-tight">On-Hand Qty</th>
                <th className="py-2 px-2 text-right whitespace-nowrap leading-tight">Base Price</th>
                <th className="py-2 px-1 text-right whitespace-nowrap leading-tight">Disc %</th>
                <th className="py-2 px-2 text-right whitespace-nowrap leading-tight">Net Price</th>
                <th className="py-2 px-2 text-right whitespace-nowrap leading-tight">Total Value</th>
                <th className="py-2 px-1 text-center whitespace-nowrap leading-tight">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-300">
              {catalogItems.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-6 text-center text-xs text-slate-500 italic">
                    No warehouse inventory matching current filter parameters.
                  </td>
                </tr>
              ) : (
                catalogItems.map((item, index) => {
                  const netPrice = calcNetUnitPrice(item.basePrice, item.companyDiscountPercent);
                  const totalVal = calcTotalRealValue(netPrice, item.quantity);
                  const statusText =
                    item.quantity === 0
                      ? 'Out of Stock'
                      : item.quantity <= 20
                      ? 'Low Stock'
                      : 'In Stock';

                  return (
                    <tr key={item.id || item.productId || index} className="bg-white hover:bg-transparent">
                      <td className="py-1.5 px-1 text-center text-xs font-medium text-black font-mono">
                        {index + 1}
                      </td>
                      <td className="py-1.5 px-2 whitespace-nowrap">
                        <span className="px-1.5 py-0.5 rounded border border-black text-black text-xs font-mono font-bold bg-transparent">
                          {item.sku || '-'}
                        </span>
                      </td>
                      <td className="py-1.5 px-2 text-xs font-medium text-black break-words leading-snug">
                        <p className="font-bold text-black">{item.productName || item.name}</p>
                        {item.category && item.category !== 'Uncategorized' && (
                          <span className="text-[10px] text-slate-600 block mt-0.5 font-normal">
                            Category: {item.category}
                          </span>
                        )}
                      </td>
                      <td className="py-1.5 px-2 text-right font-bold text-black font-mono text-xs whitespace-nowrap">
                        {item.quantity} {item.unit || 'Unit'}
                      </td>
                      <td className="py-1.5 px-2 text-right font-mono text-xs font-medium text-black whitespace-nowrap">
                        {(Number(item.basePrice) || 0).toFixed(2)}
                      </td>
                      <td className="py-1.5 px-1 text-right font-mono text-xs font-medium text-black whitespace-nowrap">
                        {(Number(item.companyDiscountPercent) || 0).toFixed(2)}%
                      </td>
                      <td className="py-1.5 px-2 text-right font-mono text-xs font-medium text-black whitespace-nowrap">
                        {netPrice.toFixed(2)}
                      </td>
                      <td className="py-1.5 px-2 text-right font-mono font-bold text-xs text-black whitespace-nowrap">
                        {totalVal.toFixed(2)}
                      </td>
                      <td className="py-1.5 px-1 text-center whitespace-nowrap">
                        <span className="inline-block px-1.5 py-0.5 rounded text-[9px] font-bold uppercase border border-black text-black bg-transparent">
                          {statusText}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-b-2 border-black bg-transparent text-xs font-bold text-black">
                <td colSpan={3} className="py-2 px-2 text-right uppercase tracking-wider text-xs font-bold text-black">
                  Total Warehouse Inventory Summary:
                </td>
                <td className="py-2 px-2 text-right font-mono text-xs font-bold text-black whitespace-nowrap">
                  {totalUnits.toLocaleString()} Units
                </td>
                <td colSpan={3} className="py-2 px-2 text-right font-mono text-xs font-bold text-black whitespace-nowrap">
                  LKR Total:
                </td>
                <td className="py-2 px-2 text-right font-mono text-xs font-bold text-black whitespace-nowrap">
                  {formatLKR(totalValuation)}
                </td>
                <td></td>
              </tr>
            </tfoot>
          </table>

          {/* Footer - Single Right-Aligned Warehouse Dispatcher / Owner Signature */}
          <div className="flex justify-end pt-4 mt-4 border-t border-black">
            <div className="w-64 text-center flex flex-col items-center">
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
                Timestamp: {formatDateYYYYMMDD(new Date(), true)}
              </p>
            </div>
          </div>

          {/* Global Footer Credit */}
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
