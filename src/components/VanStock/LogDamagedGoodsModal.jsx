/**
 * @file LogDamagedGoodsModal.jsx
 * @description Quarantined defective return & loss logging modal.
 * Streamlined layout focused strictly on Item, Qty, and Reason without UI clutter.
 */

import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { X, AlertTriangle, AlertCircle, Check, Trash2, Package } from 'lucide-react';
import { toast } from 'react-toastify';
import Combobox from '@/components/ui/combobox';
import useVanStockStore from '../../hooks/useVanStockStore';
import { calcNetUnitPrice, calcTotalRealValue, formatLKR } from '../../data/vanStockData';

export default function LogDamagedGoodsModal({
  isOpen,
  onClose,
  initialProductId = null,
  initialProduct = null,
}) {
  const vanStock = useVanStockStore((s) => s.vanStock);
  const vehicle = useVanStockStore((s) => s.vehicle);
  const dailyManifest = useVanStockStore((s) => s.dailyManifest);
  const logDamagedGoods = useVanStockStore((s) => s.logDamagedGoods);

  const [items, setItems] = useState([]);
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Available sellable items on the van
  const availableVanItems = useMemo(
    () => vanStock.filter((v) => v.quantity > 0),
    [vanStock]
  );

  const effectiveProductId =
    initialProductId || initialProduct?.productId || initialProduct?.id || null;

  useEffect(() => {
    if (isOpen) {
      setError('');
      setNotes('');
      if (effectiveProductId) {
        const prodId = Number(effectiveProductId);
        const vanItem =
          vanStock.find((v) => Number(v.productId) === prodId) ||
          (initialProduct && Number(initialProduct.productId || initialProduct.id) === prodId
            ? initialProduct
            : null);

        if (vanItem && (vanItem.quantity > 0 || (vanItem.maxQty && vanItem.maxQty > 0))) {
          const netPrice = calcNetUnitPrice(vanItem.basePrice, vanItem.companyDiscountPercent);
          setItems([
            {
              productId: prodId,
              productName: vanItem.productName || vanItem.name,
              sku: vanItem.sku,
              unit: vanItem.unit || 'Units',
              maxQty: vanItem.quantity || vanItem.maxQty || 1,
              quantity: 1,
              unitPrice: netPrice,
            },
          ]);
        } else {
          setItems([]);
        }
      } else {
        setItems([]);
      }
    }
  }, [isOpen, effectiveProductId, vanStock, initialProduct]);

  const productOptions = useMemo(
    () =>
      availableVanItems.map((v) => {
        const net = calcNetUnitPrice(v.basePrice, v.companyDiscountPercent);
        return {
          value: String(v.productId),
          label: v.productName,
          subtitle: `SKU: ${v.sku} • On-Hand: ${v.quantity} ${v.unit} • Unit: Rs. ${net.toFixed(2)}`,
        };
      }),
    [availableVanItems]
  );

  const handleAddItem = (productId) => {
    if (!productId) return;
    const prodId = Number(productId);
    if (items.some((i) => i.productId === prodId)) {
      toast.info('Item already added. Adjust quantity or reason below.');
      return;
    }
    const vanItem = vanStock.find((v) => v.productId === prodId);
    if (!vanItem || vanItem.quantity <= 0) return;

    const netPrice = calcNetUnitPrice(vanItem.basePrice, vanItem.companyDiscountPercent);

    setItems((prev) => [
      ...prev,
      {
        productId: prodId,
        productName: vanItem.productName,
        sku: vanItem.sku,
        unit: vanItem.unit,
        maxQty: vanItem.quantity,
        quantity: 1,
        unitPrice: netPrice,
      },
    ]);
  };

  const handleUpdateQty = (productId, qty) => {
    const val = Number(qty);
    setItems((prev) =>
      prev.map((i) => {
        if (i.productId === productId) {
          return { ...i, quantity: Math.max(1, Math.min(i.maxQty, val)) };
        }
        return i;
      })
    );
  };

  const handleRemoveItem = (productId) => {
    setItems((prev) => prev.filter((i) => i.productId !== productId));
  };

  const totalUnits = useMemo(
    () => items.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0),
    [items]
  );

  const totalLoss = useMemo(
    () => items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0),
    [items]
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (items.length === 0) {
      setError('Please add at least one damaged item to log.');
      return;
    }

    setIsSubmitting(true);
    try {
      for (const item of items) {
        await logDamagedGoods({
          productId: Number(item.productId),
          fromLocation: 'VEHICLE',
          quantity: item.quantity,
          reason: notes.trim() || 'Damaged goods transfer',
          notes: notes.trim(),
          reportedBy: vehicle?.repName || 'Admin',
          unitPrice: item.unitPrice,
        });
      }

      toast.warn(`Logged ${totalUnits} damaged item(s) to Quarantine Pool.`);
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to log damaged goods.');
      toast.error(err.message || 'Failed to log damaged goods.');
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
      <div className="w-full sm:max-w-2xl bg-white dark:bg-slate-800 rounded-t-3xl sm:rounded-2xl border border-gray-200 dark:border-slate-700 shadow-2xl overflow-hidden flex flex-col max-h-[90vh] pb-safe animate-in slide-in-from-bottom sm:zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-rose-100 dark:border-rose-900/30 bg-rose-50/50 dark:bg-rose-950/20">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-rose-100 dark:bg-rose-900/40 text-rose-600 dark:text-rose-400">
              <AlertTriangle size={20} />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Log Damaged Goods
              </h3>
              <p className="text-xs text-rose-700 dark:text-rose-400">
                Move damaged items from {vehicle?.id || 'VAN-01'} to Quarantine
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

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1">
          {error && (
            <div className="flex items-start gap-2 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs">
              <AlertCircle size={15} className="flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Notes input */}
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-gray-200 dark:border-slate-700">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
              Additional Notes (Optional)
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Broken packaging, transit defect, routine quarantine..."
              className="w-full px-3 py-2 text-xs rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-500"
            />
          </div>

          {/* Search Item */}
          <div className="overflow-visible relative z-30">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Select Item from Van Stock
            </label>
            <Combobox
              placeholder="Search van on-hand items to log as damaged..."
              options={productOptions}
              value=""
              onChange={handleAddItem}
              emptyMessage="No available van stock found."
              className="w-full"
            />
          </div>

          {/* Items List */}
          {items.length === 0 ? (
            <div className="py-8 text-center text-slate-400 text-xs border-2 border-dashed border-gray-200 dark:border-slate-700 rounded-xl">
              <Package className="w-8 h-8 mx-auto mb-2 opacity-30" />
              No damaged items selected. Search above to add an item.
            </div>
          ) : (
            <div className="border border-gray-200 dark:border-slate-700 rounded-xl overflow-hidden divide-y divide-gray-100 dark:divide-slate-700">
              {items.map((item) => (
                <div
                  key={item.productId}
                  className="p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-800"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800/60">
                        {item.sku}
                      </span>
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                        {item.productName}
                      </h4>
                    </div>

                    <div className="mt-1 flex items-center gap-2">
                      <span className="text-xs font-mono text-slate-500">
                        Loss: {formatLKR(item.quantity * item.unitPrice)}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 self-end sm:self-center">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs text-slate-500 font-semibold">Qty:</span>
                      <input
                        type="number"
                        min="1"
                        max={item.maxQty}
                        value={item.quantity}
                        onChange={(e) => handleUpdateQty(item.productId, e.target.value)}
                        className="w-16 px-2 py-1 text-xs text-center font-bold rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                      />
                      <span className="text-[11px] text-slate-400">/ {item.maxQty}</span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRemoveItem(item.productId)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                      title="Remove"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Loss Summary */}
          {items.length > 0 && (
            <div className="p-3 rounded-xl bg-rose-50/60 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/40 flex items-center justify-between text-xs">
              <span className="text-slate-600 dark:text-slate-400">
                Total Defective: <strong className="text-slate-900 dark:text-white">{totalUnits} units</strong>
              </span>
              <span className="text-slate-600 dark:text-slate-400">
                Financial Loss: <strong className="font-mono text-rose-600 dark:text-rose-400 text-sm">{formatLKR(totalLoss)}</strong>
              </span>
            </div>
          )}

          {/* Footer buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-gray-100 dark:border-slate-700">
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
              disabled={isSubmitting || items.length === 0}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl bg-rose-600 hover:bg-rose-700 active:scale-95 text-white shadow-sm disabled:opacity-50"
            >
              <Check size={14} />
              <span>{isSubmitting ? 'Submitting...' : 'Log Damaged Stock'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
