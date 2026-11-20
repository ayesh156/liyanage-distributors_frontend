/**
 * @file PrintDamagedGoodsReport.jsx
 * @description A4 Corporate Printable Damaged Goods & Defect Quarantine Audit Report.
 * Complies with strict A4 portrait specifications, official Liyanage Distributors stationery branding,
 * itemized defect ledger, status breakdown, loss valuations, and dual manager/auditor signature blocks.
 * Features eco/low-ink print design, strict print portal isolation, and zero background bleed.
 */

import React, { useEffect, useMemo } from 'react';
import ReactDOM from 'react-dom';
import { Printer, X } from 'lucide-react';
import useVanStockStore from '../../hooks/useVanStockStore';
import { formatLKR, formatDateYYYYMMDD, getColomboDateStr } from '../../data/vanStockData';
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

export default function PrintDamagedGoodsReport({
  isOpen,
  onClose,
  items: propItems,
  filterDate,
  dateRange,
  selectedDayOfWeek = 'ALL',
  isAllDates = false,
  statusLabel = 'All Statuses',
}) {
  const damagedGoods = useVanStockStore((s) => s.damagedGoods);
  const dailyManifest = useVanStockStore((s) => s.dailyManifest);
  const ownerSignatureData = useVanStockStore((s) => s.ownerSignatureData);
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

  const isMultiDay = Boolean(dateRange && dateRange.start && dateRange.end && dateRange.start !== dateRange.end);
  const isAllSelected = Boolean(isAllDates || (selectedDayOfWeek === 'ALL' && !filterDate && (!dateRange || (!dateRange.start && !dateRange.end))));
  const targetDate = filterDate || dateRange?.start;

  const targetDateLabel = isAllSelected
    ? 'Report Date: All Dates'
    : isMultiDay
    ? `Period: ${dateRange.start} to ${dateRange.end}`
    : `Report Date: ${targetDate || 'All Dates'}`;

  // Filter items matching active date filter scope (Asia/Colombo UTC+05:30)
  const filteredReportItems = useMemo(() => {
    const baseItems = propItems || damagedGoods || [];
    if (isAllSelected) return baseItems;

    return baseItems.filter((item) => {
      const dStr = getColomboDateStr(item.createdAt || item.date);
      if (isMultiDay) {
        return dStr >= dateRange.start && dStr <= dateRange.end;
      }
      return dStr === targetDate;
    });
  }, [propItems, damagedGoods, isAllSelected, isMultiDay, dateRange, targetDate]);

  const totalDefectiveUnits = filteredReportItems.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);
  const totalLossValuation = filteredReportItems.reduce((sum, item) => sum + (Number(item.totalValue) || 0), 0);

  // Status breakdown strictly from filtered rows
  const statusCounts = filteredReportItems.reduce((acc, curr) => {
    const s = curr.status || 'LOGGED';
    acc[s] = (acc[s] || 0) + 1;
    return acc;
  }, {});

  const currentDate = new Date().toLocaleDateString('en-LK', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const reportDocNo = `DMG-REP-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-01`;

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
            Damaged Goods Audit Report ({reportDocNo})
          </span>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            type="button"
            onClick={handlePrint}
            className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 text-xs font-bold rounded-xl bg-accent-600 hover:bg-accent-700 text-white shadow-sm transition-all cursor-pointer active:scale-95 whitespace-nowrap"
          >
            <Printer size={15} />
            <span className="hidden sm:inline">Print Report (A4)</span>
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

      {/* A4 Document Viewport - Natural Scrollbar-Free Viewport */}
      <div className="flex-1 flex justify-center py-2 sm:py-3 px-2 sm:px-4 print:p-0 print:m-0">
        <div
          id="damaged-goods-report-sheet"
          className="w-full max-w-[210mm] min-h-[297mm] bg-white text-black pt-3 pb-4 sm:pt-4 sm:pb-6 px-4 sm:px-6 shadow-xl rounded-xl print:shadow-none print:rounded-none print:m-0 print:pt-2 print:pb-3 print:px-[6mm] print:w-full print:max-w-none text-xs overflow-visible"
          style={{ fontFamily: "'Inter', -apple-system, sans-serif" }}
        >
          {/* Header (Compact Height & Bottom-Aligned Title Box) */}
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
                DAMAGE REPORT
              </span>
              <p className="mt-0.5 font-mono font-bold text-xs text-black">
                {targetDateLabel}
              </p>
              <p className="font-mono text-[10px] text-black">
                Printed: {formatPrintDateTime(new Date())}
              </p>
            </div>
          </div>

          {/* KPI Summary Boxes - Low-Ink Outlined Design */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-2 mb-2">
            <div className="p-2 rounded-lg border border-black bg-white">
              <span className="text-[10px] uppercase font-bold text-black block">Total Defective Units</span>
              <span className="text-sm font-bold font-mono text-black">{totalDefectiveUnits}</span>
            </div>
            <div className="p-2 rounded-lg border border-black bg-white">
              <span className="text-[10px] uppercase font-bold text-black block">Total Loss Valuation</span>
              <span className="text-sm font-bold font-mono text-black">{formatLKR(totalLossValuation)}</span>
            </div>
            <div className="p-2 rounded-lg border border-black bg-white">
              <span className="text-[10px] uppercase font-bold text-black block">Logged / Inspected</span>
              <span className="text-sm font-bold font-mono text-black">
                {(statusCounts['LOGGED'] || 0) + (statusCounts['INSPECTED'] || 0)}
              </span>
            </div>
            <div className="p-2 rounded-lg border border-black bg-white">
              <span className="text-[10px] uppercase font-bold text-black block">Resolved / Written Off</span>
              <span className="text-sm font-bold font-mono text-black">
                {(statusCounts['WRITTEN_OFF'] || 0) + (statusCounts['VENDOR_RETURN'] || 0)}
              </span>
            </div>
          </div>

          {/* Itemized Defect Table - Rebalanced Proportions with Strict Wrapping & Zero Horizontal Overflow */}
          <table className="table-fixed w-full border-collapse my-2 text-left">
            <colgroup>
              <col style={{ width: '4%' }} />
              <col style={{ width: '13%' }} />
              <col style={{ width: '13%' }} />
              <col style={{ width: '29%' }} />
              <col style={{ width: '8%' }} />
              <col style={{ width: '22%' }} />
              <col style={{ width: '11%' }} />
            </colgroup>
            <thead>
              <tr className="border-y-2 border-black bg-transparent text-[11px] font-bold text-black uppercase tracking-wider">
                <th className="py-2 px-1 text-center text-[11px] font-bold text-black uppercase tracking-wider">#</th>
                <th className="py-2 px-1 pr-3 whitespace-nowrap text-left text-[11px] font-bold text-black uppercase tracking-wider">Date</th>
                <th className="py-2 px-1 whitespace-nowrap text-left text-[11px] font-bold text-black uppercase tracking-wider">SKU</th>
                <th className="py-2 px-1 text-left text-[11px] font-bold text-black uppercase tracking-wider">Product Description</th>
                <th className="py-2 px-1 text-center whitespace-nowrap text-[11px] font-bold text-black uppercase tracking-wider">Qty</th>
                <th className="py-2 px-1 text-left text-[11px] font-bold text-black uppercase tracking-wider">Defect Reason</th>
                <th className="py-2 px-1 pr-2 text-right whitespace-nowrap text-[11px] font-bold text-black uppercase tracking-wider">Loss (LKR)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-300">
              {filteredReportItems.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-6 text-center text-xs text-slate-500 italic">
                    {`No damaged goods recorded on ${isMultiDay ? `${dateRange.start} to ${dateRange.end}` : targetDate || 'selected date'}.`}
                  </td>
                </tr>
              ) : (
                filteredReportItems.map((item, index) => {
                  const formattedDate = getColomboDateStr(item.createdAt || item.date) || 'N/A';

                  return (
                    <tr key={item.id || index} className="bg-white hover:bg-transparent">
                      <td className="py-2 px-1 text-center text-xs font-medium text-black font-mono">
                        {index + 1}
                      </td>
                      <td className="py-2 px-1 pr-3 font-mono text-xs font-medium text-black whitespace-nowrap">
                        {formattedDate}
                      </td>
                      <td className="py-2 px-1 font-mono font-bold text-xs text-black whitespace-nowrap">
                        {item.sku}
                      </td>
                      <td className="py-2 px-1 text-xs font-medium text-black leading-relaxed break-words">
                        <div className="line-clamp-2">{item.productName}</div>
                      </td>
                      <td className="py-2 px-1 text-center font-bold font-mono text-xs text-black whitespace-nowrap">
                        {item.quantity} <span className="text-[10px] text-black font-normal">{item.unit}</span>
                      </td>
                      <td className="py-2 px-1 text-xs font-medium text-black leading-relaxed break-words">
                        <div className="line-clamp-2">{item.reason}</div>
                      </td>
                      <td className="py-2 px-1 pr-2 text-right font-mono font-bold text-xs text-black whitespace-nowrap">
                        {Number(item.totalValue || 0).toFixed(2)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-b-2 border-black">
                <td colSpan={7} className="p-0">
                  <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 bg-gray-50/80 text-xs font-bold text-black">
                    <div className="flex items-center gap-1.5">
                      <span className="uppercase tracking-wider">TOTAL QUARANTINED DEFECT SUMMARY:</span>
                      <span className="font-mono">{totalDefectiveUnits} Units</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="uppercase tracking-wider">TOTAL NET QUARANTINE LOSS:</span>
                      <span className="font-mono font-black">{formatLKR(totalLossValuation)}</span>
                    </div>
                  </div>
                </td>
              </tr>
            </tfoot>
          </table>

          {/* Single Signature Block - Strictly Right-Aligned Dispatcher / Owner Signature */}
          <div className="flex justify-end pt-8 mt-4 border-t border-black">
            <div className="w-72 text-center flex flex-col items-center">
              <div className="h-14 flex items-center justify-center mb-1">
                {ownerSignature ? (
                  <img
                    src={ownerSignature}
                    alt="Warehouse Dispatcher / Owner Signature"
                    className="max-h-12 max-w-[180px] object-contain filter contrast-125"
                  />
                ) : (
                  <div className="text-[11px] text-black font-medium italic">Signature on file</div>
                )}
              </div>
              <div className="border-b border-dashed border-black w-full mx-auto mb-1.5" />
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
