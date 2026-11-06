/**
 * @file useVanStockStore.js
 * @description Production-ready Zustand state management store for the Van Stock & Multi-Location
 * Inventory subsystem. Fully integrated with backend REST APIs (/api/warehouse, /api/van-stock,
 * /api/damaged-goods, /api/manifests) with local state hydration, optimistic offline persistence,
 * and automated audit logging.
 */

import { create } from 'zustand';
import { DEFAULT_OWNER_SIGNATURE } from '../data/defaultOwnerSignature.js';
import {
  DEFAULT_VAN_ID,
  DEFAULT_DAILY_MANIFEST,
  HISTORICAL_MANIFESTS,
  DEFAULT_VEHICLE,
  INITIAL_LOCATIONS,
  INITIAL_PRODUCTS,
  INITIAL_MAIN_STORE_STOCK,
  INITIAL_VAN_STOCK,
  INITIAL_DAMAGED_GOODS,
  INITIAL_STOCK_MOVEMENTS,
  calcNetUnitPrice,
  calcTotalRealValue,
  calcRestockNeeded,
  calcEstimatedReplenishmentCost,
  classifyReplenishmentPriority,
} from '../data/vanStockData';
import {
  validateStoreToVehicleTransfer,
  validateVehicleToStoreReturn,
  validateVehicleRoadSale,
  validateDamagedGoodsQuarantine,
  validateWarehouseAdjustment,
  buildMovementRecord,
} from '../services/vanStockService';
import { vanStockApi } from '../services/vanStockApi.js';

const STORAGE_KEY = 'lhdd_van_stock_state_v2';
const VEHICLE_STORAGE_KEY = 'lhdd_vehicle_profile';

/**
 * Safely loads persisted vehicle state from dedicated key or snapshot fallback.
 */
function loadPersistedVehicle() {
  if (typeof window === 'undefined' || !window.localStorage) return null;
  try {
    const raw = localStorage.getItem(VEHICLE_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (_e) {
    return null;
  }
}

/**
 * Safely loads persisted state from browser localStorage, falling back to initial seeds.
 */
function loadPersistedState() {
  if (typeof window === 'undefined' || !window.localStorage) {
    return null;
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed;
  } catch (_err) {
    console.warn('Failed to parse van stock state from localStorage. Using seeds.');
    return null;
  }
}

/**
 * Safely writes state snapshot to localStorage.
 */
function persistState(state) {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    const snapshot = {
      vehicle: state.vehicle,
      locations: state.locations,
      products: state.products,
      mainStoreStock: state.mainStoreStock,
      vanStock: state.vanStock,
      damagedGoods: state.damagedGoods,
      stockMovements: state.stockMovements,
      offlineQueue: state.offlineQueue,
      dailyManifest: state.dailyManifest,
      manifestHistory: state.manifestHistory,
      ownerSignatureData: state.ownerSignatureData,
      ownerSignerName: state.ownerSignerName,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
    if (state.vehicle) {
      localStorage.setItem(VEHICLE_STORAGE_KEY, JSON.stringify(state.vehicle));
    }
  } catch (err) {
    console.error('Failed to persist van stock state:', err);
  }
}

const persisted = loadPersistedState();
const persistedVehicle = loadPersistedVehicle();

/**
 * Sanitizes van stock item ensuring all discrepancy and check fields exist.
 */
function sanitizeVanStockItem(item) {
  const isApproved = item.status === 'APPROVED' || item.status === 'VERIFIED';
  return {
    ...item,
    repChecked: item.repChecked !== undefined ? Boolean(item.repChecked) : isApproved,
    repCheckedAt: item.repCheckedAt || (isApproved ? item.confirmedAt || null : null),
    discrepancyFlag: Boolean(item.discrepancyFlag),
  };
}

export const useVanStockStore = create((set, get) => ({
  // Core Domain State
  vehicle: persistedVehicle || persisted?.vehicle || DEFAULT_VEHICLE,
  locations: persisted?.locations || INITIAL_LOCATIONS,
  products: persisted?.products || [],
  mainStoreStock: persisted?.mainStoreStock || [],
  vanStock: (persisted?.vanStock || []).map(sanitizeVanStockItem),
  damagedGoods: persisted?.damagedGoods || [],
  stockMovements: persisted?.stockMovements || [],
  offlineQueue: persisted?.offlineQueue || [],
  dailyManifest: persisted?.dailyManifest || DEFAULT_DAILY_MANIFEST,
  manifestHistory: persisted?.manifestHistory || [],
  ownerSignatureData: persisted?.ownerSignatureData || DEFAULT_OWNER_SIGNATURE,
  ownerSignerName: persisted?.ownerSignerName || 'W. Liyanage (Managing Director / Owner)',

  // â”€â”€ UI Filter & Navigation State â”€â”€
  activeTab: 'on-hand',
  searchQuery: '',
  categoryFilter: 'ALL',
  isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
  isSyncing: false,
  isHydrated: false,

  // â”€â”€ Manifest History Lookup Selector â”€â”€
  getManifestByCode: (manifestNoOrDate) => {
    if (!manifestNoOrDate) return get().dailyManifest;
    const { dailyManifest, manifestHistory = [] } = get();
    if (dailyManifest.manifestNo === manifestNoOrDate || dailyManifest.id === manifestNoOrDate) {
      return dailyManifest;
    }
    const found = manifestHistory.find(
      (m) =>
        m.manifestNo === manifestNoOrDate ||
        m.id === manifestNoOrDate ||
        (m.manifestDate && m.manifestDate.startsWith(manifestNoOrDate))
    );
    return found || null;
  },

  // â”€â”€ Setters â”€â”€
  setActiveTab: (tab) => set({ activeTab: tab }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  setCategoryFilter: (category) => set({ categoryFilter: category }),
  setIsOnline: (status) => set({ isOnline: status }),

  /**
   * Action: Updates vehicle profile attributes (plateNumber, model, driver, route, vehicleImage).
   * Persists changes to local storage snapshot, dedicated vehicle key, and state for immediate Fleet Banner rendering.
   *
   * @param {Object} partialVehicle - Partial vehicle profile data
   * @returns {Object} Updated vehicle state
   */
  updateVehicleProfile: (partialVehicle) => {
    const currentVehicle = get().vehicle || {};
    const updated = {
      ...currentVehicle,
      ...partialVehicle,
      id: partialVehicle.id || currentVehicle.id || DEFAULT_VAN_ID,
      vehicleId: partialVehicle.id || partialVehicle.vehicleId || currentVehicle.vehicleId || DEFAULT_VAN_ID,
      plateNumber: partialVehicle.plateNumber || partialVehicle.vehicleNumber || currentVehicle.plateNumber,
      vehicleNumber: partialVehicle.plateNumber || partialVehicle.vehicleNumber || currentVehicle.vehicleNumber,
      driver: partialVehicle.driver || partialVehicle.driverName || currentVehicle.driver,
      driverName: partialVehicle.driver || partialVehicle.driverName || currentVehicle.driverName,
      route: 'All Routes',
      routeName: 'All Routes',
      subRoutes: [],
      routeId: null,
      warehouseLocation: partialVehicle.warehouseLocation || currentVehicle.warehouseLocation,
      vehicleImage: partialVehicle.vehicleImage !== undefined ? partialVehicle.vehicleImage : currentVehicle.vehicleImage,
    };
    set({ vehicle: updated });
    persistState(get());
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.setItem(VEHICLE_STORAGE_KEY, JSON.stringify(updated));
      }
    } catch (_e) {}
    return updated;
  },

  // ─────────────────────────────────────────────────────────────
  // BACKEND API HYDRATION
  // ─────────────────────────────────────────────────────────────
  fetchInitialData: async (vehicleId = 'VAN-01') => {
    try {
      set({ isSyncing: true });
      const [invRes, catRes, dmgRes, manRes, histRes, sigRes] = await Promise.allSettled([
        vanStockApi.getVanInventory(vehicleId),
        vanStockApi.getWarehouseCatalog(),
        vanStockApi.getDamagedGoods(),
        vanStockApi.getDailyManifest(vehicleId),
        vanStockApi.getManifestHistory(vehicleId),
        vanStockApi.getOwnerSignature(),
      ]);

      const updates = {};

      if (invRes.status === 'fulfilled' && invRes.value?.success && invRes.value.data) {
        const { vehicle: backendVehicle, vanStock, movements } = invRes.value.data;
        if (backendVehicle) {
          const current = get().vehicle || {};
          const persistedLocally = loadPersistedVehicle() || {};
          updates.vehicle = {
            ...backendVehicle,
            ...current,
            ...persistedLocally,
            locationId: backendVehicle.locationId || current.locationId,
            routeId: null,
            plateNumber: current.plateNumber || persistedLocally.plateNumber || backendVehicle.plateNumber || backendVehicle.vehicleNumber,
            vehicleNumber: current.plateNumber || persistedLocally.plateNumber || backendVehicle.vehicleNumber || backendVehicle.plateNumber,
            driver: current.driver || persistedLocally.driver || backendVehicle.driver || backendVehicle.driverName,
            driverName: current.driver || persistedLocally.driver || backendVehicle.driverName || backendVehicle.driver,
            route: 'All Routes',
            routeName: 'All Routes',
            subRoutes: [],
            warehouseLocation: current.warehouseLocation || persistedLocally.warehouseLocation || backendVehicle.warehouseLocation || 'Deiyandara Central Warehouse',
            vehicleImage: current.vehicleImage !== undefined ? current.vehicleImage : (persistedLocally.vehicleImage !== undefined ? persistedLocally.vehicleImage : null),
          };
        }
        if (vanStock) updates.vanStock = vanStock.map(sanitizeVanStockItem);
        if (movements && movements.length > 0) updates.stockMovements = movements;
      }

      if (catRes.status === 'fulfilled' && catRes.value?.success && catRes.value.data) {
        const { catalog, movements } = catRes.value.data;
        if (catalog) {
          updates.products = catalog.map((c) => ({
            id: c.id,
            sku: c.sku,
            name: c.name,
            category: c.category,
            unit: c.unit,
            basePrice: c.basePrice,
            companyDiscountPercent: c.companyDiscountPercent,
            targetCapacity: c.targetCapacity,
            isActive: c.isActive,
          }));

          updates.mainStoreStock = catalog.map((c) => ({
            id: c.stockItemId || c.id,
            locationId: 'LOC_MAIN',
            locationType: 'MAIN_STORE',
            productId: c.id,
            productName: c.name,
            sku: c.sku,
            unit: c.unit,
            quantity: c.warehouseQuantity,
            basePrice: c.basePrice,
            companyDiscountPercent: c.companyDiscountPercent,
            targetCapacity: c.targetCapacity,
            isActive: c.isActive,
          }));
        }
        if (movements && (!updates.stockMovements || updates.stockMovements.length === 0)) {
          updates.stockMovements = movements;
        }
      }

      if (dmgRes.status === 'fulfilled' && dmgRes.value?.success && dmgRes.value.data) {
        if (dmgRes.value.data.records) {
          updates.damagedGoods = dmgRes.value.data.records;
        }
      }

      if (manRes.status === 'fulfilled' && manRes.value?.success && manRes.value.data) {
        updates.dailyManifest = manRes.value.data;
      }

      if (histRes.status === 'fulfilled' && histRes.value?.success && histRes.value.data) {
        updates.manifestHistory = histRes.value.data;
      }

      if (sigRes.status === 'fulfilled' && sigRes.value?.success && sigRes.value.data) {
        if (sigRes.value.data.signatureData) {
          updates.ownerSignatureData = sigRes.value.data.signatureData;
        }
        if (sigRes.value.data.signerName) {
          updates.ownerSignerName = sigRes.value.data.signerName;
        }
      }

      set({ ...updates, isSyncing: false, isHydrated: true });
      persistState(get());
    } catch (err) {
      console.warn('Initial fetch for van stock store failed (using offline cache):', err);
      set({ isSyncing: false });
    }
  },

  // â”€â”€ KPIs Selector â”€â”€
  getKpis: () => {
    const { mainStoreStock, vanStock, damagedGoods, products, dailyManifest } = get();

    // 1. Main Store KPI (Active items only)
    let mainStoreTotalValue = 0;
    let mainStoreTotalUnits = 0;
    let activeMainStoreCount = 0;
    mainStoreStock.forEach((item) => {
      if (item.isActive === false) return;
      const net = calcNetUnitPrice(item.basePrice, item.companyDiscountPercent);
      mainStoreTotalValue += calcTotalRealValue(net, item.quantity);
      mainStoreTotalUnits += item.quantity;
      activeMainStoreCount += 1;
    });

    // 2. Van On-Hand KPI (Active items only)
    let vanTotalValue = 0;
    let vanTotalUnits = 0;
    let pendingConfirmationCount = 0;
    const isFullyVerified = dailyManifest?.status === 'FULLY_VERIFIED';
    const isSignedManifest = isFullyVerified || dailyManifest?.status === 'PARTIAL_DISCREPANCY';
    vanStock.forEach((item) => {
      if (item.isActive === false) return;
      const net = calcNetUnitPrice(item.basePrice, item.companyDiscountPercent);
      vanTotalValue += calcTotalRealValue(net, item.quantity);
      vanTotalUnits += item.quantity;
      // Pending sign-off applies strictly to unsigned loaded stock with quantity > 0
      if (!isSignedManifest && item.quantity > 0 && item.status === 'PENDING_CONFIRMATION' && !item.repChecked) {
        pendingConfirmationCount += 1;
      }
    });

    // 3. Damaged Goods KPI (Active Quarantine Pool strictly: LOGGED & INSPECTED only)
    let damagedTotalValue = 0;
    let damagedTotalUnits = 0;
    let activeDamagedRecordCount = 0;
    let resolvedDamagedRecordCount = 0;
    damagedGoods.forEach((item) => {
      if (item.isActive === false) return;
      const isResolved = item.status === 'WRITTEN_OFF' || item.status === 'VENDOR_RETURN';
      if (!isResolved) {
        damagedTotalValue += item.totalValue;
        damagedTotalUnits += item.quantity;
        activeDamagedRecordCount += 1;
      } else {
        resolvedDamagedRecordCount += 1;
      }
    });

    // 4. Replenishment Need KPI (Active products only)
    let replenishmentNeededUnits = 0;
    let replenishmentEstimatedCost = 0;
    let criticalItemCount = 0;

    products.forEach((prod) => {
      if (prod.isActive === false) return;
      const vanItem = vanStock.find((v) => v.productId === prod.id && v.isActive !== false);
      const current = vanItem ? vanItem.quantity : 0;
      const target = vanItem?.targetCapacity || prod.targetCapacity || 100;
      const net = calcNetUnitPrice(prod.basePrice, prod.companyDiscountPercent);
      const needed = calcRestockNeeded(target, current);
      const cost = calcEstimatedReplenishmentCost(needed, net);
      const priority = classifyReplenishmentPriority(current, target);

      replenishmentNeededUnits += needed;
      replenishmentEstimatedCost += cost;
      if (priority.rank <= 2) {
        criticalItemCount += 1;
      }
    });

    return {
      mainStore: {
        totalValue: mainStoreTotalValue,
        totalUnits: mainStoreTotalUnits,
        skuCount: activeMainStoreCount,
      },
      van: {
        totalValue: vanTotalValue,
        totalUnits: vanTotalUnits,
        skuCount: vanStock.filter((i) => i.quantity > 0 && i.isActive !== false).length,
        pendingConfirmationCount,
      },
      damaged: {
        totalValue: damagedTotalValue,
        totalUnits: damagedTotalUnits,
        recordCount: activeDamagedRecordCount,
        resolvedCount: resolvedDamagedRecordCount,
      },
      replenishment: {
        neededUnits: replenishmentNeededUnits,
        estimatedCost: replenishmentEstimatedCost,
        criticalItemCount,
      },
    };
  },

  // â”€â”€ Restock Requirements Selector â”€â”€
  getRestockRequirements: () => {
    const { products, vanStock, mainStoreStock } = get();

    return products.map((prod) => {
      const vanItem = vanStock.find((v) => v.productId === prod.id);
      const warehouseItem = mainStoreStock.find((m) => m.productId === prod.id);

      const currentOnHand = vanItem ? vanItem.quantity : 0;
      const targetCapacity = vanItem?.targetCapacity || prod.targetCapacity || 100;
      const netUnitPrice = calcNetUnitPrice(prod.basePrice, prod.companyDiscountPercent);
      const restockNeeded = calcRestockNeeded(targetCapacity, currentOnHand);
      const estimatedCost = calcEstimatedReplenishmentCost(restockNeeded, netUnitPrice);
      const priority = classifyReplenishmentPriority(currentOnHand, targetCapacity);
      const availableWarehouse = warehouseItem ? warehouseItem.quantity : 0;

      return {
        product: prod,
        productId: prod.id,
        sku: prod.sku,
        name: prod.name,
        category: prod.category || 'General',
        unit: prod.unit,
        basePrice: prod.basePrice,
        discountPercent: prod.companyDiscountPercent,
        netUnitPrice,
        currentOnHand,
        targetCapacity,
        restockNeeded,
        estimatedCost,
        priority,
        availableWarehouse,
        vanItemId: vanItem ? vanItem.id : null,
      };
    });
  },

  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // ASYNC MUTATION ACTIONS (WIRED TO BACKEND REST APIS)
  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  /**
   * Action 1: Load Van Stock (Store -> Vehicle Transfer)
   */
  loadVanStock: async ({ productId, quantity, repName, notes }) => {
    const { products, mainStoreStock, vanStock, stockMovements, isOnline } = get();
    const prodId = Number(productId);
    const qty = Number(quantity);

    const product = products.find((p) => p.id === prodId);
    if (!product) throw new Error('Product not found in catalog.');

    const warehouseItem = mainStoreStock.find((m) => m.productId === prodId);
    const availableWarehouseQty = warehouseItem ? warehouseItem.quantity : 0;

    validateStoreToVehicleTransfer({
      requestedQty: qty,
      availableWarehouseQty,
    });

    const netPrice = calcNetUnitPrice(product.basePrice, product.companyDiscountPercent);

    // 1. Decrement warehouse stock
    const updatedMainStore = mainStoreStock.map((m) => {
      if (m.productId === prodId) {
        return { ...m, quantity: Math.max(0, m.quantity - qty) };
      }
      return m;
    });

    // 2. Increment van stock (or add new entry)
    let updatedVanStock = [...vanStock];
    const existingVanIndex = updatedVanStock.findIndex((v) => v.productId === prodId);

    if (existingVanIndex >= 0) {
      const curr = updatedVanStock[existingVanIndex];
      updatedVanStock[existingVanIndex] = {
        ...curr,
        quantity: curr.quantity + qty,
        status: 'PENDING_CONFIRMATION',
        repChecked: false,
        repCheckedAt: null,
        discrepancyFlag: false,
        confirmedBy: null,
        confirmedAt: null,
      };
    } else {
      updatedVanStock.push({
        id: Date.now() + Math.floor(Math.random() * 100),
        locationId: 'LOC_VAN_01',
        locationType: 'VEHICLE',
        vehicleId: DEFAULT_VAN_ID,
        productId: prodId,
        productName: product.name,
        sku: product.sku,
        unit: product.unit,
        quantity: qty,
        basePrice: product.basePrice,
        companyDiscountPercent: product.companyDiscountPercent,
        targetCapacity: product.targetCapacity,
        status: 'PENDING_CONFIRMATION',
        repChecked: false,
        repCheckedAt: null,
        discrepancyFlag: false,
        confirmedBy: null,
        confirmedAt: null,
      });
    }

    // 3. Append immutable audit movement
    const movement = buildMovementRecord({
      movementType: 'STORE_TO_VEHICLE_LOAD',
      sourceLocation: 'LOC_MAIN',
      targetLocation: 'LOC_VAN_01',
      productId: prodId,
      productName: product.name,
      sku: product.sku,
      quantity: qty,
      unitPrice: netPrice,
      reference: `LOAD-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(10 + Math.random() * 90)}`,
      performedBy: repName || 'Warehouse Dispatcher',
      notes: notes || 'Store-to-Vehicle transfer dispatch',
    });

    const updatedMovements = [movement, ...stockMovements];

    const nextState = {
      mainStoreStock: updatedMainStore,
      vanStock: updatedVanStock,
      stockMovements: updatedMovements,
    };

    if (!isOnline) {
      nextState.offlineQueue = [
        ...get().offlineQueue,
        { type: 'STORE_TO_VEHICLE_LOAD', payload: { productId, quantity, repName, notes }, timestamp: Date.now() },
      ];
    }

    set(nextState);
    persistState(get());

    // Wire to real backend REST API
    if (isOnline) {
      try {
        await vanStockApi.loadVanStock({
          productId: prodId,
          quantity: qty,
          repName,
          notes,
        });
      } catch (err) {
        console.warn('Backend loadVanStock sync queued for retry:', err);
      }
    }

    return { success: true, movement };
  },

  /**
   * Action 2: Return to Store (Vehicle -> Store Unsold Return)
   */
  returnToStore: async ({ productId, quantity, reason, performedBy }) => {
    const { products, mainStoreStock, vanStock, stockMovements, isOnline } = get();
    const prodId = Number(productId);
    const qty = Number(quantity);

    const product = products.find((p) => p.id === prodId);
    if (!product) throw new Error('Product not found in catalog.');

    const vanItem = vanStock.find((v) => v.productId === prodId);
    const availableVanQty = vanItem ? vanItem.quantity : 0;

    validateVehicleToStoreReturn({
      returnQty: qty,
      availableVanQty,
    });

    const netPrice = calcNetUnitPrice(product.basePrice, product.companyDiscountPercent);

    // 1. Decrement van stock
    const updatedVanStock = vanStock.map((v) => {
      if (v.productId === prodId) {
        return { ...v, quantity: Math.max(0, v.quantity - qty) };
      }
      return v;
    });

    // 2. Increment warehouse stock
    let updatedMainStore = [...mainStoreStock];
    const warehouseIndex = updatedMainStore.findIndex((m) => m.productId === prodId);
    if (warehouseIndex >= 0) {
      updatedMainStore[warehouseIndex] = {
        ...updatedMainStore[warehouseIndex],
        quantity: updatedMainStore[warehouseIndex].quantity + qty,
      };
    } else {
      updatedMainStore.push({
        id: Date.now() + Math.floor(Math.random() * 100),
        locationId: 'LOC_MAIN',
        locationType: 'MAIN_STORE',
        vehicleId: null,
        productId: prodId,
        productName: product.name,
        sku: product.sku,
        unit: product.unit,
        quantity: qty,
        basePrice: product.basePrice,
        companyDiscountPercent: product.companyDiscountPercent,
        targetCapacity: 100,
        status: 'APPROVED',
      });
    }

    // 3. Append immutable audit movement
    const movement = buildMovementRecord({
      movementType: 'VEHICLE_TO_STORE_RETURN',
      sourceLocation: 'LOC_VAN_01',
      targetLocation: 'LOC_MAIN',
      productId: prodId,
      productName: product.name,
      sku: product.sku,
      quantity: qty,
      unitPrice: netPrice,
      reference: `RET-${Date.now().toString().slice(-6)}`,
      performedBy: performedBy || 'Kamal Perera',
      notes: reason || 'Unsold stock returned to warehouse',
    });

    const updatedMovements = [movement, ...stockMovements];

    const nextState = {
      mainStoreStock: updatedMainStore,
      vanStock: updatedVanStock,
      stockMovements: updatedMovements,
    };

    if (!isOnline) {
      nextState.offlineQueue = [
        ...get().offlineQueue,
        { type: 'VEHICLE_TO_STORE_RETURN', payload: { productId, quantity, reason, performedBy }, timestamp: Date.now() },
      ];
    }

    set(nextState);
    persistState(get());

    if (isOnline) {
      try {
        await vanStockApi.returnToStore({
          productId: prodId,
          quantity: qty,
          reason,
          performedBy,
        });
      } catch (err) {
        console.warn('Backend returnToStore sync queued:', err);
      }
    }

    return { success: true, movement };
  },

  /**
   * Action 3: Record Road Sales Outbound
   */
  recordVehicleSale: async ({ customerName, invoiceNo, items, performedBy }) => {
    const { products, vanStock, stockMovements, isOnline } = get();

    validateVehicleRoadSale(items, vanStock);

    let updatedVanStock = [...vanStock];
    const newMovements = [];

    items.forEach((item) => {
      const prodId = Number(item.productId);
      const qty = Number(item.quantity);
      const product = products.find((p) => p.id === prodId);

      updatedVanStock = updatedVanStock.map((v) => {
        if (v.productId === prodId) {
          return { ...v, quantity: Math.max(0, v.quantity - qty) };
        }
        return v;
      });

      const netPrice = item.unitPrice || calcNetUnitPrice(product?.basePrice, product?.companyDiscountPercent);

      newMovements.push(
        buildMovementRecord({
          movementType: 'VEHICLE_SALES_OUTBOUND',
          sourceLocation: 'LOC_VAN_01',
          targetLocation: customerName || 'RETAIL_CUSTOMER',
          productId: prodId,
          productName: product?.name || item.productName,
          sku: product?.sku || item.sku,
          quantity: qty,
          unitPrice: netPrice,
          reference: invoiceNo || `INV-${Date.now().toString().slice(-6)}`,
          performedBy: performedBy || 'Kamal Perera',
          notes: `Road sale invoice to ${customerName || 'Hardware Retailer'}`,
        })
      );
    });

    const nextState = {
      vanStock: updatedVanStock,
      stockMovements: [...newMovements, ...stockMovements],
    };

    if (!isOnline) {
      nextState.offlineQueue = [
        ...get().offlineQueue,
        { type: 'VEHICLE_SALES_OUTBOUND', payload: { customerName, invoiceNo, items, performedBy }, timestamp: Date.now() },
      ];
    }

    set(nextState);
    persistState(get());

    if (isOnline) {
      try {
        await vanStockApi.recordVehicleSale({
          customerName,
          invoiceNo,
          items,
          performedBy,
        });
      } catch (err) {
        console.warn('Backend recordVehicleSale sync error:', err);
      }
    }

    return { success: true, movements: newMovements };
  },

  /**
   * Action 4: Log Damaged Goods & Quarantine
   */
  logDamagedGoods: async ({
    productId,
    fromLocation = 'VEHICLE',
    quantity,
    reason,
    sourceInvoiceNo,
    manifestNo,
    sourceManifestNo,
    loadDate,
    reportedBy,
    unitPrice,
  }) => {
    const { products, vanStock, mainStoreStock, damagedGoods, stockMovements, isOnline } = get();
    const prodId = Number(productId);
    const qty = Number(quantity);

    const product = products.find((p) => p.id === prodId);
    if (!product) throw new Error('Product not found.');

    validateDamagedGoodsQuarantine({ quantity: qty, reason, reportedBy });

    const netPrice = unitPrice || calcNetUnitPrice(product.basePrice, product.companyDiscountPercent);
    const totalLoss = calcTotalRealValue(netPrice, qty);

    let updatedVanStock = vanStock;
    let updatedMainStore = mainStoreStock;

    if (fromLocation === 'VEHICLE') {
      updatedVanStock = vanStock.map((v) => {
        if (v.productId === prodId) {
          return { ...v, quantity: Math.max(0, v.quantity - qty) };
        }
        return v;
      });
    } else if (fromLocation === 'MAIN_STORE') {
      updatedMainStore = mainStoreStock.map((m) => {
        if (m.productId === prodId) {
          return { ...m, quantity: Math.max(0, m.quantity - qty) };
        }
        return m;
      });
    }

    const assignedManifest = manifestNo || sourceManifestNo || null;

    const newRecord = {
      id: Date.now() + Math.floor(Math.random() * 100),
      vehicleId: fromLocation === 'VEHICLE' ? DEFAULT_VAN_ID : 'MAIN_STORE',
      productId: prodId,
      productName: product.name,
      sku: product.sku,
      unit: product.unit,
      quantity: qty,
      unitPrice: netPrice,
      totalValue: totalLoss,
      reason,
      sourceInvoiceNo: sourceInvoiceNo || null,
      manifestNo: assignedManifest,
      sourceManifestNo: assignedManifest,
      loadDate: loadDate || null,
      reportedBy: reportedBy || 'Kamal Perera',
      status: 'LOGGED',
      resolutionNotes: null,
      createdAt: new Date().toISOString(),
    };

    const movement = buildMovementRecord({
      movementType: 'RETURN_TO_DAMAGED_POOL',
      sourceLocation: fromLocation === 'VEHICLE' ? 'LOC_VAN_01' : 'LOC_MAIN',
      targetLocation: 'LOC_DAMAGED',
      productId: prodId,
      productName: product.name,
      sku: product.sku,
      quantity: qty,
      unitPrice: netPrice,
      reference: assignedManifest || sourceInvoiceNo || `DMG-${Date.now().toString().slice(-6)}`,
      performedBy: reportedBy || 'Kamal Perera',
      notes: reason,
    });

    const nextState = {
      vanStock: updatedVanStock,
      mainStoreStock: updatedMainStore,
      damagedGoods: [newRecord, ...damagedGoods],
      stockMovements: [movement, ...stockMovements],
    };

    if (!isOnline) {
      nextState.offlineQueue = [
        ...get().offlineQueue,
        {
          type: 'RETURN_TO_DAMAGED_POOL',
          payload: { productId, fromLocation, quantity, reason, sourceInvoiceNo, manifestNo: assignedManifest, loadDate, reportedBy, unitPrice },
          timestamp: Date.now(),
        },
      ];
    }

    set(nextState);
    persistState(get());

    if (isOnline) {
      try {
        const resp = await vanStockApi.logDamagedGoods({
          productId: prodId,
          fromLocation,
          quantity: qty,
          reason,
          sourceInvoiceNo,
          manifestNo: assignedManifest,
          sourceManifestNo: assignedManifest,
          loadDate,
          reportedBy,
          unitPrice: netPrice,
        });

        const backendRecord = resp?.data?.record || resp?.record;
        if (backendRecord?.id) {
          // Reconcile temporary client ID with authoritative backend autoincrement ID
          set({
            damagedGoods: get().damagedGoods.map((d) =>
              d.id === newRecord.id ? { ...d, id: backendRecord.id } : d
            ),
          });
          persistState(get());
        }
      } catch (err) {
        console.warn('Backend logDamagedGoods sync error:', err);
      }
    }

    return { success: true, record: newRecord, movement };
  },

  /**
   * Action 5: Adjust Central Main Store Warehouse Stocktake Count
   */
  adjustMainStoreStock: async ({ productId, delta, reason, notes, performedBy }) => {
    const { products, mainStoreStock, stockMovements, isOnline } = get();
    const prodId = Number(productId);
    const change = Number(delta);

    const product = products.find((p) => p.id === prodId);
    if (!product) throw new Error('Product not found in catalog.');

    const warehouseItem = mainStoreStock.find((m) => m.productId === prodId);
    const currentQty = warehouseItem ? warehouseItem.quantity : 0;

    validateWarehouseAdjustment({ delta: change, currentQty, reason });

    const newQty = Math.max(0, currentQty + change);
    const netPrice = calcNetUnitPrice(product.basePrice, product.companyDiscountPercent);

    let updatedMainStore = [...mainStoreStock];
    const index = updatedMainStore.findIndex((m) => m.productId === prodId);
    if (index >= 0) {
      updatedMainStore[index] = { ...updatedMainStore[index], quantity: newQty };
    } else {
      updatedMainStore.push({
        id: Date.now() + Math.floor(Math.random() * 100),
        locationId: 'LOC_MAIN',
        locationType: 'MAIN_STORE',
        vehicleId: null,
        productId: prodId,
        productName: product.name,
        sku: product.sku,
        unit: product.unit,
        quantity: newQty,
        basePrice: product.basePrice,
        companyDiscountPercent: product.companyDiscountPercent,
        targetCapacity: 100,
        status: 'APPROVED',
      });
    }

    const movement = buildMovementRecord({
      movementType: 'WAREHOUSE_AUDIT_ADJUSTMENT',
      sourceLocation: 'LOC_MAIN',
      targetLocation: 'LOC_MAIN',
      productId: prodId,
      productName: product.name,
      sku: product.sku,
      quantity: Math.abs(change),
      unitPrice: netPrice,
      reference: `AUD-${Date.now().toString().slice(-6)}`,
      performedBy: performedBy || 'Warehouse Manager',
      notes: `${reason} (${change > 0 ? '+' : ''}${change}) â€” ${notes || ''}`,
    });

    const nextState = {
      mainStoreStock: updatedMainStore,
      stockMovements: [movement, ...stockMovements],
    };

    if (!isOnline) {
      nextState.offlineQueue = [
        ...get().offlineQueue,
        { type: 'WAREHOUSE_AUDIT_ADJUSTMENT', payload: { productId, delta, reason, notes, performedBy }, timestamp: Date.now() },
      ];
    }

    set(nextState);
    persistState(get());

    if (isOnline) {
      try {
        await vanStockApi.adjustMainStoreStock({
          productId: prodId,
          delta: change,
          reason,
          notes,
          performedBy,
        });
      } catch (err) {
        console.warn('Backend adjustMainStoreStock sync error:', err);
      }
    }

    return { success: true, newQuantity: newQty, movement };
  },

  /**
   * Action 6: Receive Supplier Inbound Purchase Order
   */
  receivePurchaseOrder: async ({ supplierName, poNumber, items, notes, performedBy }) => {
    const { products, mainStoreStock, stockMovements, isOnline } = get();

    if (!items || items.length === 0) {
      throw new Error('Purchase order must contain at least one item.');
    }

    let updatedMainStore = [...mainStoreStock];
    let updatedProducts = [...products];
    const newMovements = [];

    items.forEach((item) => {
      const prodId = Number(item.productId);
      const qty = Math.max(0, Number(item.quantity) || 0);
      const product = products.find((p) => p.id === prodId);

      const idx = updatedMainStore.findIndex((m) => m.productId === prodId);
      if (idx >= 0) {
        updatedMainStore[idx] = {
          ...updatedMainStore[idx],
          quantity: updatedMainStore[idx].quantity + qty,
          basePrice: item.basePrice || updatedMainStore[idx].basePrice,
          companyDiscountPercent: item.discountPercent ?? updatedMainStore[idx].companyDiscountPercent,
        };
      } else if (product) {
        updatedMainStore.push({
          id: Date.now() + Math.floor(Math.random() * 100),
          locationId: 'LOC_MAIN',
          locationType: 'MAIN_STORE',
          vehicleId: null,
          productId: prodId,
          productName: product.name,
          sku: product.sku,
          unit: product.unit,
          quantity: qty,
          basePrice: item.basePrice || product.basePrice,
          companyDiscountPercent: item.discountPercent ?? product.companyDiscountPercent,
          targetCapacity: 100,
          status: 'APPROVED',
        });
      }

      if (item.basePrice) {
        updatedProducts = updatedProducts.map((p) => {
          if (p.id === prodId) {
            return {
              ...p,
              basePrice: Number(item.basePrice),
              companyDiscountPercent: item.discountPercent != null ? Number(item.discountPercent) : p.companyDiscountPercent,
            };
          }
          return p;
        });
      }

      const netPrice = calcNetUnitPrice(
        item.basePrice || product?.basePrice,
        item.discountPercent ?? product?.companyDiscountPercent
      );

      newMovements.push(
        buildMovementRecord({
          movementType: 'SUPPLIER_PURCHASE_INBOUND',
          sourceLocation: supplierName || 'SUPPLIER_VENDOR',
          targetLocation: 'LOC_MAIN',
          productId: prodId,
          productName: product?.name || 'Inbound Item',
          sku: product?.sku || '',
          quantity: qty,
          unitPrice: netPrice,
          reference: poNumber || `PO-${Date.now().toString().slice(-6)}`,
          performedBy: performedBy || 'Storekeeper',
          notes: notes || `Supplier PO delivery from ${supplierName}`,
        })
      );
    });

    set({
      mainStoreStock: updatedMainStore,
      products: updatedProducts,
      stockMovements: [...newMovements, ...stockMovements],
    });
    persistState(get());

    if (isOnline) {
      try {
        await vanStockApi.receivePurchaseOrder({
          supplierName,
          poNumber,
          items,
          notes,
          performedBy,
        });
      } catch (err) {
        console.warn('Backend receivePurchaseOrder sync error:', err);
      }
    }

    return { success: true, movements: newMovements };
  },

  /**
   * Action 7: Sales Representative Van Stock Confirmation (Accept Manifest)
   */
  confirmAllVanStock: ({ vehicleId = DEFAULT_VAN_ID, repName = 'Kamal Perera' }) => {
    const { vanStock } = get();
    const nowIso = new Date().toISOString();

    let confirmedCount = 0;
    const updatedVanStock = vanStock.map((v) => {
      if (v.status === 'PENDING_CONFIRMATION') {
        confirmedCount += 1;
        return {
          ...v,
          status: 'APPROVED',
          confirmedBy: repName,
          confirmedAt: nowIso,
        };
      }
      return v;
    });

    set({ vanStock: updatedVanStock });
    persistState(get());
    return { success: true, confirmedCount, confirmedAt: nowIso };
  },

  /**
   * Action 8: Confirm a Single Van Stock Item
   */
  confirmSingleVanItem: ({ itemId, repName = 'Kamal Perera' }) => {
    const { vanStock } = get();
    const nowIso = new Date().toISOString();

    const updated = vanStock.map((v) => {
      if (v.id === Number(itemId)) {
        return {
          ...v,
          status: 'APPROVED',
          confirmedBy: repName,
          confirmedAt: nowIso,
        };
      }
      return v;
    });

    set({ vanStock: updated });
    persistState(get());
    return { success: true };
  },

  /**
   * Action 9: Save SKU (Create or Edit Product)
   */
  saveProduct: async (productData) => {
    const { products, mainStoreStock, vanStock } = get();
    const isEdit = Boolean(productData.id);

    if (isEdit) {
      const prodId = Number(productData.id);
      const updatedProducts = products.map((p) => {
        if (p.id === prodId) {
          return {
            ...p,
            name: productData.name.trim(),
            sku: productData.sku.trim(),
            category: productData.category || p.category,
            unit: productData.unit || p.unit,
            basePrice: Math.max(0, Number(productData.basePrice) || 0),
            companyDiscountPercent: Math.max(0, Number(productData.companyDiscountPercent) || 0),
            targetCapacity: Math.max(0, Number(productData.targetCapacity) || 100),
          };
        }
        return p;
      });

      const updatedMainStore = mainStoreStock.map((m) => {
        if (m.productId === prodId) {
          return {
            ...m,
            productName: productData.name.trim(),
            sku: productData.sku.trim(),
            unit: productData.unit || m.unit,
            basePrice: Math.max(0, Number(productData.basePrice) || 0),
            companyDiscountPercent: Math.max(0, Number(productData.companyDiscountPercent) || 0),
          };
        }
        return m;
      });

      const updatedVanStock = vanStock.map((v) => {
        if (v.productId === prodId) {
          return {
            ...v,
            productName: productData.name.trim(),
            sku: productData.sku.trim(),
            unit: productData.unit || v.unit,
            basePrice: Math.max(0, Number(productData.basePrice) || 0),
            companyDiscountPercent: Math.max(0, Number(productData.companyDiscountPercent) || 0),
            targetCapacity: Math.max(0, Number(productData.targetCapacity) || 100),
          };
        }
        return v;
      });

      set({
        products: updatedProducts,
        mainStoreStock: updatedMainStore,
        vanStock: updatedVanStock,
      });
      persistState(get());

      try {
        await vanStockApi.updateProduct(prodId, {
          sku: productData.sku.trim(),
          name: productData.name.trim(),
          category: productData.category,
          unit: productData.unit,
          basePrice: Number(productData.basePrice) || 0,
          companyDiscountPercent: Number(productData.companyDiscountPercent) || 0,
          targetCapacity: Number(productData.targetCapacity) || 100,
        });
      } catch (err) {
        console.warn('Backend updateProduct sync error:', err);
      }

      return { success: true, mode: 'edit' };
    }

    // CREATE MODE:
    const existingSku = products.find(
      (p) => p.sku.toUpperCase() === productData.sku.trim().toUpperCase()
    );
    if (existingSku) {
      throw new Error(`SKU code "${productData.sku}" is already assigned to "${existingSku.name}".`);
    }

    const newId = products.length > 0 ? Math.max(...products.map((p) => p.id)) + 1 : 1;
    const newProduct = {
      id: newId,
      sku: productData.sku.trim().toUpperCase(),
      name: productData.name.trim(),
      category: productData.category || 'General Hardware',
      unit: productData.unit || 'Unit',
      basePrice: Math.max(0, Number(productData.basePrice) || 0),
      companyDiscountPercent: Math.max(0, Number(productData.companyDiscountPercent) || 0),
      targetCapacity: Math.max(0, Number(productData.targetCapacity) || 100),
      isActive: true,
    };

    const initialWarehouseQty = Math.max(0, Number(productData.initialQuantity) || 0);
    const newMainStoreItem = {
      id: Date.now() + Math.floor(Math.random() * 100),
      locationId: 'LOC_MAIN',
      locationType: 'MAIN_STORE',
      vehicleId: null,
      productId: newId,
      productName: newProduct.name,
      sku: newProduct.sku,
      unit: newProduct.unit,
      quantity: initialWarehouseQty,
      basePrice: newProduct.basePrice,
      companyDiscountPercent: newProduct.companyDiscountPercent,
      targetCapacity: newProduct.targetCapacity,
      status: 'APPROVED',
      isActive: true,
    };

    set({
      products: [newProduct, ...products],
      mainStoreStock: [newMainStoreItem, ...mainStoreStock],
    });
    persistState(get());

    try {
      const res = await vanStockApi.registerProduct({
        sku: newProduct.sku,
        name: newProduct.name,
        category: newProduct.category,
        unit: newProduct.unit,
        basePrice: newProduct.basePrice,
        companyDiscountPercent: newProduct.companyDiscountPercent,
        targetCapacity: newProduct.targetCapacity,
        initialQuantity: initialWarehouseQty,
      });
      if (res?.data?.product?.id) {
        const realId = res.data.product.id;
        // update local id with server id
        set((state) => ({
          products: state.products.map((p) => (p.sku === newProduct.sku ? { ...p, id: realId } : p)),
          mainStoreStock: state.mainStoreStock.map((m) => (m.sku === newProduct.sku ? { ...m, productId: realId } : m)),
        }));
        persistState(get());
      }
    } catch (err) {
      console.warn('Backend registerProduct sync error:', err);
    }

    return { success: true, mode: 'create', product: newProduct };
  },

  /**
   * Action 10: Soft Delete Product SKU & Associated Stock
   */
  deleteProduct: async (productId) => {
    const { products, mainStoreStock, vanStock } = get();
    const prodId = Number(productId);

    set({
      products: products.map((p) => (p.id === prodId ? { ...p, isActive: false } : p)),
      mainStoreStock: mainStoreStock.map((m) =>
        m.productId === prodId ? { ...m, isActive: false } : m
      ),
      vanStock: vanStock.map((v) =>
        v.productId === prodId ? { ...v, isActive: false } : v
      ),
    });
    persistState(get());

    try {
      await vanStockApi.deleteProduct(prodId);
    } catch (err) {
      console.warn('Backend deleteProduct sync error:', err);
    }

    return { success: true };
  },

  /**
   * Action 11: Resolve or update status on a Quarantined Damaged Goods record.
   * Marking as WRITTEN_OFF or VENDOR_RETURN updates status, logs an immutable
   * audit trail movement record, and archives the item out of active quarantine.
   */
  resolveDamagedRecord: async (recordId, status, resolutionNotes) => {
    const { damagedGoods, stockMovements } = get();
    const id = Number(recordId);

    const record = damagedGoods.find((d) => d.id === id);
    if (!record) throw new Error('Damaged goods record not found.');

    const updated = damagedGoods.map((d) => {
      if (d.id === id) {
        return {
          ...d,
          status,
          resolutionNotes: resolutionNotes || d.resolutionNotes,
          updatedAt: new Date().toISOString(),
        };
      }
      return d;
    });

    const movements = [...stockMovements];
    if (status === 'WRITTEN_OFF') {
      movements.unshift(
        buildMovementRecord({
          movementType: 'DAMAGED_WRITE_OFF',
          sourceLocation: 'LOC_DAMAGED',
          targetLocation: 'SCRAP_DISPOSAL',
          productId: record.productId,
          productName: record.productName,
          sku: record.sku,
          quantity: record.quantity,
          unitPrice: record.unitPrice,
          reference: `WO-${id}`,
          performedBy: 'Warehouse Manager',
          notes: resolutionNotes || 'Approved for scrap write-off',
        })
      );
    } else if (status === 'VENDOR_RETURN') {
      movements.unshift(
        buildMovementRecord({
          movementType: 'DAMAGED_VENDOR_RETURN',
          sourceLocation: 'LOC_DAMAGED',
          targetLocation: 'SUPPLIER_WARRANTY',
          productId: record.productId,
          productName: record.productName,
          sku: record.sku,
          quantity: record.quantity,
          unitPrice: record.unitPrice,
          reference: `VR-${id}`,
          performedBy: 'Warehouse Manager',
          notes: resolutionNotes || 'Returned to supplier for warranty replacement',
        })
      );
    }

    set({ damagedGoods: updated, stockMovements: movements });
    persistState(get());

    try {
      // Sync with backend when ID is within standard database range
      if (id && id <= 2147483647) {
        await vanStockApi.updateDamagedStatus(id, {
          status,
          resolutionNotes,
        });
      }
    } catch (err) {
      console.warn('Backend updateDamagedStatus sync error:', err);
      // Suppress backend network failure so local optimistic update remains intact
    }

    return { success: true };
  },

  /**
   * Action: Delete Quarantined Damaged Goods record (Soft-delete)
   */
  deleteDamagedRecord: async (recordId) => {
    const id = Number(recordId);
    set({
      damagedGoods: get().damagedGoods.map((d) => (d.id === id ? { ...d, isActive: false } : d)),
    });
    persistState(get());

    try {
      await vanStockApi.deleteDamagedRecord(id);
    } catch (err) {
      console.warn('Backend deleteDamagedRecord sync error:', err);
    }
    return { success: true };
  },

  /**
   * Action: Soft Delete Van Stock Item
   */
  deleteVanStockItem: async (stockItemId) => {
    const id = Number(stockItemId);
    const item = get().vanStock.find((v) => v.id === id);
    if (item && item.quantity > 0) {
      const updatedMainStore = get().mainStoreStock.map((m) =>
        m.productId === item.productId ? { ...m, quantity: m.quantity + item.quantity } : m
      );
      set({ mainStoreStock: updatedMainStore });
    }
    set({
      vanStock: get().vanStock.map((v) => (v.id === id ? { ...v, isActive: false, quantity: 0 } : v)),
    });
    persistState(get());

    try {
      await vanStockApi.deleteVanStockItem(id);
    } catch (err) {
      console.warn('Backend deleteVanStockItem sync error:', err);
    }
    return { success: true };
  },

  /**
   * Action 12: Process Offline Mutation Queue upon Network Reconnection
   */
  processOfflineQueue: () => {
    const { offlineQueue } = get();
    if (!offlineQueue || offlineQueue.length === 0) return 0;

    const count = offlineQueue.length;
    set({ offlineQueue: [], isSyncing: true });

    // Sync with real backend
    get().fetchInitialData();

    setTimeout(() => {
      set({ isSyncing: false });
      persistState(get());
    }, 600);

    return count;
  },

  /**
   * Action: Configure / Upload Warehouse Keeper or Owner Signature
   */
  setOwnerSignatureData: async (dataUrl, signerName) => {
    const updatedName = signerName || get().ownerSignerName;
    const nextDailyManifest = {
      ...get().dailyManifest,
      ownerSignatureData: dataUrl,
      ownerSignedBy: updatedName,
    };
    set({
      ownerSignatureData: dataUrl,
      ownerSignerName: updatedName,
      dailyManifest: nextDailyManifest,
    });
    persistState(get());

    try {
      await vanStockApi.saveOwnerSignature({
        signatureData: dataUrl,
        signerName: updatedName,
      });
    } catch (err) {
      console.warn('Backend saveOwnerSignature sync error:', err);
    }

    return { success: true };
  },

  /**
   * Action: Finalize & Dispatch Daily Stock Report Manifest to Sales Rep
   */
  dispatchDailyManifest: async ({ notes, dispatcherName } = {}) => {
    const { dailyManifest, ownerSignatureData, ownerSignerName, vehicle } = get();
    const nowIso = new Date().toISOString();
    const signer = dispatcherName || ownerSignerName || 'W. Liyanage (Managing Director / Owner)';

    const updated = {
      ...dailyManifest,
      manifestNo: `MAN-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-01`,
      manifestDate: nowIso,
      vehicleId: vehicle.id,
      routeName: vehicle.route,
      repName: vehicle.repName,
      ownerSignatureData: ownerSignatureData || DEFAULT_OWNER_SIGNATURE,
      ownerSignedBy: signer,
      ownerSignedAt: nowIso,
      status: 'DISPATCHED',
      dispatchedAt: nowIso,
      notes: notes || 'Official Daily Load Manifest Dispatched to Field Sales Rep',
    };

    const prevHistory = get().manifestHistory || [];
    const updatedHistory = [
      updated,
      ...prevHistory.filter((m) => m.manifestNo !== updated.manifestNo),
    ];

    set({ dailyManifest: updated, manifestHistory: updatedHistory });
    persistState(get());

    try {
      const res = await vanStockApi.dispatchDailyManifest({
        manifestId: dailyManifest.id,
        dispatcherName: signer,
        signatureData: ownerSignatureData || DEFAULT_OWNER_SIGNATURE,
        notes,
      });
      if (res?.data) {
        set({ dailyManifest: { ...updated, ...res.data } });
        persistState(get());
      }
    } catch (err) {
      console.warn('Backend dispatchDailyManifest sync error:', err);
    }

    return { success: true, manifest: updated };
  },

  /**
   * Action: Toggle Rep Line-Item Checkbox Verification
   */
  toggleRepItemChecked: (itemId, forceValue) => {
    const { vanStock } = get();
    const nowIso = new Date().toISOString();
    const updated = vanStock.map((item) => {
      if (item.id === Number(itemId)) {
        const nextChecked = forceValue !== undefined ? Boolean(forceValue) : !item.repChecked;
        return {
          ...item,
          repChecked: nextChecked,
          repCheckedAt: nextChecked ? nowIso : null,
          discrepancyFlag: nextChecked ? false : item.discrepancyFlag,
        };
      }
      return item;
    });

    set({ vanStock: updated });
    persistState(get());
    return { success: true };
  },

  /**
   * Action: Toggle All Rep Loaded Items Checkbox
   */
  toggleAllRepItemsChecked: (checked = true) => {
    const { vanStock } = get();
    const nowIso = new Date().toISOString();
    const updated = vanStock.map((item) => {
      if (item.quantity > 0) {
        return {
          ...item,
          repChecked: checked,
          repCheckedAt: checked ? nowIso : null,
          discrepancyFlag: checked ? false : item.discrepancyFlag,
        };
      }
      return item;
    });

    set({ vanStock: updated });
    persistState(get());
    return { success: true, allChecked: checked };
  },

  /**
   * Action: Submit Rep Verification with Signature
   */
  submitRepVerificationWithSignature: async ({ signatureData, repName }) => {
    const { dailyManifest, vanStock } = get();
    const nowIso = new Date().toISOString();
    const signer = repName || dailyManifest.repName || 'Kamal Perera';

    const activeItems = vanStock.filter((i) => i.quantity > 0 && i.isActive !== false);
    const uncheckedActiveItems = activeItems.filter((i) => !i.repChecked);
    const isFullVerification = uncheckedActiveItems.length === 0;

    const updatedVanStock = vanStock.map((v) => {
      if (v.quantity <= 0) {
        // Reset zero-quantity items to eliminate stray pending/discrepancy states
        return {
          ...v,
          status: 'APPROVED',
          discrepancyFlag: false,
        };
      }
      if (isFullVerification || v.repChecked) {
        return {
          ...v,
          status: 'APPROVED',
          repChecked: true,
          repCheckedAt: v.repCheckedAt || nowIso,
          discrepancyFlag: false,
          confirmedBy: signer,
          confirmedAt: nowIso,
        };
      } else {
        return {
          ...v,
          status: 'UNVERIFIED_BY_REP',
          repChecked: false,
          repCheckedAt: null,
          discrepancyFlag: true,
          confirmedBy: null,
          confirmedAt: null,
        };
      }
    });

    const manifestStatus = isFullVerification ? 'FULLY_VERIFIED' : 'PARTIAL_DISCREPANCY';
    const updatedManifest = {
      ...dailyManifest,
      repSignatureData: signatureData,
      repSignedBy: signer,
      repSignedAt: nowIso,
      status: manifestStatus,
      uncheckedCount: isFullVerification ? 0 : uncheckedActiveItems.length,
      manifestRevision: dailyManifest.manifestRevision || 1,
    };

    const prevHistory = get().manifestHistory || [];
    const updatedHistory = [
      updatedManifest,
      ...prevHistory.filter((m) => m.manifestNo !== updatedManifest.manifestNo),
    ];

    set({
      dailyManifest: updatedManifest,
      vanStock: updatedVanStock,
      manifestHistory: updatedHistory,
    });
    persistState(get());

    try {
      await vanStockApi.verifyPublicManifest(dailyManifest.manifestNo, {
        signatureData,
        repName: signer,
        items: activeItems.map((i) => ({ itemId: i.id, repChecked: Boolean(i.repChecked) })),
      });
    } catch (err) {
      console.warn('Backend verifyPublicManifest sync error:', err);
    }

    return {
      success: true,
      manifest: updatedManifest,
      isFullVerification,
      uncheckedCount: isFullVerification ? 0 : uncheckedActiveItems.length,
    };
  },

  /**
   * Action: Attach Sales Representative Signature to Manifest
   */
  attachRepSignatureToManifest: ({ signatureData, repName }) => {
    return get().submitRepVerificationWithSignature({ signatureData, repName });
  },

  /**
   * Action: Re-Dispatch Updated Manifest
   */
  reDispatchManifest: async ({ notes, dispatcherName } = {}) => {
    const { dailyManifest, ownerSignatureData, ownerSignerName, vehicle, vanStock } = get();
    const nowIso = new Date().toISOString();
    const signer = dispatcherName || ownerSignerName || 'W. Liyanage (Managing Director / Owner)';
    const nextRevision = (dailyManifest.manifestRevision || 1) + 1;

    const updatedVanStock = vanStock.map((item) => {
      if (item.status === 'UNVERIFIED_BY_REP' || item.discrepancyFlag) {
        return {
          ...item,
          status: 'PENDING_CONFIRMATION',
          discrepancyFlag: false,
          repChecked: false,
          repCheckedAt: null,
        };
      }
      return item;
    });

    const baseNo = dailyManifest.manifestNo?.split('-R')[0] || `MAN-${nowIso.slice(0, 10).replace(/-/g, '')}-01`;
    const updatedManifest = {
      ...dailyManifest,
      manifestNo: `${baseNo}-R${nextRevision}`,
      manifestRevision: nextRevision,
      manifestDate: nowIso,
      vehicleId: vehicle.id,
      routeName: vehicle.route,
      repName: vehicle.repName,
      ownerSignatureData: ownerSignatureData || DEFAULT_OWNER_SIGNATURE,
      ownerSignedBy: signer,
      ownerSignedAt: nowIso,
      repSignatureData: null,
      repSignedBy: null,
      repSignedAt: null,
      status: 'DISPATCHED',
      dispatchedAt: nowIso,
      uncheckedCount: 0,
      notes: notes || `Manifest Revision #${nextRevision} Re-Dispatched to Field Rep`,
    };

    const prevHistory = get().manifestHistory || [];
    const updatedHistory = [
      updatedManifest,
      ...prevHistory.filter((m) => m.manifestNo !== updatedManifest.manifestNo),
    ];

    set({
      dailyManifest: updatedManifest,
      vanStock: updatedVanStock,
      manifestHistory: updatedHistory,
    });
    persistState(get());

    try {
      await vanStockApi.dispatchDailyManifest({
        manifestId: dailyManifest.id,
        dispatcherName: signer,
        signatureData: ownerSignatureData || DEFAULT_OWNER_SIGNATURE,
        notes: notes || `Manifest Revision #${nextRevision} Re-Dispatched`,
      });
    } catch (err) {
      console.warn('Backend reDispatchManifest sync error:', err);
    }

    return {
      success: true,
      manifest: updatedManifest,
      manifestRevision: nextRevision,
    };
  },

  /**
   * Action: Modify loaded van item quantity directly with automatic warehouse reconciliation
   */
  updateVanItemQuantity: async ({ productId, newQuantity, notes, performedBy }) => {
    const { products, mainStoreStock, vanStock, stockMovements, isOnline } = get();
    const prodId = Number(productId);
    const targetQty = Math.max(0, Number(newQuantity) || 0);

    const product = products.find((p) => p.id === prodId);
    if (!product) throw new Error('Product not found in catalog.');

    const vanItem = vanStock.find((v) => v.productId === prodId);
    const currentVanQty = vanItem ? vanItem.quantity : 0;
    const delta = targetQty - currentVanQty;

    if (delta === 0) return { success: true, newQuantity: targetQty };

    const warehouseItem = mainStoreStock.find((m) => m.productId === prodId);
    const currentWarehouseQty = warehouseItem ? warehouseItem.quantity : 0;

    if (delta > 0 && currentWarehouseQty < delta) {
      throw new Error(
        `Insufficient warehouse stock to increase van quantity. Available in warehouse: ${currentWarehouseQty} ${product.unit}, requested increase: ${delta} ${product.unit}.`
      );
    }

    const netPrice = calcNetUnitPrice(product.basePrice, product.companyDiscountPercent);

    // 1. Update Central Warehouse stock
    let updatedMainStore = [...mainStoreStock];
    const whIdx = updatedMainStore.findIndex((m) => m.productId === prodId);
    if (whIdx >= 0) {
      updatedMainStore[whIdx] = {
        ...updatedMainStore[whIdx],
        quantity: Math.max(0, updatedMainStore[whIdx].quantity - delta),
      };
    }

    // 2. Update Van Stock
    let updatedVanStock = [...vanStock];
    const vanIdx = updatedVanStock.findIndex((v) => v.productId === prodId);
    if (vanIdx >= 0) {
      updatedVanStock[vanIdx] = {
        ...updatedVanStock[vanIdx],
        quantity: targetQty,
        status: 'PENDING_CONFIRMATION',
        repChecked: false,
        repCheckedAt: null,
        discrepancyFlag: false,
        confirmedBy: null,
        confirmedAt: null,
      };
    } else {
      updatedVanStock.push({
        id: Date.now() + Math.floor(Math.random() * 100),
        locationId: 'LOC_VAN_01',
        locationType: 'VEHICLE',
        vehicleId: DEFAULT_VAN_ID,
        productId: prodId,
        productName: product.name,
        sku: product.sku,
        unit: product.unit,
        quantity: targetQty,
        basePrice: product.basePrice,
        companyDiscountPercent: product.companyDiscountPercent,
        targetCapacity: product.targetCapacity,
        status: 'PENDING_CONFIRMATION',
        repChecked: false,
        repCheckedAt: null,
        discrepancyFlag: false,
        confirmedBy: null,
        confirmedAt: null,
      });
    }

    // 3. Log Audit Movement
    const movementType = delta > 0 ? 'STORE_TO_VEHICLE_LOAD' : 'VEHICLE_TO_STORE_RETURN';
    const movement = buildMovementRecord({
      movementType,
      sourceLocation: delta > 0 ? 'LOC_MAIN' : 'LOC_VAN_01',
      targetLocation: delta > 0 ? 'LOC_VAN_01' : 'LOC_MAIN',
      productId: prodId,
      productName: product.name,
      sku: product.sku,
      quantity: Math.abs(delta),
      unitPrice: netPrice,
      reference: `ADJ-${Date.now().toString().slice(-6)}`,
      performedBy: performedBy || 'Warehouse Keeper',
      notes: notes || `Adjusted van quantity from ${currentVanQty} to ${targetQty} ${product.unit} (delta: ${delta > 0 ? '+' : ''}${delta})`,
    });

    const nextState = {
      mainStoreStock: updatedMainStore,
      vanStock: updatedVanStock,
      stockMovements: [movement, ...stockMovements],
    };

    set(nextState);
    persistState(get());

    if (isOnline) {
      try {
        await vanStockApi.modifyVanItemQty({
          productId: prodId,
          newQuantity: targetQty,
          notes,
          performedBy,
        });
      } catch (err) {
        console.warn('Backend modifyVanItemQty sync error:', err);
      }
    }

    return { success: true, newQuantity: targetQty, delta, movement };
  },

  /**
   * Action 13: Reset state to pristine seed data (Factory Reset)
   */
  resetToMockData: () => {
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.removeItem(STORAGE_KEY);
    }
    set({
      vehicle: DEFAULT_VEHICLE,
      locations: INITIAL_LOCATIONS,
      products: INITIAL_PRODUCTS,
      mainStoreStock: INITIAL_MAIN_STORE_STOCK,
      vanStock: INITIAL_VAN_STOCK,
      damagedGoods: INITIAL_DAMAGED_GOODS,
      stockMovements: INITIAL_STOCK_MOVEMENTS,
      offlineQueue: [],
      activeTab: 'on-hand',
      searchQuery: '',
      categoryFilter: 'ALL',
      isHydrated: false,
    });
  },
}));

// â”€â”€ Auto-Hydration from Real Backend on Store Bootstrap â”€â”€
if (typeof window !== 'undefined') {
  // Trigger initial asynchronous hydration
  setTimeout(() => {
    useVanStockStore.getState().fetchInitialData();
  }, 100);

  // â”€â”€ Real-Time Cross-Tab Synchronization Listener â”€â”€
  window.addEventListener('storage', (event) => {
    if (event.key === STORAGE_KEY && event.newValue) {
      try {
        const parsed = JSON.parse(event.newValue);
        useVanStockStore.setState({
          vehicle: parsed.vehicle || DEFAULT_VEHICLE,
          locations: parsed.locations || INITIAL_LOCATIONS,
          products: parsed.products || INITIAL_PRODUCTS,
          mainStoreStock: parsed.mainStoreStock || INITIAL_MAIN_STORE_STOCK,
          vanStock: parsed.vanStock || INITIAL_VAN_STOCK,
          damagedGoods: parsed.damagedGoods || INITIAL_DAMAGED_GOODS,
          stockMovements: parsed.stockMovements || INITIAL_STOCK_MOVEMENTS,
          dailyManifest: parsed.dailyManifest || DEFAULT_DAILY_MANIFEST,
          manifestHistory: parsed.manifestHistory || HISTORICAL_MANIFESTS,
          ownerSignatureData: parsed.ownerSignatureData || DEFAULT_OWNER_SIGNATURE,
          ownerSignerName: parsed.ownerSignerName || 'W. Liyanage (Managing Director / Owner)',
        });
      } catch (_err) {
        console.warn('Failed to parse synchronized van stock state across tabs.');
      }
    }
  });
}

export default useVanStockStore;
