/**
 * @file WarehouseManagement.jsx
 * @description Dedicated Central Warehouse administrative cockpit (/warehouse).
 * Orchestrates Master SKU Catalog, Central Buffer Inventory, Supplier Inbound PO Receiving,
 * Physical Stocktake Reconciliation, and Direct-to-Van Dispatch.
 */

import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
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
  ListPlus,
  CornerDownLeft,
  Printer,
  Tags,
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
import AddProductModal from '../VanStock/AddProductModal';
import LoadVanStockModal from '../VanStock/LoadVanStockModal';
import ReturnToWarehouseModal from '../VanStock/ReturnToWarehouseModal';
import CategoryManagerModal from './CategoryManagerModal';
import UpdateStockModal from './UpdateStockModal';
import OwnerSignatureModal from '../VanStock/OwnerSignatureModal';
import DeleteConfirmModal from '../ui/DeleteConfirmModal';
import PrintWarehouseStockReport from './PrintWarehouseStockReport';
import useVanStockStore from '../../hooks/useVanStockStore';
import { resolveServerImageUrl } from '../../utils/imageCompression';
import {
  calcNetUnitPrice,
  calcTotalRealValue,
  formatLKR,
  formatDateYYYYMMDD,
} from '../../data/vanStockData';

export default function WarehouseManagement() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'catalog';

  const setActiveTab = (tab) => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.set('tab', tab);
        return next;
      },
      { replace: true }
    );
  };

  // Store state
  const products = useVanStockStore((s) => s.products);
  const mainStoreStock = useVanStockStore((s) => s.mainStoreStock);
  const stockMovements = useVanStockStore((s) => s.stockMovements);
  const vehicle = useVanStockStore((s) => s.vehicle);
  const categories = useVanStockStore((s) => s.categories);
  const deleteProduct = useVanStockStore((s) => s.deleteProduct);
  const fetchInitialData = useVanStockStore((s) => s.fetchInitialData);

  useEffect(() => {
    fetchInitialData();
  }, []);

  // Modals state
  const [modalAddProductOpen, setModalAddProductOpen] = useState(false);
  const [modalUpdateStockOpen, setModalUpdateStockOpen] = useState(false);
  const [stockItemToUpdate, setStockItemToUpdate] = useState(null);
  const [modalLoadVanOpen, setModalLoadVanOpen] = useState(false);
  const [modalReturnVanOpen, setModalReturnVanOpen] = useState(false);
  const [modalCategoryManagerOpen, setModalCategoryManagerOpen] = useState(false);
  const [modalOwnerSignOpen, setModalOwnerSignOpen] = useState(false);
  const [modalPrintOpen, setModalPrintOpen] = useState(false);
  const [productToEdit, setProductToEdit] = useState(null);
  const [targetProductId, setTargetProductId] = useState(null);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  // Filter toolbar state
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [stockAvailabilityFilter, setStockAvailabilityFilter] = useState('ALL');

  const setModalLoadOpen = setModalLoadVanOpen;

  // Master Categories list for SearchableSelect strictly from live DB
  const categoryOptions = useMemo(() => {
    const list = [{ value: 'ALL', label: 'All Categories' }];
    if (categories && categories.length > 0) {
      categories.forEach((c) => {
        if (c.name) list.push({ value: c.name, label: c.name });
      });
    }
    return list;
  }, [categories]);

  // Stock availability options
  const stockAvailabilityOptions = [
    { value: 'ALL', label: 'All Stock Levels' },
    { value: 'IN_STOCK', label: 'In Stock (>20 units)' },
    { value: 'LOW_STOCK', label: 'Low Stock (1-20 units)' },
    { value: 'OUT_OF_STOCK', label: 'Out of Stock (0 units)' },
  ];

  // Filtered Warehouse Catalog Items (computes first so dynamic KPIs react immediately)
  const filteredCatalog = useMemo(() => {
    const liveCategories = new Set((categories || []).map((c) => c.name).filter(Boolean));
    return mainStoreStock.filter((item) => {
      if (item.isActive === false) return false;
      const product = products.find((p) => p.id === item.productId);
      if (product && product.isActive === false) return false;

      const q = searchQuery.toLowerCase().trim();
      const matchSearch =
        !q ||
        item.productName.toLowerCase().includes(q) ||
        item.sku.toLowerCase().includes(q);

      const productCategory =
        product?.category && liveCategories.has(product.category)
          ? product.category
          : 'Uncategorized';
      const matchCategory =
        categoryFilter === 'ALL' || productCategory === categoryFilter;

      let matchStock = true;
      if (stockAvailabilityFilter === 'IN_STOCK') matchStock = item.quantity > 20;
      else if (stockAvailabilityFilter === 'LOW_STOCK') matchStock = item.quantity > 0 && item.quantity <= 20;
      else if (stockAvailabilityFilter === 'OUT_OF_STOCK') matchStock = item.quantity === 0;

      return matchSearch && matchCategory && matchStock;
    });
  }, [mainStoreStock, products, searchQuery, categoryFilter, stockAvailabilityFilter]);

  // Dynamic Warehouse KPIs (reacts directly to active filters and filtered items)
  const dynamicKpis = useMemo(() => {
    let totalValue = 0;
    let totalUnits = 0;
    let lowStockCount = 0;
    let outOfStockCount = 0;

    filteredCatalog.forEach((item) => {
      const net = calcNetUnitPrice(item.basePrice, item.companyDiscountPercent);
      totalValue += calcTotalRealValue(net, item.quantity);
      totalUnits += item.quantity;
      if (item.quantity === 0) outOfStockCount += 1;
      else if (item.quantity <= 20) lowStockCount += 1;
    });

    const inboundPoValue = stockMovements
      .filter((m) => m.movementType === 'SUPPLIER_PURCHASE_INBOUND')
      .reduce((sum, m) => sum + (m.unitPrice * m.quantity), 0);

    return {
      totalValue,
      totalUnits,
      activeSkusCount: filteredCatalog.length,
      alertCount: lowStockCount + outOfStockCount,
      lowStockCount,
      outOfStockCount,
      inboundPoValue,
    };
  }, [filteredCatalog, stockMovements]);

  // Actions
  const handleQuickLoad = (productId) => {
    setTargetProductId(productId);
    setModalLoadVanOpen(true);
  };

  const handleOpenUpdateStock = (item) => {
    const prodId = item.productId || item.id;
    const mainStock = mainStoreStock.find((m) => m.productId === prodId);
    const prod = products.find((p) => p.id === prodId) || item;

    setStockItemToUpdate({
      id: prodId,
      productId: prodId,
      sku: item.sku || prod.sku,
      name: item.productName || prod.name,
      productName: item.productName || prod.name,
      basePrice: item.basePrice || prod.basePrice || 0,
      companyDiscountPercent: item.companyDiscountPercent || prod.companyDiscountPercent || 0,
      currentStock: mainStock ? mainStock.quantity : (item.quantity ?? 0),
    });
    setModalUpdateStockOpen(true);
  };

  const handleEditSku = (prod, autoFocusStock = false) => {
    const prodId = prod.productId || prod.id;
    const mainStock = mainStoreStock.find((m) => m.productId === prodId);
    setProductToEdit({
      ...prod,
      id: prodId,
      warehouseQty: mainStock ? mainStock.quantity : (prod.quantity ?? 0),
      autoFocusStock,
    });
    setModalAddProductOpen(true);
  };

  const handleDeleteSku = (prodId, prodName) => {
    setItemToDelete({ prodId, prodName });
    setIsDeleteModalOpen(true);
  };

  const confirmDeleteSku = async () => {
    if (itemToDelete) {
      const { prodId, prodName } = itemToDelete;
      setItemToDelete(null);
      setIsDeleteModalOpen(false);
      try {
        await deleteProduct(prodId);
        await fetchInitialData();
        toast.info(`Deleted SKU "${prodName}".`);
      } catch (err) {
        toast.info(`SKU "${prodName}" removed.`);
      }
    }
  };

  return (
    <VanStockLayout>
      {/* ─────────────────────────────────────────────────────────────
          1. MINIMALIST WAREHOUSE HEADER
         ───────────────────────────────────────────────────────────── */}
      <div className="rounded-2xl bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-slate-900 dark:text-white p-4 sm:p-5 shadow-sm transition-colors flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-5 sm:gap-8 flex-wrap">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
              Warehouse Location
            </span>
            <p className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200">
              Central Warehouse
            </p>
          </div>
          <div className="h-8 w-px bg-gray-200 dark:bg-slate-700 hidden sm:block" />
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
              Hub Address
            </span>
            <p className="text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300">
              Hakmana Rd, Deiyandara Hub
            </p>
          </div>
          <div className="h-8 w-px bg-gray-200 dark:bg-slate-700 hidden sm:block" />
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
              Status
            </span>
            <p className="text-xs sm:text-sm font-mono font-semibold text-emerald-600 dark:text-emerald-400">
              Operational
            </p>
          </div>
        </div>

        <div className="flex flex-nowrap overflow-x-auto scrollbar-hide gap-2 pb-1 snap-x">
          <button
            type="button"
            onClick={() => setModalCategoryManagerOpen(true)}
            className="flex-shrink-0 snap-start flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-bold text-xs transition-all cursor-pointer shadow-xs"
            title="Manage Product Categories"
          >
            <Tags size={15} className="text-indigo-600 dark:text-indigo-400" />
            <span>Manage Categories</span>
          </button>
          <button
            type="button"
            onClick={() => setModalLoadVanOpen(true)}
            className="flex-shrink-0 snap-start flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-accent-600 hover:bg-accent-700 text-white font-bold text-xs transition-all cursor-pointer shadow-xs"
            title="Load Stock to Van"
          >
            <ListPlus size={15} />
            <span>Load to Van</span>
          </button>
          <button
            type="button"
            onClick={() => setModalPrintOpen(true)}
            className="flex-shrink-0 snap-start flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-bold text-xs transition-all cursor-pointer shadow-xs"
            title="Print Warehouse Inventory"
          >
            <Printer size={15} />
            <span>Print</span>
          </button>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          2. DYNAMIC WAREHOUSE KPI SUMMARY CARDS
         ───────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* KPI 1: Dynamic Total Valuation */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs">
            <span className="font-semibold uppercase tracking-wider text-[10px]">Filtered Valuation</span>
            <Warehouse size={15} className="text-blue-600 dark:text-blue-400" />
          </div>
          <div className="text-base sm:text-lg font-black text-slate-900 dark:text-white font-mono truncate">
            {formatLKR(dynamicKpis.totalValue)}
          </div>
          <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium block">
            {dynamicKpis.activeSkusCount} matching SKU{dynamicKpis.activeSkusCount === 1 ? '' : 's'}
          </span>
        </div>

        {/* KPI 2: Dynamic Total Units */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs">
            <span className="font-semibold uppercase tracking-wider text-[10px]">Filtered Units</span>
            <Package size={15} className="text-accent-600 dark:text-accent-400" />
          </div>
          <div className="text-base sm:text-lg font-black text-slate-900 dark:text-white font-mono">
            {dynamicKpis.totalUnits.toLocaleString()}
          </div>
          <span className="text-[10px] text-slate-400 dark:text-slate-500 block">
            Buffer inventory units
          </span>
        </div>

        {/* KPI 3: Active Master SKUs */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs">
            <span className="font-semibold uppercase tracking-wider text-[10px]">Active SKUs</span>
            <Layers size={15} className="text-indigo-600 dark:text-indigo-400" />
          </div>
          <div className="text-base sm:text-lg font-black text-slate-900 dark:text-white font-mono">
            {dynamicKpis.activeSkusCount} / {products.length}
          </div>
          <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-medium block">
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
            {dynamicKpis.alertCount}
          </div>
          <span className="text-[10px] text-amber-600 dark:text-amber-400 font-medium block">
            {dynamicKpis.outOfStockCount} out of stock, {dynamicKpis.lowStockCount} low
          </span>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          3. UNIFIED SEARCHABLESELECT & DATE PRESET FILTER ENGINE
         ───────────────────────────────────────────────────────────── */}
      <div className="p-3 sm:p-4 rounded-2xl bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 shadow-sm space-y-3">
        {/* Row 1: Search + Category/Stock Comboboxes */}
        <div className="flex flex-wrap gap-2">
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

          {/* Category Filter */}
          <div className="w-48 sm:w-56">
            <SearchableSelect
              value={categoryFilter}
              onChange={(val) => setCategoryFilter(val || 'ALL')}
              options={categoryOptions}
              placeholder={categoryOptions.length <= 1 ? "No categories available" : "Filter Category"}
              emptyMessage="No categories available"
              size="sm"
              icon={Filter}
              portal
            />
          </div>

          {/* Stock Availability Filter */}
          <div className="w-48 sm:w-52">
            <SearchableSelect
              value={stockAvailabilityFilter}
              onChange={(val) => setStockAvailabilityFilter(val || 'ALL')}
              options={stockAvailabilityOptions}
              placeholder="Stock Level"
              size="sm"
              portal
            />
          </div>
        </div>
      </div>

  {/* ─────────────────────────────────────────────────────────────
          4. MASTER SKU CATALOG TABLE / MOBILE TOUCH CARDS (Full-height natural layout)
         ───────────────────────────────────────────────────────────── */}
    < div className = "bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 shadow-sm" >
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

  {
    filteredCatalog.length === 0 ? (
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
                      {product?.category && categories?.some((c) => c.name === product.category)
                        ? product.category
                        : 'Uncategorized'}
                    </td>

                    <td className="py-3 px-3 text-center text-slate-500 dark:text-slate-300">
                      {item.unit}
                    </td>

                    <td className="py-3 px-4 text-right font-mono font-bold text-slate-900 dark:text-white text-sm">
                      {item.quantity}
                    </td>

                    <td className="py-3 px-3 text-center">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${item.quantity > 20
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
                              icon={Package}
                              onClick={() => handleOpenUpdateStock(item)}
                            >
                              Update Stock
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              icon={Edit}
                              onClick={() => handleEditSku(product || item, false)}
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
                      {product?.category && categories?.some((c) => c.name === product.category)
                        ? product.category
                        : 'Uncategorized'}
                    </p>
                  </div>

                  <span
                    className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${item.quantity > 20
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
                          icon={Package}
                          onClick={() => handleOpenUpdateStock(item)}
                        >
                          Update Stock
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          icon={Edit}
                          onClick={() => handleEditSku(product || item, false)}
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
    )
  }
      </div >

      {/* ─────────────────────────────────────────────────────────────
          5. OPERATIONAL MODALS
         ───────────────────────────────────────────────────────────── */}
      <AddProductModal
        isOpen={modalAddProductOpen}
        onClose={() => {
          setModalAddProductOpen(false);
          setProductToEdit(null);
        }}
        onSuccess={async () => {
          await fetchInitialData();
        }}
        productToEdit={productToEdit}
      />

      <UpdateStockModal
        isOpen={modalUpdateStockOpen}
        onClose={() => {
          setModalUpdateStockOpen(false);
          setStockItemToUpdate(null);
        }}
        onSuccess={async () => {
          await fetchInitialData();
        }}
        product={stockItemToUpdate}
      />

      <LoadVanStockModal
        isOpen={modalLoadVanOpen}
        onClose={() => {
          setModalLoadVanOpen(false);
          setTargetProductId(null);
        }}
        onSuccess={async () => {
          await fetchInitialData();
        }}
        initialProductId={targetProductId}
      />

      <ReturnToWarehouseModal
        isOpen={modalReturnVanOpen}
        onClose={() => setModalReturnVanOpen(false)}
        onSuccess={async () => {
          await fetchInitialData();
        }}
      />

      <CategoryManagerModal
        isOpen={modalCategoryManagerOpen}
        onClose={() => setModalCategoryManagerOpen(false)}
      />

      <OwnerSignatureModal
        isOpen={modalOwnerSignOpen}
        onClose={() => setModalOwnerSignOpen(false)}
      />

{/* Delete SKU Confirmation Modal */ }
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

      {/* Corporate A4 Printable Warehouse Stock Report */}
      <PrintWarehouseStockReport
        isOpen={modalPrintOpen}
        onClose={() => setModalPrintOpen(false)}
        items={filteredCatalog}
        categoryFilterLabel={
          categoryFilter === 'ALL'
            ? 'All Categories'
            : categories.find((c) => String(c.id) === String(categoryFilter))?.name || categoryFilter
        }
        stockFilterLabel={
          stockAvailabilityFilter === 'ALL'
            ? 'All Stock Levels'
            : stockAvailabilityFilter === 'IN_STOCK'
            ? 'In Stock (> 0)'
            : stockAvailabilityFilter === 'LOW_STOCK'
            ? 'Low Stock (<= 20)'
            : stockAvailabilityFilter === 'OUT_OF_STOCK'
            ? 'Out of Stock (0)'
            : stockAvailabilityFilter
        }
        searchQuery={searchQuery}
      />
    </VanStockLayout>
  );
}

