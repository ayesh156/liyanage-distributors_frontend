/**
 * @file AddVanStockModal.jsx
 * @description Rapid mobile-first touch transfer modal for van loading.
 * Features quick-stepper tap buttons (+1, +5, +10, +25, +50), numeric keypad support,
 * and high-contrast touch ergonomics for mobile dispatchers.
 */

import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { X, Plus, Zap, Check, AlertCircle } from 'lucide-react';
import { toast } from 'react-toastify';
import SmartCombobox from '../ui/SmartCombobox';
import useVanStockStore from '../../hooks/useVanStockStore';
import { calcNetUnitPrice, calcTotalRealValue, formatLKR } from '../../data/vanStockData';

export default function AddVanStockModal({ isOpen, onClose }) {
  const products = useVanStockStore((s) => s.products);
  const mainStoreStock = useVanStockStore((s) => s.mainStoreStock);
  const vanStock = useVanStockStore((s) => s.vanStock);
  const vehicle = useVanStockStore((s) => s.vehicle);
  const loadVanStock = useVanStockStore((s) => s.loadVanStock);

  const [productId, setProductId] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setQuantity(1);
      setError('');
    }
  }, [isOpen]);

  const selectedProduct = useMemo(
    () => products.find((p) => String(p.id) === String(productId)),
    [products, productId]
  );

  const warehouseItem = useMemo(
    () => mainStoreStock.find((m) => String(m.productId) === String(productId)),
    [mainStoreStock, productId]
  );

  const availableWarehouseStock = warehouseItem ? warehouseItem.quantity : 0;
  const netPrice = selectedProduct
    ? calcNetUnitPrice(selectedProduct.basePrice, selectedProduct.companyDiscountPercent)
    : 0;

  const productOptions = useMemo(
    () =>
      products.map((p) => {
        const wh = mainStoreStock.find((m) => m.productId === p.id);
        const whQty = wh ? wh.quantity : 0;
        return {
          value: String(p.id),
          label: p.name,
          subtitle: `SKU: ${p.sku} • Avail: ${whQty} ${p.unit}`,
        };
      }),
    [products, mainStoreStock]
  );

  const handleQuickAdd = (inc) => {
    setQuantity((prev) => Math.min(availableWarehouseStock, (Number(prev) || 0) + inc));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!productId) {
      setError('Select a product to load.');
      return;
    }
    const qty = Number(quantity);
    if (qty <= 0) {
      setError('Quantity must be at least 1.');
      return;
    }
    if (qty > availableWarehouseStock) {
      setError(`Only ${availableWarehouseStock} available in warehouse.`);
      return;
    }

    try {
      loadVanStock({
        productId: Number(productId),
        quantity: qty,
        repName: vehicle.repName || 'Kamal Perera',
        notes: 'Rapid mobile touch dispatch',
      });
      toast.success(`Loaded ${qty} ${selectedProduct?.unit || 'units'} into van.`);
      onClose();
    } catch (err) {
      setError(err.message || 'Transfer failed.');
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
        className="w-full sm:max-w-md bg-white dark:bg-slate-800 rounded-t-3xl sm:rounded-2xl border border-gray-200 dark:border-slate-700 shadow-2xl overflow-hidden flex flex-col max-h-[92vh] pb-safe animate-in slide-in-from-bottom sm:zoom-in-95 duration-200"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/80">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-accent-50 dark:bg-accent-900/30 flex items-center justify-center text-accent-600 dark:text-accent-400">
              <Zap size={18} />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Quick Van Load</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Touch-optimized stock transfer</p>
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
            <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 text-rose-700 dark:text-rose-300 text-xs">
              <AlertCircle size={15} />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Product SKU
            </label>
            <SmartCombobox
              portal={true}
              placeholder="Search SKU or item name..."
              options={productOptions}
              value={productId}
              onSelect={(opt) => {
                setProductId(opt.value);
                setError('');
              }}
            />
          </div>

          {selectedProduct && (
            <div className="flex items-center justify-between text-xs px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400">
              <span>Warehouse Stock: <strong>{availableWarehouseStock} {selectedProduct.unit}</strong></span>
              <span>Net Unit: <strong>{formatLKR(netPrice)}</strong></span>
            </div>
          )}

          {/* Stepper Input */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Quantity to Transfer
            </label>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setQuantity((q) => Math.max(1, (Number(q) || 1) - 1))}
                className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 flex items-center justify-center text-slate-700 dark:text-white font-bold text-lg transition-colors active:scale-95"
              >
                -
              </button>
              <input
                type="number"
                min="1"
                max={availableWarehouseStock || 9999}
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, Number(e.target.value) || 1))}
                className="flex-1 h-12 text-center text-xl font-bold rounded-xl border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-accent-500"
              />
              <button
                type="button"
                onClick={() => setQuantity((q) => Math.min(availableWarehouseStock || 9999, (Number(q) || 1) + 1))}
                className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 flex items-center justify-center text-slate-700 dark:text-white font-bold text-lg transition-colors active:scale-95"
              >
                +
              </button>
            </div>
          </div>

          {/* Quick Increment Chips */}
          <div className="flex items-center gap-2 flex-wrap">
            {[1, 5, 10, 25, 50].map((inc) => (
              <button
                key={inc}
                type="button"
                onClick={() => handleQuickAdd(inc)}
                disabled={!availableWarehouseStock || quantity + inc > availableWarehouseStock}
                className="flex-1 min-w-[50px] py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 hover:bg-accent-50 dark:hover:bg-accent-950/30 text-xs font-semibold text-slate-700 dark:text-slate-300 transition-colors disabled:opacity-40"
              >
                +{inc}
              </button>
            ))}
          </div>

          {selectedProduct && (
            <div className="pt-2 text-right">
              <span className="text-xs text-slate-500">Total Value: </span>
              <strong className="text-sm text-accent-600 dark:text-accent-400 font-mono">
                {formatLKR(calcTotalRealValue(netPrice, quantity))}
              </strong>
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100 dark:border-slate-700">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!productId || !quantity || quantity > availableWarehouseStock}
              className="flex items-center gap-2 px-5 py-2.5 text-xs font-bold rounded-xl bg-accent-600 hover:bg-accent-700 text-white disabled:opacity-50 transition-all active:scale-95 shadow-md shadow-accent-600/20"
            >
              <Check size={15} />
              <span>Load Now</span>
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}

