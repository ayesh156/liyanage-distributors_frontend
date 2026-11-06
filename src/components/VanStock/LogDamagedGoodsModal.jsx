/**
 * @file LogDamagedGoodsModal.jsx
 * @description Quarantined defective return & loss logging modal.
 * Strictly enforces the Contamination Prevention Rule: Damaged items are isolated
 * directly into the DAMAGED_GOODS ledger pool and never returned to sellable stock.
 */

import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { X, AlertTriangle, ShieldAlert, AlertCircle, Check } from 'lucide-react';
import { toast } from 'react-toastify';
import SmartCombobox from '../ui/SmartCombobox';
import SearchableSelect from '../ui/SearchableSelect';
import useVanStockStore from '../../hooks/useVanStockStore';
import { calcNetUnitPrice, calcTotalRealValue, formatLKR } from '../../data/vanStockData';
import { formatDateYYYYMMDD } from '../../utils/date';

const DEFECT_REASONS = [
  'Manufacturer Defect (No illumination / internal short)',
  'Transit / Road Damage (Cracked body / bent pin)',
  'Customer Warranty Return from Hardware Shop',
  'Broken Seal / Factory Packaging Failure',
  'Burnt Terminal / Overload Failure',
  'Water Damage / Damp Storage',
];

export default function LogDamagedGoodsModal({
  isOpen,
  onClose,
  initialProductId = null,
  initialProduct = null,
}) {
  const products = useVanStockStore((s) => s.products);
  const vanStock = useVanStockStore((s) => s.vanStock);
  const mainStoreStock = useVanStockStore((s) => s.mainStoreStock);
  const vehicle = useVanStockStore((s) => s.vehicle);
  const dailyManifest = useVanStockStore((s) => s.dailyManifest);
  const manifestHistory = useVanStockStore((s) => s.manifestHistory);
  const stockMovements = useVanStockStore((s) => s.stockMovements);
  const logDamagedGoods = useVanStockStore((s) => s.logDamagedGoods);

  const [productId, setProductId] = useState('');
  const [fromLocation, setFromLocation] = useState('VEHICLE'); // 'VEHICLE' or 'MAIN_STORE'
  const [quantity, setQuantity] = useState('1');
  const [reason, setReason] = useState(DEFECT_REASONS[0]);
  const [sourceInvoiceNo, setSourceInvoiceNo] = useState('');
  const [manifestNo, setManifestNo] = useState('');
  const [loadDate, setLoadDate] = useState('');
  const [reportedBy, setReportedBy] = useState(vehicle.repName || 'Kamal Perera');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Derive target product ID from initialProductId or initialProduct object
  const effectiveProductId =
    initialProductId || initialProduct?.productId || initialProduct?.id || null;

  useEffect(() => {
    if (isOpen) {
      // Auto-populate defective product SKU if launched with item context
      setProductId(effectiveProductId ? String(effectiveProductId) : '');
      setFromLocation('VEHICLE');
      setQuantity('1');
      setReason(DEFECT_REASONS[0]);
      setSourceInvoiceNo('');
      
      // Auto-populate original load manifest reference and date for van stock
      const initialManifest = dailyManifest?.manifestNo || 'MAN-20261105-01';
      const initialDate = dailyManifest?.manifestDate
        ? new Date(dailyManifest.manifestDate).toISOString().split('T')[0]
        : new Date().toISOString().split('T')[0];
      setManifestNo(initialManifest);
      setLoadDate(initialDate);

      setReportedBy(vehicle.repName || 'Kamal Perera');
      setError('');
    }
  }, [isOpen, effectiveProductId, vehicle.repName, dailyManifest]);

  const selectedProduct = useMemo(
    () => products.find((p) => String(p.id) === String(productId)),
    [products, productId]
  );

  const originatingStock = useMemo(() => {
    if (!selectedProduct) return 0;
    if (fromLocation === 'VEHICLE') {
      const v = vanStock.find((item) => item.productId === selectedProduct.id);
      return v ? v.quantity : 0;
    } else {
      const m = mainStoreStock.find((item) => item.productId === selectedProduct.id);
      return m ? m.quantity : 0;
    }
  }, [selectedProduct, fromLocation, vanStock, mainStoreStock]);

  const netUnitPrice = useMemo(() => {
    if (!selectedProduct) return 0;
    return calcNetUnitPrice(selectedProduct.basePrice, selectedProduct.companyDiscountPercent);
  }, [selectedProduct]);

  const parsedQty = Math.max(0, Number(quantity) || 0);
  const estimatedFinancialLoss = calcTotalRealValue(netUnitPrice, parsedQty);

  const productOptions = useMemo(
    () =>
      products.map((p) => {
        const v = vanStock.find((item) => item.productId === p.id);
        const m = mainStoreStock.find((item) => item.productId === p.id);
        return {
          value: String(p.id),
          label: p.name,
          subtitle: `SKU: ${p.sku} â€¢ Van: ${v ? v.quantity : 0} ${p.unit} â€¢ Warehouse: ${m ? m.quantity : 0} ${p.unit}`,
        };
      }),
    [products, vanStock, mainStoreStock]
  );

  const manifestOptions = useMemo(() => {
    const list = [];
    if (dailyManifest?.manifestNo) {
      list.push({
        value: dailyManifest.manifestNo,
        label: `Today's Manifest (${dailyManifest.manifestNo})`,
        date: dailyManifest.manifestDate || new Date().toISOString(),
      });
    }
    if (Array.isArray(manifestHistory)) {
      manifestHistory.forEach((m) => {
        if (m.manifestNo && !list.some((item) => item.value === m.manifestNo)) {
          list.push({
            value: m.manifestNo,
            label: `Manifest ${m.manifestNo} (${formatDateYYYYMMDD(m.manifestDate || m.createdAt)})`,
            date: m.manifestDate || m.createdAt,
          });
        }
      });
    }
    if (Array.isArray(stockMovements)) {
      stockMovements
        .filter((m) => m.movementType === 'STORE_TO_VEHICLE_LOAD' && m.reference)
        .forEach((m) => {
          if (!list.some((item) => item.value === m.reference)) {
            list.push({
              value: m.reference,
              label: `Load Sheet ${m.reference} (${formatDateYYYYMMDD(m.timestamp || m.createdAt)})`,
              date: m.timestamp || m.createdAt,
            });
          }
        });
    }
    return list;
  }, [dailyManifest, manifestHistory, stockMovements]);

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    if (!productId) {
      setError('Please select a product.');
      return;
    }
    if (parsedQty <= 0) {
      setError('Defective quantity must be greater than zero.');
      return;
    }
    if (parsedQty > originatingStock) {
      setError(
        `Quantity (${parsedQty}) exceeds available stock in ${fromLocation === 'VEHICLE' ? 'Van' : 'Warehouse'} (${originatingStock} ${selectedProduct?.unit}).`
      );
      return;
    }
    if (!reason.trim()) {
      setError('A defect reason is required.');
      return;
    }

    setIsSubmitting(true);
    try {
      logDamagedGoods({
        productId: Number(productId),
        fromLocation,
        quantity: parsedQty,
        reason,
        sourceInvoiceNo: sourceInvoiceNo.trim() || null,
        manifestNo: manifestNo.trim() || null,
        sourceManifestNo: manifestNo.trim() || null,
        loadDate: loadDate ? new Date(loadDate).toISOString() : null,
        reportedBy: reportedBy.trim(),
        unitPrice: netUnitPrice,
      });
      toast.warn(
        `Quarantined ${parsedQty} ${selectedProduct?.unit} into Damaged Goods Pool. Financial loss: ${formatLKR(estimatedFinancialLoss)}.`
      );
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to log damaged goods.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div
        className="w-full sm:max-w-xl bg-white dark:bg-slate-800 rounded-t-3xl sm:rounded-2xl border border-gray-200 dark:border-slate-700 shadow-2xl overflow-hidden flex flex-col max-h-[92vh] pb-safe animate-in slide-in-from-bottom sm:zoom-in-95 duration-200"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-rose-100 dark:border-rose-900/30 bg-rose-50/50 dark:bg-rose-950/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-100 dark:bg-rose-900/40 flex items-center justify-center text-rose-600 dark:text-rose-400">
              <AlertTriangle size={20} />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Log Defective / Damaged Goods
              </h3>
              <p className="text-xs text-rose-700 dark:text-rose-400">
                Direct Quarantine Pool Isolation (Never sellable)
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-4">
          {/* Contamination Rule Alert Notice */}
          <div className="flex items-start gap-2.5 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-rose-800 dark:text-rose-300 text-xs">
            <ShieldAlert size={16} className="flex-shrink-0 mt-0.5 text-rose-600" />
            <p className="leading-relaxed">
              <strong>Contamination Prevention Enforced:</strong> Damaged items are isolated strictly in the quarantine ledger. They will never contaminate sellable van stock or central warehouse bins.
            </p>
          </div>

          {error && (
            <div className="flex items-start gap-2.5 p-3 rounded-xl bg-rose-100/60 text-rose-800 dark:text-rose-300 text-xs">
              <AlertCircle size={15} className="flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Product Combobox */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Select Defective Product SKU <span className="text-rose-500">*</span>
            </label>
            <SmartCombobox
              portal={true}
              placeholder="Search product SKU or description..."
              options={productOptions}
              value={productId}
              onSelect={(opt) => {
                setProductId(opt.value);
                setError('');
              }}
            />
          </div>

          {/* Location Origin & Defective Quantity */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <SearchableSelect
                label="Defect Origin Location"
                value={fromLocation}
                onChange={setFromLocation}
                options={[
                  { value: 'VEHICLE', label: `Van On-Hand Stock (${vehicle.id})` },
                  { value: 'MAIN_STORE', label: 'Central Main Store Warehouse' },
                ]}
                placeholder="Select origin..."
                portal
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Defective Quantity <span className="text-rose-500">*</span>
                </label>
                {selectedProduct && (
                  <span className="text-[11px] text-slate-500">
                    Avail: {originatingStock} {selectedProduct.unit}
                  </span>
                )}
              </div>
              <input
                type="number"
                min="1"
                max={originatingStock || 999}
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="w-full px-3 py-2 text-base sm:text-sm rounded-xl border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-accent-500"
              />
            </div>
          </div>

          {/* Defect Reason */}
          <div>
            <SearchableSelect
              label="Defect / Damage Reason *"
              value={reason}
              onChange={setReason}
              options={DEFECT_REASONS}
              placeholder="Select defect reason..."
              portal
            />
          </div>

          {/* Original Load Manifest Correlation */}
          {fromLocation === 'VEHICLE' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-700/60">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Original Load Manifest # <span className="text-rose-500">*</span>
                </label>
                <div className="space-y-1.5">
                  <input
                    type="text"
                    value={manifestNo}
                    onChange={(e) => setManifestNo(e.target.value)}
                    placeholder="e.g. MAN-20261105-01"
                    className="w-full px-3.5 py-2 text-base sm:text-sm rounded-xl border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-accent-500 font-mono text-xs"
                  />
                  {manifestOptions.length > 0 && (
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[10px] text-slate-400">Quick Select:</span>
                      {manifestOptions.slice(0, 2).map((opt) => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => {
                            setManifestNo(opt.value);
                            if (opt.date) {
                              setLoadDate(new Date(opt.date).toISOString().split('T')[0]);
                            }
                          }}
                          className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800 hover:bg-blue-100 transition-colors"
                        >
                          {opt.value}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Original Load Date <span className="text-rose-500">*</span>
                </label>
                <input
                  type="date"
                  value={loadDate}
                  onChange={(e) => setLoadDate(e.target.value)}
                  className="w-full px-3.5 py-2 text-base sm:text-sm rounded-xl border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-accent-500 text-xs"
                />
              </div>
            </div>
          )}

          {/* Invoice Reference & Reported By */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Customer Invoice No (Optional)
              </label>
              <input
                type="text"
                value={sourceInvoiceNo}
                onChange={(e) => setSourceInvoiceNo(e.target.value)}
                placeholder="e.g. INV-2026-088"
                className="w-full px-3.5 py-2 text-base sm:text-sm rounded-xl border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-accent-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Reported By (Sales Officer)
              </label>
              <input
                type="text"
                value={reportedBy}
                onChange={(e) => setReportedBy(e.target.value)}
                className="w-full px-3.5 py-2 text-base sm:text-sm rounded-xl border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-accent-500"
              />
            </div>
          </div>

          {/* Valuation Loss */}
          {selectedProduct && parsedQty > 0 && (
            <div className="p-3.5 rounded-xl bg-rose-50/50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/40 text-xs flex items-center justify-between">
              <span className="text-slate-600 dark:text-slate-400">Estimated Financial Loss:</span>
              <span className="font-mono font-bold text-rose-600 dark:text-rose-400 text-sm">
                {formatLKR(estimatedFinancialLoss)}
              </span>
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100 dark:border-slate-700">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-semibold rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !productId || parsedQty <= 0 || parsedQty > originatingStock}
              className="flex items-center gap-2 px-5 py-2.5 text-xs font-bold rounded-xl bg-rose-600 hover:bg-rose-700 active:scale-95 text-white shadow-md shadow-rose-600/20 disabled:opacity-50"
            >
              <Check size={15} />
              <span>{isSubmitting ? 'Quarantining...' : 'Quarantine Defective Stock'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}

