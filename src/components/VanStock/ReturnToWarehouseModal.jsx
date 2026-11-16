/**
 * @file ReturnToWarehouseModal.jsx
 * @description Multi-Item Vehicle-to-Warehouse Unsold Stock Return Modal.
 * Replicates the multi-item table layout from VehicleSalesModal and LogDamagedGoodsModal.
 * Enables searching, selecting multiple SKUs, setting return quantities, and submitting as a batch.
 */

import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  RotateCcw,
  CornerDownLeft,
  Plus,
  Trash2,
  AlertCircle,
  Warehouse,
  Truck,
  Check,
} from 'lucide-react';
import { toast } from 'react-toastify';
import Combobox from '@/components/ui/combobox';
import useVanStockStore from '../../hooks/useVanStockStore';
import { calcNetUnitPrice, calcTotalRealValue, formatLKR } from '../../data/vanStockData';

export default function ReturnToWarehouseModal({
  isOpen,
  onClose,
  initialProductId = null,
  initialProduct = null,
}) {
  const vanStock = useVanStockStore((s) => s.vanStock);
  const vehicle = useVanStockStore((s) => s.vehicle);
  const returnToStore = useVanStockStore((s) => s.returnToStore);

  const [items, setItems] = useState([]);
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Available items on van with quantity > 0
  const availableVanItems = useMemo(
    () => vanStock.filter((v) => v.quantity > 0),
    [vanStock]
  );

  const effectiveInitialProductId =
    initialProductId || initialProduct?.productId || initialProduct?.id || null;

  useEffect(() => {
    if (isOpen) {
      setNotes('');
      setError('');

      if (effectiveInitialProductId) {
        const prodId = Number(effectiveInitialProductId);
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
  }, [isOpen, effectiveInitialProductId, vanStock, initialProduct]);

  // Options for product selection combobox
  const productOptions = useMemo(
    () =>
      availableVanItems.map((v) => {
        const net = calcNetUnitPrice(v.basePrice, v.companyDiscountPercent);
        return {
          value: String(v.productId),
          label: v.productName,
          subtitle: `SKU: ${v.sku} • On-Hand: ${v.quantity} ${v.unit} • Net: Rs. ${net.toFixed(2)}`,
        };
      }),
    [availableVanItems]
  );

  const handleAddItem = (productId) => {
    if (!productId) return;
    const prodId = Number(productId);
    if (items.some((i) => i.productId === prodId)) {
      toast.info('Item already in return batch. Adjust quantity below.');
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

  const totalReturnUnits = useMemo(
    () => items.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0),
    [items]
  );

  const totalReturnValue = useMemo(
    () =>
      items.reduce(
        (sum, item) => sum + calcTotalRealValue(item.unitPrice, Number(item.quantity) || 0),
        0
      ),
    [items]
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (items.length === 0) {
      setError('Please add at least one item to return.');
      return;
    }

    for (const item of items) {
      if (!item.quantity || item.quantity <= 0) {
        setError(`Quantity for ${item.productName} must be greater than zero.`);
        return;
      }
      if (item.quantity > item.maxQty) {
        setError(
          `Cannot return more than available on van for ${item.productName} (Max: ${item.maxQty}).`
        );
        return;
      }
    }

    setIsSubmitting(true);
    try {
      await returnToStore({
        vehicleId: vehicle?.id || 'VAN-01',
        items: items.map((i) => ({
          productId: i.productId,
          quantity: i.quantity,
        })),
        reason: notes.trim() || 'Vehicle stock return',
        notes: notes.trim(),
        performedBy: vehicle?.repName || 'Kamal Perera',
      });

      toast.success(
        `Returned ${totalReturnUnits} unit(s) across ${items.length} SKU(s) to Central Warehouse.`
      );
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to submit batch return to warehouse.');
      toast.error(err.message || 'Failed to submit return.');
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
      <div className="w-full sm:max-w-3xl bg-white dark:bg-slate-800 rounded-t-3xl sm:rounded-2xl border border-gray-200 dark:border-slate-700 shadow-2xl overflow-hidden flex flex-col max-h-[92vh] pb-safe animate-in slide-in-from-bottom sm:zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-gray-100 dark:border-slate-700/80 bg-slate-50/50 dark:bg-slate-800/50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-200/50 dark:border-blue-800/50">
              <CornerDownLeft size={20} />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>Return to Warehouse</span>
                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300">
                  {vehicle?.id || 'VAN-01'} &rarr; LOC_MAIN
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Batch return unsold good-condition stock back to Central Warehouse buffer
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {/* Notes input */}
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-gray-200 dark:border-slate-700">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
              Additional Notes (Optional)
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. End of day route return, verified count..."
              className="w-full px-3 py-2 text-xs rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-accent-500"
            />
          </div>

          {/* Product Search & Multi-Selection Combobox */}
          <div className="overflow-visible relative z-30">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1.5">
              Search & Add Items from Van On-Hand ({availableVanItems.length} SKUs Available)
            </label>
            <Combobox
              options={productOptions}
              value=""
              onChange={handleAddItem}
              placeholder="Search by SKU or item name to add to return batch..."
              emptyText="No matching van stock items found"
              className="w-full"
            />
          </div>

          {/* Batch Table */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-semibold px-1">
              <span>Return Batch Items ({items.length})</span>
              <span>Available Van &rarr; Return Qty</span>
            </div>

            {items.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400 border-2 border-dashed border-gray-200 dark:border-slate-700 rounded-xl">
                <Truck className="w-8 h-8 mx-auto mb-1.5 opacity-40 text-blue-500" />
                <p>No products added yet. Select products above to return to warehouse.</p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-slate-700">
                <table className="w-full border-collapse text-left text-xs">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/60 text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 tracking-wider">
                      <th className="py-2.5 px-3">Product / SKU</th>
                      <th className="py-2.5 px-2 text-center">On-Hand</th>
                      <th className="py-2.5 px-2 text-center">Return Qty</th>
                      <th className="py-2.5 px-3 text-right">Unit Net</th>
                      <th className="py-2.5 px-3 text-right">Subtotal</th>
                      <th className="py-2.5 px-2 text-center">Remove</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-slate-700/60">
                    {items.map((item) => {
                      const lineTotal = calcTotalRealValue(item.unitPrice, item.quantity);
                      return (
                        <tr
                          key={item.productId}
                          className="hover:bg-slate-50/50 dark:hover:bg-slate-700/30 transition-colors"
                        >
                          <td className="py-2.5 px-3">
                            <p className="font-bold text-slate-900 dark:text-white truncate max-w-[180px] sm:max-w-xs">
                              {item.productName}
                            </p>
                            <span className="text-[10px] font-mono text-slate-400">{item.sku}</span>
                          </td>
                          <td className="py-2.5 px-2 text-center font-mono text-slate-600 dark:text-slate-300">
                            {item.maxQty} {item.unit}
                          </td>
                          <td className="py-2.5 px-2 text-center">
                            <input
                              type="number"
                              min="1"
                              max={item.maxQty}
                              value={item.quantity}
                              onChange={(e) => handleUpdateQty(item.productId, e.target.value)}
                              className="w-16 px-2 py-1 text-center font-bold font-mono rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-accent-500"
                            />
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono text-slate-600 dark:text-slate-300">
                            {formatLKR(item.unitPrice)}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900 dark:text-white">
                            {formatLKR(lineTotal)}
                          </td>
                          <td className="py-2.5 px-2 text-center">
                            <button
                              type="button"
                              onClick={() => handleRemoveItem(item.productId)}
                              className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                              title="Remove item"
                            >
                              <Trash2 size={14} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle size={15} />
              <span>{error}</span>
            </div>
          )}
        </form>

        {/* Sticky Footer Summary Bar */}
        <div className="p-4 sm:p-5 border-t border-gray-100 dark:border-slate-700/80 bg-slate-50/70 dark:bg-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-4 text-xs">
            <div>
              <span className="text-slate-500 dark:text-slate-400 block text-[10px] uppercase font-bold">
                Total Items
              </span>
              <span className="font-bold font-mono text-slate-800 dark:text-slate-200">
                {items.length} SKU{items.length === 1 ? '' : 's'} ({totalReturnUnits} units)
              </span>
            </div>
            <div className="h-6 w-px bg-gray-200 dark:bg-slate-700" />
            <div>
              <span className="text-slate-500 dark:text-slate-400 block text-[10px] uppercase font-bold">
                Return Valuation
              </span>
              <span className="font-bold font-mono text-emerald-600 dark:text-emerald-400 text-sm">
                {formatLKR(totalReturnValue)}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1 sm:flex-none px-4 py-2.5 text-xs font-bold rounded-xl border border-gray-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting || items.length === 0}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2.5 text-xs font-bold rounded-xl bg-accent-600 hover:bg-accent-700 disabled:opacity-50 text-white shadow-sm transition-all cursor-pointer whitespace-nowrap active:scale-95"
            >
              <Check size={15} />
              <span>{isSubmitting ? 'Processing Return...' : 'Confirm Return to Warehouse'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
