/**
 * @file WarehouseManagement.jsx
 * @description Dedicated Central Warehouse administrative cockpit (/warehouse).
 * Orchestrates Master SKU Catalog, Central Buffer Inventory, Supplier Inbound PO Receiving,
 * Physical Stocktake Reconciliation, and Direct-to-Van Dispatch.
 */

import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Warehouse,
  Package,
  Plus,
  ArrowRightLeft,
  Receipt,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  SlidersHorizontal,
  Edit,
  Trash2,
  TrendingUp,
  ShieldCheck,
  Truck,
  ExternalLink,
  Layers,
  Sparkles,
  MoreVertical,
} from 'lucide-react';
import { toast } from 'react-toastify';
import VanStockLayout from '../VanStock/VanStockLayout';
import SearchableSelect from '../ui/SearchableSelect';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '../ui/DropdownMenu';
import DateFilterBar from '../VanStock/DateFilterBar';
import AddProductModal from '../VanStock/AddProductModal';
import ReceivePurchaseModal from '../VanStock/ReceivePurchaseModal';
import AdjustStockModal from '../VanStock/AdjustStockModal';
import LoadVanStockModal from '../VanStock/LoadVanStockModal';
import OwnerSignatureModal from '../VanStock/OwnerSignatureModal';
import DeleteConfirmModal from '../ui/DeleteConfirmModal';
import useVanStockStore from '../../hooks/useVanStockStore';
import {
  calcNetUnitPrice,
  calcTotalRealValue,
  formatLKR,
  isDateInPreset,
} from '../../data/vanStockData';

export default function WarehouseManagement() {
  const navigate = useNavigate();

  // Store state
  const products = useVanStockStore((s) => s.products);
  const mainStoreStock = useVanStockStore((s) => s.mainStoreStock);
  const stockMovements = useVanStockStore((s) => s.stockMovements);
  const vehicle = useVanStockStore((s) => s.vehicle);
  const deleteProduct = useVanStockStore((s) => s.deleteProduct);
  const fetchInitialData = useVanStockStore((s) => s.fetchInitialData);

  useEffect(() => {
    fetchInitialData();
  }, [fetchInitialData]);

  // Modals state
  const [modalAddProductOpen, setModalAddProductOpen] = useState(false);
  const [modalReceivePoOpen, setModalReceivePoOpen] = useState(false);
  const [modalAdjustOpen, setModalAdjustOpen] = useState(false);
  const [modalLoadVanOpen, setModalLoadVanOpen] = useState(false);
  const [modalOwnerSignOpen, setModalOwnerSignOpen] = useState(false);
  const [productToEdit, setProductToEdit] = useState(null);
  const [targetProductId, setTargetProductId] = useState(null);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  // Filter toolbar state
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [stockAvailabilityFilter, setStockAvailabilityFilter] = useState('ALL');
  const [datePreset, setDatePreset] = useState('ALL');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');

  // Master Categories list for SearchableSelect
  const categoryOptions = useMemo(() => {
    const set = new Set(products.map((p) => p.category || 'General'));
    const list = [{ value: 'ALL', label: 'All Categories' }];
    set.forEach((cat) => list.push({ value: cat, label: cat }));
    return list;
  }, [products]);

  // Stock availability options
  const stockAvailabilityOptions = [
    { value: 'ALL', label: 'All Stock Levels' },
    { value: 'IN_STOCK', label: 'In Stock (>20 units)' },
    { value: 'LOW_STOCK', label: 'Low Stock (1-20 units)' },
    { value: 'OUT_OF_STOCK', label: 'Out of Stock (0 units)' },
  ];

  // Warehouse computed KPIs
  const warehouseKpis = useMemo(() => {
    let totalValue = 0;
    let totalUnits = 0;
    let lowStockCount = 0;
    let outOfStockCount = 0;

    mainStoreStock.forEach((item) => {
      const net = calcNetUnitPrice(item.basePrice, item.companyDiscountPercent);
      totalValue += calcTotalRealValue(net, item.quantity);
      totalUnits += item.quantity;
      if (item.quantity === 0) outOfStockCount += 1;
      else if (item.quantity <= 20) lowStockCount += 1;
    });

    // Inbound PO intake value from movements
    const inboundPoValue = stockMovements
      .filter((m) => m.movementType === 'SUPPLIER_PURCHASE_INBOUND')
      .reduce((sum, m) => sum + (m.unitPrice * m.quantity), 0);

    return {
      totalValue,
      totalUnits,
      activeSkusCount: products.filter((p) => p.isActive).length,
      alertCount: lowStockCount + outOfStockCount,
      lowStockCount,
      outOfStockCount,
      inboundPoValue,
    };
  }, [mainStoreStock, products, stockMovements]);

  // Filtered Warehouse Catalog Items
  const filteredCatalog = useMemo(() => {
    return mainStoreStock.filter((item) => {
      const q = searchQuery.toLowerCase().trim();
      const matchSearch =
        !q ||
        item.productName.toLowerCase().includes(q) ||
        item.sku.toLowerCase().includes(q);

      const product = products.find((p) => p.id === item.productId);
      const matchCategory =
        categoryFilter === 'ALL' || (product && product.category === categoryFilter);

      let matchStock = true;
      if (stockAvailabilityFilter === 'IN_STOCK') matchStock = item.quantity > 20;
      else if (stockAvailabilityFilter === 'LOW_STOCK') matchStock = item.quantity > 0 && item.quantity <= 20;
      else if (stockAvailabilityFilter === 'OUT_OF_STOCK') matchStock = item.quantity === 0;

      // Date preset check (matching item update or product creation timestamp)
      const dateToCheck = item.updatedAt || item.createdAt || new Date().toISOString();
      const matchDate = isDateInPreset(dateToCheck, datePreset, customStart, customEnd);

      return matchSearch && matchCategory && matchStock && matchDate;
    });
  }, [mainStoreStock, products, searchQuery, categoryFilter, stockAvailabilityFilter, datePreset, customStart, customEnd]);

  // Actions
  const handleQuickLoad = (productId) => {
    setTargetProductId(productId);
    setModalLoadVanOpen(true);
  };

  const handleAdjustStock = (productId) => {
    setTargetProductId(productId);
    setModalAdjustOpen(true);
  };

  const handleEditSku = (prod) => {
    setProductToEdit(prod);
    setModalAddProductOpen(true);
  };

  const handleDeleteSku = (prodId, prodName) => {
    setItemToDelete({ prodId, prodName });
    setIsDeleteModalOpen(true);
  };

  const confirmDeleteSku = () => {
    if (itemToDelete) {
      deleteProduct(itemToDelete.prodId);
      toast.info(`Deleted SKU "${itemToDelete.prodName}".`);
      setItemToDelete(null);
      setIsDeleteModalOpen(false);
    }
  };

  return (
    <VanStockLayout>
      {/* ─────────────────────────────────────────────────────────────
          1. CENTRAL WAREHOUSE HEADER & OPERATIONAL QUICK-ACTIONS (Theme-Adaptive)
         ───────────────────────────────────────────────────────────── */}
      <div className="pt-2 sm:pt-4 relative overflow-hidden rounded-3xl bg-white dark:bg-zinc-900 border border-slate-200/90 dark:border-zinc-800 text-slate-900 dark:text-white p-4 sm:p-7 shadow-sm">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 rounded-full bg-blue-500/5 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          {/* Warehouse Identity */}
          <div className="flex flex-col sm:flex-row items-center sm:items-start text-center sm:text-left gap-3.5 sm:gap-4">
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-blue-50 text-blue-600 border border-blue-200 dark:bg-blue-950/50 dark:text-blue-400 dark:border-blue-800/50 flex items-center justify-center flex-shrink-0 shadow-sm overflow-hidden">
              <Warehouse className="w-7 h-7 sm:w-8 sm:h-8" />
            </div>

            <div>
              <div className="flex items-center justify-center sm:justify-start gap-2 flex-wrap">
                <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800/60">
                  LOC_MAIN
                </span>
                <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800/60 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  OPERATIONAL
                </span>
                <span className="text-xs text-slate-500 dark:text-zinc-400 hidden sm:inline">
                  Hakmana Rd, Deiyandara Hub
                </span>
              </div>

              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-white mt-1">
                Central Warehouse & Master Catalog
              </h1>

              <p className="text-xs text-slate-600 dark:text-zinc-400 mt-1 flex items-center justify-center sm:justify-start gap-2 sm:gap-3 flex-wrap">
                <span>Buffer Storage & Inbound Hub</span>
                <span className="hidden sm:inline">•</span>
                <span className="inline-flex items-center gap-1.5 bg-slate-100 dark:bg-zinc-800 px-2 py-0.5 rounded-lg border border-slate-200 dark:border-zinc-700">
                  {vehicle?.vehicleImage && (
                    <img
                      src={vehicle.vehicleImage}
                      alt={vehicle.plateNumber || vehicle.id}
                      className="w-4 h-4 rounded-full object-cover border border-slate-300 dark:border-zinc-600"
                    />
                  )}
                  <span>Active Truck: <strong className="text-slate-800 dark:text-zinc-200 font-bold">{vehicle?.id || 'VAN-01'} ({vehicle?.plateNumber || 'WP KDK-4521'})</strong></span>
                  {vehicle?.driver && (
                    <span className="text-[11px] text-slate-500 dark:text-zinc-400">[{vehicle.driver}]</span>
                  )}
                </span>
                <span className="hidden sm:inline">•</span>
                <span>Head Storekeeper: <strong className="text-slate-800 dark:text-zinc-200 font-bold">Bandara</strong></span>
              </p>
            </div>
          </div>

          {/* Quick Header Actions with Responsive Shortened Mobile Labels */}
          <div className="flex items-center justify-center sm:justify-start lg:justify-end gap-1.5 sm:gap-2.5 flex-wrap pt-3 lg:pt-0 border-t lg:border-t-0 border-slate-100 dark:border-zinc-800 w-full lg:w-auto">
            <button
              type="button"
              onClick={() => {
                setProductToEdit(null);
                setModalAddProductOpen(true);
              }}
              className="flex items-center gap-1.5 px-2.5 sm:px-3.5 py-2 sm:py-2.5 rounded-xl bg-accent-600 hover:bg-accent-700 active:scale-95 text-white font-bold text-xs shadow-sm shadow-accent-600/30 transition-all cursor-pointer whitespace-nowrap"
            >
              <Plus size={15} />
              <span className="hidden sm:inline">Register SKU</span>
              <span className="sm:hidden">SKU</span>
            </button>

            <button
              type="button"
              onClick={() => setModalReceivePoOpen(true)}
              className="flex items-center gap-1.5 px-2.5 sm:px-3.5 py-2 sm:py-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 dark:text-zinc-200 dark:border-zinc-700 font-semibold text-xs transition-all cursor-pointer whitespace-nowrap"
            >
              <Receipt size={15} />
              <span className="hidden sm:inline">Receive PO</span>
              <span className="sm:hidden">PO In</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setTargetProductId(null);
                setModalAdjustOpen(true);
              }}
              className="flex items-center gap-1.5 px-2.5 sm:px-3.5 py-2 sm:py-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 dark:text-zinc-200 dark:border-zinc-700 font-semibold text-xs transition-all cursor-pointer whitespace-nowrap"
            >
              <SlidersHorizontal size={15} />
              <span className="hidden sm:inline">Stocktake Audit</span>
              <span className="sm:hidden">Audit</span>
            </button>

            <button
              type="button"
              onClick={() => navigate('/van-stock/transfer')}
              className="flex items-center gap-1.5 px-2.5 sm:px-3.5 py-2 sm:py-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 dark:text-zinc-200 dark:border-zinc-700 font-semibold text-xs transition-all cursor-pointer whitespace-nowrap"
            >
              <ArrowRightLeft size={15} />
              <span className="hidden sm:inline">Transfer Workbench</span>
              <span className="sm:hidden">Transfer</span>
            </button>

            <button
              type="button"
              onClick={() => setModalOwnerSignOpen(true)}
              className="p-2 sm:p-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 dark:text-zinc-200 dark:border-zinc-700 transition-all cursor-pointer"
              title="Configure Official Owner Signature"
            >
              <ShieldCheck size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          2. WAREHOUSE KPI SUMMARY CARDS
         ───────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
        {/* KPI 1: Total Warehouse Valuation */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs">
            <span className="font-semibold uppercase tracking-wider text-[10px]">Total Valuation</span>
            <Warehouse size={15} className="text-blue-600 dark:text-blue-400" />
          </div>
          <div className="text-base sm:text-lg font-black text-slate-900 dark:text-white font-mono truncate">
            {formatLKR(warehouseKpis.totalValue)}
          </div>
          <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium block">
            Central Buffer Stock
          </span>
        </div>

        {/* KPI 2: Total Units */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs">
            <span className="font-semibold uppercase tracking-wider text-[10px]">Total Units</span>
            <Package size={15} className="text-accent-600 dark:text-accent-400" />
          </div>
          <div className="text-base sm:text-lg font-black text-slate-900 dark:text-white font-mono">
            {warehouseKpis.totalUnits.toLocaleString()}
          </div>
          <span className="text-[10px] text-slate-400 dark:text-slate-500 block">
            Across master items
          </span>
        </div>

        {/* KPI 3: Active Master SKUs */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs">
            <span className="font-semibold uppercase tracking-wider text-[10px]">Active SKUs</span>
            <Layers size={15} className="text-indigo-600 dark:text-indigo-400" />
          </div>
          <div className="text-base sm:text-lg font-black text-slate-900 dark:text-white font-mono">
            {warehouseKpis.activeSkusCount}
          </div>
          <span className="text-[10px] text-slate-400 dark:text-slate-500 block">
            Master SKU catalog
          </span>
        </div>

        {/* KPI 4: Stock Alerts */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs">
            <span className="font-semibold uppercase tracking-wider text-[10px]">Stock Alerts</span>
            <AlertTriangle size={15} className="text-amber-500" />
          </div>
          <div className="text-base sm:text-lg font-black text-slate-900 dark:text-white font-mono">
            {warehouseKpis.alertCount}
          </div>
          <span className="text-[10px] text-amber-600 dark:text-amber-400 font-medium block">
            {warehouseKpis.outOfStockCount} out of stock, {warehouseKpis.lowStockCount} low
          </span>
        </div>

        {/* KPI 5: Inbound PO Intake Value */}
        <div className="col-span-2 lg:col-span-1 p-4 rounded-2xl bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs">
            <span className="font-semibold uppercase tracking-wider text-[10px]">Inbound PO Value</span>
            <TrendingUp size={15} className="text-emerald-500" />
          </div>
          <div className="text-base sm:text-lg font-black text-slate-900 dark:text-white font-mono truncate">
            {formatLKR(warehouseKpis.inboundPoValue)}
          </div>
          <span className="text-[10px] text-slate-400 dark:text-slate-500 block">
            Supplier intake received
          </span>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          3. UNIFIED SEARCHABLESELECT & DATE PRESET FILTER ENGINE
         ───────────────────────────────────────────────────────────── */}
      <div className="space-y-3">
        <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Search Query Input */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search warehouse catalog by SKU, product name..."
              className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-accent-500"
            />
          </div>

          {/* Universal SearchableSelect Controls (No native <select>) */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Category Filter */}
            <div className="w-48 sm:w-56">
              <SearchableSelect
                value={categoryFilter}
                onChange={setCategoryFilter}
                options={categoryOptions}
                placeholder="Filter Category"
                size="sm"
                icon={Filter}
                portal
              />
            </div>

            {/* Stock Availability Filter */}
            <div className="w-48 sm:w-52">
              <SearchableSelect
                value={stockAvailabilityFilter}
                onChange={setStockAvailabilityFilter}
                options={stockAvailabilityOptions}
                placeholder="Stock Level"
                size="sm"
                portal
              />
            </div>
          </div>
        </div>

        {/* Unified Date Preset Filter Bar */}
        <DateFilterBar
          selectedPreset={datePreset}
          onPresetChange={setDatePreset}
          customStart={customStart}
          onCustomStartChange={setCustomStart}
          customEnd={customEnd}
          onCustomEndChange={setCustomEnd}
          resultCount={filteredCatalog.length}
          label="Warehouse Inventory Audit Scope"
        />
      </div>

      {/* ─────────────────────────────────────────────────────────────
          4. MASTER SKU CATALOG TABLE / MOBILE TOUCH CARDS (Full-height natural layout)
         ───────────────────────────────────────────────────────────── */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 shadow-sm">
        <div className="px-5 py-4 border-b border-gray-100 dark:border-slate-700 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">
              Central Warehouse Stock Catalog ({filteredCatalog.length})
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setProductToEdit(null);
                setModalAddProductOpen(true);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl bg-accent-600 hover:bg-accent-700 text-white shadow-sm transition-all cursor-pointer"
            >
              <Plus size={14} />
              <span>Register New SKU</span>
            </button>
          </div>
        </div>

        {filteredCatalog.length === 0 ? (
          <div className="py-14 text-center text-slate-400 text-xs">
            <Warehouse className="w-12 h-12 mx-auto mb-2 opacity-30" />
            <p className="font-semibold text-slate-600 dark:text-slate-300">No warehouse stock matches active filters.</p>
            <p className="mt-1">Try clearing filters or adding new master inventory.</p>
          </div>
        ) : (
          <>
            {/* Desktop Table View (>=768px) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full border-collapse text-left text-xs">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-900/50 text-[10px] uppercase font-bold text-slate-500 dark:text-slate-300 tracking-wider">
                    <th className="py-3 px-4">SKU / Item</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-3 text-center">Unit</th>
                    <th className="py-3 px-4 text-right">Warehouse On-Hand</th>
                    <th className="py-3 px-3 text-center">Status</th>
                    <th className="py-3 px-4 text-right">Base Price</th>
                    <th className="py-3 px-3 text-center">Disc %</th>
                    <th className="py-3 px-4 text-right">Net Wholesale</th>
                    <th className="py-3 px-4 text-right">Asset Valuation</th>
                    <th className="py-3 px-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-slate-700/60">
                  {filteredCatalog.map((item) => {
                    const product = products.find((p) => p.id === item.productId);
                    const netPrice = calcNetUnitPrice(item.basePrice, item.companyDiscountPercent);
                    const totalVal = calcTotalRealValue(netPrice, item.quantity);

                    return (
                      <tr
                        key={item.id}
                        className="hover:bg-slate-50/80 dark:hover:bg-slate-700/40 transition-colors"
                      >
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-orange-50 text-orange-700 border border-orange-200 dark:bg-orange-950/60 dark:text-orange-300 dark:border-orange-800/60">
                              {item.sku}
                            </span>
                            <span className="font-bold text-slate-900 dark:text-white truncate max-w-[180px]">
                              {item.productName}
                            </span>
                          </div>
                        </td>

                        <td className="py-3 px-4 text-slate-600 dark:text-slate-300">
                          {product?.category || 'General'}
                        </td>

                        <td className="py-3 px-3 text-center text-slate-500 dark:text-slate-300">
                          {item.unit}
                        </td>

                        <td className="py-3 px-4 text-right font-mono font-bold text-slate-900 dark:text-white text-sm">
                          {item.quantity}
                        </td>

                        <td className="py-3 px-3 text-center">
                          <span
                            className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                              item.quantity > 20
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
                                : item.quantity > 0
                                ? 'bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800'
                                : 'bg-red-50 text-red-700 border border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800 animate-pulse'
                            }`}
                          >
                            {item.quantity > 20
                              ? 'In Stock'
                              : item.quantity > 0
                              ? 'Low Stock'
                              : 'Out of Stock'}
                          </span>
                        </td>

                        <td className="py-3 px-4 text-right font-mono text-slate-600 dark:text-slate-300">
                          {Number(item.basePrice).toFixed(2)}
                        </td>

                        <td className="py-3 px-3 text-center font-mono text-slate-500 dark:text-slate-300">
                          {item.companyDiscountPercent}%
                        </td>

                        <td className="py-3 px-4 text-right font-mono text-slate-800 dark:text-slate-200 font-semibold">
                          {formatLKR(netPrice)}
                        </td>

                        <td className="py-3 px-4 text-right font-mono font-bold text-accent-700 dark:text-accent-300">
                          {formatLKR(totalVal)}
                        </td>

                        <td className="py-3 px-4 text-center relative">
                          {/* Professional Shadcn UI 3-Dots Action Menu */}
                          <div className="relative flex items-center justify-center">
                            <DropdownMenu className="relative">
                              <DropdownMenuTrigger
                                className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-700/60 transition-colors cursor-pointer"
                                title="Open Actions Menu"
                              >
                                <MoreVertical size={16} />
                              </DropdownMenuTrigger>
                              <DropdownMenuContent
                                align="end"
                                width="w-48"
                                className="bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 shadow-xl z-[9999]"
                              >
                                <DropdownMenuLabel>SKU Actions</DropdownMenuLabel>
                                <DropdownMenuItem
                                  icon={Truck}
                                  onClick={() => handleQuickLoad(item.productId)}
                                >
                                  Load to Van
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  icon={SlidersHorizontal}
                                  onClick={() => handleAdjustStock(item.productId)}
                                >
                                  Stocktake Adjust
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  icon={Edit}
                                  onClick={() => handleEditSku(product || item)}
                                >
                                  Edit SKU Specs
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  icon={Trash2}
                                  destructive
                                  onClick={() => handleDeleteSku(item.productId, item.productName)}
                                >
                                  Delete SKU
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Touch Cards (<768px) */}
            <div className="md:hidden divide-y divide-gray-100 dark:divide-slate-700/60">
              {filteredCatalog.map((item) => {
                const product = products.find((p) => p.id === item.productId);
                const netPrice = calcNetUnitPrice(item.basePrice, item.companyDiscountPercent);
                const totalVal = calcTotalRealValue(netPrice, item.quantity);

                return (
                  <div key={item.id} className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-orange-50 text-orange-700 border border-orange-200 dark:bg-orange-950/60 dark:text-orange-300 dark:border-orange-800/60">
                          {item.sku}
                        </span>
                        <h3 className="text-sm font-bold text-slate-900 dark:text-white mt-1 leading-snug">
                          {item.productName}
                        </h3>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                          {product?.category || 'General'}
                        </p>
                      </div>

                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          item.quantity > 20
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300'
                            : item.quantity > 0
                            ? 'bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-300'
                            : 'bg-red-50 text-red-700 border border-red-200 dark:bg-red-950/40 dark:text-red-300'
                        }`}
                      >
                        {item.quantity > 20
                          ? 'In Stock'
                          : item.quantity > 0
                          ? 'Low Stock'
                          : 'Out of Stock'}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-gray-100 dark:border-slate-700/60">
                      <div>
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 block">Warehouse On-Hand:</span>
                        <strong className="text-sm font-mono text-slate-900 dark:text-white">
                          {item.quantity} {item.unit}
                        </strong>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 block">Asset Valuation:</span>
                        <strong className="text-sm font-mono text-accent-700 dark:text-accent-300">
                          {formatLKR(totalVal)}
                        </strong>
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-2 pt-2 border-t border-gray-100 dark:border-slate-700/60">
                      <button
                        type="button"
                        onClick={() => handleQuickLoad(item.productId)}
                        className="flex-1 py-1.5 px-3 text-xs font-bold rounded-xl bg-accent-600 hover:bg-accent-700 text-white shadow-sm text-center"
                      >
                        Load to Van
                      </button>

                      {/* Mobile 3-Dots Action Menu */}
                      <div className="relative">
                        <DropdownMenu className="relative">
                          <DropdownMenuTrigger
                            className="p-2 rounded-xl border border-gray-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                            title="More Actions"
                          >
                            <MoreVertical size={16} />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent
                            align="end"
                            width="w-48"
                            className="bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 shadow-xl z-[9999]"
                          >
                          <DropdownMenuItem
                            icon={SlidersHorizontal}
                            onClick={() => handleAdjustStock(item.productId)}
                          >
                            Stocktake Adjust
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            icon={Edit}
                            onClick={() => handleEditSku(product || item)}
                          >
                            Edit SKU Specs
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            icon={Trash2}
                            destructive
                            onClick={() => handleDeleteSku(item.productId, item.productName)}
                          >
                            Delete SKU
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* ─────────────────────────────────────────────────────────────
          5. OPERATIONAL MODALS
         ───────────────────────────────────────────────────────────── */}
      <AddProductModal
        isOpen={modalAddProductOpen}
        onClose={() => {
          setModalAddProductOpen(false);
          setProductToEdit(null);
        }}
        productToEdit={productToEdit}
      />

      <ReceivePurchaseModal
        isOpen={modalReceivePoOpen}
        onClose={() => setModalReceivePoOpen(false)}
      />

      <AdjustStockModal
        isOpen={modalAdjustOpen}
        onClose={() => {
          setModalAdjustOpen(false);
          setTargetProductId(null);
        }}
        initialProductId={targetProductId}
      />

      <LoadVanStockModal
        isOpen={modalLoadVanOpen}
        onClose={() => {
          setModalLoadVanOpen(false);
          setTargetProductId(null);
        }}
        initialProductId={targetProductId}
      />

      <OwnerSignatureModal
        isOpen={modalOwnerSignOpen}
        onClose={() => setModalOwnerSignOpen(false)}
      />

      {/* Delete SKU Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setItemToDelete(null);
        }}
        onConfirm={confirmDeleteSku}
        entityType="sku"
        entityName={itemToDelete?.prodName || ''}
        message={
          itemToDelete ? (
            <>
              Are you sure you want to delete SKU{' '}
              <span className="font-semibold text-gray-800 dark:text-slate-200">
                "{itemToDelete.prodName}"
              </span>
              ? This will remove all associated stock.
            </>
          ) : null
        }
      />
    </VanStockLayout>
  );
}

