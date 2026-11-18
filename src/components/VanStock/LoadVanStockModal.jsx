/**
 * @file LoadVanStockModal.jsx
 * @description Multi-Item Store-to-Vehicle loading transfer modal.
 * Features batch SKU selection via Combobox, real-time stock balance previews,
 * auto-fill par restock shortcuts, and atomic multi-item transfer dispatch.
 */

import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Truck,
  ArrowRight,
  Package,
  AlertCircle,
  Plus,
  Trash2,
  Check,
  Sparkles,
  ChevronsUp,
} from 'lucide-react';
import { toast } from 'react-toastify';
import Combobox from '@/components/ui/combobox';
import useVanStockStore from '../../hooks/useVanStockStore';
import {
  calcNetUnitPrice,
  calcTotalRealValue,
  calcRestockNeeded,
  formatLKR,
} from '../../data/vanStockData';

export default function LoadVanStockModal({ isOpen, onClose, initialProductId = null, onSuccess = null }) {
  const products = useVanStockStore((s) => s.products);
  const mainStoreStock = useVanStockStore((s) => s.mainStoreStock);
  const vanStock = useVanStockStore((s) => s.vanStock);
  const vehicle = useVanStockStore((s) => s.vehicle);
  const loadVanStock = useVanStockStore((s) => s.loadVanStock);

  const [items, setItems] = useState([]);
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Sync initial product if passed
  useEffect(() => {
    if (isOpen) {
      setNotes('');
      setError('');

      if (initialProductId) {
        const prodId = Number(initialProductId);
        const prod = products.find((p) => p.id === prodId);
        const whItem = mainStoreStock.find((m) => m.productId === prodId);
        const vItem = vanStock.find((v) => v.productId === prodId);

        if (prod) {
          const whQty = whItem ? whItem.quantity : 0;
          const currentVan = vItem ? vItem.quantity : 0;
          const targetPar = vItem?.targetCapacity || prod.targetCapacity || 100;
          const defaultQty = 1;
          const net = calcNetUnitPrice(prod.basePrice, prod.companyDiscountPercent);

          setItems([
            {
              productId: prodId,
              productName: prod.name,
              sku: prod.sku,
              unit: prod.unit || 'Units',
              whQty,
              currentVan,
              targetPar,
              quantity: defaultQty,
              unitPrice: net,
            },
          ]);
        } else {
          setItems([]);
        }
      } else {
        setItems([]);
      }
    }
  }, [isOpen, initialProductId, products, mainStoreStock, vanStock]);

  const productOptions = useMemo(
    () =>
      products
        .filter((p) => p.isActive !== false)
        .map((p) => {
          const wh = mainStoreStock.find((m) => m.productId === p.id);
          const whQty = wh ? wh.quantity : 0;
          const v = vanStock.find((item) => item.productId === p.id);
          const vQty = v ? v.quantity : 0;
          const net = calcNetUnitPrice(p.basePrice, p.companyDiscountPercent);

          return {
            value: String(p.id),
            label: p.name,
            subtitle: `SKU: ${p.sku} • WH Avail: ${whQty} ${p.unit} • Van: ${vQty} • Net: Rs. ${net.toFixed(2)}`,
          };
        }),
    [products, mainStoreStock, vanStock]
  );

  const handleAddItem = (productId) => {
    if (!productId) return;
    const prodId = Number(productId);
    if (items.some((i) => i.productId === prodId)) {
      toast.info('Item already added to load batch. Adjust quantity below.');
      return;
    }
    const prod = products.find((p) => p.id === prodId);
    if (!prod) return;

    const whItem = mainStoreStock.find((m) => m.productId === prodId);
    const whQty = whItem ? whItem.quantity : 0;
    const vItem = vanStock.find((v) => v.productId === prodId);
    const currentVan = vItem ? vItem.quantity : 0;
    const targetPar = vItem?.targetCapacity || prod.targetCapacity || 100;
    const defaultQty = 1;
    const net = calcNetUnitPrice(prod.basePrice, prod.companyDiscountPercent);

    setItems((prev) => [
      ...prev,
      {
        productId: prodId,
        productName: prod.name,
        sku: prod.sku,
        unit: prod.unit || 'Units',
        whQty,
        currentVan,
        targetPar,
        quantity: defaultQty,
        unitPrice: net,
      },
    ]);
  };

  const handleUpdateQty = (productId, qty) => {
    const val = Number(qty);
    setItems((prev) =>
      prev.map((i) => {
        if (i.productId === productId) {
          return { ...i, quantity: Math.max(1, val) };
        }
        return i;
      })
    );
  };

  const handleRemoveItem = (productId) => {
    setItems((prev) => prev.filter((i) => i.productId !== productId));
  };

  const totalLoadUnits = useMemo(
    () => items.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0),
    [items]
  );

  const totalLoadValue = useMemo(
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
      setError('Please add at least one product to load.');
      return;
    }

    for (const item of items) {
      if (!item.quantity || item.quantity <= 0) {
        setError(`Quantity for ${item.productName} must be greater than zero.`);
        return;
      }
      if (item.quantity > item.whQty) {
        setError(
          `Cannot load more than available warehouse stock for ${item.productName} (Available: ${item.whQty} ${item.unit}).`
        );
        return;
      }
    }

    setIsSubmitting(true);
    try {
      await loadVanStock({
        vehicleId: vehicle?.id || 'VAN-01',
        items: items.map((i) => ({
          productId: i.productId,
          quantity: i.quantity,
          notes: notes.trim(),
        })),
        repName: vehicle?.repName || 'Kamal Perera',
        notes: notes.trim(),
      });

      if (typeof onSuccess === 'function') {
        await onSuccess();
      }

      onClose();

      toast.success(
        `Successfully loaded ${totalLoadUnits} unit(s) across ${items.length} SKU(s) into Van.`
      );
    } catch (err) {
      setError(err.message || 'Failed to complete stock load.');
      toast.error(err.message || 'Failed to load stock.');
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
            <div className="p-2.5 rounded-xl bg-accent-50 dark:bg-accent-950/60 text-accent-600 dark:text-accent-400 border border-accent-200/50 dark:border-accent-800/50">
              <Truck size={20} />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>Load Stock to Van</span>
                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-accent-100 dark:bg-accent-900/40 text-accent-700 dark:text-accent-300">
                  Warehouse &rarr; Van
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Transfer inventory from Central Warehouse into Van
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
              Transfer Dispatch Notes (Optional)
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Morning replenishment dispatch, route restock..."
              className="w-full px-3 py-2 text-xs rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-accent-500"
            />
          </div>

          {/* Product Search Combobox */}
          <div className="overflow-visible relative z-30">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1.5">
              Search & Add Products from Warehouse Catalog
            </label>
            <Combobox
              options={productOptions}
              value=""
              onChange={handleAddItem}
              placeholder="Search SKU or product name to add to load batch..."
              emptyText="No matching products found"
              className="w-full"
            />
          </div>

          {/* Batch Table */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-semibold px-1">
              <span>Selected Products to Load ({items.length})</span>
              <span>WH Avail &rarr; Load Quantity</span>
            </div>

            {items.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400 border-2 border-dashed border-gray-200 dark:border-slate-700 rounded-xl">
                <Package className="w-8 h-8 mx-auto mb-1.5 opacity-40 text-accent-500" />
                <p>No products selected. Use the search box above to add items to this load batch.</p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-slate-700">
                <table className="w-full border-collapse text-left text-xs">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/60 text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 tracking-wider">
                      <th className="py-2.5 px-3">Product / SKU</th>
                      <th className="py-2.5 px-2 text-center">WH Avail</th>
                      <th className="py-2.5 px-2 text-center">Van On-Hand</th>
                      <th className="py-2.5 px-2 text-center">Load Qty</th>
                      <th className="py-2.5 px-3 text-right">Unit Net</th>
                      <th className="py-2.5 px-3 text-right">Subtotal</th>
                      <th className="py-2.5 px-2 text-center">Remove</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-slate-700/60">
                    {items.map((item) => {
                      const lineTotal = calcTotalRealValue(item.unitPrice, item.quantity);
                      const isOver = item.quantity > item.whQty;
                      return (
                        <tr
                          key={item.productId}
                          className="hover:bg-slate-50/50 dark:hover:bg-slate-700/30 transition-colors"
                        >
                          <td className="py-2.5 px-3">
                            <p className="font-bold text-slate-900 dark:text-white truncate max-w-[170px] sm:max-w-xs">
                              {item.productName}
                            </p>
                            <span className="text-[10px] font-mono text-slate-400">{item.sku}</span>
                          </td>
                          <td className="py-2.5 px-2 text-center font-mono">
                            <span className={`font-semibold ${item.whQty > 0 ? 'text-slate-700 dark:text-slate-300' : 'text-rose-600'}`}>
                              {item.whQty} {item.unit}
                            </span>
                          </td>
                          <td className="py-2.5 px-2 text-center font-mono text-slate-500 dark:text-slate-400">
                            {item.currentVan} / {item.targetPar}
                          </td>
                          <td className="py-2.5 px-2 text-center">
                            <div className="inline-flex items-center gap-1 justify-center">
                              <input
                                type="number"
                                min="1"
                                max={item.whQty}
                                value={item.quantity}
                                onChange={(e) => handleUpdateQty(item.productId, e.target.value)}
                                className={`w-16 px-2 py-1 text-center font-bold font-mono rounded-lg border ${
                                  isOver
                                    ? 'border-rose-500 bg-rose-50 text-rose-700'
                                    : 'border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white'
                                } focus:outline-none focus:ring-1 focus:ring-accent-500`}
                              />
                              <button
                                type="button"
                                onClick={() => handleUpdateQty(item.productId, item.whQty)}
                                disabled={item.whQty <= 0}
                                className="p-1 rounded-lg border border-gray-200 dark:border-slate-700 text-slate-500 hover:text-accent-600 hover:border-accent-400 hover:bg-accent-50 dark:hover:bg-accent-950/40 transition-colors disabled:opacity-30 disabled:pointer-events-none"
                                title="Fill all available qty"
                              >
                                <ChevronsUp size={14} />
                              </button>
                            </div>
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

        {/* Summary Footer */}
        <div className="p-4 sm:p-5 border-t border-gray-100 dark:border-slate-700/80 bg-slate-50/70 dark:bg-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-4 text-xs">
            <div>
              <span className="text-slate-500 dark:text-slate-400 block text-[10px] uppercase font-bold">
                Total SKUs
              </span>
              <span className="font-bold font-mono text-slate-800 dark:text-slate-200">
                {items.length} SKU{items.length === 1 ? '' : 's'} ({totalLoadUnits} units)
              </span>
            </div>
            <div className="h-6 w-px bg-gray-200 dark:bg-slate-700" />
            <div>
              <span className="text-slate-500 dark:text-slate-400 block text-[10px] uppercase font-bold">
                Transfer Valuation
              </span>
              <span className="font-bold font-mono text-accent-600 dark:text-accent-400 text-sm">
                {formatLKR(totalLoadValue)}
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
              <span>{isSubmitting ? 'Transferring...' : 'Load into Van'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
