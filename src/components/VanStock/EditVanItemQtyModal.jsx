/**
 * @file EditVanItemQtyModal.jsx
 * @description Operational modal allowing Warehouse Keepers and Admins to modify
 * loaded van item quantities directly. Automatically reconciles the delta back
 * to/from Central Warehouse stock and records an immutable audit ledger movement.
 */

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Plus, Minus, ArrowRightLeft, Check, AlertCircle } from 'lucide-react';
import { toast } from 'react-toastify';
import useVanStockStore from '../../hooks/useVanStockStore';
import { calcNetUnitPrice, calcTotalRealValue, formatLKR } from '../../data/vanStockData';

export default function EditVanItemQtyModal({ isOpen, onClose, item }) {
  const mainStoreStock = useVanStockStore((s) => s.mainStoreStock);
  const updateVanItemQuantity = useVanStockStore((s) => s.updateVanItemQuantity);

  const [quantity, setQuantity] = useState(0);
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Find warehouse item to determine available balance
  const warehouseItem = mainStoreStock.find((m) => m.productId === item?.productId);
  const warehouseAvail = warehouseItem ? warehouseItem.quantity : 0;
  const currentVanQty = item ? item.quantity : 0;

  useEffect(() => {
    if (isOpen && item) {
      setQuantity(item.quantity);
      setNotes('');
      setError('');
    }
  }, [isOpen, item]);

  if (!isOpen || !item) return null;

  const parsedQty = Math.max(0, Number(quantity) || 0);
  const delta = parsedQty - currentVanQty;
  const netPrice = calcNetUnitPrice(item.basePrice, item.companyDiscountPercent);
  const totalValuation = calcTotalRealValue(netPrice, parsedQty);

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    if (delta > 0 && delta > warehouseAvail) {
      setError(`Only ${warehouseAvail} ${item.unit} available in Central Warehouse.`);
      return;
    }

    setIsSubmitting(true);
    try {
      updateVanItemQuantity({
        productId: item.productId,
        newQuantity: parsedQty,
        notes: notes || `Direct van quantity edit (${delta > 0 ? '+' : ''}${delta} ${item.unit})`,
        performedBy: 'Warehouse Keeper',
      });

      toast.success(
        delta === 0
          ? 'Quantity unchanged.'
          : delta > 0
          ? `Added +${delta} ${item.unit} from Warehouse into ${item.vehicleId || 'VAN-01'}.`
          : `Returned ${Math.abs(delta)} ${item.unit} back to Central Warehouse.`
      );
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to update van item quantity.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/80 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl border border-gray-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/60 dark:bg-slate-800/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-accent-50 dark:bg-accent-950/40 text-accent-600 dark:text-accent-400 border border-accent-200 dark:border-accent-800 flex items-center justify-center">
              <ArrowRightLeft size={18} />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                Modify Loaded Van Quantity
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Automatic Warehouse Rebalancing & Audit Trail
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Target Product Identity Card */}
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-gray-200 dark:border-slate-700">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-orange-50 text-orange-700 border border-orange-200 dark:bg-orange-950/60 dark:text-orange-300 dark:border-orange-800/60">
                {item.sku}
              </span>
              <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate">
                {item.productName}
              </h3>
            </div>

            <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-gray-200/60 dark:border-slate-700 text-xs">
              <div>
                <span className="text-[10px] text-slate-400 block">Current Van Qty:</span>
                <span className="font-bold text-slate-900 dark:text-white">
                  {currentVanQty} {item.unit}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block">Warehouse Avail:</span>
                <span className="font-bold text-slate-900 dark:text-white">
                  {warehouseAvail} {item.unit}
                </span>
              </div>
            </div>
          </div>

          {/* Stepper Quantity Control */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              New Loaded Quantity ({item.unit}) <span className="text-red-500">*</span>
            </label>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setQuantity((q) => Math.max(0, Number(q) - 1))}
                className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 flex items-center justify-center text-slate-700 dark:text-slate-200 hover:bg-slate-200 transition-colors cursor-pointer"
              >
                <Minus size={16} />
              </button>

              <input
                type="number"
                min="0"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="flex-1 text-center py-2 px-3 text-sm font-bold font-mono rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-accent-500"
              />

              <button
                type="button"
                onClick={() => setQuantity((q) => Number(q) + 1)}
                className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 flex items-center justify-center text-slate-700 dark:text-slate-200 hover:bg-slate-200 transition-colors cursor-pointer"
              >
                <Plus size={16} />
              </button>
            </div>
          </div>

          {/* Reconcile Delta Impact Indicator */}
          <div
            className={`p-3 rounded-xl text-xs border transition-all ${
              delta > 0
                ? 'bg-amber-50/70 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800/60 text-amber-900 dark:text-amber-200'
                : delta < 0
                ? 'bg-blue-50/70 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800/60 text-blue-900 dark:text-blue-200'
                : 'bg-slate-50 dark:bg-slate-800/40 border-gray-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
            }`}
          >
            <div className="flex items-center justify-between font-semibold">
              <span>Inventory Delta:</span>
              <span className="font-mono">
                {delta > 0 ? `+${delta}` : delta} {item.unit}
              </span>
            </div>
            <p className="text-[11px] mt-0.5 opacity-90">
              {delta > 0
                ? `Will deduct ${delta} ${item.unit} from Central Warehouse to load into van.`
                : delta < 0
                ? `Will return ${Math.abs(delta)} ${item.unit} back to Central Warehouse stock.`
                : 'No quantity change.'}
            </p>
          </div>

          {/* Notes Input */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Adjustment Reason / Notes (Audit Trail)
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Route requirement change, customer back-order..."
              className="w-full px-3 py-2 text-xs rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-accent-500"
            />
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-xs text-red-700 dark:text-red-300 flex items-center gap-2">
              <AlertCircle size={15} className="flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Actions */}
          <div className="pt-2 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold rounded-xl border border-gray-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-1.5 px-5 py-2 text-xs font-bold rounded-xl bg-accent-600 hover:bg-accent-700 text-white shadow-md shadow-accent-600/20 active:scale-95 disabled:opacity-50 transition-all cursor-pointer"
            >
              <Check size={14} />
              <span>Apply Adjustment</span>
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}

