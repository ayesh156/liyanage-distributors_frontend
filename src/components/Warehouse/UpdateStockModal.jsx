/**
 * @file UpdateStockModal.jsx
 * @description Dedicated Warehouse Stock Adjustment Modal.
 * Enables warehouse staff to perform relative (+ / -) inventory adjustments directly
 * on a selected SKU with live resulting stock computation, audit reason logging,
 * and immediate backend synchronization.
 */

import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Package,
  AlertCircle,
  Check,
} from 'lucide-react';
import { toast } from 'react-toastify';
import useVanStockStore from '../../hooks/useVanStockStore';
import { formatLKR } from '../../data/vanStockData';

export default function UpdateStockModal({
  isOpen,
  onClose,
  product = null,
  onSuccess = null,
}) {
  const adjustMainStoreStock = useVanStockStore((s) => s.adjustMainStoreStock);
  const fetchInitialData = useVanStockStore((s) => s.fetchInitialData);

  const [adjustmentQty, setAdjustmentQty] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Reset form upon opening
  useEffect(() => {
    if (isOpen) {
      setAdjustmentQty('');
      setNotes('');
      setError('');
      setIsSubmitting(false);
    }
  }, [isOpen, product]);

  const currentStock = useMemo(() => {
    return Number(product?.currentStock ?? product?.quantity ?? 0);
  }, [product]);

  const numericDelta = useMemo(() => {
    if (adjustmentQty === '' || adjustmentQty === '-' || adjustmentQty === '+') return 0;
    const n = Number(adjustmentQty);
    return isNaN(n) ? 0 : n;
  }, [adjustmentQty]);

  const resultingStock = useMemo(() => {
    return currentStock + numericDelta;
  }, [currentStock, numericDelta]);

  const isDeltaNegativeExceeds = resultingStock < 0;

  if (!isOpen || !product) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (adjustmentQty === '' || numericDelta === 0) {
      setError('Please enter a non-zero adjustment quantity (positive to add, negative to subtract).');
      return;
    }

    if (resultingStock < 0) {
      setError(`Cannot deduct ${Math.abs(numericDelta)} units. Current warehouse stock is only ${currentStock} units.`);
      return;
    }

    setIsSubmitting(true);
    try {
      await adjustMainStoreStock({
        productId: product.id || product.productId,
        delta: numericDelta,
        reason: 'Warehouse Stock Adjustment',
        notes: notes.trim(),
        performedBy: 'Warehouse Manager',
      });

      if (typeof onSuccess === 'function') {
        await onSuccess();
      } else {
        await fetchInitialData();
      }

      toast.success(
        `Adjusted stock for "${product.name || product.sku}": ${currentStock} -> ${resultingStock} units (${numericDelta > 0 ? '+' : ''}${numericDelta}).`
      );
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to adjust warehouse stock.');
      toast.error(err.message || 'Failed to adjust stock.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div className="w-full sm:max-w-lg bg-white dark:bg-slate-800 rounded-t-3xl sm:rounded-2xl border border-gray-200 dark:border-slate-700 shadow-2xl overflow-hidden flex flex-col max-h-[92vh] pb-safe animate-in slide-in-from-bottom sm:zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-900/30 flex items-center justify-center text-amber-600 dark:text-amber-400">
              <Package size={20} />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Update Warehouse Stock
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Relative (+ / -) Central Warehouse Inventory Adjustment
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

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-4">
          {error && (
            <div className="flex items-start gap-2.5 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 text-rose-700 dark:text-rose-300 text-xs">
              <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Product Summary Card (Read-Only Reference) */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-gray-200 dark:border-slate-700/80 space-y-2.5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <span className="font-mono text-[11px] font-bold uppercase tracking-wider text-accent-600 dark:text-accent-400 bg-accent-50 dark:bg-accent-950/50 px-2 py-0.5 rounded-md border border-accent-200 dark:border-accent-800">
                  {product.sku || 'SKU'}
                </span>
                <h4 className="text-sm font-bold text-slate-900 dark:text-white mt-1">
                  {product.name || product.productName}
                </h4>
              </div>
              <div className="text-right flex-shrink-0">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">
                  Base Price
                </span>
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  {formatLKR(product.basePrice || 0)}
                </span>
              </div>
            </div>

            <div className="pt-2 border-t border-gray-200/80 dark:border-slate-800 flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                Current Warehouse On-Hand:
              </span>
              <span className="text-xs font-bold font-mono px-2.5 py-0.5 rounded-lg bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-slate-800 dark:text-slate-200">
                {currentStock} Units
              </span>
            </div>
          </div>

          {/* Relative Adjustment Input with Prominent Live Resulting Stock Preview */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Adjustment Quantity (+ / -) <span className="text-rose-500">*</span>
              </label>

              {/* Live Resulting Stock Badge at the Top */}
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                  Resulting Stock:
                </span>
                <span
                  className={`font-mono font-bold text-xs px-2.5 py-0.5 rounded-lg border transition-all ${
                    isDeltaNegativeExceeds
                      ? 'bg-rose-50 dark:bg-rose-950/60 border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400'
                      : numericDelta > 0
                      ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300'
                      : numericDelta < 0
                      ? 'bg-amber-50 dark:bg-amber-950/60 border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300'
                      : 'bg-slate-100 dark:bg-slate-700 border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  {resultingStock} Units
                </span>
              </div>
            </div>

            <div className="relative">
              <input
                type="number"
                step="any"
                value={adjustmentQty}
                onChange={(e) => {
                  setAdjustmentQty(e.target.value);
                  setError('');
                }}
                placeholder="e.g. +10 or -5"
                className={`w-full h-[42px] px-3.5 py-2 font-mono text-base sm:text-sm font-bold rounded-xl border bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm focus:outline-none transition-all ${
                  isDeltaNegativeExceeds
                    ? 'border-rose-400 ring-2 ring-rose-400/20 text-rose-600 dark:text-rose-400'
                    : numericDelta > 0
                    ? 'border-emerald-400 ring-2 ring-emerald-400/20 text-emerald-700 dark:text-emerald-400'
                    : numericDelta < 0
                    ? 'border-amber-400 ring-2 ring-amber-400/20 text-amber-700 dark:text-amber-400'
                    : 'border-gray-200 hover:border-gray-300 dark:border-slate-700 focus:border-accent-500 focus:ring-2 focus:ring-accent-500/20'
                }`}
              />
            </div>

            <div className="flex items-center justify-between mt-1.5 text-[11px]">
              <p className="text-slate-500 dark:text-slate-400">
                Enter <strong className="text-emerald-600 dark:text-emerald-400">+10</strong> to add, or <strong className="text-rose-600 dark:text-rose-400">-5</strong> to deduct.
              </p>
              {isDeltaNegativeExceeds ? (
                <span className="font-semibold text-rose-600 dark:text-rose-400">
                  Exceeds available stock ({currentStock} Units)
                </span>
              ) : numericDelta !== 0 ? (
                <span className="font-semibold text-slate-600 dark:text-slate-300">
                  {currentStock} {numericDelta > 0 ? `+ ${numericDelta}` : `- ${Math.abs(numericDelta)}`} = <strong className="text-slate-900 dark:text-white">{resultingStock} Units</strong>
                </span>
              ) : null}
            </div>
          </div>

          {/* Storekeeper Memo / Notes (Optional) */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Notes / Audit Memo (Optional)
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Shelf audit bin B-12"
              className="w-full h-[38px] px-3 py-1.5 text-xs rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-accent-500"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100 dark:border-slate-700">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-semibold rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || numericDelta === 0 || isDeltaNegativeExceeds}
              className="flex items-center gap-2 px-5 py-2.5 text-xs font-bold rounded-xl bg-accent-600 hover:bg-accent-700 active:scale-95 text-white shadow-md shadow-accent-600/20 disabled:opacity-40 transition-all cursor-pointer"
            >
              <Check size={15} />
              <span>{isSubmitting ? 'Updating Stock...' : 'Save Stock Adjustment'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
