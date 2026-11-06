/**
 * @file ReturnToStoreModal.jsx
 * @description Vehicle-to-Store unsold stock return modal.
 * Atomically rebalances unsold good condition stock from active van back to
 * Central Warehouse inventory, creating a VEHICLE_TO_STORE_RETURN movement.
 */

import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { X, CornerDownLeft, AlertCircle, Check } from 'lucide-react';
import { toast } from 'react-toastify';
import SmartCombobox from '../ui/SmartCombobox';
import SearchableSelect from '../ui/SearchableSelect';
import useVanStockStore from '../../hooks/useVanStockStore';
import { calcNetUnitPrice, calcTotalRealValue, formatLKR } from '../../data/vanStockData';

const RETURN_REASONS = [
  'Route Completed / End-of-Week Unsold Stock Return',
  'Overstocked Truck Space Rebalancing',
  'Damaged Bin Re-inspection Verification',
  'Customer Order Cancellation Return',
  'Physical Inventory Stocktake Reconciliation',
];

export default function ReturnToStoreModal({
  isOpen,
  onClose,
  initialProductId = null,
  initialProduct = null,
}) {
  const vanStock = useVanStockStore((s) => s.vanStock);
  const products = useVanStockStore((s) => s.products);
  const vehicle = useVanStockStore((s) => s.vehicle);
  const returnToStore = useVanStockStore((s) => s.returnToStore);

  const [productId, setProductId] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [reason, setReason] = useState(RETURN_REASONS[0]);
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Only products currently on the van with quantity > 0
  const availableVanItems = useMemo(
    () => vanStock.filter((v) => v.quantity > 0),
    [vanStock]
  );

  // Derive target product ID from initialProductId or initialProduct object
  const effectiveProductId =
    initialProductId || initialProduct?.productId || initialProduct?.id || null;

  useEffect(() => {
    if (isOpen) {
      // Auto-select row context product if supplied, otherwise leave blank for manual selection
      setProductId(effectiveProductId ? String(effectiveProductId) : '');
      setQuantity('1');
      setReason(RETURN_REASONS[0]);
      setNotes('');
      setError('');
    }
  }, [isOpen, effectiveProductId]);

  const selectedVanItem = useMemo(
    () => vanStock.find((v) => String(v.productId) === String(productId)),
    [vanStock, productId]
  );

  const selectedProduct = useMemo(
    () => products.find((p) => String(p.id) === String(productId)),
    [products, productId]
  );

  const currentVanStock = selectedVanItem ? selectedVanItem.quantity : 0;
  const parsedQty = Math.max(0, Number(quantity) || 0);

  const netUnitPrice = selectedVanItem
    ? calcNetUnitPrice(selectedVanItem.basePrice, selectedVanItem.companyDiscountPercent)
    : 0;

  const totalReturnValue = calcTotalRealValue(netUnitPrice, parsedQty);

  const productOptions = useMemo(
    () =>
      availableVanItems.map((v) => ({
        value: String(v.productId),
        label: v.productName,
        subtitle: `SKU: ${v.sku} • Van On-Hand: ${v.quantity} ${v.unit}`,
      })),
    [availableVanItems]
  );

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    if (!productId) {
      setError('Please select a product to return.');
      return;
    }
    if (parsedQty <= 0) {
      setError('Return quantity must be greater than zero.');
      return;
    }
    if (parsedQty > currentVanStock) {
      setError(
        `Cannot return more than available van on-hand stock (${currentVanStock} ${selectedVanItem?.unit}).`
      );
      return;
    }

    setIsSubmitting(true);
    try {
      returnToStore({
        productId: Number(productId),
        quantity: parsedQty,
        reason: `${reason} — ${notes.trim()}`,
        performedBy: vehicle.repName || 'Kamal Perera',
      });
      toast.success(
        `Returned ${parsedQty} ${selectedVanItem?.unit} from ${vehicle.id} back to Central Warehouse.`
      );
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to return stock to store.');
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
            <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-900/30 flex items-center justify-center text-purple-600 dark:text-purple-400">
              <CornerDownLeft size={20} />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Return Stock to Central Warehouse
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Vehicle-to-Store Unsold Stock Rebalancing
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
              Select Loaded Product SKU <span className="text-rose-500">*</span>
            </label>
            <SmartCombobox
              portal={true}
              placeholder="Search van on-hand products..."
              options={productOptions}
              value={productId}
              onSelect={(opt) => {
                setProductId(opt.value);
                setError('');
              }}
            />
          </div>

          {selectedVanItem && (
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700/60 text-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-slate-500 dark:text-slate-400">Current Van On-Hand:</span>
                <span className="font-bold text-slate-900 dark:text-white">
                  {currentVanStock} {selectedVanItem.unit}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 dark:text-slate-400">Net Valuation per Unit:</span>
                <span className="font-semibold text-slate-900 dark:text-white">
                  {formatLKR(netUnitPrice)}
                </span>
              </div>
            </div>
          )}

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Quantity to Return ({selectedVanItem?.unit || 'Units'}) <span className="text-rose-500">*</span>
              </label>
              {currentVanStock > 0 && (
                <button
                  type="button"
                  onClick={() => setQuantity(String(currentVanStock))}
                  className="text-[11px] font-semibold text-accent-600 hover:underline"
                >
                  Return All ({currentVanStock})
                </button>
              )}
            </div>
            <input
              type="number"
              min="1"
              max={currentVanStock || 999}
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className="w-full px-3.5 py-2.5 text-base sm:text-sm rounded-xl border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-accent-500"
            />
          </div>

          <div>
            <SearchableSelect
              label="Return Justification Reason"
              value={reason}
              onChange={setReason}
              options={RETURN_REASONS}
              placeholder="Select return reason..."
              portal
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Additional Notes (Optional)
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Returned after completing Deniyaya circuit..."
              className="w-full px-3.5 py-2 text-base sm:text-sm rounded-xl border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-accent-500"
            />
          </div>

          {selectedVanItem && parsedQty > 0 && (
            <div className="p-3 rounded-xl bg-purple-50/50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800/40 text-xs flex items-center justify-between">
              <span className="text-slate-600 dark:text-slate-400">Total Returned Valuation:</span>
              <span className="font-mono font-bold text-purple-700 dark:text-purple-300">
                {formatLKR(totalReturnValue)}
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
              disabled={isSubmitting || !productId || parsedQty <= 0 || parsedQty > currentVanStock}
              className="flex items-center gap-2 px-5 py-2.5 text-xs font-bold rounded-xl bg-purple-600 hover:bg-purple-700 active:scale-95 text-white shadow-md shadow-purple-600/20 disabled:opacity-50"
            >
              <Check size={15} />
              <span>{isSubmitting ? 'Returning...' : 'Confirm Return to Warehouse'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}

