/**
 * @file VanStockManagement.jsx
 * @description Central administrative cockpit orchestrator for active field delivery van operations.
 * Focuses strictly on mobile vehicle inventory, daily dispatch & digital owner pre-signatures,
 * on-hand van stock with direct item quantity modification & automatic warehouse rebalancing,
 * automated par replenishment planner, quarantined damaged goods ledger with printable audit report,
 * immutable stock movements, and universal SearchableSelect + DateFilterBar filtering.
 */

import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Truck,
  AlertTriangle,
  TrendingUp,
  Plus,
  ArrowRightLeft,
  RotateCcw,
  Receipt,
  Printer,
  Share2,
  MessageCircle,
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
} from 'lucide-react';
import { toast } from 'react-toastify';
import VanStockLayout from './VanStockLayout';
import LoadVanStockModal from './LoadVanStockModal';
import AddVanStockModal from './AddVanStockModal';
import AddProductModal from './AddProductModal';
import AdjustStockModal from './AdjustStockModal';
import LogDamagedGoodsModal from './LogDamagedGoodsModal';
import VehicleSalesModal from './VehicleSalesModal';
import ReturnToStoreModal from './ReturnToStoreModal';
import PrintVanStockSheet from './PrintVanStockSheet';
import PrintDamagedGoodsReport from './PrintDamagedGoodsReport';
import EditVanItemQtyModal from './EditVanItemQtyModal';
import OwnerSignatureModal from './OwnerSignatureModal';
import SearchableSelect from '../ui/SearchableSelect';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '../ui/DropdownMenu';
import DateFilterBar from './DateFilterBar';
import useAppStore from '../../hooks/useAppStore';
import useVanStockStore from '../../hooks/useVanStockStore';
import { openWhatsAppChat, formatSriLankanWhatsAppNumber } from '../../utils/whatsapp';
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
  const ownerSignatureData = useVanStockStore((s) => s.ownerSignatureData);
  const activeTab = useVanStockStore((s) => s.activeTab);
  const setActiveTab = useVanStockStore((s) => s.setActiveTab);
  const getKpis = useVanStockStore((s) => s.getKpis);
  const getRestockRequirements = useVanStockStore((s) => s.getRestockRequirements);
  const resolveDamagedRecord = useVanStockStore((s) => s.resolveDamagedRecord);
  const dispatchDailyManifest = useVanStockStore((s) => s.dispatchDailyManifest);
  const reDispatchManifest = useVanStockStore((s) => s.reDispatchManifest);
  const fetchInitialData = useVanStockStore((s) => s.fetchInitialData);

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

  // Local filtering & date states
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [vanApprovalFilter, setVanApprovalFilter] = useState('ALL');
  const [priorityTierFilter, setPriorityTierFilter] = useState('ALL');
  const [defectStatusFilter, setDefectStatusFilter] = useState('ALL');
  const [movementTypeFilter, setMovementTypeFilter] = useState('ALL');

  // Unified Date Filter states per context
  const [datePreset, setDatePreset] = useState('ALL');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [damageDateFilterMode, setDamageDateFilterMode] = useState('LOGGED'); // 'LOGGED' | 'LOAD_DATE'
  const [showResolvedHistory, setShowResolvedHistory] = useState(false); // Toggle Active vs Resolved Damaged History

  const [copiedLink, setCopiedLink] = useState(false);

  // Computed KPIs & Restock Data
  const kpis = getKpis();
  const restockRequirements = getRestockRequirements();

  // Master categories list for SearchableSelect
  const categoryOptions = useMemo(() => {
    const set = new Set(products.map((p) => p.category || 'General'));
    const list = [{ value: 'ALL', label: 'All Categories' }];
    set.forEach((cat) => list.push({ value: cat, label: cat }));
    return list;
  }, [products]);

  // Van Approval Status options
  const vanApprovalOptions = [
    { value: 'ALL', label: 'All Verification Statuses' },
    { value: 'PENDING_CONFIRMATION', label: 'Pending Rep Sign-Off' },
    { value: 'APPROVED', label: 'Verified & Approved' },
  ];

  // Restock Priority Tier options
  const priorityTierOptions = [
    { value: 'ALL', label: 'All Priority Tiers' },
    { value: 'CRITICAL (OUT)', label: 'Critical Out (0 Units)' },
    { value: 'CRITICAL', label: 'Critical Buffer Shortage' },
    { value: 'MODERATE', label: 'Moderate Shortage' },
    { value: 'OPTIMAL', label: 'Optimal Par Level' },
    { value: 'OVERSTOCKED', label: 'Overstocked Capacity' },
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

  // Movement Types options
  const movementTypeOptions = [
    { value: 'ALL', label: 'All Movement Types' },
    { value: 'STORE_TO_VEHICLE_LOAD', label: 'Store -> Van Load' },
    { value: 'VEHICLE_TO_STORE_RETURN', label: 'Van -> Store Return' },
    { value: 'VEHICLE_SALES_OUTBOUND', label: 'Road Sales Outbound' },
    { value: 'RETURN_TO_DAMAGED_POOL', label: 'Quarantined Damaged Pool' },
    { value: 'WAREHOUSE_AUDIT_ADJUSTMENT', label: 'Warehouse Audit Adjustment' },
    { value: 'SUPPLIER_PURCHASE_INBOUND', label: 'Supplier Purchase Inbound' },
    { value: 'DAMAGED_WRITE_OFF', label: 'Damaged Scrap Write-Off' },
  ];

  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // FILTERED TAB DATASETS (WITH DATE-RANGE & SEARCHABLE LOGIC)
  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  // Filtered On-Hand Van Stock (Perpetual Inventory: displays all SKUs where quantity > 0 disregarding dates)
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

      return matchSearch && matchCategory && matchApproval;
    });
  }, [vanStock, products, searchQuery, categoryFilter, vanApprovalFilter]);

  // Filtered Restock Requirements
  const filteredRestockItems = useMemo(() => {
    return restockRequirements.filter((item) => {
      const q = searchQuery.toLowerCase().trim();
      const matchSearch =
        !q ||
        item.name.toLowerCase().includes(q) ||
        item.sku.toLowerCase().includes(q);

      const matchCategory =
        categoryFilter === 'ALL' || item.category === categoryFilter;

      const matchPriority =
        priorityTierFilter === 'ALL' || item.priority.level === priorityTierFilter;

      return matchSearch && matchCategory && matchPriority;
    });
  }, [restockRequirements, searchQuery, categoryFilter, priorityTierFilter]);

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

      const matchDate = isDateInPreset(targetDate, datePreset, customStart, customEnd);

      return matchSearch && matchStatus && matchDate;
    });
  }, [showResolvedHistory, activeDamagedGoodsList, resolvedDamagedGoodsList, searchQuery, defectStatusFilter, damageDateFilterMode, datePreset, customStart, customEnd]);

  // Filtered Stock Movements
  const filteredMovements = useMemo(() => {
    return stockMovements.filter((m) => {
      const q = searchQuery.toLowerCase().trim();
      const matchSearch =
        !q ||
        m.productName.toLowerCase().includes(q) ||
        m.sku.toLowerCase().includes(q) ||
        (m.reference && m.reference.toLowerCase().includes(q)) ||
        (m.performedBy && m.performedBy.toLowerCase().includes(q));

      const matchType =
        movementTypeFilter === 'ALL' || m.movementType === movementTypeFilter;

      // Safely support either timestamp or createdAt fields from backend or local movements
      const rawTime = m.timestamp || m.createdAt;
      const matchDate = isDateInPreset(rawTime, datePreset, customStart, customEnd);

      return matchSearch && matchType && matchDate;
    });
  }, [stockMovements, searchQuery, movementTypeFilter, datePreset, customStart, customEnd]);

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

  /**
   * Dispatches the daily delivery van manifest link directly to the assigned Sales Representative via WhatsApp.
   * Resolves the representative's dynamic phone number from the database and invokes openWhatsAppChat.
   */
  const handleWhatsApp = async () => {
    const manifestCode =
      dailyManifest?.manifestNo ||
      `MAN-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-01`;
    const shareUrl = `${window.location.origin}/share/van-manifest/${manifestCode}`;
    // Clean text template without emojis to prevent device-specific Mojibake and encoding corruption
    const message = `Today's Delivery Van Manifest (${manifestCode}) is ready for your verification:\n\n${shareUrl}`;

    // Always copy link to clipboard for convenience
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    } catch (_clipErr) {
      // ignore
    }

    if (!dynamicRepPhone) {
      toast.warning(`No phone number registered for ${dynamicRepName}. Manifest link copied to clipboard.`);
      toast.info(`Manifest URL: ${shareUrl}`);
      return;
    }

    // Pass dynamic phone and manifest dispatch message into openWhatsAppChat utility
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
   * Alias for handleWhatsApp to support backward-compatible naming conventions.
   */
  const handleShareManifest = handleWhatsApp;

  // Discrepancy items computation: dynamically reflects current items and manifest status
  const uncheckedByRepItems = useMemo(() => {
    // If manifest is fully verified / rep accepted, zero discrepancy items exist
    if (dailyManifest?.status === 'FULLY_VERIFIED' || dailyManifest?.status === 'REP_ACCEPTED' || dailyManifest?.status === 'VERIFIED') return [];
    return vanStock.filter(
      (i) => i.quantity > 0 && (i.status === 'UNVERIFIED_BY_REP' || i.discrepancyFlag || (!i.repChecked && dailyManifest?.status === 'PARTIAL_DISCREPANCY'))
    );
  }, [vanStock, dailyManifest]);
  const hasDiscrepancy = dailyManifest?.status === 'PARTIAL_DISCREPANCY' && uncheckedByRepItems.length > 0;

  // Dynamic pending confirmation count reflecting current items & manifest status (cleared once signed/verified)
  const pendingConfirmationCount = useMemo(() => {
    if (
      dailyManifest?.status === 'FULLY_VERIFIED' ||
      dailyManifest?.status === 'REP_ACCEPTED' ||
      dailyManifest?.status === 'VERIFIED' ||
      dailyManifest?.status === 'PARTIAL_DISCREPANCY'
    ) return 0;
    return vanStock.filter(
      (i) => i.quantity > 0 && i.isActive !== false && (i.status === 'PENDING_CONFIRMATION' && !i.repChecked)
    ).length;
  }, [vanStock, dailyManifest]);

  // Re-Dispatch Manifest Loop: asynchronous handler with valid manifest route generation
  const handleReDispatch = async () => {
    const result = await reDispatchManifest({
      dispatcherName: 'W. Liyanage (Managing Director / Owner)',
      notes: `Updated manifest re-dispatched to ${vehicle.id} after quantity reconciliation`,
    });
    // Safely resolve unique manifest number from result or active store state
    const manifestNo =
      result?.manifest?.manifestNo ||
      dailyManifest?.manifestNo ||
      `MAN-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-01`;
    const shareUrl = `${window.location.origin}/share/van-manifest/${manifestNo}`;
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast.success(`Manifest ${manifestNo} link copied to clipboard.`);
    } catch {
      toast.info(`Manifest ${manifestNo} link: ${shareUrl}`);
    }
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

  const ownerSignature = ownerSignatureData || dailyManifest?.ownerSignatureData || DEFAULT_OWNER_SIGNATURE;

  return (
    <VanStockLayout>
      {/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
          1. FLEET & DISPATCH STATUS BANNER (Light & Dark Adaptive Hero)
         â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <div className="pt-2 sm:pt-4 relative overflow-hidden rounded-3xl bg-white dark:bg-zinc-900 border border-slate-200/90 dark:border-zinc-800 text-slate-900 dark:text-white p-5 sm:p-7 shadow-sm transition-colors">
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          {/* Truck & Rep Identity */}
          <div className="flex flex-col sm:flex-row items-center sm:items-start text-center sm:text-left gap-4">
            <div className="w-16 h-16 sm:w-16 sm:h-16 rounded-2xl bg-orange-50 text-orange-600 border border-orange-200 dark:bg-orange-950/50 dark:text-orange-400 dark:border-orange-800/50 flex items-center justify-center shadow-inner flex-shrink-0 overflow-hidden">
              {vehicle?.vehicleImage ? (
                <img
                  src={resolveServerImageUrl(vehicle.vehicleImage)}
                  alt={vehicle.plateNumber || vehicle.id}
                  className="w-full h-full object-cover"
                />
              ) : (
                <Truck size={32} />
              )}
            </div>

            <div>
              <div className="flex items-center justify-center sm:justify-start gap-2.5 flex-wrap">
                <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded-full bg-orange-50 text-orange-700 border border-orange-200 dark:bg-orange-950/60 dark:text-orange-300 dark:border-orange-800/60">
                  {vehicle?.id || 'VAN-01'}
                </span>
                <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  {vehicle?.status || 'ACTIVE'}
                </span>
                <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-800 border border-slate-300 dark:bg-zinc-800 dark:text-zinc-200 dark:border-zinc-700">
                  Rev #{dailyManifest?.manifestRevision || 1}
                </span>
                {dailyManifest?.status === 'PARTIAL_DISCREPANCY' && (
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-800 flex items-center gap-1">
                    <AlertTriangle size={11} /> Rep Discrepancy Flagged
                  </span>
                )}
                {dailyManifest?.status === 'DISPATCHED' && (
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800 flex items-center gap-1">
                    <Lock size={11} /> Owner Signed & Dispatched
                  </span>
                )}
                {(dailyManifest?.status === 'VERIFIED' || dailyManifest?.status === 'FULLY_VERIFIED' || dailyManifest?.status === 'REP_ACCEPTED') && (
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800 flex items-center gap-1">
                    <CheckCircle2 size={11} /> Rep Tablet Accepted
                  </span>
                )}
              </div>

              <h1 className="text-xl sm:text-2xl font-black tracking-tight mt-1 text-slate-900 dark:text-white">
                {vehicle?.plateNumber || vehicle?.vehicleNumber || 'WP KDK-4521'}
              </h1>

              <p className="text-xs text-slate-600 dark:text-zinc-400 mt-1 flex items-center justify-center sm:justify-start gap-2.5 sm:gap-3 flex-wrap">
                <span>
                  Route: <strong className="text-slate-800 dark:text-zinc-200">All Routes</strong>
                </span>
                <span className="hidden sm:inline">•</span>
                <span>Rep: <strong className="text-slate-800 dark:text-zinc-200">{dynamicRepName || 'Unassigned'}</strong> ({dynamicRepPhone || 'No phone registered'})</span>
                <span className="hidden sm:inline">•</span>
                <span>Driver: <strong className="text-slate-800 dark:text-zinc-200">{vehicle?.driver || vehicle?.driverName || 'Sunil Shantha'}</strong></span>
              </p>
            </div>
          </div>

          {/* Quick Header Navigation Actions with shortened mobile labels */}
          <div className="flex items-center justify-center sm:justify-start lg:justify-end gap-2 flex-wrap pt-3 lg:pt-0 border-t lg:border-t-0 border-slate-200 dark:border-zinc-800 w-full lg:w-auto">
            {/* Owner Pre-Sign & Finalize Manifest Dispatch */}
            <button
              type="button"
              onClick={handleDispatchDailyManifest}
              className="flex items-center gap-1.5 px-3 py-2 sm:px-3.5 sm:py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 active:scale-95 text-white font-bold text-xs shadow-sm transition-all cursor-pointer whitespace-nowrap"
              title="Lock Owner Signature & Dispatch Daily Manifest to Sales Rep"
            >
              <PenTool size={14} />
              <span className="hidden sm:inline">Dispatch Manifest</span>
              <span className="sm:hidden">Dispatch</span>
            </button>

            <button
              type="button"
              onClick={() => navigate('/van-stock/transfer')}
              className="flex items-center gap-1.5 px-3 py-2 sm:px-3.5 sm:py-2.5 rounded-xl bg-accent-600 hover:bg-accent-700 active:scale-95 text-white font-bold text-xs shadow-sm transition-all cursor-pointer whitespace-nowrap"
            >
              <ArrowRightLeft size={14} />
              <span className="hidden sm:inline">Transfer Workbench</span>
              <span className="sm:hidden">Transfer</span>
            </button>

            <button
              type="button"
              onClick={() => navigate(`/van-stock/confirm/${vehicle.id}`)}
              className="flex items-center gap-1.5 px-3 py-2 sm:px-3.5 sm:py-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 dark:text-zinc-200 dark:border-zinc-700 active:scale-95 font-semibold text-xs transition-all cursor-pointer whitespace-nowrap"
            >
              <ShieldCheck size={14} />
              <span className="hidden sm:inline">Rep Acceptance Portal</span>
              <span className="sm:hidden">Rep Portal</span>
              {pendingConfirmationCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-amber-500 text-slate-900 font-bold text-[10px]">
                  {pendingConfirmationCount}
                </span>
              )}
            </button>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleWhatsApp}
                className="p-2 sm:p-2.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-300 dark:bg-emerald-950/40 dark:hover:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800 transition-all cursor-pointer shadow-sm"
                title={dynamicRepPhone ? `WhatsApp Direct Share to ${dynamicRepName} (${dynamicRepPhone})` : 'No Rep Phone Registered'}
              >
                {copiedLink ? <Check size={15} className="text-emerald-600 dark:text-emerald-400" /> : <MessageCircle size={15} className="text-emerald-600 dark:text-emerald-400 fill-emerald-100 dark:fill-emerald-950/50" />}
              </button>

              <button
                type="button"
                onClick={() => setModalPrintOpen(true)}
                className="p-2 sm:p-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 dark:text-zinc-200 dark:border-zinc-700 transition-all cursor-pointer"
                title="Print Daily Load Manifest (A4)"
              >
                <Printer size={15} />
              </button>

              <button
                type="button"
                onClick={() => setModalOwnerSignOpen(true)}
                className="p-2 sm:p-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 dark:text-zinc-200 dark:border-zinc-700 transition-all cursor-pointer"
                title="Owner / Dispatcher Signature Settings"
              >
                <Lock size={15} />
              </button>
            </div>
          </div>
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
                Physical truck count mismatch detected on {vehicle.id} (Manifest Rev #{dailyManifest?.manifestRevision || 1}). Reconcile quantities below and re-dispatch updated manifest to rep.
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

      {/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
          2. FIELD OPERATION KPI CARDS (Van On-Hand, Par Shortage, Damages)
         â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* KPI 1: Active Van Stock Valuation */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs">
            <span className="font-semibold uppercase tracking-wider text-[10px]">Van On-Hand Value</span>
            <Truck size={15} className="text-emerald-500" />
          </div>
          <div className="text-base sm:text-lg font-black text-slate-900 dark:text-white font-mono truncate">
            {formatLKR(kpis.van.totalValue)}
          </div>
          <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium block">
            {kpis.van.skuCount} active SKUs on truck
          </span>
        </div>

        {/* KPI 2: Total Loaded Units */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs">
            <span className="font-semibold uppercase tracking-wider text-[10px]">Loaded Units</span>
            <PackageCheck size={15} className="text-accent-600 dark:text-accent-400" />
          </div>
          <div className="text-base sm:text-lg font-black text-slate-900 dark:text-white font-mono">
            {kpis.van.totalUnits.toLocaleString()}
          </div>
          <span className="text-[10px] text-slate-400 dark:text-slate-500 block">
            {pendingConfirmationCount > 0 ? (
              <span className="text-amber-600 dark:text-amber-400 font-medium">
                {pendingConfirmationCount} awaiting rep sign-off
              </span>
            ) : (
              '100% Rep Confirmed'
            )}
          </span>
        </div>

        {/* KPI 3: Next-Trip Replenishment Par Need */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs">
            <span className="font-semibold uppercase tracking-wider text-[10px]">Replenishment Need</span>
            <Sparkles size={15} className="text-amber-500" />
          </div>
          <div className="text-base sm:text-lg font-black text-slate-900 dark:text-white font-mono truncate">
            {formatLKR(kpis.replenishment.estimatedCost)}
          </div>
          <span className="text-[10px] text-amber-600 dark:text-amber-400 font-medium block">
            {kpis.replenishment.criticalItemCount} critical short item{kpis.replenishment.criticalItemCount === 1 ? '' : 's'}
          </span>
        </div>

        {/* KPI 4: Quarantined Damaged Goods */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs">
            <span className="font-semibold uppercase tracking-wider text-[10px]">Damaged Quarantine</span>
            <AlertTriangle size={15} className="text-rose-500" />
          </div>
          <div className="text-base sm:text-lg font-black text-slate-900 dark:text-white font-mono truncate">
            {formatLKR(kpis.damaged.totalValue)}
          </div>
          <span className="text-[10px] text-rose-600 dark:text-rose-400 font-medium block">
            {kpis.damaged.totalUnits} active unit{kpis.damaged.totalUnits === 1 ? '' : 's'} ({activeDamagedGoodsList.length} active SKU{activeDamagedGoodsList.length === 1 ? '' : 's'})
          </span>
        </div>
      </div>

      {/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
          3. FIELD OPERATIONS QUICK-ACTION BAR
         â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 shadow-sm flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => {
              setTargetProductId(null);
              setModalLoadOpen(true);
            }}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-xl bg-accent-600 hover:bg-accent-700 text-white shadow-sm transition-all cursor-pointer whitespace-nowrap"
          >
            <Plus size={14} />
            <span className="hidden sm:inline">Load Van Stock</span>
            <span className="sm:hidden">+ Load</span>
          </button>

          <button
            type="button"
            onClick={() => handleOpenSalesModal(null)}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all cursor-pointer shadow-sm whitespace-nowrap"
          >
            <Receipt size={14} />
            <span className="hidden sm:inline">Record Road Sale</span>
            <span className="sm:hidden">Sale</span>
          </button>

          <button
            type="button"
            onClick={() => handleOpenDamagedModal(null)}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50/50 dark:bg-rose-950/20 text-rose-700 dark:text-rose-300 hover:bg-rose-100/50 transition-all cursor-pointer shadow-sm whitespace-nowrap"
          >
            <AlertTriangle size={14} />
            <span className="hidden sm:inline">Quarantine Defect</span>
            <span className="sm:hidden">Quarantine</span>
          </button>

          <button
            type="button"
            onClick={() => handleOpenReturnModal(null)}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all cursor-pointer shadow-sm whitespace-nowrap"
          >
            <RotateCcw size={14} />
            <span className="hidden sm:inline">Return to Warehouse</span>
            <span className="sm:hidden">Return</span>
          </button>
        </div>

        {/* Right Action Group: Central Warehouse navigation and contextual Damaged Report print trigger */}
        <div className="flex items-center gap-2 flex-wrap">
          {activeTab === 'damaged' && (
            <button
              type="button"
              onClick={() => setModalDamageReportOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-xl bg-rose-600 hover:bg-rose-700 active:scale-95 text-white shadow-sm transition-all cursor-pointer whitespace-nowrap"
              title="Print Damaged Goods Audit Report (A4)"
            >
              <Printer size={14} />
              <span className="hidden sm:inline">Print Damage Report (A4)</span>
              <span className="sm:hidden">Damage Report</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => navigate('/warehouse')}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl border border-blue-200 dark:border-blue-900/60 bg-blue-50/50 dark:bg-blue-950/20 text-blue-700 dark:text-blue-300 hover:bg-blue-100/50 transition-all cursor-pointer whitespace-nowrap"
          >
            <Warehouse size={14} />
            <span className="hidden sm:inline">Go to Central Warehouse â†’</span>
            <span className="sm:hidden">Warehouse â†’</span>
          </button>
        </div>
      </div>

      {/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
          4. 4-PILLAR FIELD OPERATIONS NAVIGATION (Responsive: Mobile Dropdown / Desktop Tabs)
         â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <div className="border-b border-gray-200 dark:border-slate-700">
        {(() => {
          const navigationTabs = [
            { id: 'on-hand', label: 'On-Hand Van Stock', icon: Truck, count: filteredVanStock.length },
            { id: 'restock', label: 'Next-Trip Restock', icon: Sparkles, count: kpis.replenishment.criticalItemCount },
            { id: 'damaged', label: 'Damaged Goods Ledger', icon: AlertTriangle, count: activeDamagedGoodsList.length },
            { id: 'movements', label: 'Movement Audit Trail', icon: ArrowRightLeft, count: stockMovements.length },
          ];

          return (
            <>
              {/* Mobile View Section Selector: 100% width SearchableSelect replacing horizontal scroll */}
              <div className="flex sm:hidden flex-col gap-1 pb-2">
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Active Operations Section
                </label>
                <SearchableSelect
                  options={navigationTabs.map((tab) => ({
                    value: tab.id,
                    label: `${tab.label} (${tab.count ?? 0})`,
                    icon: tab.icon,
                  }))}
                  value={activeTab}
                  onChange={(val) => {
                    if (val) {
                      setActiveTab(val);
                      setSearchQuery('');
                    }
                  }}
                  placeholder="Select Operations Section..."
                  clearable={false}
                  className="w-full"
                />
              </div>

              {/* Desktop View: Horizontal tab buttons */}
              <nav className="hidden sm:flex items-center gap-2 overflow-x-auto pb-1">
                {navigationTabs.map((tab) => {
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
                      className={`flex items-center gap-2 px-4 py-2.5 border-b-2 text-xs sm:text-sm font-bold whitespace-nowrap transition-all cursor-pointer ${
                        isActive
                          ? 'border-accent-600 text-accent-700 dark:text-accent-400 bg-accent-50/40 dark:bg-accent-950/20'
                          : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
                      }`}
                    >
                      <Icon size={16} />
                      <span>{tab.label}</span>
                      {tab.count !== undefined && (
                        <span
                          className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                            isActive
                              ? 'bg-accent-200 dark:bg-accent-900 text-accent-900 dark:text-accent-200'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                          }`}
                        >
                          {tab.count}
                        </span>
                      )}
                    </button>
                  );
                })}
              </nav>
            </>
          );
        })()}
      </div>

      {/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
          5. CONTEXTUAL FILTER ENGINE (Universal SearchableSelect & DateBar)
         â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
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
            {/* Category Filter for catalog tabs */}
            {(activeTab === 'on-hand' || activeTab === 'restock') && (
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

            {/* Priority Tier Filter on Restock */}
            {activeTab === 'restock' && (
              <div className="w-48 sm:w-52">
                <SearchableSelect
                  value={priorityTierFilter}
                  onChange={setPriorityTierFilter}
                  options={priorityTierOptions}
                  placeholder="Priority Tier"
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

        {/* Unified Date Preset Filter Bar (Tabs: damaged, movements strictly - Decoupled from On-Hand Perpetual Inventory) */}
        {(activeTab === 'damaged' || activeTab === 'movements') && (
          <DateFilterBar
            selectedPreset={datePreset}
            onPresetChange={setDatePreset}
            customStart={customStart}
            onCustomStartChange={setCustomStart}
            customEnd={customEnd}
            onCustomEndChange={setCustomEnd}
            resultCount={
              activeTab === 'damaged'
                ? filteredDamagedGoods.length
                : filteredMovements.length
            }
            label={
              activeTab === 'damaged'
                ? 'Quarantine Date Filter'
                : 'Movement Timestamp Filter'
            }
          />
        )}
      </div>

      {/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
          TAB 1: ON-HAND VAN STOCK (With Inline/Modal Quantity Edit)
         â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      {activeTab === 'on-hand' && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 shadow-sm">
          <div className="px-5 py-4 border-b border-gray-100 dark:border-slate-700 flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">
              Active Van Loaded Stock ({filteredVanStock.length})
            </h2>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => navigate(`/van-stock/confirm/${vehicle.id}`)}
                className="text-xs font-semibold text-accent-600 dark:text-accent-400 hover:underline"
              >
                Open Acceptance Drawer
              </button>
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
              {/* Desktop View */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full border-collapse text-left text-xs">
                  <thead>
                    <tr className="border-b border-gray-100 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-900/50 text-[10px] uppercase font-bold text-slate-500 dark:text-slate-300 tracking-wider">
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
                      const isApproved =
                        item.status === 'APPROVED' ||
                        ((dailyManifest?.status === 'FULLY_VERIFIED' || dailyManifest?.status === 'REP_ACCEPTED' || dailyManifest?.status === 'VERIFIED') && item.quantity > 0);

                      return (
                        <tr key={item.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-700/40 transition-colors">
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
                            {item.status === 'UNVERIFIED_BY_REP' || (item.discrepancyFlag && !item.repChecked) ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-rose-100 text-rose-800 border border-rose-300 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-800">
                                <AlertTriangle size={10} />
                                <span>Unchecked by Rep â€” Action Needed</span>
                              </span>
                            ) : item.repChecked || isApproved ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800">
                                <CheckCircle2 size={10} />
                                <span>Verified by Rep</span>
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

              {/* Mobile Cards */}
              <div className="md:hidden divide-y divide-gray-100 dark:divide-slate-700/60">
                {filteredVanStock.map((item) => {
                  const product = products.find((p) => p.id === item.productId);
                  const netPrice = calcNetUnitPrice(item.basePrice, item.companyDiscountPercent);
                  const totalVal = calcTotalRealValue(netPrice, item.quantity);
                  const isApproved =
                    item.status === 'APPROVED' ||
                    ((dailyManifest?.status === 'FULLY_VERIFIED' || dailyManifest?.status === 'REP_ACCEPTED' || dailyManifest?.status === 'VERIFIED') && item.quantity > 0);

                  return (
                    <div key={item.id} className="p-4 space-y-2.5">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-orange-50 text-orange-700 border border-orange-200 dark:bg-orange-950/60 dark:text-orange-300 dark:border-orange-800/60">
                            {item.sku}
                          </span>
                          <h3 className="text-sm font-bold text-slate-900 dark:text-white mt-1 leading-snug">
                            {item.productName}
                          </h3>
                        </div>

                        {item.status === 'UNVERIFIED_BY_REP' || (item.discrepancyFlag && !item.repChecked) ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-rose-100 text-rose-800 border border-rose-300 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-800 flex-shrink-0">
                            <AlertTriangle size={10} />
                            <span>Action Needed</span>
                          </span>
                        ) : item.repChecked || isApproved ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 flex-shrink-0">
                            <CheckCircle2 size={10} />
                            <span>Verified</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 flex-shrink-0">
                            <Clock size={10} />
                            <span>Pending</span>
                          </span>
                        )}
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

      {/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
          TAB 2: NEXT-TRIP RESTOCK REQUIREMENTS (Automated Par Planner)
         â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      {activeTab === 'restock' && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 dark:border-slate-700 flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                Next-Trip Restock Requirements ({filteredRestockItems.length})
              </h2>
            </div>

            <div className="divide-y divide-gray-100 dark:divide-slate-700/60">
              {filteredRestockItems.map((item) => (
                <div key={item.productId} className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-orange-50 text-orange-700 border border-orange-200 dark:bg-orange-950/60 dark:text-orange-300 dark:border-orange-800/60">
                        {item.sku}
                      </span>
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                        {item.name}
                      </h3>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${item.priority.badgeClass}`}>
                        {item.priority.level}
                      </span>
                    </div>

                    <div className="flex items-center gap-4 mt-1.5 text-xs text-slate-500 dark:text-slate-300 flex-wrap">
                      <span>On-Hand: <strong className="text-slate-900 dark:text-white">{item.currentOnHand} {item.unit}</strong></span>
                      <span>Target Par: <strong>{item.targetCapacity}</strong></span>
                      <span>Deficit: <strong className="text-rose-600 dark:text-rose-400">+{item.restockNeeded} {item.unit}</strong></span>
                      <span>Warehouse Avail: <strong className="text-blue-600 dark:text-blue-400">{item.availableWarehouse} {item.unit}</strong></span>
                      <span>Restock Cost: <strong className="text-accent-600 dark:text-accent-400 font-mono">{formatLKR(item.estimatedCost)}</strong></span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setTargetProductId(item.productId);
                        setModalLoadOpen(true);
                      }}
                      className="px-3 py-1.5 text-xs font-bold rounded-xl bg-accent-600 hover:bg-accent-700 text-white shadow-sm transition-all cursor-pointer"
                    >
                      Restock into Van
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
          TAB 3: DAMAGED GOODS LEDGER (Quarantine Pool & Defect Resolution)
         â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
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

      {/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
          TAB 4: TRANSACTIONAL AUDIT MOVEMENT LEDGER
         â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      {activeTab === 'movements' && (
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
                      <th className="py-3 px-4">Source â†’ Target</th>
                      <th className="py-3 px-4">Reference</th>
                      <th className="py-3 px-4">Performed By</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-slate-700/60">
                    {filteredMovements.map((m) => (
                      <tr key={m.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-700/40 transition-colors">
                        <td className="py-3 px-4 font-mono text-[11px] text-slate-500 dark:text-slate-400">
                          {formatMovementTimestamp(m.timestamp || m.createdAt)}
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-200">
                            {m.movementType}
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
                          {m.sourceLocation} â†’ {m.targetLocation}
                        </td>
                        <td className="py-3 px-4 font-mono text-[11px] text-accent-700 dark:text-accent-400 font-bold">
                          {m.reference || 'N/A'}
                        </td>
                        <td className="py-3 px-4 text-slate-600 dark:text-slate-300">
                          {m.performedBy}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Cards View */}
              <div className="md:hidden divide-y divide-gray-100 dark:divide-slate-700/60">
                {filteredMovements.map((m) => (
                  <div key={m.id} className="p-3.5 space-y-2 text-xs">
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-200">
                        {m.movementType}
                      </span>
                      <span className="font-mono text-[10px] text-slate-400">
                        {formatMovementTimestamp(m.timestamp || m.createdAt)}
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
                      <span>{m.sourceLocation} â†’ {m.targetLocation}</span>
                      <span className="text-accent-600 dark:text-accent-400 font-semibold">{m.reference || 'N/A'}</span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
          OPERATIONAL MODALS
         â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
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
    </VanStockLayout>
  );
}
