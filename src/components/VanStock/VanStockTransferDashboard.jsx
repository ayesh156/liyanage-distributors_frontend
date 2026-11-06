/**
 * @file VanStockTransferDashboard.jsx
 * @description Creative split-view dual inventory transfer workbench.
 * Left Pane: Central Main Store Warehouse (source catalog, quantity picker, real-time calculations).
 * Right Pane: Active Delivery Van (current loaded items, total valuations, share manifest, inline returns).
 * Upgraded with WCAG-compliant Dark Mode contrast tokens and anti-clipping header spacing.
 */

import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  Warehouse,
  Truck,
  Share2,
  MessageCircle,
  Printer,
  RotateCcw,
  Plus,
  CheckCircle2,
  AlertCircle,
  PackageCheck,
  Check,
  AlertTriangle,
} from 'lucide-react';
import { toast } from 'react-toastify';
import VanStockLayout from './VanStockLayout';
import SmartCombobox from '../ui/SmartCombobox';
import PrintVanStockSheet from './PrintVanStockSheet';
import useAppStore from '../../hooks/useAppStore';
import useVanStockStore from '../../hooks/useVanStockStore';
import { openWhatsAppChat, formatSriLankanWhatsAppNumber } from '../../utils/whatsapp';
import {
  calcNetUnitPrice,
  calcTotalRealValue,
  calcRestockNeeded,
  formatLKR,
} from '../../data/vanStockData';

export default function VanStockTransferDashboard() {
  const navigate = useNavigate();
  const salesPersons = useAppStore((s) => s.salesPersons);
  const routes = useAppStore((s) => s.routes);
  const products = useVanStockStore((s) => s.products);
  const mainStoreStock = useVanStockStore((s) => s.mainStoreStock);
  const vanStock = useVanStockStore((s) => s.vanStock);
  const vehicle = useVanStockStore((s) => s.vehicle);
  const dailyManifest = useVanStockStore((s) => s.dailyManifest);
  const loadVanStock = useVanStockStore((s) => s.loadVanStock);
  const returnToStore = useVanStockStore((s) => s.returnToStore);
  const reDispatchManifest = useVanStockStore((s) => s.reDispatchManifest);

  const [selectedProductId, setSelectedProductId] = useState('');
  const [transferQty, setTransferQty] = useState('');
  const [transferNotes, setTransferNotes] = useState('');
  const [isTransferring, setIsTransferring] = useState(false);
  const [transferError, setTransferError] = useState('');
  const [isPrintOpen, setIsPrintOpen] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // Discrepancy items computation: dynamically reflects current items and manifest status
  const uncheckedByRepItems = useMemo(() => {
    // If manifest is fully verified, zero discrepancy items exist
    if (dailyManifest?.status === 'FULLY_VERIFIED') return [];
    return vanStock.filter(
      (i) => i.quantity > 0 && (i.status === 'UNVERIFIED_BY_REP' || i.discrepancyFlag || (!i.repChecked && dailyManifest?.status === 'PARTIAL_DISCREPANCY'))
    );
  }, [vanStock, dailyManifest]);
  const hasDiscrepancy = dailyManifest?.status === 'PARTIAL_DISCREPANCY' && uncheckedByRepItems.length > 0;

  /**
   * Dynamically resolves active Route from the live database/store collection.
   */
  const activeRoute = useMemo(() => {
    if (!routes || routes.length === 0) return null;
    const targetRouteName = (vehicle?.route || '').trim().toLowerCase();
    return routes.find((r) => r.name?.trim().toLowerCase() === targetRouteName) || null;
  }, [routes, vehicle?.route]);

  /**
   * Dynamically resolves the active sales representative from the live database/store collection.
   * Matches by activeRoute.salesPerson, salesPersonId, or representative name.
   */
  const activeSalesPerson = useMemo(() => {
    if (activeRoute?.salesPerson?.phone || activeRoute?.rep?.phone) {
      return activeRoute.salesPerson || activeRoute.rep;
    }
    if (!salesPersons || salesPersons.length === 0) return null;
    const targetRepName = (dailyManifest?.repName || vehicle?.repName || '').trim().toLowerCase();
    const targetId = vehicle?.salesPersonId || vehicle?.repId || dailyManifest?.salesPersonId;
    const matched = salesPersons.find(
      (sp) =>
        (targetId && String(sp.id) === String(targetId)) ||
        (targetRepName && sp.name?.trim().toLowerCase() === targetRepName)
    );
    if (matched) return matched;
    return salesPersons.find((sp) => Boolean(sp.phone)) || salesPersons[0] || null;
  }, [salesPersons, activeRoute, dailyManifest?.repName, dailyManifest?.salesPersonId, vehicle?.repName, vehicle?.salesPersonId, vehicle?.repId]);

  const dynamicRepPhone =
    activeSalesPerson?.phone ||
    activeRoute?.salesPerson?.phone ||
    activeRoute?.rep?.phone ||
    vehicle?.repPhone ||
    '';

  const dynamicRepName =
    activeSalesPerson?.name ||
    activeRoute?.salesPerson?.name ||
    activeRoute?.rep?.name ||
    vehicle?.repName ||
    'Unassigned';

  /**
   * Dispatches updated manifest notification to sales rep following transfer workbench adjustments.
   * Dynamically resolves sales rep phone from database record and passes it to openWhatsAppChat.
   */
  const handleReDispatch = async () => {
    const result = await reDispatchManifest({
      dispatcherName: 'W. Liyanage (Managing Director / Owner)',
      notes: `Updated manifest re-dispatched to ${vehicle.id} after reconciliation workbench transfer`,
    });
    const manifestCode =
      result?.manifest?.manifestNo ||
      dailyManifest?.manifestNo ||
      `MAN-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-01`;
    const shareUrl = `${window.location.origin}/share/van-manifest/${manifestCode}`;
    const message = `📦 Today's Delivery Van Manifest (${manifestCode}) is ready for your verification:\n\n${shareUrl}`;

    try {
      await navigator.clipboard.writeText(shareUrl);
      toast.success(`Manifest ${manifestCode} link copied to clipboard.`);
    } catch {
      toast.info(`Manifest ${manifestCode} link: ${shareUrl}`);
    }

    if (dynamicRepPhone) {
      openWhatsAppChat(dynamicRepPhone, message);
      toast.info(`WhatsApp dispatch opened for ${dynamicRepName} (${dynamicRepPhone})`);
    }
  };

  // Selected product calculations for left pane
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

  const parsedTransferQty = Math.max(0, Number(transferQty) || 0);
  const totalTransferValue = calcTotalRealValue(netUnitPrice, parsedTransferQty);

  const productOptions = useMemo(
    () =>
      products.map((p) => {
        const wh = mainStoreStock.find((m) => m.productId === p.id);
        const whQty = wh ? wh.quantity : 0;
        return {
          value: String(p.id),
          label: p.name,
          subtitle: `SKU: ${p.sku} • Warehouse Avail: ${whQty} ${p.unit}`,
          count: `${whQty}`,
        };
      }),
    [products, mainStoreStock]
  );

  // Right pane: Van loaded items
  const activeVanItems = useMemo(
    () => vanStock.filter((v) => v.quantity > 0),
    [vanStock]
  );

  const totalLoadedUnits = useMemo(
    () => activeVanItems.reduce((sum, item) => sum + item.quantity, 0),
    [activeVanItems]
  );

  const totalLoadedValue = useMemo(
    () =>
      activeVanItems.reduce((sum, item) => {
        const net = calcNetUnitPrice(item.basePrice, item.companyDiscountPercent);
        return sum + calcTotalRealValue(net, item.quantity);
      }, 0),
    [activeVanItems]
  );

  // Handle Transfer
  const handleExecuteTransfer = (e) => {
    e.preventDefault();
    setTransferError('');

    if (!selectedProductId) {
      setTransferError('Please select a product to transfer.');
      return;
    }
    if (parsedTransferQty <= 0) {
      setTransferError('Enter a quantity greater than zero.');
      return;
    }
    if (parsedTransferQty > availableWarehouseStock) {
      setTransferError(`Only ${availableWarehouseStock} ${selectedProduct?.unit} available in warehouse.`);
      return;
    }

    setIsTransferring(true);
    try {
      loadVanStock({
        productId: Number(selectedProductId),
        quantity: parsedTransferQty,
        repName: vehicle.repName,
        notes: transferNotes || 'Split-view workbench transfer',
      });
      toast.success(
        `Transferred ${parsedTransferQty} ${selectedProduct?.unit} to ${vehicle.id}.`
      );
      setTransferQty('');
      setTransferNotes('');
    } catch (err) {
      setTransferError(err.message || 'Transfer failed.');
    } finally {
      setIsTransferring(false);
    }
  };

  // Quick inline return of 1 or more units
  const handleQuickReturn = (productId, qty = 1) => {
    try {
      returnToStore({
        productId,
        quantity: qty,
        reason: 'Workbench quick return to warehouse',
        performedBy: vehicle.repName,
      });
      toast.info(`Returned ${qty} unit(s) back to Central Warehouse.`);
    } catch (err) {
      toast.error(err.message || 'Return failed.');
    }
  };

  /**
   * Direct WhatsApp Manifest Sharing via dynamically resolved SalesPerson mobile number
   * and unique manifest route. Passes dynamic phone into openWhatsAppChat utility.
   */
  const handleWhatsAppShare = async () => {
    const manifestCode =
      dailyManifest?.manifestNo ||
      `MAN-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-01`;
    const shareUrl = `${window.location.origin}/share/van-manifest/${manifestCode}`;
    const message = `📦 Today's Delivery Van Manifest (${manifestCode}) is ready for your verification:\n\n${shareUrl}`;

    // Always copy link to clipboard for quick multi-channel access
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    } catch (_clipErr) {
      // Fallback ignore
    }

    if (!dynamicRepPhone) {
      toast.warning(`No phone number registered for ${dynamicRepName}. Manifest link copied to clipboard.`);
      toast.info(`Manifest URL: ${shareUrl}`);
      return;
    }

    const whatsappUrl = openWhatsAppChat(dynamicRepPhone, message);
    if (whatsappUrl) {
      toast.success(
        `WhatsApp launched for ${dynamicRepName} (${dynamicRepPhone}) & link copied!`
      );
    } else {
      toast.error(`Invalid phone number format for ${dynamicRepName} (${dynamicRepPhone}).`);
    }
  };

  /**
   * Alias for WhatsApp dispatch to support standard nomenclature across route & sales modules.
   */
  const handleWhatsApp = handleWhatsAppShare;

  return (
    <VanStockLayout>
      {/* Top Breadcrumb & Actions Bar with anti-clipping safe padding */}
      <div className="pt-2 sm:pt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-gray-200 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate('/van-stock')}
            className="p-2 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer"
          >
            <ArrowLeft size={16} />
          </button>
          <div>
            <h1 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span>Split-View Transfer Workbench</span>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-accent-50 text-accent-700 border border-accent-200 dark:bg-accent-950/60 dark:text-accent-300 dark:border-accent-800/60 font-mono font-bold">
                {vehicle.id}
              </span>
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Direct Warehouse-to-Truck loading console & loaded inventory reconciliation
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
          <button
            type="button"
            onClick={handleWhatsAppShare}
            title={dynamicRepPhone ? `Direct WhatsApp Share to ${dynamicRepName} (${dynamicRepPhone})` : 'No Rep Phone Registered'}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-xl border border-emerald-300 dark:border-emerald-700/60 bg-emerald-50/70 hover:bg-emerald-100 dark:bg-emerald-950/30 dark:hover:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 transition-all cursor-pointer shadow-sm whitespace-nowrap"
          >
            {copiedLink ? (
              <Check size={14} className="text-emerald-600 dark:text-emerald-400" />
            ) : (
              <MessageCircle size={14} className="text-emerald-600 dark:text-emerald-400 fill-emerald-100 dark:fill-emerald-950/50" />
            )}
            <span className="hidden sm:inline">{copiedLink ? 'Link Copied!' : 'WhatsApp Share & Copy Link'}</span>
            <span className="sm:hidden">{copiedLink ? 'Copied' : 'WhatsApp'}</span>
          </button>

          <button
            type="button"
            onClick={() => setIsPrintOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl bg-accent-600 hover:bg-accent-700 text-white shadow-sm transition-all cursor-pointer active:scale-95 whitespace-nowrap"
          >
            <Printer size={14} />
            <span className="hidden sm:inline">Print Manifest (A4)</span>
            <span className="sm:hidden">Print</span>
          </button>
        </div>
      </div>

      {/* Discrepancy Top Alert Banner with Re-Dispatch Action */}
      {hasDiscrepancy && (
        <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/15 via-rose-500/10 to-amber-500/15 border border-amber-300 dark:border-amber-700/70 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-100 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-800 flex items-center justify-center text-amber-700 dark:text-amber-400 flex-shrink-0">
              <AlertTriangle size={18} />
            </div>
            <div>
              <h4 className="font-bold text-amber-950 dark:text-amber-200">
                Discrepancy Action Needed: {uncheckedByRepItems.length} SKU{uncheckedByRepItems.length === 1 ? '' : 's'} Unchecked by Sales Rep
              </h4>
              <p className="text-amber-800 dark:text-amber-300 text-[11px] mt-0.5">
                Physical truck count mismatch detected on {vehicle.id} (Manifest Rev #{dailyManifest?.manifestRevision || 1}). Reconcile transfer quantities or re-dispatch link.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleReDispatch}
            className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 active:scale-95 text-white font-bold text-xs shadow-sm transition-all cursor-pointer whitespace-nowrap flex-shrink-0"
          >
            <Share2 size={13} />
            <span>Re-Dispatch Updated Manifest / Copy Rep Link</span>
          </button>
        </div>
      )}

      {/* Split-View Dual Grid (Left: Main Store -> Right: Van Stock) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* LEFT PANE: Central Warehouse Loading Station */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 shadow-sm overflow-hidden flex flex-col">
          <div className="p-4 border-b border-gray-100 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800/80 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                <Warehouse size={18} />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                  Central Main Store Warehouse (Source)
                </h2>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Select available stock to transfer into {vehicle.id}
                </p>
              </div>
            </div>

            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-950/40 text-blue-800 dark:text-blue-300 font-bold">
              LOC_MAIN
            </span>
          </div>

          <form onSubmit={handleExecuteTransfer} className="p-5 flex-1 flex flex-col justify-between space-y-4">
            <div className="space-y-4">
              {/* Product Selector */}
              <div>
                <SmartCombobox
                  label="Select Product to Transfer"
                  placeholder="Search catalog by name or SKU..."
                  options={productOptions}
                  value={selectedProductId}
                  onSelect={(opt) => {
                    setSelectedProductId(opt.value);
                    setTransferQty('');
                    setTransferError('');
                  }}
                  showSearchIcon
                  portal
                />
              </div>

              {/* Product Selected Details & Stock Comparison Grid */}
              {selectedProduct ? (
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-gray-200 dark:border-slate-700 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-orange-50 text-orange-700 border border-orange-200 dark:bg-orange-950/60 dark:text-orange-300 dark:border-orange-800/60 font-mono">
                        {selectedProduct.sku}
                      </span>
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white mt-1">
                        {selectedProduct.name}
                      </h3>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        Category: {selectedProduct.category} • Unit: {selectedProduct.unit}
                      </p>
                    </div>

                    <div className="text-right">
                      <span className="text-[10px] text-slate-400 dark:text-slate-400 uppercase block font-semibold">Net Unit Price</span>
                      <span className="text-sm font-mono font-bold text-slate-900 dark:text-white">
                        {formatLKR(netUnitPrice)}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 pt-2 border-t border-gray-200/60 dark:border-slate-700/60 text-center">
                    <div className="p-2 rounded-lg bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700">
                      <span className="text-[10px] text-slate-500 dark:text-slate-300 block font-medium">Warehouse Avail</span>
                      <strong className="text-sm font-mono text-blue-600 dark:text-blue-400 font-bold block mt-0.5">
                        {availableWarehouseStock} {selectedProduct.unit}
                      </strong>
                    </div>

                    <div className="p-2 rounded-lg bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700">
                      <span className="text-[10px] text-slate-500 dark:text-slate-300 block font-medium">Current Van</span>
                      <strong className="text-sm font-mono text-emerald-600 dark:text-emerald-400 font-bold block mt-0.5">
                        {currentVanStock} {selectedProduct.unit}
                      </strong>
                    </div>

                    <div className="p-2 rounded-lg bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700">
                      <span className="text-[10px] text-slate-500 dark:text-slate-300 block font-medium">Par Shortage</span>
                      <strong
                        className={`text-sm font-mono font-bold block mt-0.5 ${
                          restockNeeded > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-slate-400 dark:text-slate-500'
                        }`}
                      >
                        {restockNeeded > 0 ? `+${restockNeeded} ${selectedProduct.unit}` : 'Fully Stocked'}
                      </strong>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-8 text-center rounded-xl border border-dashed border-gray-200 dark:border-slate-700 text-slate-400 dark:text-slate-400 text-xs">
                  Select a product above to inspect current stock levels and calculate transfer valuation.
                </div>
              )}

              {/* Transfer Quantity Input & Quick Preset Buttons */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Transfer Quantity {selectedProduct ? `(${selectedProduct.unit})` : ''}
                  </label>
                  {selectedProduct && restockNeeded > 0 && availableWarehouseStock > 0 && (
                    <button
                      type="button"
                      onClick={() =>
                        setTransferQty(String(Math.min(restockNeeded, availableWarehouseStock)))
                      }
                      className="text-[11px] font-semibold text-accent-600 dark:text-accent-400 hover:underline cursor-pointer"
                    >
                      Fill Par Deficit ({Math.min(restockNeeded, availableWarehouseStock)})
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="1"
                    max={availableWarehouseStock}
                    value={transferQty}
                    onChange={(e) => {
                      setTransferQty(e.target.value);
                      setTransferError('');
                    }}
                    placeholder={selectedProduct ? `Max: ${availableWarehouseStock}` : 'Enter qty...'}
                    disabled={!selectedProduct || availableWarehouseStock === 0}
                    className="flex-1 px-3.5 py-2 text-sm rounded-xl border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-accent-500 disabled:opacity-50"
                  />

                  {/* Preset quick buttons */}
                  {selectedProduct && availableWarehouseStock > 0 && (
                    <div className="flex items-center gap-1">
                      {[5, 10, 25].map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => setTransferQty(String(Math.min(preset, availableWarehouseStock)))}
                          className="px-2.5 py-2 text-xs font-mono font-semibold rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                        >
                          +{preset}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Transfer Notes */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Transfer Dispatch Notes (Optional)
                </label>
                <input
                  type="text"
                  value={transferNotes}
                  onChange={(e) => setTransferNotes(e.target.value)}
                  placeholder="e.g. Weekly route replenishment, emergency restock..."
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-accent-500"
                />
              </div>

              {transferError && (
                <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-xs text-red-700 dark:text-red-300 flex items-center gap-2">
                  <AlertCircle size={15} className="flex-shrink-0" />
                  <span>{transferError}</span>
                </div>
              )}
            </div>

            {/* High-Contrast Summary Bar (Phase 1 WCAG compliant) */}
            <div className="pt-4 border-t border-gray-100 dark:border-slate-700 space-y-3">
              {selectedProduct && parsedTransferQty > 0 && (
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 dark:bg-zinc-800/90 dark:border-zinc-700 text-slate-800 dark:text-amber-400 text-xs flex items-center justify-between shadow-sm">
                  <span className="font-bold text-slate-700 dark:text-zinc-200">
                    Total Transfer Value:
                  </span>
                  <span className="font-mono font-black text-amber-600 dark:text-amber-400 text-sm sm:text-base">
                    {formatLKR(totalTransferValue)}
                  </span>
                </div>
              )}

              <button
                type="submit"
                disabled={isTransferring || !selectedProductId || parsedTransferQty <= 0 || parsedTransferQty > availableWarehouseStock}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-accent-600 hover:bg-accent-700 active:scale-95 text-white font-bold text-xs shadow-md shadow-accent-600/20 disabled:opacity-50 transition-all cursor-pointer"
              >
                <ArrowRight size={16} />
                <span>{isTransferring ? 'Transferring...' : `Transfer Stock to ${vehicle.id}`}</span>
              </button>
            </div>
          </form>
        </div>

        {/* RIGHT PANE: Active Field Delivery Van (Destination) */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 shadow-sm overflow-hidden flex flex-col">
          <div className="p-4 border-b border-gray-100 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800/80 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <Truck size={18} />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                  Active Delivery Van ({vehicle.id} • {vehicle.plateNumber})
                </h2>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Rep: {vehicle.repName} • Route: All Routes
                </p>
              </div>
            </div>

            <div className="text-right">
              <span className="text-[10px] text-slate-500 dark:text-slate-300 block uppercase font-semibold">Total Loaded</span>
              <strong className="text-xs font-mono font-bold text-slate-900 dark:text-white">
                {totalLoadedUnits} Units ({formatLKR(totalLoadedValue)})
              </strong>
            </div>
          </div>

          <div className="p-5 flex-1 flex flex-col justify-between overflow-y-auto">
            {activeVanItems.length === 0 ? (
              <div className="my-auto py-12 text-center text-slate-400 text-xs">
                <Truck className="w-10 h-10 mx-auto mb-2 opacity-30" />
                <p className="font-semibold text-slate-600 dark:text-slate-300">Van Stock Currently Empty</p>
                <p className="mt-1">Load inventory using the source workstation on the left.</p>
              </div>
            ) : (
              <div className="space-y-2.5 max-h-[480px] overflow-y-auto pr-1">
                {activeVanItems.map((item) => {
                  const net = calcNetUnitPrice(item.basePrice, item.companyDiscountPercent);
                  const total = calcTotalRealValue(net, item.quantity);

                  return (
                    <div
                      key={item.id}
                      className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700/60 text-xs flex items-center justify-between gap-3 hover:border-slate-300 transition-colors"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="px-1.5 py-0.5 rounded bg-orange-50 text-orange-700 border border-orange-200 dark:bg-orange-950/60 dark:text-orange-300 dark:border-orange-800/60 font-mono text-[10px] font-bold">
                            {item.sku}
                          </span>
                          <p className="font-bold text-slate-900 dark:text-white truncate">
                            {item.productName}
                          </p>
                          {item.status === 'UNVERIFIED_BY_REP' || (item.discrepancyFlag && !item.repChecked) ? (
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-300 dark:border-rose-800">
                              Unchecked by Rep — Action Needed
                            </span>
                          ) : (
                            <span
                              className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${
                                item.status === 'APPROVED' || item.status === 'VERIFIED'
                                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300'
                                  : 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300'
                              }`}
                            >
                              {item.status === 'APPROVED' || item.status === 'VERIFIED' ? 'Verified' : 'Pending Sign-Off'}
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-300 font-mono mt-1">
                          On-Hand: <strong className="text-slate-900 dark:text-white font-bold">{item.quantity} {item.unit}</strong> • Valuation: {formatLKR(total)}
                        </p>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          title="Unload 1 unit back to warehouse"
                          onClick={() => handleQuickReturn(item.productId, 1)}
                          className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                        >
                          <RotateCcw size={12} />
                          <span>Unload 1</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="pt-4 border-t border-gray-100 dark:border-slate-700 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
              <span>{activeVanItems.length} SKUs currently loaded</span>
              <button
                type="button"
                onClick={() => navigate(`/van-stock/confirm/${vehicle.id}`)}
                className="font-semibold text-accent-600 dark:text-accent-400 hover:underline cursor-pointer"
              >
                <span className="hidden sm:inline">Go to Rep Acceptance Portal →</span>
                <span className="sm:hidden">Rep Portal →</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <PrintVanStockSheet isOpen={isPrintOpen} onClose={() => setIsPrintOpen(false)} />
    </VanStockLayout>
  );
}
