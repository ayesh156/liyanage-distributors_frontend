/**
 * @file VanStockManagement.jsx
 * @description Central administrative cockpit orchestrator for active field delivery van operations.
 * Focuses strictly on mobile vehicle inventory, daily dispatch & digital owner pre-signatures,
 * on-hand van stock with direct item quantity modification & automatic warehouse rebalancing,
 * automated par replenishment planner, quarantined damaged goods ledger with printable audit report,
 * immutable stock movements, and universal SearchableSelect + DateFilterBar filtering.
 */

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Truck,
  AlertTriangle,
  TrendingUp,
  Plus,
  ListPlus,
  ArrowRightLeft,
  RotateCcw,
  Receipt,
  Printer,
  Share2,
  Package,
  PackageCheck,
  Search,
  Filter,
  SlidersHorizontal,
  PackagePlus,
  ExternalLink,
  ShieldCheck,
  Check,
  Sparkles,
  Zap,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileText,
  Trash2,
  Edit,
  PenTool,
  Lock,
  Calendar,
  Warehouse,
  MoreVertical,
  ChevronLeft,
  ChevronRight,
  Sun,
  Moon,
  CheckSquare,
  Square,
  UserCheck,
} from 'lucide-react';
import { toast } from 'react-toastify';
import VanStockLayout from './VanStockLayout';
import LoadVanStockModal from './LoadVanStockModal';
import AddVanStockModal from './AddVanStockModal';
import AddProductModal from './AddProductModal';
import LogDamagedGoodsModal from './LogDamagedGoodsModal';
import VehicleSalesModal from './VehicleSalesModal';
import ReturnToStoreModal from './ReturnToStoreModal';
import PrintVanStockSheet from './PrintVanStockSheet';
import PrintDamagedGoodsReport from './PrintDamagedGoodsReport';
import EditVanItemQtyModal from './EditVanItemQtyModal';
import OwnerSignatureModal from './OwnerSignatureModal';
import SignaturePadModal from './SignaturePadModal';
import SearchableSelect from '../ui/SearchableSelect';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '../ui/DropdownMenu';
import useAppStore from '../../hooks/useAppStore';
import useVanStockStore, { getOperatingDateStr } from '../../hooks/useVanStockStore';
import { resolveServerImageUrl } from '../../utils/imageCompression';
import {
  calcNetUnitPrice,
  calcTotalRealValue,
  formatLKR,
  isDateInPreset,
  formatDateYYYYMMDD,
} from '../../data/vanStockData';
import { DEFAULT_OWNER_SIGNATURE } from '../../data/defaultOwnerSignature';

/**
 * Simple English human-readable movement labels & visual badges
 */
export function getHumanMovementLabel(type) {
  switch (type) {
    case 'VEHICLE_SALES_OUTBOUND':
      return {
        label: 'Van Sale',
        badge: 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800/60',
      };
    case 'STORE_TO_VEHICLE_LOAD':
      return {
        label: 'Loaded to Van',
        badge: 'bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800/60',
      };
    case 'VEHICLE_TO_STORE_RETURN':
      return {
        label: 'Returned to Store',
        badge: 'bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800/60',
      };
    case 'RETURN_TO_DAMAGED_POOL':
      return {
        label: 'Damaged Item',
        badge: 'bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800/60',
      };
    case 'SUPPLIER_PURCHASE_INBOUND':
      return {
        label: 'Stock Received',
        badge: 'bg-purple-50 text-purple-700 border border-purple-200 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-800/60',
      };
    case 'DAMAGED_WRITE_OFF':
      return {
        label: 'Damaged Write-Off',
        badge: 'bg-slate-100 text-slate-700 border border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
      };
    case 'WAREHOUSE_AUDIT_ADJUSTMENT':
      return {
        label: 'Audit Adjustment',
        badge: 'bg-cyan-50 text-cyan-700 border border-cyan-200 dark:bg-cyan-950/60 dark:text-cyan-300 dark:border-cyan-800/60',
      };
    default:
      return {
        label: type ? type.replace(/_/g, ' ') : 'Movement',
        badge: 'bg-slate-100 text-slate-800 border border-slate-200 dark:bg-slate-800 dark:text-slate-200',
      };
  }
}

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
 * Safely formats movement audit timestamps to standard YYYY-MM-DD hh:mm a.
 * Handles both ISO strings, date objects, and Unix numbers with fallback.
 *
 * @param {string|number|Date} rawDate
 * @returns {string} Formatted timestamp string e.g. '2026-11-06 09:30 AM' or 'N/A'
 */
function formatMovementTimestamp(rawDate) {
  return formatDateYYYYMMDD(rawDate, true);
}

/**
 * Derives original load date from explicit loadDate or extracts from manifest code e.g. MAN-20261105-01.
 * Standardizes to YYYY-MM-DD string.
 *
 * @param {Object} item
 * @returns {string} Formatted load date
 */
function deriveItemLoadDate(item) {
  if (item?.loadDate) return formatDateYYYYMMDD(item.loadDate);
  const manifest = item?.manifestNo || item?.sourceManifestNo || '';
  const match = String(manifest).match(/MAN-(\d{4})(\d{2})(\d{2})/);
  if (match) {
    return `${match[1]}-${match[2]}-${match[3]}`;
  }
  return formatDateYYYYMMDD(item?.createdAt);
}

/**
 * Resolves day name ('Mon', 'Tue', ...) to a deterministic YYYY-MM-DD date in the current week.
 * Assumes Monday-Sunday operating week.
 */
function getDateForDayOfWeek(dayName) {
  if (!dayName || dayName === 'ALL') return null;
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const targetDayIdx = dayNames.indexOf(dayName);
  if (targetDayIdx === -1) return null;

  const now = new Date();
  const currentDayIdx = now.getDay();

  // Convert to 1-7 (Mon=1 ... Sun=7)
  const currentIsoDay = currentDayIdx === 0 ? 7 : currentDayIdx;
  const targetIsoDay = targetDayIdx === 0 ? 7 : targetDayIdx;
  const diffDays = targetIsoDay - currentIsoDay;

  const targetDate = new Date(now);
  targetDate.setDate(now.getDate() + diffDays);
  return formatDateYYYYMMDD(targetDate);
}

/**
 * Determines the earliest known load or creation date for a Van Stock item.
 * Evaluates stock movements, explicit loadDate, manifest patterns, or createdAt.
 */
function getItemFirstLoadedDate(item, stockMovements = []) {
  if (!item) return null;

  // 1. Earliest STORE_TO_VEHICLE_LOAD movement for this product/sku
  if (Array.isArray(stockMovements) && stockMovements.length > 0) {
    const pid = item.productId || item.id;
    const sku = item.sku;
    const loads = stockMovements.filter(
      (m) =>
        m.movementType === 'STORE_TO_VEHICLE_LOAD' &&
        ((pid && (Number(m.productId) === Number(pid) || m.productId === pid)) ||
         (sku && m.sku && m.sku.toLowerCase() === sku.toLowerCase()))
    );
    if (loads.length > 0) {
      let earliestDate = null;
      loads.forEach((m) => {
        const raw = m.timestamp || m.createdAt;
        if (raw) {
          const dStr = formatDateYYYYMMDD(raw);
          if (dStr && (!earliestDate || dStr < earliestDate)) {
            earliestDate = dStr;
          }
        }
      });
      if (earliestDate) return earliestDate;
    }
  }

  // 2. Explicit loadDate
  if (item.loadDate) {
    const dStr = formatDateYYYYMMDD(item.loadDate);
    if (dStr) return dStr;
  }

  // 3. Manifest number pattern MAN-YYYYMMDD-01
  const manifest = item.manifestNo || item.sourceManifestNo || '';
  const match = String(manifest).match(/MAN-(\d{4})(\d{2})(\d{2})/);
  if (match) {
    return `${match[1]}-${match[2]}-${match[3]}`;
  }

  // 4. Initial createdAt
  if (item.createdAt) {
    const dStr = formatDateYYYYMMDD(item.createdAt);
    if (dStr) return dStr;
  }

  return null;
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

export default function VanStockManagement() {
  const navigate = useNavigate();

  // Store state
  const salesPersons = useAppStore((s) => s.salesPersons);
  const routes = useAppStore((s) => s.routes);
  const vehicle = useVanStockStore((s) => s.vehicle);
  const products = useVanStockStore((s) => s.products);
  const vanStock = useVanStockStore((s) => s.vanStock);
  const mainStoreStock = useVanStockStore((s) => s.mainStoreStock);
  const damagedGoods = useVanStockStore((s) => s.damagedGoods);
  const stockMovements = useVanStockStore((s) => s.stockMovements);
  const dailyManifest = useVanStockStore((s) => s.dailyManifest);
  const manifestHistory = useVanStockStore((s) => s.manifestHistory);
  const ownerSignatureData = useVanStockStore((s) => s.ownerSignatureData);
  const categories = useVanStockStore((s) => s.categories);
  const [searchParams, setSearchParams] = useSearchParams();
  const urlTab = searchParams.get('tab');
  const storeActiveTab = useVanStockStore((s) => s.activeTab);
  const setStoreActiveTab = useVanStockStore((s) => s.setActiveTab);
  const activeTab = urlTab || storeActiveTab || 'on-hand';

  const setActiveTab = (tab) => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.set('tab', tab);
        return next;
      },
      { replace: true }
    );
    setStoreActiveTab(tab);
  };
  const getKpis = useVanStockStore((s) => s.getKpis);
  const getRestockRequirements = useVanStockStore((s) => s.getRestockRequirements);
  const resolveDamagedRecord = useVanStockStore((s) => s.resolveDamagedRecord);
  const dispatchDailyManifest = useVanStockStore((s) => s.dispatchDailyManifest);
  const reDispatchManifest = useVanStockStore((s) => s.reDispatchManifest);
  const fetchInitialData = useVanStockStore((s) => s.fetchInitialData);
  const toggleRepItemChecked = useVanStockStore((s) => s.toggleRepItemChecked);
  const toggleEveningItemChecked = useVanStockStore((s) => s.toggleEveningItemChecked);
  const toggleAllRepItemsChecked = useVanStockStore((s) => s.toggleAllRepItemsChecked);
  const toggleAllEveningItemsChecked = useVanStockStore((s) => s.toggleAllEveningItemsChecked);
  const getManifestForDate = useVanStockStore((s) => s.getManifestForDate);
  const fetchDailyManifest = useVanStockStore((s) => s.fetchDailyManifest);
  const submitRepVerificationWithSignature = useVanStockStore((s) => s.submitRepVerificationWithSignature);
  const setOwnerSignatureData = useVanStockStore((s) => s.setOwnerSignatureData);
  const fetchSavedSignatures = useVanStockStore((s) => s.fetchSavedSignatures);
  const saveSignatureSetting = useVanStockStore((s) => s.saveSignatureSetting);
  const savedOwnerSignature = useVanStockStore((s) => s.savedOwnerSignature);
  const savedRepSignature = useVanStockStore((s) => s.savedRepSignature);
  const saveEveningReconciliation = useVanStockStore((s) => s.saveEveningReconciliation);

  useEffect(() => {
    fetchInitialData();
  }, [fetchInitialData]);

  // Modals state
  const [modalLoadOpen, setModalLoadOpen] = useState(false);
  const [modalQuickLoadOpen, setModalQuickLoadOpen] = useState(false);
  const [modalDamagedOpen, setModalDamagedOpen] = useState(false);
  const [modalSalesOpen, setModalSalesOpen] = useState(false);
  const [modalReturnOpen, setModalReturnOpen] = useState(false);
  const [modalPrintOpen, setModalPrintOpen] = useState(false);
  const [modalDamageReportOpen, setModalDamageReportOpen] = useState(false);
  const [modalOwnerSignOpen, setModalOwnerSignOpen] = useState(false);
  const [modalEditQtyOpen, setModalEditQtyOpen] = useState(false);
  const [selectedVanItemToEdit, setSelectedVanItemToEdit] = useState(null);
  const [targetProductId, setTargetProductId] = useState(null);
  // Row-level product context selected from 3-dots action menus for operational modals
  const [selectedContextProduct, setSelectedContextProduct] = useState(null);

  // In-App Unified Digital Signing State
  const [signingModalRole, setSigningModalRole] = useState(null); // 'owner' | 'rep' | null
  const [useSavedOwnerSig, setUseSavedOwnerSig] = useState(false);
  const [useSavedRepSig, setUseSavedRepSig] = useState(false);

  // Local filtering & date states
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [vanApprovalFilter, setVanApprovalFilter] = useState('ALL');
  const [defectStatusFilter, setDefectStatusFilter] = useState('ALL');
  const [movementTypeFilter, setMovementTypeFilter] = useState('ALL');

  // Unified Date Filter states (Day of Week Pills & Shadcn Popover Calendar)
  const [selectedDayOfWeek, setSelectedDayOfWeek] = useState('ALL'); // 'ALL' | 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat' | 'Sun'
  const [calendarDateRange, setCalendarDateRange] = useState({ start: '', end: '' });
  const [datePreset, setDatePreset] = useState('ALL');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [damageDateFilterMode, setDamageDateFilterMode] = useState('LOGGED'); // 'LOGGED' | 'LOAD_DATE'
  const [showResolvedHistory, setShowResolvedHistory] = useState(false); // Toggle Active vs Resolved Damaged History

  // Today reference string (YYYY-MM-DD)
  const todayStr = useMemo(() => getOperatingDateStr(new Date()), []);

  // Derive active operating date string (YYYY-MM-DD)
  const activeOperatingDate = useMemo(() => {
    if (calendarDateRange.start) return calendarDateRange.start;
    if (selectedDayOfWeek !== 'ALL') {
      const dStr = getDateForDayOfWeek(selectedDayOfWeek);
      if (dStr) return dStr;
    }
    if (customStart) return customStart;
    return todayStr;
  }, [calendarDateRange.start, selectedDayOfWeek, customStart, todayStr]);

  // Is viewing a past date filter
  const isViewingPastDate = useMemo(() => {
    const isFiltered = Boolean(calendarDateRange.start || selectedDayOfWeek !== 'ALL');
    return isFiltered && Boolean(activeOperatingDate && activeOperatingDate < todayStr);
  }, [calendarDateRange.start, selectedDayOfWeek, activeOperatingDate, todayStr]);

  // Local date-bound checklist state strictly isolated to the active operating date
  const [localMorningChecks, setLocalMorningChecks] = useState({});
  const [localEveningChecks, setLocalEveningChecks] = useState({});

  const isItemCheckedMorning = useCallback((itemOrId) => {
    if (!itemOrId) return false;
    const idKey = typeof itemOrId === 'object' ? String(itemOrId.id || '') : String(itemOrId);
    const pidKey = typeof itemOrId === 'object' && itemOrId.productId ? String(itemOrId.productId) : String(itemOrId);
    const skuKey = typeof itemOrId === 'object' && itemOrId.sku ? String(itemOrId.sku) : null;
    return Boolean(
      localMorningChecks[idKey] ||
      localMorningChecks[pidKey] ||
      (skuKey && localMorningChecks[skuKey])
    );
  }, [localMorningChecks]);

  const isItemCheckedEvening = useCallback((itemOrId) => {
    if (!itemOrId) return false;
    const idKey = typeof itemOrId === 'object' ? String(itemOrId.id || '') : String(itemOrId);
    const pidKey = typeof itemOrId === 'object' && itemOrId.productId ? String(itemOrId.productId) : String(itemOrId);
    const skuKey = typeof itemOrId === 'object' && itemOrId.sku ? String(itemOrId.sku) : null;
    return Boolean(
      localEveningChecks[idKey] ||
      localEveningChecks[pidKey] ||
      (skuKey && localEveningChecks[skuKey])
    );
  }, [localEveningChecks]);

  // Strictly date-bound checklist toggle handlers
  const handleToggleCheck = (item) => {
    const pid = item.productId || item.id;
    const idKey = String(item.id);
    const pidKey = item.productId ? String(item.productId) : null;
    const skuKey = item.sku || null;
    const currentVal = isItemCheckedMorning(item);
    const nextVal = !currentVal;

    setLocalMorningChecks((prev) => {
      const updated = { ...prev };
      if (nextVal) {
        updated[idKey] = true;
        if (pidKey) updated[pidKey] = true;
        if (skuKey) updated[skuKey] = true;
      } else {
        delete updated[idKey];
        if (pidKey) delete updated[pidKey];
        if (skuKey) delete updated[skuKey];
      }
      return updated;
    });

    toggleRepItemChecked(pid, activeOperatingDate, nextVal);
  };

  const handleToggleEveningReconciled = (item) => {
    const pid = item.productId || item.id;
    const idKey = String(item.id);
    const pidKey = item.productId ? String(item.productId) : null;
    const skuKey = item.sku || null;
    const currentVal = isItemCheckedEvening(item);
    const nextVal = !currentVal;

    setLocalEveningChecks((prev) => {
      const updated = { ...prev };
      if (nextVal) {
        updated[idKey] = true;
        if (pidKey) updated[pidKey] = true;
        if (skuKey) updated[skuKey] = true;
      } else {
        delete updated[idKey];
        if (pidKey) delete updated[pidKey];
        if (skuKey) delete updated[skuKey];
      }
      return updated;
    });

    toggleEveningItemChecked(pid, activeOperatingDate, nextVal);
  };

  // Strictly wipe UI local checklist states and synchronize manifest state on operatingDate change
  useEffect(() => {
    setLocalMorningChecks({});
    setLocalEveningChecks({});
    setSelectedContextProduct(null);
    setSelectedVanItemToEdit(null);
    setSigningModalRole(null);

    if (vehicle?.id && activeOperatingDate) {
      fetchDailyManifest(vehicle.id, activeOperatingDate);
    }
  }, [vehicle?.id, activeOperatingDate, fetchDailyManifest]);

  // Active manifest bound strictly to operating date
  const activeManifest = useMemo(() => {
    return getManifestForDate(activeOperatingDate);
  }, [getManifestForDate, activeOperatingDate, dailyManifest, manifestHistory]);

  // Hydrate local checklist states strictly when activeManifest matches activeOperatingDate
  useEffect(() => {
    if (!activeManifest) {
      setLocalMorningChecks({});
      setLocalEveningChecks({});
      return;
    }

    const manifestDateStr = getOperatingDateStr(activeManifest.manifestDate || activeManifest.createdAt);
    if (manifestDateStr !== activeOperatingDate) {
      setLocalMorningChecks({});
      setLocalEveningChecks({});
      return;
    }

    const nextMorning = {};
    const nextEvening = {};

    // 1. Read from manifest.morningCheckedItems
    const rawMorning = activeManifest.morningCheckedItems;
    const morningList = Array.isArray(rawMorning)
      ? rawMorning.map(String)
      : (rawMorning && typeof rawMorning === 'object' ? Object.keys(rawMorning).filter((k) => Boolean(rawMorning[k])) : []);

    morningList.forEach((ident) => {
      nextMorning[ident] = true;
    });

    // 2. Read from manifest.eveningCheckedItems
    const rawEvening = activeManifest.eveningCheckedItems;
    const eveningList = Array.isArray(rawEvening)
      ? rawEvening.map(String)
      : (rawEvening && typeof rawEvening === 'object' ? Object.keys(rawEvening).filter((k) => Boolean(rawEvening[k])) : []);

    eveningList.forEach((ident) => {
      nextEvening[ident] = true;
    });

    // 3. Fallback / supplement from itemsSnapshot
    if (Array.isArray(activeManifest.itemsSnapshot)) {
      activeManifest.itemsSnapshot.forEach((s) => {
        if (s) {
          if (s.repChecked) {
            if (s.id) nextMorning[String(s.id)] = true;
            if (s.productId) nextMorning[String(s.productId)] = true;
            if (s.sku) nextMorning[String(s.sku)] = true;
          }
          if (s.eveningReconciled) {
            if (s.id) nextEvening[String(s.id)] = true;
            if (s.productId) nextEvening[String(s.productId)] = true;
            if (s.sku) nextEvening[String(s.sku)] = true;
          }
        }
      });
    }

    setLocalMorningChecks(nextMorning);
    setLocalEveningChecks(nextEvening);
  }, [activeManifest, activeOperatingDate]);

  // Strict date verification for signatures: did the official signature stamp occur on the active operating date?
  const isOwnerSignedForActiveDate = useMemo(() => {
    if (!activeManifest?.ownerSignedAt) return false;
    return getOperatingDateStr(activeManifest.ownerSignedAt) === activeOperatingDate;
  }, [activeManifest, activeOperatingDate]);

  const isRepSignedForActiveDate = useMemo(() => {
    if (!activeManifest?.repSignedAt || !activeManifest?.repSignatureData) return false;
    return getOperatingDateStr(activeManifest.repSignedAt) === activeOperatingDate;
  }, [activeManifest, activeOperatingDate]);


  // Computed KPIs
  const kpis = getKpis();

  // Master categories list for SearchableSelect
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

  // Van Approval Status options
  const vanApprovalOptions = [
    { value: 'ALL', label: 'All Verification Statuses' },
    { value: 'PENDING_CONFIRMATION', label: 'Pending Rep Sign-Off' },
    { value: 'APPROVED', label: 'Verified & Approved' },
  ];

  // Defect Status options dynamically adapted to active vs resolved history mode
  const defectStatusOptions = useMemo(() => {
    if (showResolvedHistory) {
      return [
        { value: 'ALL', label: 'All Resolved Statuses' },
        { value: 'WRITTEN_OFF', label: 'Scrap Write-Off' },
        { value: 'VENDOR_RETURN', label: 'Vendor Replacement' },
      ];
    }
    return [
      { value: 'ALL', label: 'All Active Defect Statuses' },
      { value: 'LOGGED', label: 'Logged from Field' },
      { value: 'INSPECTED', label: 'Warehouse Inspected' },
    ];
  }, [showResolvedHistory]);

  // Movement Types options with Simple English labels
  const movementTypeOptions = [
    { value: 'ALL', label: 'All Movements' },
    { value: 'VEHICLE_SALES_OUTBOUND', label: 'Van Sale' },
    { value: 'STORE_TO_VEHICLE_LOAD', label: 'Loaded to Van' },
    { value: 'VEHICLE_TO_STORE_RETURN', label: 'Returned to Store' },
    { value: 'RETURN_TO_DAMAGED_POOL', label: 'Damaged Item' },
    { value: 'SUPPLIER_PURCHASE_INBOUND', label: 'Stock Received' },
    { value: 'DAMAGED_WRITE_OFF', label: 'Damaged Write-Off' },
    { value: 'WAREHOUSE_AUDIT_ADJUSTMENT', label: 'Audit Adjustment' },
  ];

  // -------------------------------------------------------------
  // FILTERED TAB DATASETS (WITH DATE-RANGE & SEARCHABLE LOGIC)
  // -------------------------------------------------------------

  // Filtered On-Hand Van Stock (Perpetual Inventory with Date-Bound Past Filter)
  const filteredVanStock = useMemo(() => {
    return vanStock.filter((item) => {
      if (item.quantity <= 0) return false;
      const q = searchQuery.toLowerCase().trim();
      const matchSearch =
        !q ||
        item.productName.toLowerCase().includes(q) ||
        item.sku.toLowerCase().includes(q);

      const product = products.find((p) => p.id === item.productId);
      const matchCategory =
        categoryFilter === 'ALL' || (product && product.category === categoryFilter);

      const matchApproval =
        vanApprovalFilter === 'ALL' || item.status === vanApprovalFilter;

      // Temporal Filter: When viewing a past date, hide SKUs first loaded AFTER that date
      if (isViewingPastDate && activeOperatingDate) {
        const firstLoadDate = getItemFirstLoadedDate(item, stockMovements);
        if (firstLoadDate && firstLoadDate > activeOperatingDate) {
          return false;
        }
      }

      return matchSearch && matchCategory && matchApproval;
    });
  }, [vanStock, products, searchQuery, categoryFilter, vanApprovalFilter, isViewingPastDate, activeOperatingDate, stockMovements]);

  // Active vs Resolved Damaged Goods Lists
  const activeDamagedGoodsList = useMemo(() => {
    return damagedGoods.filter(
      (item) => item.isActive !== false && (item.status === 'LOGGED' || item.status === 'INSPECTED')
    );
  }, [damagedGoods]);

  const resolvedDamagedGoodsList = useMemo(() => {
    return damagedGoods.filter(
      (item) => item.isActive !== false && (item.status === 'WRITTEN_OFF' || item.status === 'VENDOR_RETURN')
    );
  }, [damagedGoods]);

  // Filtered Damaged Goods (Separates Active Quarantine vs Resolved History)
  const filteredDamagedGoods = useMemo(() => {
    const baseDataset = showResolvedHistory
      ? resolvedDamagedGoodsList
      : activeDamagedGoodsList;

    return baseDataset.filter((item) => {
      const q = searchQuery.toLowerCase().trim();
      const matchSearch =
        !q ||
        item.productName.toLowerCase().includes(q) ||
        item.sku.toLowerCase().includes(q) ||
        (item.reason && item.reason.toLowerCase().includes(q)) ||
        (item.sourceInvoiceNo && item.sourceInvoiceNo.toLowerCase().includes(q)) ||
        (item.manifestNo && item.manifestNo.toLowerCase().includes(q)) ||
        (item.sourceManifestNo && item.sourceManifestNo.toLowerCase().includes(q)) ||
        (item.reportedBy && item.reportedBy.toLowerCase().includes(q));

      const matchStatus =
        defectStatusFilter === 'ALL' || item.status === defectStatusFilter;

      // Correlate date filter to either defect report date or original vehicle load date
      const targetDate = damageDateFilterMode === 'LOAD_DATE'
        ? deriveItemLoadDate(item)
        : item.createdAt;

      // Date matching against calendar date range and day of week
      let matchDate = true;
      if (calendarDateRange.start) {
        const dtStr = formatDateYYYYMMDD(targetDate);
        if (calendarDateRange.end && calendarDateRange.end !== calendarDateRange.start) {
          matchDate = dtStr >= calendarDateRange.start && dtStr <= calendarDateRange.end;
        } else {
          matchDate = dtStr === calendarDateRange.start;
        }
      } else if (selectedDayOfWeek !== 'ALL') {
        const dt = new Date(targetDate);
        const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        matchDate = dayNames[dt.getDay()] === selectedDayOfWeek;
      }

      return matchSearch && matchStatus && matchDate;
    });
  }, [showResolvedHistory, activeDamagedGoodsList, resolvedDamagedGoodsList, searchQuery, defectStatusFilter, damageDateFilterMode, calendarDateRange, selectedDayOfWeek]);

  // Grouped Stock Movements: consolidate VEHICLE_SALES_OUTBOUND by Date (YYYY-MM-DD) and SKU
  const groupedMovements = useMemo(() => {
    const roadSalesMap = new Map();
    const otherMovements = [];

    stockMovements.forEach((m) => {
      if (m.movementType === 'VEHICLE_SALES_OUTBOUND') {
        const rawTime = m.timestamp || m.createdAt || new Date().toISOString();
        const dateKey = new Date(rawTime).toISOString().slice(0, 10);
        const skuKey = m.sku || String(m.productId);
        const groupKey = `${dateKey}_${skuKey}`;

        if (!roadSalesMap.has(groupKey)) {
          roadSalesMap.set(groupKey, {
            ...m,
            id: `road_sale_${groupKey}`,
            movementType: 'VEHICLE_SALES_OUTBOUND',
            sourceLocation: m.sourceLocation || 'VAN-01',
            targetLocation: 'Road Sales',
            quantity: 0,
            timestamp: rawTime,
            createdAt: rawTime,
            isGrouped: true,
            groupedDate: dateKey,
          });
        }
        const currentGroup = roadSalesMap.get(groupKey);
        currentGroup.quantity += Number(m.quantity) || 0;
      } else {
        otherMovements.push(m);
      }
    });

    const consolidated = [...Array.from(roadSalesMap.values()), ...otherMovements];
    return consolidated.sort((a, b) => {
      const timeA = new Date(a.timestamp || a.createdAt).getTime();
      const timeB = new Date(b.timestamp || b.createdAt).getTime();
      return timeB - timeA;
    });
  }, [stockMovements]);

  // Filtered Stock Movements (incorporates Day of Week and Calendar Picker)
  const filteredMovements = useMemo(() => {
    return groupedMovements.filter((m) => {
      const q = searchQuery.toLowerCase().trim();
      const matchSearch =
        !q ||
        m.productName.toLowerCase().includes(q) ||
        (m.sku && m.sku.toLowerCase().includes(q));

      const matchType =
        movementTypeFilter === 'ALL' || m.movementType === movementTypeFilter;

      // Safely support either timestamp or createdAt fields from backend or local movements
      const rawTime = m.timestamp || m.createdAt;
      const matchDate = isDateInPreset(rawTime, datePreset, customStart, customEnd);

      // Day of Week filter (Mon - Sun)
      let matchDay = true;
      if (selectedDayOfWeek !== 'ALL') {
        const dt = new Date(rawTime);
        const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        matchDay = dayNames[dt.getDay()] === selectedDayOfWeek;
      }

      // Calendar Date Range filter
      let matchCalendar = true;
      if (calendarDateRange.start) {
        const dtStr = new Date(rawTime).toISOString().slice(0, 10);
        if (calendarDateRange.end) {
          matchCalendar = dtStr >= calendarDateRange.start && dtStr <= calendarDateRange.end;
        } else {
          matchCalendar = dtStr === calendarDateRange.start;
        }
      }

      return matchSearch && matchType && matchDate && matchDay && matchCalendar;
    });
  }, [groupedMovements, searchQuery, movementTypeFilter, datePreset, customStart, customEnd, selectedDayOfWeek, calendarDateRange]);

  // Item-Wise Total Summary calculation for Audit History
  const movementItemTotals = useMemo(() => {
    const map = {};
    filteredMovements.forEach((m) => {
      const key = m.productId || m.sku || m.productName;
      if (!map[key]) {
        map[key] = {
          productId: m.productId,
          productName: m.productName,
          sku: m.sku,
          totalUnits: 0,
          vanSales: 0,
          loaded: 0,
          returned: 0,
          damaged: 0,
          received: 0,
          count: 0,
        };
      }
      map[key].totalUnits += m.quantity;
      map[key].count += 1;
      if (m.movementType === 'VEHICLE_SALES_OUTBOUND') map[key].vanSales += m.quantity;
      else if (m.movementType === 'STORE_TO_VEHICLE_LOAD') map[key].loaded += m.quantity;
      else if (m.movementType === 'VEHICLE_TO_STORE_RETURN') map[key].returned += m.quantity;
      else if (m.movementType === 'RETURN_TO_DAMAGED_POOL') map[key].damaged += m.quantity;
      else if (m.movementType === 'SUPPLIER_PURCHASE_INBOUND') map[key].received += m.quantity;
    });
    return Object.values(map).sort((a, b) => b.totalUnits - a.totalUnits);
  }, [filteredMovements]);

  const handleSelectToday = () => {
    const todayStr = new Date().toISOString().slice(0, 10);
    setCalendarDateRange({ start: todayStr, end: todayStr });
    setSelectedDayOfWeek('ALL');
    setDatePreset('ALL');
    setCustomStart('');
    setCustomEnd('');
  };

  const handleSelectDayOfWeek = (day) => {
    setSelectedDayOfWeek(day);
  };

  const handleResetAuditDateFilters = () => {
    setSelectedDayOfWeek('ALL');
    setCalendarDateRange({ start: '', end: '' });
    setDatePreset('ALL');
    setCustomStart('');
    setCustomEnd('');
  };

  /**
   * Dynamically resolves active Route from the live database/store collection.
   * Extracts sales person / rep information returned by the backend Route relation query.
   */
  const activeRoute = useMemo(() => {
    if (!routes || routes.length === 0) return null;
    const targetRouteName = (vehicle?.route || '').trim().toLowerCase();
    return routes.find((r) => r.name?.trim().toLowerCase() === targetRouteName) || null;
  }, [routes, vehicle?.route]);

  /**
   * Dynamically resolves the active sales representative from the live database/store collection.
   * Hierarchically resolves:
   * 1. Route-assigned sales person from activeRoute (activeRoute.salesPerson or activeRoute.rep)
   * 2. Direct SalesPerson matching vehicle.salesPersonId / vehicle.repId / vehicle.repName
   * 3. Database default: first registered sales person with a valid phone number
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

  // Dynamic sales rep phone number and name extracted strictly from live database data
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



  // Discrepancy items computation: dynamically reflects current items and manifest status
  const uncheckedByRepItems = useMemo(() => {
    // If manifest is fully verified / rep accepted, zero discrepancy items exist
    const manStatus = activeManifest?.status;
    if (manStatus === 'FULLY_VERIFIED' || manStatus === 'REP_ACCEPTED' || manStatus === 'VERIFIED') return [];
    return vanStock.filter(
      (i) => i.quantity > 0 && (i.status === 'UNVERIFIED_BY_REP' || i.discrepancyFlag || (!isItemCheckedMorning(i) && manStatus === 'PARTIAL_DISCREPANCY'))
    );
  }, [vanStock, activeManifest, isItemCheckedMorning]);
  const hasDiscrepancy = activeManifest?.status === 'PARTIAL_DISCREPANCY' && uncheckedByRepItems.length > 0;

  // Dynamic pending confirmation count reflecting current items & manifest status (cleared once signed/verified)
  const pendingConfirmationCount = useMemo(() => {
    const manStatus = activeManifest?.status;
    if (
      manStatus === 'FULLY_VERIFIED' ||
      manStatus === 'REP_ACCEPTED' ||
      manStatus === 'VERIFIED' ||
      manStatus === 'PARTIAL_DISCREPANCY'
    ) return 0;
    return vanStock.filter(
      (i) => i.quantity > 0 && i.isActive !== false && (i.status === 'PENDING_CONFIRMATION' && !isItemCheckedMorning(i))
    ).length;
  }, [vanStock, activeManifest, isItemCheckedMorning]);

  // Re-Dispatch Manifest Loop: asynchronous handler with in-app dispatch confirmation
  const handleReDispatch = async () => {
    const result = await reDispatchManifest({
      dispatcherName: 'W. Liyanage (Managing Director / Owner)',
      notes: `Updated manifest re-dispatched to ${vehicle.id} after quantity reconciliation`,
    });
    const manifestNo =
      result?.manifest?.manifestNo ||
      dailyManifest?.manifestNo ||
      `MAN-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-01`;
    toast.success(`Manifest ${manifestNo} updated and re-dispatched to Sales Rep.`);
  };

  // Dispatch Daily Manifest with Owner Signature Lock
  const handleDispatchDailyManifest = () => {
    dispatchDailyManifest({
      dispatcherName: 'W. Liyanage (Managing Director / Owner)',
      notes: `Daily load manifest locked and dispatched to ${vehicle.id}`,
    });
    toast.success('Daily Stock Manifest finalized and dispatched. Owner signature locked in.');
  };

  // Trigger Edit Van Item Quantity Modal
  const handleOpenEditQty = (item) => {
    setSelectedVanItemToEdit(item);
    setModalEditQtyOpen(true);
  };

  // Context-aware modal triggers: capture row item so modal auto-selects the product
  const handleOpenSalesModal = (item = null) => {
    setSelectedContextProduct(item);
    setModalSalesOpen(true);
  };

  const handleOpenReturnModal = (item = null) => {
    setSelectedContextProduct(item);
    setModalReturnOpen(true);
  };

  const handleOpenDamagedModal = (item = null) => {
    setSelectedContextProduct(item);
    setModalDamagedOpen(true);
  };

  // Fetch saved signatures on mount or vehicle/rep change
  useEffect(() => {
    fetchSavedSignatures(vehicle?.salesPersonId || vehicle?.id);
  }, [fetchSavedSignatures, vehicle?.salesPersonId, vehicle?.id]);

  useEffect(() => {
    if (savedOwnerSignature && (ownerSignatureData === savedOwnerSignature || activeManifest?.ownerSignatureData === savedOwnerSignature)) {
      setUseSavedOwnerSig(true);
    }
  }, [savedOwnerSignature, ownerSignatureData, activeManifest?.ownerSignatureData]);

  useEffect(() => {
    if (savedRepSignature && activeManifest?.repSignatureData === savedRepSignature) {
      setUseSavedRepSig(true);
    }
  }, [savedRepSignature, activeManifest?.repSignatureData]);

  const handleToggleSavedOwnerSignature = async (checked) => {
    setUseSavedOwnerSig(checked);
    if (checked) {
      if (savedOwnerSignature) {
        await setOwnerSignatureData(savedOwnerSignature, 'W. Liyanage (Managing Director / Owner)', activeOperatingDate);
        toast.success(`Applied saved Owner signature for ${activeOperatingDate}.`);
      } else {
        toast.info('No saved signature found for Owner. Please draw one to save.');
        setSigningModalRole('owner');
      }
    }
  };

  const [isSavingEvening, setIsSavingEvening] = useState(false);
  const handleConfirmEveningReconciliation = async () => {
    setIsSavingEvening(true);
    try {
      const checkedEveningSkus = filteredVanStock
        .filter((item) => isItemCheckedEvening(item))
        .map((item) => item.sku || String(item.productId || item.id));

      const res = await saveEveningReconciliation(activeOperatingDate, checkedEveningSkus);
      if (res?.success) {
        toast.success(`Evening reconciliation confirmed & saved for ${activeOperatingDate} (${res.count} items verified).`);
      } else {
        toast.error('Failed to persist evening reconciliation to database.');
      }
    } catch (err) {
      toast.error('Error saving evening reconciliation.');
    } finally {
      setIsSavingEvening(false);
    }
  };

  const handleToggleSavedRepSignature = async (checked) => {
    setUseSavedRepSig(checked);
    if (checked) {
      if (savedRepSignature) {
        const checkedMorningSkus = filteredVanStock
          .filter((item) => isItemCheckedMorning(item))
          .map((item) => item.sku || String(item.productId || item.id));

        await submitRepVerificationWithSignature({
          signatureData: savedRepSignature,
          repName: dynamicRepName || vehicle?.repName || 'Kamal Perera',
          dateStr: activeOperatingDate,
          morningCheckedItems: checkedMorningSkus,
        });
        toast.success(`Applied saved Sales Rep signature for ${activeOperatingDate}.`);
      } else {
        toast.info('No saved signature found for Sales Rep. Please draw and sign first.');
        setSigningModalRole('rep');
      }
    }
  };

  const handleSignatureModalSave = async ({ signatureData, signerName }) => {
    if (signingModalRole === 'owner') {
      await setOwnerSignatureData(signatureData, signerName, activeOperatingDate);
      await saveSignatureSetting({ type: 'owner', signatureData });
      setUseSavedOwnerSig(true);
      toast.success(`Owner signature saved and applied to manifest for ${activeOperatingDate}.`);
    } else {
      const checkedMorningSkus = filteredVanStock
        .filter((item) => isItemCheckedMorning(item))
        .map((item) => item.sku || String(item.productId || item.id));
      const uncheckedCount = filteredVanStock.length - checkedMorningSkus.length;

      await submitRepVerificationWithSignature({
        signatureData,
        repName: signerName || dynamicRepName || vehicle?.repName,
        dateStr: activeOperatingDate,
        morningCheckedItems: checkedMorningSkus,
      });
      await saveSignatureSetting({
        type: 'rep',
        repId: vehicle?.salesPersonId || vehicle?.id,
        signatureData,
      });
      setUseSavedRepSig(true);
      if (uncheckedCount === 0) {
        toast.success(`Manifest for ${activeOperatingDate} successfully signed and fully verified.`);
      } else {
        toast.warning(`Manifest for ${activeOperatingDate} signed with ${uncheckedCount} unchecked item(s) flagged as discrepancy.`);
      }
    }
    setSigningModalRole(null);
  };

  const morningVerifiedCount = useMemo(
    () => filteredVanStock.filter((i) => isItemCheckedMorning(i)).length,
    [filteredVanStock, isItemCheckedMorning]
  );
  const eveningReconciledCount = useMemo(
    () => filteredVanStock.filter((i) => isItemCheckedEvening(i)).length,
    [filteredVanStock, isItemCheckedEvening]
  );
  const allMorningVerified = filteredVanStock.length > 0 && morningVerifiedCount === filteredVanStock.length;
  const allEveningReconciled = filteredVanStock.length > 0 && eveningReconciledCount === filteredVanStock.length;

  const handleToggleAllMorning = () => {
    const nextVal = !allMorningVerified;
    const updated = {};
    if (nextVal) {
      filteredVanStock.forEach((item) => {
        if (item.quantity > 0) {
          updated[String(item.id)] = true;
          if (item.productId) updated[String(item.productId)] = true;
          if (item.sku) updated[String(item.sku)] = true;
        }
      });
    }
    setLocalMorningChecks(updated);
    toggleAllRepItemsChecked(nextVal, activeOperatingDate);
  };

  const handleToggleAllEvening = () => {
    const nextVal = !allEveningReconciled;
    const updated = {};
    if (nextVal) {
      filteredVanStock.forEach((item) => {
        if (item.quantity > 0) {
          updated[String(item.id)] = true;
          if (item.productId) updated[String(item.productId)] = true;
          if (item.sku) updated[String(item.sku)] = true;
        }
      });
    }
    setLocalEveningChecks(updated);
    toggleAllEveningItemsChecked(nextVal, activeOperatingDate);
  };

  const ownerSignature = isOwnerSignedForActiveDate
    ? (activeManifest?.ownerSignatureData || ownerSignatureData || DEFAULT_OWNER_SIGNATURE)
    : (useSavedOwnerSig ? (savedOwnerSignature || ownerSignatureData || DEFAULT_OWNER_SIGNATURE) : null);

  const dynamicVanKpis = useMemo(() => {
    if (activeTab === 'damaged') {
      const totalVal = filteredDamagedGoods.reduce((sum, item) => sum + (Number(item.totalValue) || 0), 0);
      const totalUnits = filteredDamagedGoods.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);
      return {
        card1Label: 'Quarantine Valuation',
        card1Value: formatLKR(totalVal),
        card1Sub: `${filteredDamagedGoods.length} active damaged SKU(s)`,
        card1Icon: AlertTriangle,
        card1Color: 'text-rose-500',
        card2Label: 'Defective Units',
        card2Value: totalUnits.toLocaleString(),
        card2Sub: 'Quarantined from field truck',
        card2Icon: Package,
        card2Color: 'text-amber-500',
        card3Label: 'Damaged Records',
        card3Value: filteredDamagedGoods.length,
        card3Sub: 'Segregated quarantine pool',
        card3Icon: SlidersHorizontal,
        card3Color: 'text-rose-500',
        card4Label: 'Pending Inspection',
        card4Value: filteredDamagedGoods.filter((i) => i.status === 'LOGGED').length,
        card4Sub: 'Awaiting manager sign-off',
        card4Icon: AlertCircle,
        card4Color: 'text-amber-500',
      };
    }

    if (activeTab === 'movements') {
      const totalVal = filteredMovements.reduce((sum, m) => sum + ((m.unitPrice || 0) * (m.quantity || 0)), 0);
      const totalUnits = filteredMovements.reduce((sum, m) => sum + (Number(m.quantity) || 0), 0);
      const roadSaleUnits = filteredMovements
        .filter((m) => m.movementType === 'VEHICLE_SALES_OUTBOUND')
        .reduce((sum, m) => sum + (Number(m.quantity) || 0), 0);
      return {
        card1Label: 'Movements Valuation',
        card1Value: formatLKR(totalVal),
        card1Sub: `${filteredMovements.length} audit movement(s)`,
        card1Icon: ArrowRightLeft,
        card1Color: 'text-cyan-500',
        card2Label: 'Total Moved Units',
        card2Value: totalUnits.toLocaleString(),
        card2Sub: 'Inventory volume shifted',
        card2Icon: PackageCheck,
        card2Color: 'text-blue-500',
        card3Label: 'Road Sales Outbound',
        card3Value: `${roadSaleUnits} units`,
        card3Sub: 'Consolidated field shop sales',
        card3Icon: Receipt,
        card3Color: 'text-emerald-500',
        card4Label: 'Audit Records',
        card4Value: filteredMovements.length,
        card4Sub: 'Immutable transaction entries',
        card4Icon: ShieldCheck,
        card4Color: 'text-purple-500',
      };
    }

    // Default: 'on-hand'
    const totalVal = filteredVanStock.reduce((sum, item) => {
      const net = calcNetUnitPrice(item.basePrice, item.companyDiscountPercent);
      return sum + calcTotalRealValue(net, item.quantity);
    }, 0);
    const totalUnits = filteredVanStock.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);
    const activeSkus = filteredVanStock.filter((i) => i.quantity > 0).length;
    const pendingCount = filteredVanStock.filter((i) => i.quantity > 0 && !isItemCheckedMorning(i)).length;

    return {
      card1Label: 'Van On-Hand Value',
      card1Value: formatLKR(totalVal),
      card1Sub: `${activeSkus} active SKUs on truck`,
      card1Icon: Truck,
      card1Color: 'text-emerald-500',
      card2Label: 'Loaded Units',
      card2Value: totalUnits.toLocaleString(),
      card2Sub: pendingCount > 0 ? `${pendingCount} awaiting rep sign-off` : '100% Rep Confirmed',
      card2Icon: PackageCheck,
      card2Color: 'text-accent-500',
      card3Label: 'Filtered SKUs',
      card3Value: activeSkus,
      card3Sub: 'Ready for road distribution',
      card3Icon: Package,
      card3Color: 'text-indigo-500',
      card4Label: 'Damaged Quarantine',
      card4Value: formatLKR(kpis.damaged.totalValue),
      card4Sub: `${kpis.damaged.totalUnits} defect units isolated`,
      card4Icon: AlertTriangle,
      card4Color: 'text-rose-500',
    };
  }, [activeTab, filteredVanStock, filteredDamagedGoods, filteredMovements, kpis.damaged, isItemCheckedMorning]);

  const Card1Icon = dynamicVanKpis.card1Icon;
  const Card2Icon = dynamicVanKpis.card2Icon;
  const Card3Icon = dynamicVanKpis.card3Icon;
  const Card4Icon = dynamicVanKpis.card4Icon;

  return (
    <VanStockLayout>
      {/* -------------------------------------------------------------
          1. MINIMALIST VEHICLE HEADER
         ------------------------------------------------------------- */}
      <div className="rounded-2xl bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-slate-900 dark:text-white p-4 sm:p-5 shadow-sm transition-colors flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-5 sm:gap-8 flex-wrap">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
              Rep Name
            </span>
            <p className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200">
              {dynamicRepName || 'Unassigned'}
            </p>
          </div>
          <div className="h-8 w-px bg-gray-200 dark:bg-slate-700 hidden sm:block" />
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
              Rep Phone
            </span>
            <p className="text-xs sm:text-sm font-mono font-semibold text-slate-700 dark:text-slate-300">
              {dynamicRepPhone || 'No phone registered'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setModalPrintOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-bold text-xs transition-all cursor-pointer shadow-xs"
            title="Print Daily Load Manifest (A4)"
          >
            <Printer size={15} />
            <span>Print</span>
          </button>
        </div>
      </div>

      {/* -------------------------------------------------------------
          2. DYNAMIC FIELD OPERATION KPI CARDS (Van On-Hand, Par Shortage, Damages)
         ------------------------------------------------------------- */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* KPI 1 */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs">
            <span className="font-semibold uppercase tracking-wider text-[10px]">{dynamicVanKpis.card1Label}</span>
            <Card1Icon size={15} className={dynamicVanKpis.card1Color} />
          </div>
          <div className="text-base sm:text-lg font-black text-slate-900 dark:text-white font-mono truncate">
            {dynamicVanKpis.card1Value}
          </div>
          <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium block truncate">
            {dynamicVanKpis.card1Sub}
          </span>
        </div>

        {/* KPI 2 */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs">
            <span className="font-semibold uppercase tracking-wider text-[10px]">{dynamicVanKpis.card2Label}</span>
            <Card2Icon size={15} className={dynamicVanKpis.card2Color} />
          </div>
          <div className="text-base sm:text-lg font-black text-slate-900 dark:text-white font-mono">
            {dynamicVanKpis.card2Value}
          </div>
          <span className="text-[10px] text-slate-400 dark:text-slate-500 block truncate">
            {dynamicVanKpis.card2Sub}
          </span>
        </div>

        {/* KPI 3 */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs">
            <span className="font-semibold uppercase tracking-wider text-[10px]">{dynamicVanKpis.card3Label}</span>
            <Card3Icon size={15} className={dynamicVanKpis.card3Color} />
          </div>
          <div className="text-base sm:text-lg font-black text-slate-900 dark:text-white font-mono truncate">
            {dynamicVanKpis.card3Value}
          </div>
          <span className="text-[10px] text-cyan-600 dark:text-cyan-400 font-medium block truncate">
            {dynamicVanKpis.card3Sub}
          </span>
        </div>

        {/* KPI 4 */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs">
            <span className="font-semibold uppercase tracking-wider text-[10px]">{dynamicVanKpis.card4Label}</span>
            <Card4Icon size={15} className={dynamicVanKpis.card4Color} />
          </div>
          <div className="text-base sm:text-lg font-black text-slate-900 dark:text-white font-mono truncate">
            {dynamicVanKpis.card4Value}
          </div>
          <span className="text-[10px] text-rose-600 dark:text-rose-400 font-medium block truncate">
            {dynamicVanKpis.card4Sub}
          </span>
        </div>
      </div>

      {/* -------------------------------------------------------------
          3. FIELD OPERATIONS QUICK-ACTION BAR
         ------------------------------------------------------------- */}
      {/* 3. COMPACT MODERN OPERATIONS TOOLBAR & TABS */}
      <div className="p-2 sm:p-2.5 rounded-2xl bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-2.5">
        {/* Navigation Tabs (Pill Style) */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0">
          {[
            { id: 'on-hand', label: 'Van Stock', icon: Truck, count: filteredVanStock.length },
            { id: 'damaged', label: 'Damaged Goods', icon: AlertTriangle, count: activeDamagedGoodsList.length },
            { id: 'movements', label: 'Audit History', icon: ArrowRightLeft, count: stockMovements.length },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setActiveTab(tab.id);
                  setSearchQuery('');
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                  isActive
                    ? 'bg-accent-600 text-white shadow-sm ring-1 ring-accent-500/50'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/60'
                }`}
              >
                <Icon size={14} />
                <span>{tab.label}</span>
                {tab.count !== undefined && (
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                      isActive
                        ? 'bg-white/20 text-white'
                        : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Compact Field Operations Action Buttons */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            type="button"
            onClick={() => {
              setTargetProductId(null);
              setModalLoadOpen(true);
            }}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-xl bg-accent-600 hover:bg-accent-700 text-white shadow-sm transition-all cursor-pointer whitespace-nowrap"
          >
            <ListPlus size={14} />
            <span>Load Van Stock</span>
          </button>

          <button
            type="button"
            onClick={() => handleOpenSalesModal(null)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all cursor-pointer shadow-sm whitespace-nowrap"
          >
            <Receipt size={13} />
            <span>Record Road Sale</span>
          </button>

          <button
            type="button"
            onClick={() => handleOpenDamagedModal(null)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50/50 dark:bg-rose-950/20 text-rose-700 dark:text-rose-300 hover:bg-rose-100/50 transition-all cursor-pointer shadow-sm whitespace-nowrap"
          >
            <AlertTriangle size={13} />
            <span>Damage</span>
          </button>

          <button
            type="button"
            onClick={() => handleOpenReturnModal(null)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all cursor-pointer shadow-sm whitespace-nowrap"
          >
            <RotateCcw size={13} />
            <span>Return to Store</span>
          </button>

          {activeTab === 'damaged' && (
            <button
              type="button"
              onClick={() => setModalDamageReportOpen(true)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-bold rounded-xl bg-rose-600 hover:bg-rose-700 active:scale-95 text-white shadow-sm transition-all cursor-pointer whitespace-nowrap"
              title="Print Damaged Goods Audit Report (A4)"
            >
              <Printer size={13} />
              <span>Print Damage</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => navigate('/warehouse')}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-xl border border-blue-200 dark:border-blue-900/60 bg-blue-50/50 dark:bg-blue-950/20 text-blue-700 dark:text-blue-300 hover:bg-blue-100/50 transition-all cursor-pointer whitespace-nowrap"
          >
            <Warehouse size={13} />
            <span>Warehouse &rarr;</span>
          </button>
        </div>
      </div>

      {/* -------------------------------------------------------------
          5. CONTEXTUAL FILTER ENGINE (Universal SearchableSelect & DateBar)
         ------------------------------------------------------------- */}
      <div className="space-y-3">
        <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by SKU, product description, or reference..."
              className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-accent-500"
            />
          </div>

          {/* Contextual SearchableSelect Dropdowns */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Category Filter for On-Hand */}
            {activeTab === 'on-hand' && (
              <div className="w-48 sm:w-56">
                <SearchableSelect
                  value={categoryFilter}
                  onChange={setCategoryFilter}
                  options={categoryOptions}
                  placeholder="Category"
                  size="sm"
                  icon={Filter}
                  portal
                />
              </div>
            )}

            {/* Approval Status Filter on On-Hand */}
            {activeTab === 'on-hand' && (
              <div className="w-48 sm:w-52">
                <SearchableSelect
                  value={vanApprovalFilter}
                  onChange={setVanApprovalFilter}
                  options={vanApprovalOptions}
                  placeholder="Verification Status"
                  size="sm"
                  portal
                />
              </div>
            )}

            {/* Defect Status Filter on Damaged tab */}
            {activeTab === 'damaged' && (
              <div className="w-48 sm:w-52">
                <SearchableSelect
                  value={defectStatusFilter}
                  onChange={setDefectStatusFilter}
                  options={defectStatusOptions}
                  placeholder="Defect Status"
                  size="sm"
                  portal
                />
              </div>
            )}

            {/* Movement Type Filter on Movements tab */}
            {activeTab === 'movements' && (
              <div className="w-48 sm:w-56">
                <SearchableSelect
                  value={movementTypeFilter}
                  onChange={setMovementTypeFilter}
                  options={movementTypeOptions}
                  placeholder="Movement Type"
                  size="sm"
                  portal
                />
              </div>
            )}
          </div>
        </div>

        {/* Unified Day of Week Pills & Shadcn Calendar Date Filter Bar */}
        {(activeTab === 'on-hand' || activeTab === 'damaged') && (
          <UnifiedDayPillsCalendarFilter
            selectedDayOfWeek={selectedDayOfWeek}
            onSelectDayOfWeek={handleSelectDayOfWeek}
            calendarDateRange={calendarDateRange}
            onSelectDateRange={(range) => {
              setCalendarDateRange(range);
              setSelectedDayOfWeek('ALL');
            }}
            onReset={handleResetAuditDateFilters}
            label={activeTab === 'on-hand' ? `Operating Date (${activeOperatingDate})` : 'Quarantine Date'}
            resultCount={activeTab === 'on-hand' ? filteredVanStock.length : filteredDamagedGoods.length}
          />
        )}
      </div>

      {/* -------------------------------------------------------------
          TAB 1: VAN STOCK (Unified Morning & Evening Reconcile Portal)
         ------------------------------------------------------------- */}
      {activeTab === 'on-hand' && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 shadow-sm overflow-hidden">
          {/* Sub-Header with Status Counts and Batch Toggle Actions */}
          <div className="px-5 py-4 border-b border-gray-100 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3 flex-wrap">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                Active Van Loaded Stock ({filteredVanStock.length})
              </h2>
              <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800 flex items-center gap-1">
                <Sun size={12} className="text-emerald-600" />
                <span>Morning: {morningVerifiedCount}/{filteredVanStock.length}</span>
              </span>
              <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800 flex items-center gap-1">
                <Moon size={12} className="text-blue-600" />
                <span>Evening: {eveningReconciledCount}/{filteredVanStock.length}</span>
              </span>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={handleToggleAllMorning}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl border border-emerald-200 dark:border-emerald-800/80 bg-emerald-50/50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100/60 transition-all cursor-pointer"
              >
                <CheckSquare size={13} className={allMorningVerified ? 'text-emerald-600' : 'text-slate-400'} />
                <span>{allMorningVerified ? 'Uncheck Morning' : 'Morning: Check All'}</span>
              </button>
              <button
                type="button"
                onClick={handleToggleAllEvening}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl border border-blue-200 dark:border-blue-800/80 bg-blue-50/50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 hover:bg-blue-100/60 transition-all cursor-pointer"
              >
                <CheckSquare size={13} className={allEveningReconciled ? 'text-blue-600' : 'text-slate-400'} />
                <span>{allEveningReconciled ? 'Uncheck Evening' : 'Evening: Reconcile All'}</span>
              </button>
              <button
                type="button"
                onClick={handleConfirmEveningReconciliation}
                disabled={isSavingEvening}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl border border-indigo-200 dark:border-indigo-800/80 bg-indigo-50/70 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100/70 transition-all cursor-pointer disabled:opacity-50 shadow-xs"
                title="Persist Evening Checklist to Database for active date"
              >
                <ShieldCheck size={13} className="text-indigo-600 dark:text-indigo-400" />
                <span>{isSavingEvening ? 'Saving...' : 'Confirm'}</span>
              </button>
            </div>
          </div>

          {/* Embedded Dual In-App Digital Signature Cards (Owner & Sales Rep) */}
          <div className="p-4 sm:p-5 border-b border-gray-100 dark:border-slate-700 grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50/40 dark:bg-slate-900/30">
            {/* Card 1: Warehouse Keeper / Owner In-App Digital Signature */}
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Lock size={15} className="text-amber-600 dark:text-amber-400" />
                  <span className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                    Dispatcher / Owner Signature
                  </span>
                </div>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  isOwnerSignedForActiveDate
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800'
                    : 'bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800'
                }`}>
                  {isOwnerSignedForActiveDate ? 'Verified & Stamped' : 'Ready to Sign'}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-gray-100 dark:border-slate-800 flex items-center justify-between gap-3 flex-wrap sm:flex-nowrap">
                <div>
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    {activeManifest?.ownerSignedBy || dailyManifest?.ownerSignedBy || 'W. Liyanage (Managing Director / Owner)'}
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 font-mono">
                    Stamped: {isOwnerSignedForActiveDate && activeManifest?.ownerSignedAt ? new Date(activeManifest.ownerSignedAt).toLocaleString() : 'Ready'}
                  </p>
                </div>
                {ownerSignature && (
                  <img
                    src={ownerSignature}
                    alt="Owner Signature"
                    className="h-10 max-w-[120px] object-contain filter dark:invert-0 border border-dashed border-gray-200 dark:border-slate-700 rounded-lg p-1 bg-white dark:bg-slate-800"
                  />
                )}
              </div>

              <div className="flex items-center justify-between pt-1 border-t border-gray-100 dark:border-slate-800/60 text-xs">
                <label className="flex items-center gap-2 cursor-pointer select-none text-slate-700 dark:text-slate-300 font-medium">
                  <input
                    type="checkbox"
                    checked={useSavedOwnerSig}
                    onChange={(e) => handleToggleSavedOwnerSignature(e.target.checked)}
                    className="w-4 h-4 rounded border-gray-300 dark:border-slate-600 text-amber-600 focus:ring-amber-500 cursor-pointer accent-amber-600"
                  />
                  <span>Use Saved Signature</span>
                </label>
                <button
                  type="button"
                  onClick={() => setSigningModalRole('owner')}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-amber-300 dark:border-amber-700 bg-amber-50/50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-300 hover:bg-amber-100/70 text-xs font-semibold transition-colors cursor-pointer"
                >
                  <PenTool size={13} />
                  <span>{ownerSignature ? 'Draw / Update' : 'Sign as Owner'}</span>
                </button>
              </div>
            </div>

            {/* Card 2: Sales Representative Acceptance Signature */}
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <UserCheck size={15} className="text-emerald-600 dark:text-emerald-400" />
                  <span className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                    Sales Representative Acceptance
                  </span>
                </div>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    activeManifest?.status === 'PARTIAL_DISCREPANCY' && isRepSignedForActiveDate
                      ? 'bg-amber-100 text-amber-800 border border-amber-300 dark:bg-amber-950/50 dark:text-amber-300'
                      : isRepSignedForActiveDate
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800'
                      : 'bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800'
                  }`}
                >
                  {activeManifest?.status === 'PARTIAL_DISCREPANCY' && isRepSignedForActiveDate
                    ? 'Signed with Discrepancy'
                    : isRepSignedForActiveDate
                    ? 'Signed & Fully Verified'
                    : 'Pending Sign-Off'}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-gray-100 dark:border-slate-800 flex items-center justify-between gap-3 flex-wrap sm:flex-nowrap">
                <div>
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    {activeManifest?.repSignedBy || dailyManifest?.repSignedBy || dynamicRepName || vehicle?.repName || 'Kamal Perera'}
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 font-mono">
                    {isRepSignedForActiveDate && activeManifest?.repSignedAt
                      ? `Signed: ${new Date(activeManifest.repSignedAt).toLocaleString()}`
                      : 'Awaiting signature'}
                  </p>
                </div>

                {isRepSignedForActiveDate && activeManifest?.repSignatureData ? (
                  <img
                    src={activeManifest.repSignatureData}
                    alt="Rep Signature"
                    className="h-10 max-w-[120px] object-contain filter dark:invert-0 border border-dashed border-gray-200 dark:border-slate-700 rounded-lg p-1 bg-white dark:bg-slate-800"
                  />
                ) : (
                  <button
                    type="button"
                    onClick={() => setSigningModalRole('rep')}
                    className="px-3 py-1.5 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition-all cursor-pointer"
                  >
                    Sign Now
                  </button>
                )}
              </div>

              <div className="flex items-center justify-between pt-1 border-t border-gray-100 dark:border-slate-800/60 text-xs">
                <label className="flex items-center gap-2 cursor-pointer select-none text-slate-700 dark:text-slate-300 font-medium">
                  <input
                    type="checkbox"
                    checked={useSavedRepSig}
                    onChange={(e) => handleToggleSavedRepSignature(e.target.checked)}
                    className="w-4 h-4 rounded border-gray-300 dark:border-slate-600 text-emerald-600 focus:ring-emerald-500 cursor-pointer accent-emerald-600"
                  />
                  <span>Use Saved Signature</span>
                </label>
                <button
                  type="button"
                  onClick={() => setSigningModalRole('rep')}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-emerald-300 dark:border-emerald-700 bg-emerald-50/50 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-100/70 text-xs font-semibold transition-colors cursor-pointer"
                >
                  <PenTool size={13} />
                  <span>{isRepSignedForActiveDate && activeManifest?.repSignatureData ? 'Draw / Update' : 'Draw & Sign'}</span>
                </button>
              </div>
            </div>
          </div>

          {filteredVanStock.length === 0 ? (
            <div className="py-14 text-center text-slate-400 text-xs">
              <Truck className="w-12 h-12 mx-auto mb-2 opacity-30" />
              <p className="font-semibold text-slate-600 dark:text-slate-300">No van stock matches filters.</p>
              <p className="mt-1">Use the Load Van Stock action above to transfer items.</p>
            </div>
          ) : (
            <>
              {/* Desktop Table View */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full border-collapse text-left text-xs">
                  <thead>
                    <tr className="border-b border-gray-100 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-900/50 text-[10px] uppercase font-bold text-slate-500 dark:text-slate-300 tracking-wider">
                      <th className="py-3 px-3 text-center w-16" title="Morning Load Verification Check">
                        <Sun size={12} className="inline text-emerald-600 mr-0.5" />
                        <span>Morning</span>
                      </th>
                      <th className="py-3 px-3 text-center w-16" title="Evening Return & Sales Reconciliation Check">
                        <Moon size={12} className="inline text-blue-600 mr-0.5" />
                        <span>Evening</span>
                      </th>
                      <th className="py-3 px-4">SKU / Item</th>
                      <th className="py-3 px-4">Category</th>
                      <th className="py-3 px-3 text-center">Unit</th>
                      <th className="py-3 px-4 text-right">Van Quantity</th>
                      <th className="py-3 px-4 text-right">Target Par</th>
                      <th className="py-3 px-3 text-center">Verification</th>
                      <th className="py-3 px-4 text-right">Net Wholesale</th>
                      <th className="py-3 px-4 text-right">Total Valuation</th>
                      <th className="py-3 px-4 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-slate-700/60">
                    {filteredVanStock.map((item) => {
                      const product = products.find((p) => p.id === item.productId);
                      const netPrice = calcNetUnitPrice(item.basePrice, item.companyDiscountPercent);
                      const totalVal = calcTotalRealValue(netPrice, item.quantity);
                      const isMorningChecked = isItemCheckedMorning(item);
                      const isEveningChecked = isItemCheckedEvening(item);
                      const isDiscrepancy = item.status === 'UNVERIFIED_BY_REP' || (item.discrepancyFlag && !isMorningChecked);

                      // Distinct row background highlights:
                      // Morning check: bg-emerald-500/15 border-emerald-500/40 text-emerald-950 dark:text-emerald-100 font-medium
                      // Evening reconciliation: bg-blue-500/15 border-blue-500/40 text-blue-950 dark:text-blue-100 font-medium
                      // Both checked: dual gradient
                      let rowStyle = 'hover:bg-slate-50/80 dark:hover:bg-slate-700/40 transition-colors';
                      if (isEveningChecked && isMorningChecked) {
                        rowStyle = 'bg-gradient-to-r from-emerald-500/15 via-blue-500/15 to-emerald-500/10 border-blue-500/40 text-slate-900 dark:text-white font-medium';
                      } else if (isEveningChecked) {
                        rowStyle = 'bg-blue-500/15 border-blue-500/40 text-blue-950 dark:text-blue-100 font-medium';
                      } else if (isMorningChecked) {
                        rowStyle = 'bg-emerald-500/15 border-emerald-500/40 text-emerald-950 dark:text-emerald-100 font-medium';
                      } else if (isDiscrepancy) {
                        rowStyle = 'bg-rose-500/15 border-rose-500/40';
                      }

                      return (
                        <tr key={item.id} className={rowStyle}>
                          {/* Morning Checkbox */}
                          <td className="py-3 px-3 text-center">
                            <input
                              type="checkbox"
                              checked={isMorningChecked}
                              onChange={() => handleToggleCheck(item)}
                              className="w-4 h-4 rounded border-gray-300 dark:border-slate-600 text-emerald-600 focus:ring-emerald-500 cursor-pointer accent-emerald-600"
                              title="Morning Load Check"
                            />
                          </td>

                          {/* Evening Reconciliation Checkbox */}
                          <td className="py-3 px-3 text-center">
                            <input
                              type="checkbox"
                              checked={isEveningChecked}
                              onChange={() => handleToggleEveningReconciled(item)}
                              className="w-4 h-4 rounded border-gray-300 dark:border-slate-600 text-blue-600 focus:ring-blue-500 cursor-pointer accent-blue-600"
                              title="Evening Return / Sales Reconciled Check"
                            />
                          </td>

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

                          <td className="py-3 px-4 text-right font-mono text-slate-500 dark:text-slate-400">
                            {item.targetCapacity || 100}
                          </td>

                          <td className="py-3 px-3 text-center">
                            {isEveningChecked && isMorningChecked ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-blue-100 text-blue-800 border border-blue-300 dark:bg-blue-950/50 dark:text-blue-300">
                                <CheckCircle2 size={10} />
                                <span>Reconciled</span>
                              </span>
                            ) : item.status === 'UNVERIFIED_BY_REP' || (item.discrepancyFlag && !isMorningChecked) ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-rose-100 text-rose-800 border border-rose-300 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-800">
                                <AlertTriangle size={10} />
                                <span>Action Needed</span>
                              </span>
                            ) : isMorningChecked ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800">
                                <CheckCircle2 size={10} />
                                <span>Verified</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800">
                                <Clock size={10} />
                                <span>Pending Sign-Off</span>
                              </span>
                            )}
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
                                  width="w-52"
                                  className="bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 shadow-xl z-[9999]"
                                >
                                  <DropdownMenuLabel>Van Item Actions</DropdownMenuLabel>
                                  <DropdownMenuItem
                                    icon={Edit}
                                    onClick={() => handleOpenEditQty(item)}
                                  >
                                    Modify Quantity
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    icon={Receipt}
                                    onClick={() => handleOpenSalesModal(item)}
                                  >
                                    Record Road Sale
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    icon={RotateCcw}
                                    onClick={() => handleOpenReturnModal(item)}
                                  >
                                    Return to Warehouse
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    icon={AlertTriangle}
                                    destructive
                                    onClick={() => handleOpenDamagedModal(item)}
                                  >
                                    Quarantine Defect
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

              {/* Mobile Cards View */}
              <div className="md:hidden divide-y divide-gray-100 dark:divide-slate-700/60">
                {filteredVanStock.map((item) => {
                  const product = products.find((p) => p.id === item.productId);
                  const netPrice = calcNetUnitPrice(item.basePrice, item.companyDiscountPercent);
                  const totalVal = calcTotalRealValue(netPrice, item.quantity);
                  const isMorningChecked = isItemCheckedMorning(item);
                  const isEveningChecked = isItemCheckedEvening(item);
                  const isDiscrepancy = item.status === 'UNVERIFIED_BY_REP' || (item.discrepancyFlag && !isMorningChecked);

                  let rowStyle = 'p-4 space-y-2.5 transition-colors';
                  if (isEveningChecked && isMorningChecked) {
                    rowStyle = 'p-4 space-y-2.5 bg-gradient-to-r from-emerald-500/15 to-blue-500/15 border-l-4 border-l-blue-500';
                  } else if (isEveningChecked) {
                    rowStyle = 'p-4 space-y-2.5 bg-blue-500/15 border-l-4 border-l-blue-500';
                  } else if (isMorningChecked) {
                    rowStyle = 'p-4 space-y-2.5 bg-emerald-500/15 border-l-4 border-l-emerald-500';
                  } else if (isDiscrepancy) {
                    rowStyle = 'p-4 space-y-2.5 bg-rose-500/15 border-l-4 border-l-rose-500';
                  }

                  return (
                    <div key={item.id} className={rowStyle}>
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-orange-50 text-orange-700 border border-orange-200 dark:bg-orange-950/60 dark:text-orange-300 dark:border-orange-800/60">
                            {item.sku}
                          </span>
                          <h3 className="text-sm font-bold text-slate-900 dark:text-white mt-1 leading-snug">
                            {item.productName}
                          </h3>
                        </div>

                        {/* Dual Checkboxes for Mobile */}
                        <div className="flex items-center gap-3 flex-shrink-0">
                          <label className="flex items-center gap-1 cursor-pointer select-none text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                            <input
                              type="checkbox"
                              checked={isMorningChecked}
                              onChange={() => handleToggleCheck(item)}
                              className="w-4 h-4 rounded border-gray-300 dark:border-slate-600 text-emerald-600 focus:ring-emerald-500 cursor-pointer accent-emerald-600"
                            />
                            <Sun size={11} className="text-emerald-600" />
                          </label>

                          <label className="flex items-center gap-1 cursor-pointer select-none text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                            <input
                              type="checkbox"
                              checked={isEveningChecked}
                              onChange={() => handleToggleEveningReconciled(item)}
                              className="w-4 h-4 rounded border-gray-300 dark:border-slate-600 text-blue-600 focus:ring-blue-500 cursor-pointer accent-blue-600"
                            />
                            <Moon size={11} className="text-blue-600" />
                          </label>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-gray-100 dark:border-slate-700/60">
                        <div>
                          <span className="text-[10px] text-slate-500 dark:text-slate-400 block">Van Quantity:</span>
                          <strong className="text-sm font-mono text-slate-900 dark:text-white">
                            {item.quantity} {item.unit}
                          </strong>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-500 dark:text-slate-400 block">Total Value:</span>
                          <strong className="text-sm font-mono text-accent-700 dark:text-accent-300">
                            {formatLKR(totalVal)}
                          </strong>
                        </div>
                      </div>

                      <div className="pt-2 flex items-center justify-between gap-2 border-t border-gray-100 dark:border-slate-700/60">
                        <button
                          type="button"
                          onClick={() => handleOpenEditQty(item)}
                          className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 text-xs font-bold rounded-xl bg-accent-600 hover:bg-accent-700 text-white shadow-sm"
                        >
                          <Edit size={13} />
                          <span>Modify Qty</span>
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
                              width="w-52"
                              className="bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 shadow-xl z-[9999]"
                            >
                              <DropdownMenuItem
                                icon={Receipt}
                                onClick={() => handleOpenSalesModal(item)}
                              >
                                Record Road Sale
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                icon={RotateCcw}
                                onClick={() => handleOpenReturnModal(item)}
                              >
                                Return to Warehouse
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                icon={AlertTriangle}
                                destructive
                                onClick={() => handleOpenDamagedModal(item)}
                              >
                                Quarantine Defect
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
      )}



      {/* -------------------------------------------------------------
          TAB 3: DAMAGED GOODS LEDGER (Quarantine Pool & Defect Resolution)
         ------------------------------------------------------------- */}
      {activeTab === 'damaged' && (
        <div className="space-y-4">
          {/* Sub-Header: Active vs Resolved History Mode & Date Correlation */}
          <div className="flex items-center justify-between gap-3 flex-wrap bg-white dark:bg-slate-800 p-3 sm:px-4 rounded-2xl border border-gray-200 dark:border-slate-700 shadow-sm text-xs">
            {/* View Mode Toggle: Active vs Resolved History */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-slate-700 dark:text-slate-300">Quarantine View:</span>
              <div className="inline-flex rounded-lg border border-gray-200 dark:border-slate-700 p-0.5 bg-slate-50 dark:bg-slate-900">
                <button
                  type="button"
                  onClick={() => {
                    setShowResolvedHistory(false);
                    setDefectStatusFilter('ALL');
                  }}
                  className={`px-3 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                    !showResolvedHistory
                      ? 'bg-rose-600 text-white shadow-xs font-bold'
                      : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
                  }`}
                >
                  Active Quarantine ({activeDamagedGoodsList.length})
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowResolvedHistory(true);
                    setDefectStatusFilter('ALL');
                  }}
                  className={`px-3 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                    showResolvedHistory
                      ? 'bg-slate-800 dark:bg-slate-700 text-white shadow-xs font-bold'
                      : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
                  }`}
                  title="View items resolved via Vendor Return or Scrap Write-Off"
                >
                  Show Resolved / History ({resolvedDamagedGoodsList.length})
                </button>
              </div>
            </div>

            {/* Date Correlation Mode Selector */}
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-700 dark:text-slate-300">Filter Date By:</span>
              <div className="inline-flex rounded-lg border border-gray-200 dark:border-slate-700 p-0.5 bg-slate-50 dark:bg-slate-900">
                <button
                  type="button"
                  onClick={() => setDamageDateFilterMode('LOGGED')}
                  className={`px-3 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                    damageDateFilterMode === 'LOGGED'
                      ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                      : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
                  }`}
                >
                  Date Logged
                </button>
                <button
                  type="button"
                  onClick={() => setDamageDateFilterMode('LOAD_DATE')}
                  className={`px-3 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                    damageDateFilterMode === 'LOAD_DATE'
                      ? 'bg-rose-600 text-white shadow-xs font-bold'
                      : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
                  }`}
                  title="Correlate defects by the date the batch was originally loaded on the vehicle"
                >
                  Original Load Date
                </button>
              </div>
            </div>
            {damageDateFilterMode === 'LOAD_DATE' && (
              <span className="text-[11px] font-medium text-rose-600 dark:text-rose-400 flex items-center gap-1">
                <span>Correlated to loading batch:</span>
                <strong className="font-semibold">{datePreset}</strong>
              </span>
            )}
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 shadow-sm overflow-hidden">
            {filteredDamagedGoods.length === 0 ? (
              <div className="py-14 text-center text-slate-400 text-xs">
                <AlertTriangle className="w-12 h-12 mx-auto mb-2 opacity-30 text-rose-500" />
                <p className="font-semibold text-slate-600 dark:text-slate-300">
                  {showResolvedHistory ? 'No resolved damaged goods records found.' : 'No damaged goods quarantined.'}
                </p>
                <p className="mt-1">
                  {showResolvedHistory
                    ? 'Items resolved via Scrap Write-Off or Vendor Return will appear here.'
                    : 'All van items meet pristine road quality standards.'}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100 dark:divide-slate-700/60">
                {filteredDamagedGoods.map((item) => (
                <div key={item.id} className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-orange-50 text-orange-700 border border-orange-200 dark:bg-orange-950/60 dark:text-orange-300 dark:border-orange-800/60">
                        {item.sku}
                      </span>
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                        {item.productName}
                      </h3>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                          item.status === 'WRITTEN_OFF'
                            ? 'bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-300'
                            : item.status === 'VENDOR_RETURN'
                            ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/50 dark:text-indigo-300'
                            : item.status === 'INSPECTED'
                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300'
                            : 'bg-rose-100 text-rose-800 dark:bg-rose-950/50 dark:text-rose-300'
                        }`}
                      >
                        {item.status}
                      </span>
                    </div>

                    <p className="text-xs text-rose-700 dark:text-rose-300 font-medium mt-1">
                      Reason: {item.reason}
                    </p>

                    <div className="flex items-center gap-4 mt-1 text-xs text-slate-500 dark:text-slate-300 flex-wrap">
                      <span>Defective Qty: <strong className="text-slate-900 dark:text-white">{item.quantity} {item.unit}</strong></span>
                      <span>Total Loss: <strong className="text-rose-600 dark:text-rose-400 font-mono">{formatLKR(item.totalValue)}</strong></span>
                      <span>
                        Original Load Date:{' '}
                        <strong className="text-slate-900 dark:text-white font-mono">
                          {item.loadDate
                            ? formatDateYYYYMMDD(item.loadDate)
                            : deriveItemLoadDate(item)}
                        </strong>
                      </span>
                      {(item.manifestNo || item.sourceManifestNo) && (
                        <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800/60">
                          Manifest: {item.manifestNo || item.sourceManifestNo}
                        </span>
                      )}
                      {item.sourceInvoiceNo && <span>Invoice: <strong>{item.sourceInvoiceNo}</strong></span>}
                      <span>Reported By: <strong>{item.reportedBy}</strong></span>
                      <span className="text-[11px] text-slate-400 font-mono">
                        Logged: {formatDateYYYYMMDD(item.createdAt)}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {item.status === 'WRITTEN_OFF' || item.status === 'VENDOR_RETURN' ? (
                      /* Resolved status indicator: archived from active quarantine ledger */
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800/60">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Archived / Resolved
                      </span>
                    ) : (
                      /* Active quarantine actions: resolve as write-off or vendor return */
                      <>
                        <button
                          type="button"
                          onClick={async () => {
                            try {
                              await resolveDamagedRecord(item.id, 'WRITTEN_OFF', 'Scrap write-off approved');
                              toast.success(`SKU ${item.sku} written off as scrap.`);
                            } catch (err) {
                              toast.error(err.message || 'Failed to update damaged item status');
                            }
                          }}
                          className="px-2.5 py-1 text-xs font-semibold rounded-lg border border-gray-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                        >
                          Write-Off
                        </button>
                        <button
                          type="button"
                          onClick={async () => {
                            try {
                              await resolveDamagedRecord(item.id, 'VENDOR_RETURN', 'Dispatched to supplier');
                              toast.success(`SKU ${item.sku} dispatched for vendor return.`);
                            } catch (err) {
                              toast.error(err.message || 'Failed to update damaged item status');
                            }
                          }}
                          className="px-2.5 py-1 text-xs font-semibold rounded-lg border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 transition-colors"
                        >
                          Vendor Return
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
          </div>
        </div>
      )}

      {/* 4. TRANSACTIONAL AUDIT MOVEMENT LEDGER (AUDIT HISTORY) */}
      {activeTab === 'movements' && (
        <div className="space-y-3">
          {/* Day of Week & Calendar Date Filter Bar */}
          <UnifiedDayPillsCalendarFilter
            selectedDayOfWeek={selectedDayOfWeek}
            onSelectDayOfWeek={handleSelectDayOfWeek}
            calendarDateRange={calendarDateRange}
            onSelectDateRange={(range) => {
              setCalendarDateRange(range);
              setSelectedDayOfWeek('ALL');
            }}
            onReset={handleResetAuditDateFilters}
            label="Audit Date Filter"
            resultCount={filteredMovements.length}
          />

          {/* Item-Wise Total Summary Bar */}
          {movementItemTotals.length > 0 && (
            <div className="p-3 sm:px-4 rounded-2xl bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 shadow-sm space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                  <PackageCheck size={14} className="text-accent-600" />
                  Item-Wise Movement Totals ({movementItemTotals.length} Products Moved)
                </span>
                <span className="text-xs font-mono font-bold text-slate-600 dark:text-slate-400">
                  {movementItemTotals.reduce((sum, item) => sum + item.totalUnits, 0)} Total Units / {filteredMovements.length} Transactions
                </span>
              </div>

              {/* Product Pills / Summary Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2 pt-1 max-h-48 overflow-y-auto">
                {movementItemTotals.map((item) => (
                  <div
                    key={item.productId || item.sku}
                    className="p-2 rounded-xl border border-gray-100 dark:border-slate-700/70 bg-slate-50/70 dark:bg-slate-900/50 flex flex-col justify-between text-xs space-y-1"
                  >
                    <div className="flex items-start justify-between gap-1">
                      <div className="min-w-0">
                        <span className="font-mono text-[9px] font-bold text-slate-400">{item.sku}</span>
                        <p className="font-bold text-slate-800 dark:text-slate-200 truncate">{item.productName}</p>
                      </div>
                      <span className="font-mono font-black text-xs text-accent-700 dark:text-accent-300 flex-shrink-0">
                        {item.totalUnits} units
                      </span>
                    </div>

                    <div className="flex items-center gap-1 flex-wrap text-[10px]">
                      {item.vanSales > 0 && (
                        <span className="px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 font-medium">
                          Sale: {item.vanSales}
                        </span>
                      )}
                      {item.loaded > 0 && (
                        <span className="px-1.5 py-0.2 rounded bg-accent-100 text-accent-800 dark:bg-accent-950/60 dark:text-accent-300 font-medium">
                          Loaded: {item.loaded}
                        </span>
                      )}
                      {item.returned > 0 && (
                        <span className="px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 font-medium">
                          Returned: {item.returned}
                        </span>
                      )}
                      {item.damaged > 0 && (
                        <span className="px-1.5 py-0.2 rounded bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 font-medium">
                          Damaged: {item.damaged}
                        </span>
                      )}
                      {item.received > 0 && (
                        <span className="px-1.5 py-0.2 rounded bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300 font-medium">
                          Received: {item.received}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Movements Table / Cards */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 shadow-sm">
            {filteredMovements.length === 0 ? (
              <div className="py-14 text-center text-slate-400 text-xs">
                <ArrowRightLeft className="w-12 h-12 mx-auto mb-2 opacity-30" />
                <p className="font-semibold text-slate-600 dark:text-slate-300">No stock movements found.</p>
              </div>
            ) : (
              <>
                {/* Desktop Table View */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full border-collapse text-left text-xs">
                    <thead>
                      <tr className="border-b border-gray-100 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-900/50 text-[10px] uppercase font-bold text-slate-500 dark:text-slate-300 tracking-wider">
                        <th className="py-3 px-4">Timestamp</th>
                        <th className="py-3 px-4">Movement Type</th>
                        <th className="py-3 px-4">Item / SKU</th>
                        <th className="py-3 px-3 text-center">Qty</th>
                        <th className="py-3 px-4">Source &rarr; Target</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-slate-700/60">
                      {filteredMovements.map((m) => {
                        const { label, badge } = getHumanMovementLabel(m.movementType);
                        return (
                          <tr key={m.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-700/40 transition-colors">
                            <td className="py-3 px-4 font-mono text-[11px] text-slate-500 dark:text-slate-400">
                              {m.isGrouped ? (
                                <span className="font-semibold text-slate-800 dark:text-slate-200">
                                  {m.groupedDate} (Daily Total)
                                </span>
                              ) : (
                                formatMovementTimestamp(m.timestamp || m.createdAt)
                              )}
                            </td>
                            <td className="py-3 px-4">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${badge}`}>
                                {m.isGrouped ? 'Consolidated Road Sale' : label}
                              </span>
                            </td>
                            <td className="py-3 px-4">
                              <span className="font-bold text-slate-900 dark:text-white block">{m.productName}</span>
                              <span className="text-[10px] font-mono text-slate-400">{m.sku}</span>
                            </td>
                            <td className="py-3 px-3 text-center font-bold font-mono text-slate-900 dark:text-white">
                              {m.quantity}
                            </td>
                            <td className="py-3 px-4 text-slate-600 dark:text-slate-300 font-mono text-[11px]">
                              {m.sourceLocation} &rarr; {m.targetLocation}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Cards View */}
                <div className="md:hidden divide-y divide-gray-100 dark:divide-slate-700/60">
                  {filteredMovements.map((m) => {
                    const { label, badge } = getHumanMovementLabel(m.movementType);
                    return (
                      <div key={m.id} className="p-3.5 space-y-2 text-xs">
                        <div className="flex items-start justify-between gap-2">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${badge}`}>
                            {m.isGrouped ? 'Consolidated Road Sale' : label}
                          </span>
                          <span className="font-mono text-[10px] text-slate-400">
                            {m.isGrouped ? m.groupedDate : formatMovementTimestamp(m.timestamp || m.createdAt)}
                          </span>
                        </div>

                        <div className="flex items-center justify-between gap-2">
                          <div className="min-w-0">
                            <p className="font-bold text-slate-900 dark:text-white truncate">{m.productName}</p>
                            <p className="font-mono text-[10px] text-slate-400">{m.sku}</p>
                          </div>
                          <span className="font-mono font-bold text-sm text-slate-900 dark:text-white flex-shrink-0">
                            {m.quantity} units
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-[11px] pt-1.5 border-t border-gray-100 dark:border-slate-700/60 text-slate-500 dark:text-slate-400 font-mono">
                          <span>{m.sourceLocation} &rarr; {m.targetLocation}</span>
                          {m.isGrouped && (
                            <span className="text-emerald-600 dark:text-emerald-400 font-semibold text-[10px]">Daily Consolidation</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------
          OPERATIONAL MODALS
         ------------------------------------------------------------- */}
      <LoadVanStockModal
        isOpen={modalLoadOpen}
        onClose={() => {
          setModalLoadOpen(false);
          setTargetProductId(null);
        }}
        initialProductId={targetProductId}
      />

      <VehicleSalesModal
        isOpen={modalSalesOpen}
        onClose={() => {
          setModalSalesOpen(false);
          setSelectedContextProduct(null);
        }}
        initialProduct={selectedContextProduct}
        initialProductId={selectedContextProduct?.productId || selectedContextProduct?.id || null}
      />

      <LogDamagedGoodsModal
        isOpen={modalDamagedOpen}
        onClose={() => {
          setModalDamagedOpen(false);
          setSelectedContextProduct(null);
        }}
        initialProduct={selectedContextProduct}
        initialProductId={selectedContextProduct?.productId || selectedContextProduct?.id || null}
      />

      <ReturnToStoreModal
        isOpen={modalReturnOpen}
        onClose={() => {
          setModalReturnOpen(false);
          setSelectedContextProduct(null);
        }}
        initialProduct={selectedContextProduct}
        initialProductId={selectedContextProduct?.productId || selectedContextProduct?.id || null}
      />

      <EditVanItemQtyModal
        isOpen={modalEditQtyOpen}
        onClose={() => {
          setModalEditQtyOpen(false);
          setSelectedVanItemToEdit(null);
        }}
        item={selectedVanItemToEdit}
      />

      <PrintVanStockSheet
        isOpen={modalPrintOpen}
        onClose={() => setModalPrintOpen(false)}
      />

      <PrintDamagedGoodsReport
        isOpen={modalDamageReportOpen}
        onClose={() => setModalDamageReportOpen(false)}
        items={filteredDamagedGoods}
        dateRangeLabel={datePreset}
        statusLabel={defectStatusFilter}
      />

      <OwnerSignatureModal
        isOpen={modalOwnerSignOpen}
        onClose={() => setModalOwnerSignOpen(false)}
      />

      <SignaturePadModal
        isOpen={signingModalRole !== null}
        onClose={() => setSigningModalRole(null)}
        onSave={handleSignatureModalSave}
        defaultSignerName={
          signingModalRole === 'owner'
            ? activeManifest?.ownerSignedBy || dailyManifest?.ownerSignedBy || 'W. Liyanage (Managing Director / Owner)'
            : activeManifest?.repSignedBy || dynamicRepName || vehicle?.repName || 'Kamal Perera'
        }
        title={
          signingModalRole === 'owner'
            ? 'Warehouse Keeper / Owner Digital Signature'
            : 'Sales Representative Digital Acceptance Signature'
        }
        vehicleId={vehicle?.id || 'VAN-01'}
        manifestNo={activeManifest?.manifestNo || dailyManifest?.manifestNo || `MAN-${activeOperatingDate.replace(/-/g, '')}-01`}
        uncheckedCount={filteredVanStock.filter((i) => !isItemCheckedMorning(i)).length}
        totalCount={filteredVanStock.length}
      />
    </VanStockLayout>
  );
}
