/**
 * @file ReceivePurchaseModal.jsx
 * @description Inbound supplier purchase order receiving modal.
 * Directly receives stock into Central Warehouse inventory, updates unit costs,
 * and logs an immutable SUPPLIER_PURCHASE_INBOUND movement record.
 */

import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { X, PackageCheck, AlertCircle, Check } from 'lucide-react';
import { toast } from 'react-toastify';
import SmartCombobox from '../ui/SmartCombobox';
import SearchableSelect from '../ui/SearchableSelect';
import useVanStockStore from '../../hooks/useVanStockStore';
import { calcNetUnitPrice, calcTotalRealValue, formatLKR } from '../../data/vanStockData';

const SRI_LANKAN_SUPPLIERS = [
  'ACL Cables PLC (Colombo)',
  'Orange Electric (Orel Corporation)',
  'Kevilton Electrical Products (Pvt) Ltd',
  'S-lon Lanka (Pvt) Ltd',
  'National PVC Industries',
  'Robert Bosch Lanka (Pvt) Ltd',
  'Harris Ceylon (Pvt) Ltd',
];

export default function ReceivePurchaseModal({ isOpen, onClose, initialProductId = null }) {
  const products = useVanStockStore((s) => s.products);
  const mainStoreStock = useVanStockStore((s) => s.mainStoreStock);
  const receivePurchaseOrder = useVanStockStore((s) => s.receivePurchaseOrder);

  const [supplierName, setSupplierName] = useState(SRI_LANKAN_SUPPLIERS[0]);
  const [poNumber, setPoNumber] = useState('');
  const [productId, setProductId] = useState('');
  const [quantity, setQuantity] = useState('50');
  const [unitCost, setUnitCost] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setSupplierName(SRI_LANKAN_SUPPLIERS[0]);
      setPoNumber(`PO-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(100 + Math.random() * 900)}`);
      setProductId(initialProductId ? String(initialProductId) : '');
      setQuantity('50');
      setNotes('');
      setError('');
    }
  }, [isOpen, initialProductId]);

  const selectedProduct = useMemo(
    () => products.find((p) => String(p.id) === String(productId)),
    [products, productId]
  );

  useEffect(() => {
    if (selectedProduct) {
      setUnitCost(String(selectedProduct.basePrice || ''));
    }
  }, [selectedProduct]);

  const parsedQty = Math.max(0, Number(quantity) || 0);
  const parsedCost = Math.max(0, Number(unitCost) || 0);
  const totalInboundValue = parsedQty * parsedCost;

  const productOptions = useMemo(
    () =>
      products.map((p) => {
        const wh = mainStoreStock.find((m) => m.productId === p.id);
        const qty = wh ? wh.quantity : 0;
        return {
          value: String(p.id),
          label: p.name,
          subtitle: `SKU: ${p.sku} • Warehouse Stock: ${qty} ${p.unit} • Base: Rs. ${p.basePrice}`,
        };
      }),
    [products, mainStoreStock]
  );

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    if (!productId) {
      setError('Please select a product SKU.');
      return;
    }
    if (parsedQty <= 0) {
      setError('Received quantity must be greater than zero.');
      return;
    }
    if (parsedCost <= 0) {
      setError('Unit purchase cost must be greater than zero.');
      return;
    }

    setIsSubmitting(true);
    try {
      receivePurchaseOrder({
        supplierName,
        poNumber: poNumber.trim(),
        items: [
          {
            productId: Number(productId),
            quantity: parsedQty,
            basePrice: parsedCost,
            discountPercent: selectedProduct?.companyDiscountPercent ?? 10,
          },
        ],
        notes: notes.trim(),
        performedBy: 'Head Storekeeper',
      });
      toast.success(
        `Received ${parsedQty} ${selectedProduct?.unit} from ${supplierName}. Added to Central Warehouse.`
      );
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to receive purchase order.');
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
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <PackageCheck size={20} />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Receive Supplier Purchase Order
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Inbound Stock Delivery into Central Warehouse
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

          {/* Supplier & PO Number */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <SearchableSelect
                label="Vendor / Supplier Name"
                value={supplierName}
                onChange={setSupplierName}
                options={SRI_LANKAN_SUPPLIERS}
                placeholder="Select supplier..."
                portal
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                PO / Delivery Note Reference
              </label>
              <input
                type="text"
                value={poNumber}
                onChange={(e) => setPoNumber(e.target.value)}
                className="w-full font-mono px-3.5 py-2 text-base sm:text-sm rounded-xl border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-accent-500"
              />
            </div>
          </div>

          {/* Product Combobox */}
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

          {/* Quantity & Unit Cost */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Received Quantity ({selectedProduct?.unit || 'Units'}) <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="w-full px-3.5 py-2 text-base sm:text-sm rounded-xl border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-accent-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Unit Purchase Cost (LKR) <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={unitCost}
                onChange={(e) => setUnitCost(e.target.value)}
                className="w-full px-3.5 py-2 text-base sm:text-sm rounded-xl border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-accent-500"
              />
            </div>
          </div>

          {/* Inbound Valuation Summary */}
          {parsedQty > 0 && parsedCost > 0 && (
            <div className="p-3.5 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/40 text-xs flex items-center justify-between">
              <span className="text-slate-600 dark:text-slate-400">Total Purchase Value:</span>
              <span className="font-mono font-bold text-emerald-700 dark:text-emerald-400 text-sm">
                {formatLKR(totalInboundValue)}
              </span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Receiving Notes / Quality Inspection
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Factory sealed carton verified intact by storekeeper..."
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
              disabled={isSubmitting || !productId || parsedQty <= 0 || parsedCost <= 0}
              className="flex items-center gap-2 px-5 py-2.5 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white shadow-md shadow-emerald-600/20 disabled:opacity-50"
            >
              <Check size={15} />
              <span>{isSubmitting ? 'Receiving...' : 'Confirm Inbound Receipt'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}

