/**
 * @file PrintDamagedGoodsReport.jsx
 * @description A4 Corporate Printable Damaged Goods & Defect Quarantine Audit Report.
 * Complies with strict A4 portrait specifications, official Liyanage Distributors stationery branding,
 * itemized defect ledger, status breakdown, loss valuations, and dual manager/auditor signature blocks.
 * Features eco/low-ink print design, strict print portal isolation, and zero background bleed.
 */

import React, { useEffect } from 'react';
import ReactDOM from 'react-dom';
import { Printer, X } from 'lucide-react';
import useVanStockStore from '../../hooks/useVanStockStore';
import { formatLKR, formatDateYYYYMMDD } from '../../data/vanStockData';

export default function PrintDamagedGoodsReport({
  isOpen,
  onClose,
  items: propItems,
  dateRangeLabel = 'All Dates',
  statusLabel = 'All Statuses',
}) {
  const damagedGoods = useVanStockStore((s) => s.damagedGoods);
  const items = propItems || damagedGoods;

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

  const totalDefectiveUnits = items.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);
  const totalLossValuation = items.reduce((sum, item) => sum + (Number(item.totalValue) || 0), 0);

  // Status breakdown
  const statusCounts = items.reduce((acc, curr) => {
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

  const modalContent = (
    <div className="fixed inset-0 z-[120] flex flex-col bg-slate-900/80 backdrop-blur-md overflow-y-auto print:bg-white print:p-0">
      {/* Action Toolbar â€” hidden during print */}
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

      {/* A4 Document Viewport â€” Natural Scrollbar-Free Viewport */}
      <div className="flex-1 flex justify-center py-2 sm:py-3 px-2 sm:px-4 print:p-0 print:m-0">
        <div
          id="damaged-goods-report-sheet"
          className="w-full max-w-[210mm] min-h-[297mm] bg-white text-slate-900 py-6 sm:py-8 px-4 sm:px-6 shadow-xl rounded-xl print:shadow-none print:rounded-none print:m-0 print:py-4 print:px-[6mm] print:w-full print:max-w-none text-xs overflow-visible"
          style={{ fontFamily: "'Inter', -apple-system, sans-serif" }}
        >
          {/* Header */}
          <div className="flex items-start justify-between border-b-2 border-slate-900 pb-2">
            <div className="flex items-center gap-3">
              <img
                src="/inv_logo.png"
                alt="Liyanage Distributors Logo"
                className="w-16 h-16 object-contain"
                onError={(e) => {
                  e.target.style.display = 'none';
                }}
              />
              <div>
                <h1 className="text-base sm:text-lg font-extrabold uppercase tracking-tight text-slate-900">
                  Liyanage Distributors
                </h1>
                <p className="text-[10.5px] font-semibold text-slate-700">
                  Hardware & Electrical Wholesaler â€¢ Central Quarantine & Defect Control
                </p>
                <p className="text-[9.5px] text-slate-500">
                  Hakmana Road, Deiyandara, Southern Province, Sri Lanka â€¢ Tel: 041-2268123 / 077-1112233
                </p>
              </div>
            </div>

            <div className="text-right flex-shrink-0">
              <span className="inline-block px-2 py-0.5 rounded border border-slate-900 text-slate-900 text-[9px] font-bold tracking-widest uppercase bg-transparent">
                Damaged Goods Audit
              </span>
              <p className="mt-0.5 font-mono font-bold text-xs text-slate-900">{reportDocNo}</p>
              <p className="text-[9.5px] text-slate-600 mt-0.5">{currentDate}</p>
            </div>
          </div>

          {/* Audit Scope / Context Metadata â€” Eco Clean White Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 my-2 p-2 rounded-lg bg-white border border-slate-300 text-[10px]">
            <div>
              <span className="text-[8.5px] uppercase text-slate-500 block font-semibold">Audit Date Scope</span>
              <span className="font-bold text-slate-900">{dateRangeLabel}</span>
            </div>
            <div>
              <span className="text-[8.5px] uppercase text-slate-500 block font-semibold">Filter Status</span>
              <span className="font-bold text-slate-900">{statusLabel}</span>
            </div>
            <div>
              <span className="text-[8.5px] uppercase text-slate-500 block font-semibold">Quarantine Ledger</span>
              <span className="font-bold text-slate-900">LOC_DAMAGED (Central)</span>
            </div>
            <div>
              <span className="text-[8.5px] uppercase text-slate-500 block font-semibold">Report Printed By</span>
              <span className="font-bold text-slate-900">Internal Audit Control</span>
            </div>
          </div>

          {/* KPI Summary Boxes â€” Low-Ink Outlined Design */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 my-2">
            <div className="p-2 rounded-lg border border-slate-300 bg-white">
              <span className="text-[8.5px] uppercase font-semibold text-slate-500 block">Total Defective Units</span>
              <span className="text-sm font-extrabold font-mono text-slate-900">{totalDefectiveUnits}</span>
            </div>
            <div className="p-2 rounded-lg border border-slate-900 bg-white">
              <span className="text-[8.5px] uppercase font-bold text-slate-900 block">Total Loss Valuation</span>
              <span className="text-sm font-extrabold font-mono text-slate-900">{formatLKR(totalLossValuation)}</span>
            </div>
            <div className="p-2 rounded-lg border border-slate-300 bg-white">
              <span className="text-[8.5px] uppercase font-semibold text-slate-500 block">Logged / Inspected</span>
              <span className="text-sm font-extrabold font-mono text-slate-900">
                {(statusCounts['LOGGED'] || 0) + (statusCounts['INSPECTED'] || 0)}
              </span>
            </div>
            <div className="p-2 rounded-lg border border-slate-300 bg-white">
              <span className="text-[8.5px] uppercase font-semibold text-slate-500 block">Resolved / Written Off</span>
              <span className="text-sm font-extrabold font-mono text-slate-900">
                {(statusCounts['WRITTEN_OFF'] || 0) + (statusCounts['VENDOR_RETURN'] || 0)}
              </span>
            </div>
          </div>

          {/* Itemized Defect Table â€” Rebalanced Proportions with Strict Wrapping & Zero Horizontal Overflow */}
          <table className="table-fixed w-full border-collapse my-2 text-left">
            <colgroup>
              <col style={{ width: '3%' }} />
              <col style={{ width: '8%' }} />
              <col style={{ width: '10%' }} />
              <col style={{ width: '18%' }} />
              <col style={{ width: '5%' }} />
              <col style={{ width: '17%' }} />
              <col style={{ width: '9%' }} />
              <col style={{ width: '9%' }} />
              <col style={{ width: '10%' }} />
              <col style={{ width: '11%' }} />
            </colgroup>
            <thead>
              <tr className="border-y-2 border-slate-800 bg-slate-50/50 text-slate-900 text-[8.5px] uppercase font-bold">
                <th className="py-2 px-1 text-center">#</th>
                <th className="py-2 px-1 whitespace-nowrap">Date</th>
                <th className="py-2 px-1 whitespace-nowrap">SKU</th>
                <th className="py-2 px-1">Product Description</th>
                <th className="py-2 px-1 text-center whitespace-nowrap">Qty</th>
                <th className="py-2 px-1">Defect Reason</th>
                <th className="py-2 px-1 text-center whitespace-nowrap">Invoice #</th>
                <th className="py-2 px-1 text-center leading-tight">Reported By</th>
                <th className="py-2 px-1 text-center whitespace-nowrap">Status</th>
                <th className="py-2 px-1 pr-2 text-right whitespace-nowrap">Loss (LKR)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {items.map((item, index) => {
                const formattedDate = item.createdAt
                  ? new Date(item.createdAt).toISOString().slice(0, 10)
                  : 'N/A';

                return (
                  <tr key={item.id} className="bg-white hover:bg-slate-50 transition-colors">
                    <td className="py-2.5 px-2 text-center text-slate-500 font-mono text-[9px]">
                      {index + 1}
                    </td>
                    <td className="py-2.5 px-2 font-mono text-slate-700 text-[9px] whitespace-nowrap">
                      {formattedDate}
                    </td>
                    <td className="py-2.5 px-2 font-mono font-bold text-slate-900 text-[9px] whitespace-nowrap">
                      {item.sku}
                    </td>
                    <td className="py-2.5 px-2 text-slate-900 font-medium leading-relaxed break-words text-[9px]">
                      <div className="line-clamp-2">{item.productName}</div>
                    </td>
                    <td className="py-2.5 px-2 text-center font-bold font-mono text-slate-900 text-[9px] whitespace-nowrap">
                      {item.quantity} <span className="text-[8px] text-slate-500">{item.unit}</span>
                    </td>
                    <td className="py-2.5 px-2 text-slate-700 text-[9px] leading-relaxed break-words">
                      <div className="line-clamp-2">{item.reason}</div>
                    </td>
                    <td className="py-2.5 px-2 text-center font-mono text-[9px] text-slate-600 whitespace-nowrap">
                      {item.sourceInvoiceNo || 'N/A'}
                    </td>
                    <td className="py-2.5 px-1 text-center text-slate-800 text-[9px] leading-tight break-words">
                      {item.reportedBy}
                    </td>
                    <td className="py-2.5 px-1 text-center">
                      <span
                        className={`inline-block px-1 py-0.5 rounded text-[7.5px] tracking-tighter font-bold uppercase border whitespace-nowrap ${
                          item.status === 'WRITTEN_OFF'
                            ? 'border-slate-300 bg-slate-50 text-slate-700'
                            : item.status === 'VENDOR_RETURN'
                            ? 'border-indigo-200 bg-indigo-50 text-indigo-700'
                            : item.status === 'INSPECTED'
                            ? 'border-amber-200 bg-amber-50 text-amber-700'
                            : 'border-rose-200 bg-rose-50 text-rose-700'
                        }`}
                      >
                        {item.status}
                      </span>
                    </td>
                    <td className="py-2.5 px-1 pr-2 text-right font-mono font-bold text-slate-900 text-[9px] whitespace-nowrap">
                      {Number(item.totalValue || 0).toFixed(2)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-b-2 border-slate-800 bg-slate-50/50 font-bold text-[10px] text-slate-900">
                <td colSpan={4} className="py-2 px-1 text-right uppercase tracking-wider">
                  Total Quarantined Defect Summary:
                </td>
                <td className="py-2 px-1 text-center font-mono text-[10px] whitespace-nowrap">
                  {totalDefectiveUnits} Units
                </td>
                <td colSpan={4} className="py-2 px-1 text-right font-mono text-slate-700 whitespace-nowrap uppercase tracking-wider">
                  Total Net Quarantine Loss:
                </td>
                <td className="py-2 px-1 pr-2 text-right font-mono text-[10px] text-slate-900 font-black whitespace-nowrap">
                  {formatLKR(totalLossValuation)}
                </td>
              </tr>
            </tfoot>
          </table>

          {/* Audit Verification Statement â€” Compact Border */}
          <div className="p-2 my-2 rounded border border-slate-300 bg-transparent text-[9px] text-slate-700 leading-relaxed">
            <strong>Contamination Prevention Certification:</strong> The items listed above have been inspected and physically quarantined in the secure Damaged Goods area. Under company protocol, quarantined items are strictly barred from sellable van stock until formally replaced by manufacturer warranty credit or written off as authorized scrap.
          </div>

          {/* Dual Signature Blocks â€” Spacious Layout Matching Manifest Report */}
          <div className="grid grid-cols-2 gap-8 pt-10 mt-4 border-t border-slate-300">
            <div className="text-center flex flex-col items-center">
              <div className="h-12 flex items-center justify-center mb-1">

              </div>
              <div className="border-b border-dashed border-slate-500 w-3/4 mx-auto mb-1.5" />
              <p className="font-bold text-slate-900 text-[10.5px]">Warehouse Quality Manager Signature</p>
              <p className="text-[9.5px] text-slate-600">Name: Bandara (Head Storekeeper)</p>
              <p className="text-[8.5px] text-slate-500 font-mono mt-0.5">Date: {formatDateYYYYMMDD(new Date())}</p>
            </div>

            <div className="text-center flex flex-col items-center">
              <div className="h-12 flex items-center justify-center mb-1">
              </div>
              <div className="border-b border-dashed border-slate-500 w-3/4 mx-auto mb-1.5" />
              <p className="font-bold text-slate-900 text-[10.5px]">Managing Director / Loss Auditor</p>
              <p className="text-[9.5px] text-slate-600">Name: W. Liyanage</p>
              <p className="text-[8.5px] text-slate-500 font-mono mt-0.5">Liyanage Distributors Quality Audit</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const portalRoot = document.getElementById('print-report-portal');
  return portalRoot ? ReactDOM.createPortal(modalContent, portalRoot) : modalContent;
}
