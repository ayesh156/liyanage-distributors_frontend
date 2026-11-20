/**
 * @file VehicleSalesModal.jsx
 * @description Field road sales invoice modal.
 * Directly deducts sold quantities from active van on-hand stock, guaranteeing
 * true vehicular stock depletion without phantom field inventory.
 */

import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { X, Receipt, Trash2, AlertCircle, ShoppingCart, FileText, Store, ChevronsUp } from 'lucide-react';
import { toast } from 'react-toastify';
import Combobox from '@/components/ui/combobox';
import useVanStockStore from '../../hooks/useVanStockStore';
import useAppStore from '../../hooks/useAppStore';
import { calcNetUnitPrice, calcTotalRealValue, formatLKR } from '../../data/vanStockData';
import { handleNumericFocus, normalizeNumericChange, handleNumericBlur } from '../../utils/numberInputUtils';

export default function VehicleSalesModal({
  isOpen,
  onClose,
  initialProduct = null,
  initialProductId = null,
}) {
  const vanStock = useVanStockStore((s) => s.vanStock);
  const products = useVanStockStore((s) => s.products);
  const vehicle = useVanStockStore((s) => s.vehicle);
  const recordVehicleSale = useVanStockStore((s) => s.recordVehicleSale);
  const shops = useAppStore((s) => s.shops);

  const [customerName, setCustomerName] = useState('');
  const [invoiceNo, setInvoiceNo] = useState('');
  const [items, setItems] = useState([]);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Active stores from database mapped for searchable Combobox
  const storeOptions = useMemo(() => {
    return (shops || [])
      .filter((s) => s.active !== false)
      .map((s) => ({
        value: s.name,
        label: s.name,
        subtitle: `Route: ${s.route || 'General'} • Code: #${s.id}`,
      }));
  }, [shops]);

  // Manual bill mode — sets the fixed value 'manual_bill' as the invoice reference
  const handleSetManualBill = () => {
    setInvoiceNo('manual_bill');
    toast.success('Invoice reference set to manual_bill.');
  };

  // Available sellable items on the van
  const availableVanItems = useMemo(
    () => vanStock.filter((v) => v.quantity > 0),
    [vanStock]
  );

  // Derive target product ID from initialProductId or initialProduct object
  const effectiveInitialProductId =
    initialProductId || initialProduct?.productId || initialProduct?.id || null;

  useEffect(() => {
    if (isOpen) {
      setCustomerName('');
      setInvoiceNo('');
      setError('');

      // Auto-populate invoice with the row-selected product if launched with item context
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
      toast.info('Item already added to invoice. Adjust quantity below.');
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
    const raw = normalizeNumericChange(qty);
    setItems((prev) =>
      prev.map((i) => {
        if (i.productId === productId) {
          if (raw === '') {
            return { ...i, quantity: '' };
          }
          const val = Number(raw);
          return { ...i, quantity: Math.min(i.maxQty, Math.max(0, val)) };
        }
        return i;
      })
    );
  };

  const handleBlurQty = (productId) => {
    setItems((prev) =>
      prev.map((i) => {
        if (i.productId === productId) {
          const val = Number(i.quantity);
          return { ...i, quantity: Math.max(1, Math.min(i.maxQty, isNaN(val) || val <= 0 ? 1 : val)) };
        }
        return i;
      })
    );
  };

  const handleRemoveItem = (productId) => {
    setItems((prev) => prev.filter((i) => i.productId !== productId));
  };

  const totalInvoiceAmount = useMemo(() => {
    return items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  }, [items]);

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    if (!customerName.trim()) {
      setError('Retail Hardware Shop / Customer name is required.');
      return;
    }
    if (items.length === 0) {
      setError('Add at least one line item from van stock.');
      return;
    }

    setIsSubmitting(true);
    try {
      recordVehicleSale({
        customerName: customerName.trim(),
        invoiceNo: invoiceNo.trim(),
        items,
        performedBy: vehicle.repName || 'Kamal Perera',
      });
      toast.success(
        `Road sales invoice recorded for ${customerName} (${formatLKR(totalInvoiceAmount)}). Van inventory depleted.`
      );
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to record road sales invoice.');
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
        className="w-full sm:max-w-2xl bg-white dark:bg-slate-800 rounded-t-3xl sm:rounded-2xl border border-gray-200 dark:border-slate-700 shadow-2xl overflow-hidden flex flex-col max-h-[92vh] pb-safe animate-in slide-in-from-bottom sm:zoom-in-95 duration-200"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-accent-50 dark:bg-accent-900/30 flex items-center justify-center text-accent-600 dark:text-accent-400">
              <Receipt size={20} />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Record Road Sales Invoice
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Direct Outbound Deduction from Van
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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="overflow-visible relative z-40">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Hardware Customer / Store Name <span className="text-rose-500">*</span>
              </label>
              <div className="space-y-1.5">
                <Combobox
                  placeholder="Search registered stores..."
                  searchPlaceholder="Type store name, route, or code..."
                  options={storeOptions}
                  value={customerName}
                  onChange={(val) => setCustomerName(val)}
                  emptyMessage="Store not found. Type manual name below."
                />
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Or enter custom store/customer name..."
                  className="w-full px-3.5 py-1.5 text-xs rounded-xl border border-gray-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-accent-500"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Invoice Reference No
                </label>
                <button
                  type="button"
                  onClick={handleSetManualBill}
                  className="text-[11px] font-semibold text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <FileText size={11} /> Manual Bill
                </button>
              </div>
              <input
                type="text"
                value={invoiceNo}
                onChange={(e) => setInvoiceNo(e.target.value)}
                placeholder="Enter invoice / bill book number..."
                className="w-full font-mono px-3.5 py-2 text-base sm:text-sm rounded-xl border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-accent-500"
              />
            </div>
          </div>

          {/* Add item to invoice */}
          <div className="overflow-visible relative z-30">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Add Products from Active Van Stock
            </label>
            <Combobox
              placeholder="Search van on-hand items to add..."
              searchPlaceholder="Search product by name or SKU..."
              options={productOptions}
              value=""
              onChange={(val) => handleAddItem(val)}
              emptyMessage="No matching van stock products found."
            />
          </div>

          {/* Selected line items table */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
              Invoice Line Items ({items.length})
            </label>

            {items.length === 0 ? (
              <div className="p-6 text-center rounded-xl border border-dashed border-slate-300 dark:border-slate-700 text-xs text-slate-400">
                <ShoppingCart className="w-8 h-8 mx-auto mb-2 opacity-30" />
                No products added to this invoice yet. Use the combobox above to pick loaded van stock.
              </div>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {items.map((item) => (
                  <div
                    key={item.productId}
                    className="flex items-center justify-between gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700/60 text-xs"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-slate-900 dark:text-white truncate">
                        {item.productName}
                      </p>
                      <p className="text-[11px] text-slate-500 font-mono">
                        {item.sku} • On-Hand: {item.maxQty} {item.unit} • Net: {formatLKR(item.unitPrice)}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1">
                        <label className="text-[10px] text-slate-400">Qty:</label>
                        <input
                          type="number"
                          min="1"
                          max={item.maxQty}
                          step="any"
                          inputMode="numeric"
                          value={item.quantity}
                          onFocus={(e) => handleNumericFocus(e)}
                          onChange={(e) => handleUpdateQty(item.productId, e.target.value)}
                          onBlur={() => handleBlurQty(item.productId)}
                          className="w-16 px-2 py-1 text-center font-bold text-xs rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                        />
                        <button
                          type="button"
                          onClick={() => handleUpdateQty(item.productId, item.maxQty)}
                          disabled={item.maxQty <= 0}
                          className="p-1 rounded-lg border border-gray-200 dark:border-slate-700 text-slate-500 hover:text-accent-600 hover:border-accent-400 hover:bg-accent-50 dark:hover:bg-accent-950/40 transition-colors disabled:opacity-30 disabled:pointer-events-none"
                          title="Fill all available qty"
                        >
                          <ChevronsUp size={14} />
                        </button>
                      </div>

                      <span className="font-mono font-bold text-slate-900 dark:text-white w-24 text-right">
                        {formatLKR(item.quantity * item.unitPrice)}
                      </span>

                      <button
                        type="button"
                        onClick={() => handleRemoveItem(item.productId)}
                        className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Invoice Total */}
          {items.length > 0 && (
            <div className="p-3.5 rounded-xl bg-accent-50/50 dark:bg-accent-950/20 border border-accent-200 dark:border-accent-800/40 flex items-center justify-between text-xs">
              <span className="font-bold text-slate-700 dark:text-slate-300">Total Billed Amount:</span>
              <span className="font-mono font-bold text-accent-700 dark:text-accent-300 text-base">
                {formatLKR(totalInvoiceAmount)}
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
              disabled={isSubmitting || !customerName.trim() || items.length === 0}
              className="flex items-center gap-2 px-5 py-2.5 text-xs font-bold rounded-xl bg-accent-600 hover:bg-accent-700 active:scale-95 text-white shadow-md shadow-accent-600/20 disabled:opacity-50"
            >
              <Receipt size={15} />
              <span>{isSubmitting ? 'Recording...' : 'Save & Deplete Van'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}

