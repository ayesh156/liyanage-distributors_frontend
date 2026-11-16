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
  Calendar,
  ChevronLeft,
  ChevronRight,
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
import OwnerSignatureModal from '../VanStock/OwnerSignatureModal';
import DeleteConfirmModal from '../ui/DeleteConfirmModal';
import useVanStockStore from '../../hooks/useVanStockStore';
import { resolveServerImageUrl } from '../../utils/imageCompression';
import {
  calcNetUnitPrice,
  calcTotalRealValue,
  formatLKR,
  formatDateYYYYMMDD,
} from '../../data/vanStockData';

/**
 * Popover Calendar Date Picker supporting single-day and date-range selection
 */
function AuditCalendarPicker({ startDate, endDate, onSelectRange, onClose }) {
  const [viewDate, setViewDate] = useState(() => {
    return startDate ? new Date(startDate) : new Date();
  });
  const [rangeStart, setRangeStart] = useState(startDate || '');
  const [rangeEnd, setRangeEnd] = useState(endDate || '');

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const calendarDays = [];
  for (let i = 0; i < firstDay; i++) calendarDays.push(null);
  for (let d = 1; d <= daysInMonth; d++) calendarDays.push(d);

  const handlePrevMonth = () => {
    setViewDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setViewDate(new Date(year, month + 1, 1));
  };

  const handleDayClick = (day) => {
    if (!day) return;
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    if (!rangeStart || (rangeStart && rangeEnd)) {
      setRangeStart(dateStr);
      setRangeEnd('');
    } else {
      if (dateStr < rangeStart) {
        setRangeEnd(rangeStart);
        setRangeStart(dateStr);
      } else {
        setRangeEnd(dateStr);
      }
    }
  };

  const handleApply = () => {
    onSelectRange(rangeStart, rangeEnd || rangeStart);
    onClose();
  };

  const handleClear = () => {
    setRangeStart('');
    setRangeEnd('');
    onSelectRange('', '');
    onClose();
  };

  return (
    <div className="p-3 bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-700 shadow-2xl w-72 text-xs space-y-2.5 z-50">
      <div className="flex items-center justify-between">
        <span className="font-bold text-slate-800 dark:text-slate-100">
          {monthNames[month]} {year}
        </span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={handlePrevMonth}
            className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 cursor-pointer"
          >
            <ChevronLeft size={14} />
          </button>
          <button
            type="button"
            onClick={handleNextMonth}
            className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 cursor-pointer"
          >
            <ChevronRight size={14} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center font-bold text-[10px] text-slate-400">
        {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d) => (
          <div key={d}>{d}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {calendarDays.map((d, idx) => {
          if (!d) return <div key={idx} />;
          const curStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
          const isStart = rangeStart === curStr;
          const isEnd = rangeEnd === curStr;
          const inRange = rangeStart && rangeEnd && curStr >= rangeStart && curStr <= rangeEnd;
          const isToday = curStr === new Date().toISOString().slice(0, 10);

          let cls = 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200';
          if (isStart || isEnd) {
            cls = 'bg-accent-600 text-white font-bold rounded-lg';
          } else if (inRange) {
            cls = 'bg-accent-100 dark:bg-accent-950/60 text-accent-800 dark:text-accent-200 rounded-md';
          }

          return (
            <button
              key={idx}
              type="button"
              onClick={() => handleDayClick(d)}
              className={`h-7 w-full flex items-center justify-center text-xs transition-colors cursor-pointer relative ${cls} ${isToday && !inRange && !isStart ? 'border border-accent-400 font-bold' : ''}`}
            >
              {d}
            </button>
          );
        })}
      </div>

      <div className="pt-2 border-t border-gray-100 dark:border-slate-800 flex items-center justify-between text-[11px]">
        <button
          type="button"
          onClick={handleClear}
          className="text-slate-500 hover:text-rose-500 cursor-pointer"
        >
          Clear
        </button>
        <button
          type="button"
          onClick={handleApply}
          disabled={!rangeStart}
          className="px-3 py-1 rounded-lg bg-accent-600 hover:bg-accent-700 text-white font-semibold disabled:opacity-40 cursor-pointer"
        >
          Apply
        </button>
      </div>
    </div>
  );
}

/**
 * Unified Modern Day of Week Pills & Shadcn Popover Calendar Filter
 */
function UnifiedDayPillsCalendarFilter({
  selectedDayOfWeek,
  onSelectDayOfWeek,
  calendarDateRange,
  onSelectDateRange,
  onReset,
  label = 'Date Filter',
  resultCount,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const isTodaySelected = calendarDateRange.start === todayStr && calendarDateRange.end === todayStr;

  return (
    <div className="p-3 sm:px-4 rounded-2xl bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
      {/* Day of Week Pills (Today, ALL, Mon - Sun) */}
      <div className="flex items-center gap-1.5 flex-wrap">
        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mr-1 flex items-center gap-1">
          <Calendar size={13} className="text-accent-500" />
          <span>{label}:</span>
        </span>
        <button
          type="button"
          onClick={() => {
            onSelectDateRange({ start: todayStr, end: todayStr });
            onSelectDayOfWeek('ALL');
          }}
          className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
            isTodaySelected
              ? 'bg-accent-600 text-white shadow-xs'
              : 'bg-accent-50 dark:bg-accent-950/40 text-accent-700 dark:text-accent-300 hover:bg-accent-100'
          }`}
        >
          Today
        </button>
        {['ALL', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => {
          const isSelected = selectedDayOfWeek === day;
          return (
            <button
              key={day}
              type="button"
              onClick={() => onSelectDayOfWeek(day)}
              className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                isSelected
                  ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs font-bold'
                  : 'bg-slate-100 dark:bg-slate-700/60 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {day}
            </button>
          );
        })}
      </div>

      {/* Calendar Date Range Picker Popover Trigger + Result count + Reset */}
      <div className="flex items-center gap-2 relative">
        {resultCount !== undefined && (
          <span className="text-xs text-slate-500 dark:text-slate-400 font-medium hidden sm:inline mr-1">
            {resultCount} item{resultCount === 1 ? '' : 's'}
          </span>
        )}

        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl border transition-all cursor-pointer ${
            calendarDateRange.start
              ? 'border-accent-500 bg-accent-50/50 dark:bg-accent-950/30 text-accent-700 dark:text-accent-300 font-bold'
              : 'border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50'
          }`}
        >
          <Calendar size={14} />
          <span>
            {calendarDateRange.start
              ? `${calendarDateRange.start}${calendarDateRange.end && calendarDateRange.end !== calendarDateRange.start ? ` to ${calendarDateRange.end}` : ''}`
              : 'Pick Date Range'}
          </span>
        </button>

        {(selectedDayOfWeek !== 'ALL' || calendarDateRange.start) && (
          <button
            type="button"
            onClick={onReset}
            className="px-2 py-1 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:underline cursor-pointer"
          >
            Reset
          </button>
        )}

        {/* Popover Calendar Picker */}
        {isOpen && (
          <div className="absolute right-0 top-full mt-2 z-50">
            <AuditCalendarPicker
              startDate={calendarDateRange.start}
              endDate={calendarDateRange.end}
              isOpen={isOpen}
              onClose={() => setIsOpen(false)}
              onSelectRange={(start, end) => {
                onSelectDateRange({ start, end });
                onSelectDayOfWeek('ALL');
                setIsOpen(false);
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}

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
  }, [fetchInitialData]);

  // Modals state
  const [modalAddProductOpen, setModalAddProductOpen] = useState(false);
  const [modalLoadVanOpen, setModalLoadVanOpen] = useState(false);
  const [modalReturnVanOpen, setModalReturnVanOpen] = useState(false);
  const [modalCategoryManagerOpen, setModalCategoryManagerOpen] = useState(false);
  const [modalOwnerSignOpen, setModalOwnerSignOpen] = useState(false);
  const [productToEdit, setProductToEdit] = useState(null);
  const [targetProductId, setTargetProductId] = useState(null);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  // Filter toolbar state
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [stockAvailabilityFilter, setStockAvailabilityFilter] = useState('ALL');
  const [selectedDayOfWeek, setSelectedDayOfWeek] = useState('ALL');
  const [calendarDateRange, setCalendarDateRange] = useState({ start: '', end: '' });

  const setModalLoadOpen = setModalLoadVanOpen;

  const handleResetDateFilters = () => {
    setSelectedDayOfWeek('ALL');
    setCalendarDateRange({ start: '', end: '' });
  };

  // Master Categories list for SearchableSelect
  const categoryOptions = useMemo(() => {
    const set = new Set();
    if (categories && categories.length > 0) {
      categories.forEach((c) => {
        if (c.name) set.add(c.name);
      });
    }
    products.forEach((p) => {
      if (p.category) set.add(p.category);
    });
    const list = [{ value: 'ALL', label: 'All Categories' }];
    set.forEach((cat) => list.push({ value: cat, label: cat }));
    return list;
  }, [categories, products]);

  // Stock availability options
  const stockAvailabilityOptions = [
    { value: 'ALL', label: 'All Stock Levels' },
    { value: 'IN_STOCK', label: 'In Stock (>20 units)' },
    { value: 'LOW_STOCK', label: 'Low Stock (1-20 units)' },
    { value: 'OUT_OF_STOCK', label: 'Out of Stock (0 units)' },
  ];

  // Filtered Warehouse Catalog Items (computes first so dynamic KPIs react immediately)
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

      // Date preset / Shadcn Day-Pill & Range check (matching item update or product creation timestamp)
      const dateToCheck = item.updatedAt || item.createdAt || new Date().toISOString();
      let matchDate = true;
      if (calendarDateRange.start) {
        const dtStr = formatDateYYYYMMDD(dateToCheck);
        if (calendarDateRange.end && calendarDateRange.end !== calendarDateRange.start) {
          matchDate = dtStr >= calendarDateRange.start && dtStr <= calendarDateRange.end;
        } else {
          matchDate = dtStr === calendarDateRange.start;
        }
      } else if (selectedDayOfWeek !== 'ALL') {
        const dt = new Date(dateToCheck);
        const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        matchDate = dayNames[dt.getDay()] === selectedDayOfWeek;
      }

      return matchSearch && matchCategory && matchStock && matchDate;
    });
  }, [mainStoreStock, products, searchQuery, categoryFilter, stockAvailabilityFilter, selectedDayOfWeek, calendarDateRange]);

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
          1. MINIMALIST WAREHOUSE HEADER
         ───────────────────────────────────────────────────────────── */}
      <div className="rounded-2xl bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-slate-900 dark:text-white p-4 sm:p-5 shadow-sm transition-colors flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-5 sm:gap-8 flex-wrap">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
              Warehouse Location
            </span>
            <p className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200">
              Central Warehouse (LOC_MAIN)
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

        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          <button
            type="button"
            onClick={() => setModalCategoryManagerOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-bold text-xs transition-all cursor-pointer shadow-xs"
            title="Manage Product Categories"
          >
            <Tags size={15} className="text-indigo-600 dark:text-indigo-400" />
            <span>Manage Categories</span>
          </button>
          <button
            type="button"
            onClick={() => setModalLoadVanOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-accent-600 hover:bg-accent-700 text-white font-bold text-xs transition-all cursor-pointer shadow-xs"
            title="Load Stock to Van"
          >
            <ListPlus size={15} />
            <span>Load to Van</span>
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-bold text-xs transition-all cursor-pointer shadow-xs"
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

        {/* Unified Day Pills & Popover Calendar Date Range Filter */}
        <UnifiedDayPillsCalendarFilter
          selectedDayOfWeek={selectedDayOfWeek}
          onSelectDayOfWeek={setSelectedDayOfWeek}
          calendarDateRange={calendarDateRange}
          onSelectDateRange={(range) => {
            setCalendarDateRange(range);
            setSelectedDayOfWeek('ALL');
          }}
          onReset={handleResetDateFilters}
          label="Warehouse Audit Scope"
          resultCount={filteredCatalog.length}
        />
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
    )
  }
      </div >

  {/* ─────────────────────────────────────────────────────────────
          5. OPERATIONAL MODALS
         ───────────────────────────────────────────────────────────── */}
    < AddProductModal
  isOpen = { modalAddProductOpen }
  onClose = {() => {
    setModalAddProductOpen(false);
    setProductToEdit(null);
  }
}
productToEdit = { productToEdit }
  />


      <LoadVanStockModal
        isOpen={modalLoadVanOpen}
        onClose={() => {
          setModalLoadVanOpen(false);
          setTargetProductId(null);
        }}
        initialProductId={targetProductId}
      />

      <ReturnToWarehouseModal
        isOpen={modalReturnVanOpen}
        onClose={() => setModalReturnVanOpen(false)}
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
    </VanStockLayout>
  );
}

