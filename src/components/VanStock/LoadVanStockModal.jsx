/**
 * @file LoadVanStockModal.jsx
 * @description Modal for atomic Store-to-Vehicle loading transfer.
 * Features SmartCombobox product selection, real-time stock balance previews,
 * and portal rendering with mobile bottom-sheet styling.
 */

import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { X, Truck, ArrowRight, Package, AlertCircle } from 'lucide-react';
import { toast } from 'react-toastify';
import SmartCombobox from '../ui/SmartCombobox';
import useVanStockStore from '../../hooks/useVanStockStore';
import {
  calcNetUnitPrice,
  calcTotalRealValue,
  calcRestockNeeded,
  formatLKR,
} from '../../data/vanStockData';

export default function LoadVanStockModal({ isOpen, onClose, initialProductId = null }) {
  const products = useVanStockStore((s) => s.products);
  const mainStoreStock = useVanStockStore((s) => s.mainStoreStock);
  const vanStock = useVanStockStore((s) => s.vanStock);
  const vehicle = useVanStockStore((s) => s.vehicle);
  const loadVanStock = useVanStockStore((s) => s.loadVanStock);

  const [selectedProductId, setSelectedProductId] = useState(initialProductId ? String(initialProductId) : '');
  const [quantity, setQuantity] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Sync initial product if passed
  useEffect(() => {
    if (isOpen) {
      setSelectedProductId(initialProductId ? String(initialProductId) : '');
      setQuantity('');
      setNotes('');
      setError('');
    }
  }, [isOpen, initialProductId]);

  const selectedProduct = useMemo(
    () => products.find((p) => String(p.id) === String(selectedProductId)),
    [products, selectedProductId]
  );

  const warehouseItem = useMemo(
    () => mainStoreStock.find((m) => String(m.productId) === String(selectedProductId)),
    [mainStoreStock, selectedProductId]
  );

  const vanItem = useMemo(
    () => vanStock.find((v) => String(v.productId) === String(selectedProductId)),
    [vanStock, selectedProductId]
  );

  const availableWarehouseStock = warehouseItem ? warehouseItem.quantity : 0;
  const currentVanStock = vanItem ? vanItem.quantity : 0;
  const targetPar = vanItem?.targetCapacity || selectedProduct?.targetCapacity || 100;
  const restockNeeded = calcRestockNeeded(targetPar, currentVanStock);

  const netUnitPrice = selectedProduct
    ? calcNetUnitPrice(selectedProduct.basePrice, selectedProduct.companyDiscountPercent)
    : 0;

  const parsedQty = Math.max(0, Number(quantity) || 0);
  const totalTransferValue = calcTotalRealValue(netUnitPrice, parsedQty);
  const projectedWarehouseStock = Math.max(0, availableWarehouseStock - parsedQty);
  const projectedVanStock = currentVanStock + parsedQty;

  const productOptions = useMemo(
    () =>
      products.map((p) => {
        const wh = mainStoreStock.find((m) => String(m.productId) === String(p.id));
        const whQty = wh ? wh.quantity : 0;
        return {
          value: String(p.id),
          label: p.name,
          subtitle: `SKU: ${p.sku} • Warehouse Avail: ${whQty} ${p.unit} • Base: Rs. ${p.basePrice}`,
          count: `${whQty} in stock`,
        };
      }),
    [products, mainStoreStock]
  );

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    if (!selectedProductId) {
      setError('Please select a product to transfer.');
      return;
    }

    if (parsedQty <= 0) {
      setError('Quantity must be greater than zero.');
      return;
    }

    if (parsedQty > availableWarehouseStock) {
      setError(
        `Insufficient warehouse stock. Available: ${availableWarehouseStock} ${selectedProduct?.unit || 'units'}.`
      );
      return;
    }

    setIsSubmitting(true);
    try {
      loadVanStock({
        productId: Number(selectedProductId),
        quantity: parsedQty,
        repName: vehicle.repName || 'Kamal Perera',
        notes: notes.trim(),
      });
      toast.success(
        `Successfully loaded ${parsedQty} ${selectedProduct?.unit || 'units'} to ${vehicle.id} (${vehicle.plateNumber}).`
      );
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to complete stock load.');
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
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-accent-50 dark:bg-accent-900/30 border border-accent-200 dark:border-accent-700/60 flex items-center justify-center text-accent-600 dark:text-accent-400">
              <Truck size={20} />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Load Stock into Field Van
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Transfer from Central Warehouse to {vehicle.id} ({vehicle.plateNumber})
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
            <div className="flex items-start gap-2.5 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs font-medium">
              <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Product Combobox */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Select Product SKU <span className="text-rose-500">*</span>
            </label>
            <SmartCombobox
              portal={true}
              placeholder="Search by SKU, product name, or category..."
              options={productOptions}
              value={selectedProductId}
              onSelect={(opt) => {
                setSelectedProductId(opt.value);
                setError('');
              }}
            />
          </div>

          {/* Stock Metrics Card when Product is Selected */}
          {selectedProduct && (
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700/60 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500 dark:text-slate-400">Master SKU:</span>
                <span className="font-mono font-semibold text-slate-900 dark:text-white">
                  {selectedProduct.sku}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-2 border-t border-slate-200/60 dark:border-slate-700/60 text-xs">
                <div>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 block">Warehouse Avail</span>
                  <span className={`font-bold ${availableWarehouseStock > 0 ? 'text-slate-900 dark:text-white' : 'text-rose-600'}`}>
                    {availableWarehouseStock} {selectedProduct.unit}
                  </span>
                </div>
                <div>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 block">Van On-Hand</span>
                  <span className="font-bold text-slate-900 dark:text-white">
                    {currentVanStock} / {targetPar} {selectedProduct.unit}
                  </span>
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 block">Suggested Par Restock</span>
                  <span className={`font-bold ${restockNeeded > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                    {restockNeeded > 0 ? `+${restockNeeded} ${selectedProduct.unit}` : 'Par Satisfied'}
                  </span>
                </div>
              </div>

              {/* Quick Fill Restock Par Button */}
              {restockNeeded > 0 && availableWarehouseStock > 0 && (
                <button
                  type="button"
                  onClick={() => setQuantity(String(Math.min(restockNeeded, availableWarehouseStock)))}
                  className="w-full text-xs font-medium py-1.5 px-3 rounded-lg bg-accent-50 dark:bg-accent-900/20 text-accent-700 dark:text-accent-300 hover:bg-accent-100 transition-colors border border-accent-200 dark:border-accent-800"
                >
                  ⚡ Autofill Par Restock ({Math.min(restockNeeded, availableWarehouseStock)} {selectedProduct.unit})
                </button>
              )}
            </div>
          )}

          {/* Transfer Quantity */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Quantity to Load ({selectedProduct?.unit || 'Units'}) <span className="text-rose-500">*</span>
              </label>
              {availableWarehouseStock > 0 && (
                <button
                  type="button"
                  onClick={() => setQuantity(String(availableWarehouseStock))}
                  className="text-[11px] font-semibold text-accent-600 hover:underline"
                >
                  Max Available ({availableWarehouseStock})
                </button>
              )}
            </div>
            <input
              type="number"
              min="1"
              max={availableWarehouseStock}
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder="Enter transfer quantity..."
              className="w-full px-3.5 py-2.5 text-base sm:text-sm rounded-xl border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-accent-500"
            />
          </div>

          {/* Dynamic Transfer Projection Bar */}
          {selectedProduct && parsedQty > 0 && (
            <div className="p-3.5 rounded-xl bg-accent-50/50 dark:bg-accent-950/20 border border-accent-200/60 dark:border-accent-800/40 text-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-slate-600 dark:text-slate-400">Net Unit Price:</span>
                <span className="font-semibold text-slate-900 dark:text-white">
                  {formatLKR(netUnitPrice)}
                </span>
              </div>
              <div className="flex items-center justify-between font-bold text-accent-700 dark:text-accent-300">
                <span>Total Loaded Value:</span>
                <span>{formatLKR(totalTransferValue)}</span>
              </div>
              <div className="flex items-center justify-between pt-1 border-t border-accent-200/40 dark:border-accent-800/40 text-[11px] text-slate-500 dark:text-slate-400">
                <span>Warehouse Post-Balance: {projectedWarehouseStock} {selectedProduct.unit}</span>
                <span>Van Post-Balance: {projectedVanStock} {selectedProduct.unit}</span>
              </div>
            </div>
          )}

          {/* Notes / Dispatch Reference */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Dispatch Notes / Manifest Reference (Optional)
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Morning dispatch for Morawaka weekly run..."
              className="w-full px-3.5 py-2 text-base sm:text-sm rounded-xl border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-accent-500"
            />
          </div>

          {/* Footer Controls */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100 dark:border-slate-700">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-semibold rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || parsedQty <= 0 || parsedQty > availableWarehouseStock}
              className="flex items-center gap-2 px-5 py-2.5 text-xs font-bold rounded-xl bg-accent-600 hover:bg-accent-700 active:scale-95 text-white shadow-md shadow-accent-600/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              <Truck size={14} />
              <span>{isSubmitting ? 'Transferring...' : 'Confirm Load to Van'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}

