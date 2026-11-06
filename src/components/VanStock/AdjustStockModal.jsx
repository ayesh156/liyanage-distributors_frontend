/**
 * @file AdjustStockModal.jsx
 * @description Warehouse stocktake count reconciliation modal.
 * Requires a non-zero delta (+/-) and mandatory audit reason, generating
 * an immutable WAREHOUSE_AUDIT_ADJUSTMENT movement log.
 */

import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { X, SlidersHorizontal, AlertCircle, Check } from 'lucide-react';
import { toast } from 'react-toastify';
import SmartCombobox from '../ui/SmartCombobox';
import SearchableSelect from '../ui/SearchableSelect';
import useVanStockStore from '../../hooks/useVanStockStore';

const AUDIT_REASONS = [
  'Routine Stocktake Reconciliation',
  'Physical Count Discrepancy (Shrinkage)',
  'Found Unrecorded Buffer Stock',
  'Warehouse Transit/Bin Breakage',
  'Packaging Failure or Seal Breach',
  'Supplier Inbound Invoice Correction',
];

export default function AdjustStockModal({ isOpen, onClose, initialProductId = null }) {
  const products = useVanStockStore((s) => s.products);
  const mainStoreStock = useVanStockStore((s) => s.mainStoreStock);
  const adjustMainStoreStock = useVanStockStore((s) => s.adjustMainStoreStock);

  const [productId, setProductId] = useState('');
  const [delta, setDelta] = useState('');
  const [reason, setReason] = useState(AUDIT_REASONS[0]);
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setProductId(initialProductId ? String(initialProductId) : '');
      setDelta('');
      setReason(AUDIT_REASONS[0]);
      setNotes('');
      setError('');
    }
  }, [isOpen, initialProductId]);

  const selectedProduct = useMemo(
    () => products.find((p) => String(p.id) === String(productId)),
    [products, productId]
  );

  const warehouseItem = useMemo(
    () => mainStoreStock.find((m) => String(m.productId) === String(productId)),
    [mainStoreStock, productId]
  );

  const currentQty = warehouseItem ? warehouseItem.quantity : 0;
  const parsedDelta = Number(delta) || 0;
  const projectedQty = currentQty + parsedDelta;

  const productOptions = useMemo(
    () =>
      products.map((p) => {
        const wh = mainStoreStock.find((m) => m.productId === p.id);
        const qty = wh ? wh.quantity : 0;
        return {
          value: String(p.id),
          label: p.name,
          subtitle: `SKU: ${p.sku} • Current Warehouse Stock: ${qty} ${p.unit}`,
        };
      }),
    [products, mainStoreStock]
  );

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    if (!productId) {
      setError('Please select a product to adjust.');
      return;
    }
    if (parsedDelta === 0) {
      setError('Adjustment delta cannot be zero (0). Enter a positive or negative quantity.');
      return;
    }
    if (projectedQty < 0) {
      setError(`Adjustment would cause negative warehouse stock. Current: ${currentQty}, Delta: ${parsedDelta}.`);
      return;
    }

    setIsSubmitting(true);
    try {
      adjustMainStoreStock({
        productId: Number(productId),
        delta: parsedDelta,
        reason,
        notes: notes.trim(),
        performedBy: 'Warehouse Manager',
      });
      toast.success(
        `Warehouse stock adjusted: ${selectedProduct?.name} (${parsedDelta > 0 ? '+' : ''}${parsedDelta} ${selectedProduct?.unit}). New balance: ${projectedQty}.`
      );
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to adjust stock count.');
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
        className="w-full sm:max-w-lg bg-white dark:bg-slate-800 rounded-t-3xl sm:rounded-2xl border border-gray-200 dark:border-slate-700 shadow-2xl overflow-hidden flex flex-col max-h-[92vh] pb-safe animate-in slide-in-from-bottom sm:zoom-in-95 duration-200"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-900/30 flex items-center justify-center text-amber-600 dark:text-amber-400">
              <SlidersHorizontal size={20} />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Reconcile Stock Count
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Central Warehouse Physical Count Adjustment
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
          {error && (
            <div className="flex items-start gap-2.5 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 text-rose-700 dark:text-rose-300 text-xs">
              <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Select Product SKU <span className="text-rose-500">*</span>
            </label>
            <SmartCombobox
              portal={true}
              placeholder="Search product SKU or name..."
              options={productOptions}
              value={productId}
              onSelect={(opt) => {
                setProductId(opt.value);
                setError('');
              }}
            />
          </div>

          {selectedProduct && (
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700/60 text-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-slate-500 dark:text-slate-400">Current Warehouse Stock:</span>
                <span className="font-bold text-slate-900 dark:text-white">
                  {currentQty} {selectedProduct.unit}
                </span>
              </div>
              {parsedDelta !== 0 && (
                <div className="flex items-center justify-between pt-1 border-t border-slate-200 dark:border-slate-700">
                  <span className="text-slate-500 dark:text-slate-400">Post-Reconciliation Balance:</span>
                  <span className={`font-bold ${projectedQty >= 0 ? 'text-accent-600 dark:text-accent-400' : 'text-rose-600'}`}>
                    {projectedQty} {selectedProduct.unit}
                  </span>
                </div>
              )}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Count Adjustment Delta (+ or -) <span className="text-rose-500">*</span>
            </label>
            <input
              type="number"
              value={delta}
              onChange={(e) => setDelta(e.target.value)}
              placeholder="e.g. -5 for shrinkage, +10 for found stock"
              className="w-full px-3.5 py-2.5 text-base sm:text-sm rounded-xl border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-accent-500"
            />
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
              Use a minus sign (-) for deficit/shrinkage, or a positive number (+) for found stock.
            </p>
          </div>

          <div>
            <SearchableSelect
              label="Audit Justification Reason *"
              value={reason}
              onChange={setReason}
              options={AUDIT_REASONS}
              placeholder="Select audit reason..."
              portal
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Storekeeper Notes / Audit Memo
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Detailed explanation of count discrepancy..."
              className="w-full px-3.5 py-2 text-base sm:text-sm rounded-xl border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-accent-500"
            />
          </div>

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
              disabled={isSubmitting || !productId || parsedDelta === 0 || projectedQty < 0}
              className="flex items-center gap-2 px-5 py-2.5 text-xs font-bold rounded-xl bg-accent-600 hover:bg-accent-700 active:scale-95 text-white shadow-md shadow-accent-600/20 disabled:opacity-50"
            >
              <Check size={15} />
              <span>{isSubmitting ? 'Recording...' : 'Commit Adjustment'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}

