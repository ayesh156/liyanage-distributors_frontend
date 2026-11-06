import { DEFAULT_OWNER_SIGNATURE } from './defaultOwnerSignature.js';
import { formatDateYYYYMMDD } from '../utils/date.js';

export { formatDateYYYYMMDD };
/**
 * @file vanStockData.js
 * @description Isolated mock catalog, Sri Lankan hardware inventory seed data,
 * and pure deterministic financial & par-replenishment calculation helpers.
 * Adheres to 3-tier multi-location inventory segregation:
 * 1. MAIN_STORE (LOC_MAIN - Central Warehouse Deiyandara)
 * 2. VEHICLE (LOC_VAN_01 - Field Delivery Van WP KDK-4521)
 * 3. DAMAGED_GOODS (LOC_DAMAGED - Defect Quarantine Pool)
 */

export const DEFAULT_VAN_ID = 'VAN-01';


export const DEFAULT_DAILY_MANIFEST = {
  id: 'MAN-20261105-01',
  manifestNo: 'MAN-20261105-01',
  manifestDate: '2026-11-05T07:00:00Z',
  manifestRevision: 1,
  uncheckedCount: 0,
  vehicleId: DEFAULT_VAN_ID,
  routeName: 'Morawaka Regional Route',
  repName: null,
  repPhone: null,
  dispatcherName: 'W. Liyanage (Managing Director / Owner)',
  ownerSignatureData: DEFAULT_OWNER_SIGNATURE,
  ownerSignedBy: 'W. Liyanage (Managing Director / Owner)',
  ownerSignedAt: '2026-11-05T07:15:00Z',
  repSignatureData: null,
  repSignedBy: null,
  repSignedAt: null,
  status: 'DISPATCHED', // 'DRAFT' | 'DISPATCHED' | 'FULLY_VERIFIED' | 'PARTIAL_DISCREPANCY'
  dispatchedAt: '2026-11-05T07:15:00Z',
};

/**
 * Historical manifests archive (Populated dynamically via Backend API)
 */
export const HISTORICAL_MANIFESTS = [];

export const DEFAULT_VEHICLE = {
  id: DEFAULT_VAN_ID,
  plateNumber: 'WP KDK-4521',
  route: 'All Routes',
  subRoutes: [],
  driver: 'Sunil Shantha',
  repName: null,
  repPhone: null,
  warehouseLocation: 'Deiyandara Central Warehouse',
  status: 'ACTIVE',
  vehicleImage: null,
};

export const INITIAL_LOCATIONS = [
  {
    id: 'LOC_MAIN',
    name: 'Central Main Store Warehouse',
    type: 'MAIN_STORE',
    vehicleId: null,
    description: 'Central buffer warehouse and supplier receiving hub, Hakmana Rd, Deiyandara',
    isActive: true,
  },
  {
    id: 'LOC_VAN_01',
    name: 'Delivery Van 01 (WP KDK-4521)',
    type: 'VEHICLE',
    vehicleId: DEFAULT_VAN_ID,
    description: 'Active field sales truck serving Morawaka & Southern regional route',
    isActive: true,
  },
  {
    id: 'LOC_DAMAGED',
    name: 'Damaged Goods Ledger Pool',
    type: 'DAMAGED_GOODS',
    vehicleId: null,
    description: 'Quarantined defect ledger for transit breakages, factory warranties and scrap',
    isActive: true,
  },
];

/**
 * Master Product Catalog (Populated dynamically via Backend API)
 */
export const INITIAL_PRODUCTS = [];

/**
 * Initial Central Warehouse (Main Store) Stock (Populated dynamically via Backend API)
 */
export const INITIAL_MAIN_STORE_STOCK = [];

/**
 * Initial Loaded Field Van Stock (Populated dynamically via Backend API)
 */
export const INITIAL_VAN_STOCK = [];

/**
 * Initial Quarantined Damaged Goods Pool (Populated dynamically via Backend API)
 */
export const INITIAL_DAMAGED_GOODS = [];

/**
 * Historical stock movements ledger (Populated dynamically via Backend API)
 */
export const INITIAL_STOCK_MOVEMENTS = [];

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// PURE DETERMINISTIC CALCULATION HELPERS
// Clamps all negative values to 0 using Math.max(0, val)
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

/**
 * Calculates net unit price after company discount percent.
 * Formula: NetUnitPrice = Math.max(0, BasePrice * (1 - Discount% / 100))
 * @param {number} basePrice
 * @param {number} discountPercent
 * @returns {number}
 */
export function calcNetUnitPrice(basePrice, discountPercent = 0) {
  const price = Math.max(0, Number(basePrice) || 0);
  const discount = Math.max(0, Math.min(100, Number(discountPercent) || 0));
  return Math.max(0, price * (1 - discount / 100));
}

/**
 * Calculates total monetary valuation of a given quantity at net price.
 * Formula: TotalRealValue = Math.max(0, NetUnitPrice * Quantity)
 * @param {number} netUnitPrice
 * @param {number} quantity
 * @returns {number}
 */
export function calcTotalRealValue(netUnitPrice, quantity) {
  const unit = Math.max(0, Number(netUnitPrice) || 0);
  const qty = Math.max(0, Number(quantity) || 0);
  return Math.max(0, unit * qty);
}

/**
 * Calculates required restock quantity to bring van stock up to par target capacity.
 * Formula: RestockNeeded = Math.max(0, TargetCapacity - CurrentOnHand)
 * @param {number} targetCapacity
 * @param {number} currentOnHand
 * @returns {number}
 */
export function calcRestockNeeded(targetCapacity, currentOnHand) {
  const target = Math.max(0, Number(targetCapacity) || 0);
  const current = Math.max(0, Number(currentOnHand) || 0);
  return Math.max(0, target - current);
}

/**
 * Calculates estimated monetary cost to restock short inventory to par target capacity.
 * Formula: EstimatedCost = RestockNeeded * NetUnitPrice
 * @param {number} restockNeeded
 * @param {number} netUnitPrice
 * @returns {number}
 */
export function calcEstimatedReplenishmentCost(restockNeeded, netUnitPrice) {
  const needed = Math.max(0, Number(restockNeeded) || 0);
  const price = Math.max(0, Number(netUnitPrice) || 0);
  return Math.max(0, needed * price);
}

/**
 * Classifies replenishment health status into a 5-tier priority matrix.
 * Thresholds:
 * - Current == 0               -> CRITICAL (OUT)
 * - Current <= Target * 0.25   -> CRITICAL
 * - Current <= Target * 0.60   -> MODERATE
 * - Current <= Target          -> OPTIMAL
 * - Current > Target           -> OVERSTOCKED
 *
 * @param {number} currentOnHand
 * @param {number} targetCapacity
 * @returns {{
 *   level: 'CRITICAL (OUT)' | 'CRITICAL' | 'MODERATE' | 'OPTIMAL' | 'OVERSTOCKED',
 *   label: string,
 *   badgeClass: string,
 *   actionText: string,
 *   rank: number
 * }}
 */
export function classifyReplenishmentPriority(currentOnHand, targetCapacity) {
  const current = Math.max(0, Number(currentOnHand) || 0);
  const target = Math.max(0, Number(targetCapacity) || 0);

  if (target === 0 && current === 0) {
    return {
      level: 'OPTIMAL',
      label: 'Optimal Par Level',
      badgeClass: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800',
      actionText: 'No target configured',
      rank: 4,
    };
  }

  if (current === 0) {
    return {
      level: 'CRITICAL (OUT)',
      label: 'Stock Depleted (Out of Stock)',
      badgeClass: 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300 border border-red-200 dark:border-red-800 animate-pulse',
      actionText: 'Urgent immediate loading required before truck dispatch',
      rank: 1,
    };
  }

  if (current <= target * 0.25) {
    return {
      level: 'CRITICAL',
      label: 'Critical Buffer Shortage',
      badgeClass: 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300 border border-red-200 dark:border-red-800',
      actionText: 'High priority loading; stock below safe operational buffer',
      rank: 2,
    };
  }

  if (current <= target * 0.6) {
    return {
      level: 'MODERATE',
      label: 'Moderate Shortage',
      badgeClass: 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 border border-amber-200 dark:border-amber-800',
      actionText: 'Routine replenishment recommended',
      rank: 3,
    };
  }

  if (current <= target) {
    return {
      level: 'OPTIMAL',
      label: 'Optimal Par Level',
      badgeClass: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800',
      actionText: 'Stock levels healthy; no immediate transfer needed',
      rank: 4,
    };
  }

  return {
    level: 'OVERSTOCKED',
    label: 'Overstocked Capacity',
    badgeClass: 'bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 border border-purple-200 dark:border-purple-800',
    actionText: 'Van overloaded; return excess to warehouse',
    rank: 5,
  };
}

/**
 * Formats a numeric currency value into standard Sri Lankan Rupee display: "Rs. 12,450.00"
 * @param {number} amount
 * @returns {string}
 */
export function formatLKR(amount) {
  const val = Number(amount) || 0;
  return `Rs. ${val.toLocaleString('en-LK', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/**
 * Generates standard SKU codes (e.g., 'COP-WIR-482') based on product name
 * and a 3-digit salt.
 * @param {string} productName
 * @returns {string}
 */
export function generateAutoSku(productName = '') {
  const words = productName
    .trim()
    .replace(/[^a-zA-Z0-9\s]/g, '')
    .split(/\s+/)
    .filter(Boolean);

  let prefix = 'SKU';
  if (words.length >= 2) {
    prefix = `${words[0].substring(0, 3).toUpperCase()}-${words[1].substring(0, 3).toUpperCase()}`;
  } else if (words.length === 1) {
    prefix = `${words[0].substring(0, 4).toUpperCase()}-ITM`;
  }

  const salt = Math.floor(100 + Math.random() * 900);
  return `${prefix}-${salt}`;
}



/**
 * Universal Date Presets and filtering logic
 */
export const DATE_PRESETS = [
  { id: 'ALL', label: 'All Dates' },
  { id: 'TODAY', label: 'Today' },
  { id: 'YESTERDAY', label: 'Yesterday' },
  { id: 'TOMORROW', label: 'Tomorrow' },
  { id: 'THIS_MONTH', label: 'This Month' },
  { id: 'THIS_YEAR', label: 'This Year' },
  { id: 'CUSTOM', label: 'Custom Range' },
];

/**
 * Validates if an ISO string or date representation matches a given preset or custom range.
 * @param {string|number|Date} dateValue
 * @param {'ALL'|'TODAY'|'YESTERDAY'|'TOMORROW'|'THIS_MONTH'|'THIS_YEAR'|'CUSTOM'} preset
 * @param {string} customStart - 'YYYY-MM-DD'
 * @param {string} customEnd - 'YYYY-MM-DD'
 * @returns {boolean}
 */
export function isDateInPreset(dateValue, preset = 'ALL', customStart = '', customEnd = '') {
  if (!preset || preset === 'ALL') return true;
  if (!dateValue) return false;

  const target = new Date(dateValue);
  if (isNaN(target.getTime())) return false;

  const now = new Date();
  const targetYear = target.getFullYear();
  const targetMonth = target.getMonth();
  const targetDate = target.getDate();

  const nowYear = now.getFullYear();
  const nowMonth = now.getMonth();
  const nowDate = now.getDate();

  if (preset === 'TODAY') {
    return targetYear === nowYear && targetMonth === nowMonth && targetDate === nowDate;
  }

  if (preset === 'YESTERDAY') {
    const yest = new Date(nowYear, nowMonth, nowDate - 1);
    return targetYear === yest.getFullYear() && targetMonth === yest.getMonth() && targetDate === yest.getDate();
  }

  if (preset === 'TOMORROW') {
    const tom = new Date(nowYear, nowMonth, nowDate + 1);
    return targetYear === tom.getFullYear() && targetMonth === tom.getMonth() && targetDate === tom.getDate();
  }

  if (preset === 'THIS_MONTH') {
    return targetYear === nowYear && targetMonth === nowMonth;
  }

  if (preset === 'THIS_YEAR') {
    return targetYear === nowYear;
  }

  if (preset === 'CUSTOM') {
    if (customStart) {
      const start = new Date(customStart);
      start.setHours(0, 0, 0, 0);
      if (target < start) return false;
    }
    if (customEnd) {
      const end = new Date(customEnd);
      end.setHours(23, 59, 59, 999);
      if (target > end) return false;
    }
    return true;
  }

  return true;
}
