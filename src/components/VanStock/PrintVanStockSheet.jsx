/**
 * @file PrintVanStockSheet.jsx
 * @description A4 Corporate Printable Load Manifest and Stock Audit Bill.
 * Adheres to strict A4 portrait specifications, official Liyanage Distributors stationery branding,
 * itemized table, total valuations, and dual signature blocks for dispatcher and field sales rep.
 * Features eco/low-ink print design, strict print portal isolation, and zero background bleed.
 */

import React, { useEffect, useState, useMemo } from 'react';
import ReactDOM from 'react-dom';
import { Printer, X } from 'lucide-react';
import useVanStockStore from '../../hooks/useVanStockStore';
import {
  calcNetUnitPrice,
  calcTotalRealValue,
  formatLKR,
  formatDateYYYYMMDD,
  getColomboDateStr,
  isRoadSaleMovement,
  isLoadMovement,
  isReversalMovement,
} from '../../data/vanStockData';
import { DEFAULT_OWNER_SIGNATURE } from '../../data/defaultOwnerSignature';
import { settingsApi } from '../../services/api';

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

export default function PrintVanStockSheet({
  isOpen,
  onClose,
  reportType = 'stock',
  filterDate,
  dateRange,
  dateLabel,
  selectedDayOfWeek = 'ALL',
  isAllDates = false,
}) {
  const vanStock = useVanStockStore((s) => s.vanStock);
  const products = useVanStockStore((s) => s.products) || [];
  const vehicle = useVanStockStore((s) => s.vehicle);
  const dailyManifest = useVanStockStore((s) => s.dailyManifest);
  const stockMovements = useVanStockStore((s) => s.stockMovements);
  const ownerSignatureData = useVanStockStore((s) => s.ownerSignatureData);

  const [signatureConfig, setSignatureConfig] = useState({
    reportSignatureRole: 'Driver',
    reportSignatureName: '',
  });

  // Hydrate configured signature role and name dynamically from System/Company Settings
  useEffect(() => {
    let isMounted = true;
    async function fetchSettings() {
      try {
        const res = await settingsApi.getCompanySettings();
        if (isMounted && res?.data) {
          setSignatureConfig({
            reportSignatureRole: res.data.reportSignatureRole || 'Driver',
            reportSignatureName: res.data.reportSignatureName || '',
          });
        }
      } catch (_err) {
        // Soft fallback
      }
    }
    if (isOpen) {
      fetchSettings();
    }
    return () => {
      isMounted = false;
    };
  }, [isOpen]);

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

  const isSaleReport = reportType === 'sales';
  const isWeeklyReport = reportType === 'weekly';

  const todayStr = formatDateYYYYMMDD(new Date());
  const isAllSelected = Boolean(isAllDates || (selectedDayOfWeek === 'ALL' && !filterDate && (!dateRange || (!dateRange.start && !dateRange.end))));
  const isMultiDay = Boolean(dateRange && dateRange.start && dateRange.end && dateRange.start !== dateRange.end);
  const targetDate = filterDate || dateRange?.start || todayStr;

  const targetDateLabel = isAllSelected
    ? 'Report Date: Current Live Stock'
    : isMultiDay
    ? `Period: ${dateRange.start} to ${dateRange.end}`
    : `Report Date: ${targetDate}`;

  // Helper: master catalog SKU lookup fallback to eliminate 'N/A'
  const resolveItemSku = (item) => {
    if (item.sku && item.sku !== 'N/A' && item.sku.trim() !== '') return item.sku;
    const foundProd = products.find(
      (p) => p.id === item.productId || (p.name && item.productName && p.name.trim().toLowerCase() === item.productName.trim().toLowerCase())
    );
    if (foundProd?.sku && foundProd.sku.trim() !== '') return foundProd.sku;
    return item.productId ? `#${item.productId}` : '-';
  };

  // Set of reversed movement IDs to strictly exclude cancelled/reversed transactions
  const reversedMovementIds = useMemo(() => {
    const set = new Set();
    (stockMovements || []).forEach((m) => {
      if (String(m.reference || '').startsWith('REV-MOV-')) {
        const match = String(m.reference || '').match(/REV-MOV-(\d+)/);
        if (match) set.add(Number(match[1]));
      }
    });
    return set;
  }, [stockMovements]);

  // 1. Resolve persistent items for Stock Sheet vs Road Sale Report vs Weekly Report
  // Strict Date-Scoped Filtering: When ALL is selected, snapshot live vanStock.
  // When ANY specific date or date range is active, query STRICTLY the Loaded to Van movements.
  const stockItems = useMemo(() => {
    if (isAllSelected) {
      return vanStock
        .filter((v) => (v.dispatchedQty || v.quantity) > 0)
        .map((item) => ({
          ...item,
          sku: resolveItemSku(item),
          entryDate: 'Live Balance',
        }));
    }

    // Filter strictly for STORE_TO_VEHICLE_LOAD movements within the Colombo date boundaries
    const loadMovements = (stockMovements || []).filter((m) => {
      if (!isLoadMovement(m)) return false;
      if (isReversalMovement(m)) return false;
      if (reversedMovementIds.has(Number(m.id))) return false;

      const movDate = getColomboDateStr(m.timestamp || m.createdAt || m.date || m.loadDate);
      if (isMultiDay) {
        return movDate >= dateRange.start && movDate <= dateRange.end;
      }
      return movDate === targetDate;
    });

    if (loadMovements.length === 0) {
      // Clean zero-load empty state: NEVER fall back to live vanStock!
      return [];
    }

    // Aggregate repeated loads of the same product within the filtered date/period
    const aggregatedMap = new Map();
    loadMovements.forEach((m) => {
      const prodKey = m.productId ? String(m.productId) : (m.productName || m.sku || String(m.id));
      const masterProd = products.find(
        (p) => String(p.id) === String(m.productId) || (p.name && m.productName && p.name.trim().toLowerCase() === m.productName.trim().toLowerCase())
      );
      const sku = resolveItemSku({ ...m, productId: m.productId, productName: m.productName });
      const basePrice = Number(m.unitPrice || masterProd?.basePrice || masterProd?.price || 0);
      const discPercent = Number(masterProd?.discount || masterProd?.discountPercent || 0);
      const netUnitPrice = calcNetUnitPrice(basePrice, discPercent);
      const qty = Number(m.quantity) || 0;

      if (!aggregatedMap.has(prodKey)) {
        aggregatedMap.set(prodKey, {
          id: m.id,
          productId: m.productId,
          productName: m.productName || masterProd?.name || 'Product',
          sku,
          unit: m.unit || masterProd?.unit || 'Unit',
          quantity: qty,
          basePrice,
          discountPercent: discPercent,
          netUnitPrice,
          totalValue: Math.round(qty * netUnitPrice * 100) / 100,
          repChecked: true,
          status: 'APPROVED',
          entryDate: getColomboDateStr(m.timestamp || m.createdAt || m.date || m.loadDate),
        });
      } else {
        const existing = aggregatedMap.get(prodKey);
        existing.quantity += qty;
        existing.totalValue = Math.round(existing.quantity * existing.netUnitPrice * 100) / 100;
      }
    });

    return Array.from(aggregatedMap.values());
  }, [isAllSelected, vanStock, stockMovements, isMultiDay, dateRange, targetDate, reversedMovementIds, products]);

  // Road Sale Report: strictly filtered to active date / range or defaults strictly to today in Colombo time
  const saleItems = useMemo(() => {
    // 1. Gather all road sales movements matching the active date scope
    const rawSaleMovements = (stockMovements || []).filter((m) => {
      if (!isRoadSaleMovement(m)) return false;
      if (isReversalMovement(m)) return false;
      if (reversedMovementIds.has(Number(m.id))) return false;

      const movementDate = getColomboDateStr(m.timestamp || m.createdAt || m.date || m.groupedDate);
      if (isMultiDay) {
        return movementDate >= dateRange.start && movementDate <= dateRange.end;
      }
      return movementDate === targetDate;
    });

    const candidateSales =
      rawSaleMovements.length > 0
        ? rawSaleMovements
        : dailyManifest?.roadSales && dailyManifest.roadSales.length > 0 && !isMultiDay && (!filterDate || filterDate === todayStr)
        ? dailyManifest.roadSales
        : [];

    if (candidateSales.length === 0) {
      return [];
    }

    // Aggregate repeated sales of the same product within the filtered date/period
    const aggregatedMap = new Map();
    candidateSales.forEach((m) => {
      const prodKey = m.productId ? String(m.productId) : (m.productName || m.sku || String(m.id));
      const masterProd = products.find(
        (p) => String(p.id) === String(m.productId) || (p.name && m.productName && p.name.trim().toLowerCase() === m.productName.trim().toLowerCase())
      );
      const sku = resolveItemSku({ ...m, productId: m.productId, productName: m.productName });
      const basePrice = Number(m.unitPrice || masterProd?.basePrice || masterProd?.price || 0);
      const discPercent = Number(masterProd?.discount || masterProd?.discountPercent || 0);
      const netUnitPrice = Number(m.unitPrice) || Number(m.netUnitPrice) || calcNetUnitPrice(basePrice, discPercent);
      const qty = Number(m.quantity) || 0;

      if (!aggregatedMap.has(prodKey)) {
        aggregatedMap.set(prodKey, {
          id: m.id,
          productId: m.productId,
          productName: m.productName || masterProd?.name || 'Product',
          sku,
          unit: m.unit || masterProd?.unit || 'Unit',
          quantity: qty,
          basePrice,
          discountPercent: discPercent,
          netUnitPrice,
          totalValue: Math.round(qty * netUnitPrice * 100) / 100,
          status: 'SOLD',
          repChecked: true,
          entryDate: getColomboDateStr(m.timestamp || m.createdAt || m.date || m.groupedDate),
        });
      } else {
        const existing = aggregatedMap.get(prodKey);
        existing.quantity += qty;
        existing.totalValue = Math.round(existing.quantity * existing.netUnitPrice * 100) / 100;
      }
    });

    return Array.from(aggregatedMap.values());
  }, [stockMovements, dailyManifest?.roadSales, reversedMovementIds, isMultiDay, dateRange, targetDate, filterDate, todayStr, products]);

  // Weekly Physical Stock Verification Audit Items
  const weeklyItems = vanStock
    .filter((v) => Boolean(v.weeklyVerified))
    .map((item) => ({
      ...item,
      sku: resolveItemSku(item),
      entryDate: item.weeklyVerifiedAt ? formatDateYYYYMMDD(item.weeklyVerifiedAt) : (filterDate || todayStr),
      status: 'VERIFIED',
      repChecked: true,
    }));

  const activeItems = isWeeklyReport ? weeklyItems : isSaleReport ? saleItems : stockItems;

  const totalLoadedUnits = activeItems.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);
  const totalLoadedValue = activeItems.reduce((sum, item) => {
    if (typeof item.totalValue === 'number' && item.totalValue > 0) {
      return sum + item.totalValue;
    }
    const net = item.netUnitPrice || calcNetUnitPrice(item.basePrice, item.companyDiscountPercent || item.discountPercent);
    return sum + calcTotalRealValue(net, item.quantity);
  }, 0);

  const manifestDocNo = dailyManifest?.manifestNo || `MAN-${(filterDate || todayStr).replace(/-/g, '')}-01`;
  const manifestRev = dailyManifest?.manifestRevision || 1;
  const ownerSignature = ownerSignatureData || dailyManifest?.ownerSignatureData || DEFAULT_OWNER_SIGNATURE;

  // Signatory Role & Name with fallback to Driver
  const configuredSignatoryRole = signatureConfig.reportSignatureRole || 'Driver';
  const configuredSignatoryName = signatureConfig.reportSignatureName || dailyManifest?.repSignedBy || vehicle?.repName || 'Driver';

  const handlePrint = () => {
    window.print();
  };

  // Safe early exit for closed modal after all React hooks have unconditionally evaluated
  if (!isOpen) return null;

  const modalContent = (
    <div className="fixed inset-0 z-[100] flex flex-col bg-slate-900/80 backdrop-blur-md overflow-y-auto print:bg-white print:p-0">
      {/* Top action bar - hidden during print */}
      <div className="no-print sticky top-0 z-10 flex items-center justify-between px-3 sm:px-6 py-2.5 sm:py-3 bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700 shadow-md">
        <div className="flex items-center gap-2">
          <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate">
            {isWeeklyReport
              ? `Weekly Stock Verification Report (${manifestDocNo})`
              : isSaleReport
              ? `Road Sale Report (${manifestDocNo})`
              : `Daily Van Manifest (${manifestDocNo})`} {manifestRev > 1 ? `* Rev #${manifestRev}` : ''}
          </span>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            type="button"
            onClick={handlePrint}
            className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 text-xs font-bold rounded-xl bg-accent-600 hover:bg-accent-700 text-white shadow-sm transition-all cursor-pointer active:scale-95 whitespace-nowrap"
          >
            <Printer size={15} />
            <span className="hidden sm:inline">
              {isWeeklyReport
                ? 'Print Weekly Report (A4)'
                : isSaleReport
                ? 'Print Sale Report (A4)'
                : 'Print Manifest (A4)'}
            </span>
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
                {isWeeklyReport ? 'WEEKLY REPORT' : isSaleReport ? 'ROAD SALE REPORT' : 'VAN STOCK REPORT'}
              </span>
              <p className="mt-0.5 font-mono font-bold text-xs text-black">
                {targetDateLabel}
              </p>
              <p className="font-mono text-[10px] text-black">
                Printed: {formatPrintDateTime(new Date())}
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
              <tr className="border-y-2 border-black bg-transparent text-[11px] font-bold text-black uppercase tracking-wider">
                <th className="py-2 px-1 text-center whitespace-normal break-words leading-tight text-[11px] font-bold text-black uppercase tracking-wider">#</th>
                <th className="py-2 px-2 text-left whitespace-normal break-words leading-tight text-[11px] font-bold text-black uppercase tracking-wider">SKU</th>
                <th className="py-2 px-2 text-left whitespace-normal break-words leading-tight text-[11px] font-bold text-black uppercase tracking-wider">Product Description</th>
                <th className="py-2 px-2 text-right whitespace-normal break-words leading-tight text-[11px] font-bold text-black uppercase tracking-wider">
                  {isWeeklyReport ? 'Audited Qty' : isSaleReport ? 'Sold Qty' : 'Loaded Qty'}
                </th>
                <th className="py-2 px-2 text-right whitespace-normal break-words leading-tight text-[11px] font-bold text-black uppercase tracking-wider">Net Price</th>
                <th className="py-2 px-2 text-right whitespace-normal break-words leading-tight text-[11px] font-bold text-black uppercase tracking-wider">Total Value</th>
                <th className="py-2 px-1 text-center whitespace-nowrap leading-tight text-[11px] font-bold text-black uppercase tracking-wider">Verification</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-300">
              {activeItems.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-6 text-center text-xs text-slate-500 italic">
                    {isWeeklyReport
                      ? 'No items currently verified for the weekly audit.'
                      : isSaleReport
                      ? `No road sales recorded on ${isMultiDay ? `${dateRange.start} to ${dateRange.end}` : targetDate}.`
                      : `No stock loaded to van on ${isMultiDay ? `${dateRange.start} to ${dateRange.end}` : targetDate}.`}
                  </td>
                </tr>
              ) : (
                activeItems.map((item, index) => {
                  const netPrice = item.netUnitPrice || calcNetUnitPrice(item.basePrice, item.companyDiscountPercent || item.discountPercent);
                  const totalVal = item.totalValue || calcTotalRealValue(netPrice, item.quantity);
                  const isVerified = item.repChecked || item.status === 'APPROVED' || item.status === 'VERIFIED' || isSaleReport || isWeeklyReport;

                  return (
                    <tr key={item.id || index} className="bg-white hover:bg-transparent">
                      <td className="py-1.5 px-1 text-center text-xs font-medium text-black font-mono">
                        {index + 1}
                      </td>
                      <td className="py-1.5 px-2 whitespace-nowrap">
                        <span className="px-1.5 py-0.5 rounded border border-black text-black text-xs font-mono font-bold bg-transparent">
                          {item.sku || '-'}
                        </span>
                      </td>
                      <td className="py-1.5 px-2 text-xs font-medium text-black break-words leading-snug">
                        <span>{item.productName}</span>
                        {isMultiDay && item.entryDate && (
                          <span className="block text-[10px] text-slate-600 font-mono mt-0.5">
                            Date: {item.entryDate}
                          </span>
                        )}
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
                        <span className="inline-block px-1.5 py-0.5 rounded text-[9px] font-bold uppercase border border-black text-black bg-transparent">
                          {isWeeklyReport ? 'Audited' : isSaleReport ? 'Sold' : isVerified ? 'Verified' : 'Pending'}
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
                  {isWeeklyReport
                    ? 'Total Weekly Audited Summary:'
                    : isSaleReport
                    ? 'Total Sold Inventory Summary:'
                    : 'Total Loaded Inventory Summary:'}
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

            {/* Configured Report Signatory Signature Block (Dynamic from Settings) */}
            <div className="text-center flex flex-col items-center">
              <div className="h-14 flex items-center justify-center mb-1">
                {dailyManifest?.repSignatureData ? (
                  <img
                    src={dailyManifest.repSignatureData}
                    alt={`${configuredSignatoryRole} Signature`}
                    className="max-h-12 max-w-[180px] object-contain filter contrast-125"
                  />
                ) : (
                  <div className="h-12 flex items-center justify-center text-[11px] text-black font-medium italic">
                    Awaiting field tablet sign-off
                  </div>
                )}
              </div>
              <div className="border-b border-dashed border-black w-3/4 mx-auto mb-1.5" />
              <p className="text-xs font-bold text-black">{configuredSignatoryRole} Signature</p>
              <p className="text-[11px] font-medium text-black">
                {configuredSignatoryName}
              </p>
              <p className="text-[11px] font-medium text-black font-mono mt-0.5">
                {dailyManifest?.repSignedAt
                  ? `Verified: ${new Date(dailyManifest.repSignedAt).toLocaleString()}`
                  : `Mobile: ${vehicle?.repPhone || 'N/A'}`}
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
