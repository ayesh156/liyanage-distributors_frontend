/**
 * @file AddProductModal.jsx
 * @description Central Warehouse SKU master product catalog modal.
 * Supports Create and Edit modes, SKU auto-generation, standard categories/units,
 * and real-time net price / opening stock valuation calculations.
 */

import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { X, Sparkles, PackagePlus, AlertCircle, Save } from 'lucide-react';
import { toast } from 'react-toastify';
import SearchableSelect from '../ui/SearchableSelect';
import useVanStockStore from '../../hooks/useVanStockStore';
import {
  calcNetUnitPrice,
  calcTotalRealValue,
  formatLKR,
  generateAutoSku,
} from '../../data/vanStockData';

const HARDWARE_CATEGORIES = [
  'Cables & Wires',
  'Lighting & Lamps',
  'Switchgear & Wiring',
  'Plumbing & PVC',
  'Tools & Hardware',
  'Paints & Finishing',
  'General Hardware',
];

const STANDARD_UNITS = [
  'Unit',
  'Roll',
  'Box',
  'Length',
  'Tin',
  'Pkt',
  'Pkt of 100',
  'm',
  'Kg',
];

export default function AddProductModal({ isOpen, onClose, productToEdit = null }) {
  const saveProduct = useVanStockStore((s) => s.saveProduct);
  const products = useVanStockStore((s) => s.products);

  const isEdit = Boolean(productToEdit);

  const [sku, setSku] = useState('');
  const [name, setName] = useState('');
  const [category, setCategory] = useState(HARDWARE_CATEGORIES[0]);
  const [unit, setUnit] = useState(STANDARD_UNITS[0]);
  const [basePrice, setBasePrice] = useState('');
  const [companyDiscountPercent, setCompanyDiscountPercent] = useState('10');
  const [targetCapacity, setTargetCapacity] = useState('50');
  const [initialQuantity, setInitialQuantity] = useState('50');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (productToEdit) {
        setSku(productToEdit.sku || '');
        setName(productToEdit.name || '');
        setCategory(productToEdit.category || HARDWARE_CATEGORIES[0]);
        setUnit(productToEdit.unit || STANDARD_UNITS[0]);
        setBasePrice(String(productToEdit.basePrice || ''));
        setCompanyDiscountPercent(String(productToEdit.companyDiscountPercent ?? '0'));
        setTargetCapacity(String(productToEdit.targetCapacity || '50'));
        setInitialQuantity('0');
      } else {
        setSku('');
        setName('');
        setCategory(HARDWARE_CATEGORIES[0]);
        setUnit(STANDARD_UNITS[0]);
        setBasePrice('');
        setCompanyDiscountPercent('10');
        setTargetCapacity('50');
        setInitialQuantity('50');
      }
      setError('');
    }
  }, [isOpen, productToEdit]);

  const netUnitPrice = useMemo(() => {
    return calcNetUnitPrice(Number(basePrice) || 0, Number(companyDiscountPercent) || 0);
  }, [basePrice, companyDiscountPercent]);

  const openingStockValue = useMemo(() => {
    return calcTotalRealValue(netUnitPrice, Number(initialQuantity) || 0);
  }, [netUnitPrice, initialQuantity]);

  const handleAutoGenerateSku = () => {
    if (!name.trim()) {
      setError('Please enter product name first to generate SKU code.');
      return;
    }
    const generated = generateAutoSku(name);
    setSku(generated);
    setError('');
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) {
      setError('Product Name is required.');
      return;
    }
    if (!sku.trim()) {
      setError('SKU Code is required.');
      return;
    }
    if (Number(basePrice) <= 0) {
      setError('Base Price must be greater than zero.');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        id: productToEdit ? productToEdit.id : undefined,
        sku: sku.trim().toUpperCase(),
        name: name.trim(),
        category,
        unit,
        basePrice: Number(basePrice),
        companyDiscountPercent: Number(companyDiscountPercent) || 0,
        targetCapacity: Number(targetCapacity) || 50,
        initialQuantity: Number(initialQuantity) || 0,
      };

      const result = saveProduct(payload);
      if (result.mode === 'edit') {
        toast.success(`Product "${payload.name}" updated successfully.`);
      } else {
        toast.success(`New SKU "${payload.sku}" registered with ${payload.initialQuantity} opening units.`);
      }
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to save product SKU.');
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
            <div className="w-10 h-10 rounded-xl bg-accent-50 dark:bg-accent-900/30 flex items-center justify-center text-accent-600 dark:text-accent-400">
              <PackagePlus size={20} />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {isEdit ? 'Edit SKU Specifications' : 'Register New Hardware SKU'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Central Warehouse Master Product Catalog
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

          {/* Product Name */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Product Name & Description <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. ACL 1.0mm Single Core Wire 100m"
              className="w-full px-3.5 py-2.5 text-base sm:text-sm rounded-xl border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-accent-500"
            />
          </div>

          {/* SKU Code & Auto-generator */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                SKU Code <span className="text-rose-500">*</span>
              </label>
              {!isEdit && (
                <button
                  type="button"
                  onClick={handleAutoGenerateSku}
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-accent-600 hover:text-accent-700"
                >
                  <Sparkles size={12} />
                  <span>Auto-Generate SKU</span>
                </button>
              )}
            </div>
            <input
              type="text"
              value={sku}
              onChange={(e) => setSku(e.target.value.toUpperCase())}
              disabled={isEdit}
              placeholder="e.g. CW-ACL-100"
              className="w-full font-mono uppercase px-3.5 py-2.5 text-base sm:text-sm rounded-xl border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-accent-500 disabled:opacity-60"
            />
          </div>

          {/* Category & Unit */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <SearchableSelect
                label="Hardware Category"
                value={category}
                onChange={setCategory}
                options={HARDWARE_CATEGORIES}
                placeholder="Select category..."
                portal
              />
            </div>

            <div>
              <SearchableSelect
                label="Stocking Unit"
                value={unit}
                onChange={setUnit}
                options={STANDARD_UNITS}
                placeholder="Select unit..."
                portal
              />
            </div>
          </div>

          {/* Pricing & Par Levels */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Base Price (LKR) <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={basePrice}
                onChange={(e) => setBasePrice(e.target.value)}
                placeholder="0.00"
                className="w-full px-3 py-2 text-base sm:text-sm rounded-xl border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-accent-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Discount (%)
              </label>
              <input
                type="number"
                min="0"
                max="100"
                value={companyDiscountPercent}
                onChange={(e) => setCompanyDiscountPercent(e.target.value)}
                placeholder="10"
                className="w-full px-3 py-2 text-base sm:text-sm rounded-xl border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-accent-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Van Par Capacity
              </label>
              <input
                type="number"
                min="1"
                value={targetCapacity}
                onChange={(e) => setTargetCapacity(e.target.value)}
                placeholder="50"
                className="w-full px-3 py-2 text-base sm:text-sm rounded-xl border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-accent-500"
              />
            </div>
          </div>

          {/* Opening Warehouse Quantity (Create Mode Only) */}
          {!isEdit && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Initial Central Warehouse Stock ({unit})
              </label>
              <input
                type="number"
                min="0"
                value={initialQuantity}
                onChange={(e) => setInitialQuantity(e.target.value)}
                placeholder="e.g. 100"
                className="w-full px-3.5 py-2 text-base sm:text-sm rounded-xl border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-accent-500"
              />
            </div>
          )}

          {/* Dynamic Valuation Summary */}
          {Number(basePrice) > 0 && (
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700/60 text-xs space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-slate-500 dark:text-slate-400">Computed Net Unit Price:</span>
                <span className="font-semibold text-slate-900 dark:text-white">{formatLKR(netUnitPrice)}</span>
              </div>
              {!isEdit && Number(initialQuantity) > 0 && (
                <div className="flex items-center justify-between font-bold text-accent-700 dark:text-accent-300 pt-1 border-t border-slate-200 dark:border-slate-700">
                  <span>Opening Stock Valuation:</span>
                  <span>{formatLKR(openingStockValue)}</span>
                </div>
              )}
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
              disabled={isSubmitting || !name || !sku || Number(basePrice) <= 0}
              className="flex items-center gap-2 px-5 py-2.5 text-xs font-bold rounded-xl bg-accent-600 hover:bg-accent-700 active:scale-95 text-white shadow-md shadow-accent-600/20 disabled:opacity-50"
            >
              <Save size={15} />
              <span>{isSubmitting ? 'Saving...' : isEdit ? 'Update SKU' : 'Register SKU'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}

