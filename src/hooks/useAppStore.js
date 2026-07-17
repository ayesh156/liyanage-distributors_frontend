import { create } from 'zustand';
import { toast } from 'react-toastify';
import {
  storesApi,
  routesApi,
  invoicesApi,
  paymentsApi,
  salesPersonsApi,
  dashboardApi,
  outstandingApi,
  setToastHandler,
  withPagination,
} from '../services/api';
import {
  mapStoreFromApi,
  mapInvoiceFromApi,
  mapPaymentFromApi,
  mapSalesPersonFromApi,
  mapRouteFromApi,
  mapRouteToApi,
  mapStoreToApi,
  mapInvoiceToApi,
  mapInvoiceUpdateToApi,
  mapPaymentToApi,
  mapOutstandingRowFromApi,
  computeShopOutstanding,
  extractData,
  extractPagination,
} from '../services/dataMappers';

// ── Fallback seed data (used only when backend is unreachable) ──────────────
import {
  initialStores,
  initialInvoices,
  initialRoutes,
  initialSalesPersons as fallbackSalesPersons,
  bankNames as initialBankNames,
  getNextId,
  getNextDocNo,
  getNextReceiptNo,
  getRouteNames,
} from '../data/mockData';

// ── Pure computation helpers ────────────────────────────────────────────────

function computeDerived(shops, invoices, searchQuery = '') {
  const activeShops = shops.filter((s) => s.active);

  // Net outstanding per shop
  const shopOutstanding = computeShopOutstanding(invoices);

  // Ensure no negative outstanding (clamp to 0)
  const grandTotalOutstanding = Object.values(shopOutstanding).reduce(
    (sum, v) => sum + Math.max(0, v), 0,
  );

  const totalActiveDebtors = activeShops.filter(
    (s) => (shopOutstanding[s.id] || 0) > 0,
  ).length;

  // This-month recovered (all payments from embedded arrays)
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  let thisMonthRecovered = 0;
  invoices.forEach((inv) => {
    (inv.payments || []).forEach((p) => {
      if (new Date(p.date) >= startOfMonth) {
        thisMonthRecovered += p.amount;
      }
    });
  });

  const topOutstandingShops = activeShops
    .map((s) => ({ ...s, outstanding: Math.max(0, shopOutstanding[s.id] || 0) }))
    .filter((s) => s.outstanding > 0)
    .sort((a, b) => b.outstanding - a.outstanding)
    .slice(0, 8);

  // ── Payment Mode Distribution ────────────────────────────────────────────
  const paymentDistribution = { cash: 0, cheque: 0, check: 0, bankSlip: 0, total: 0 };
  invoices.forEach((inv) => {
    (inv.payments || []).forEach((p) => {
      const mode = p.paymentMode || 'cash';
      if (mode === 'cash')   paymentDistribution.cash   += p.amount;
      else if (mode === 'cheque') paymentDistribution.cheque += p.amount;
      else if (mode === 'check')  paymentDistribution.check  += p.amount;
      else if (mode === 'bank_slip') paymentDistribution.bankSlip += p.amount;
      paymentDistribution.total += p.amount;
    });
  });

  // ── Monthly aggregation from real invoices ───────────────────────────────
  const monthMap = {};
  invoices.forEach((inv) => {
    const dt = new Date(inv.date);
    if (isNaN(dt)) return;
    const key = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`;
    if (!monthMap[key]) {
      monthMap[key] = { year: dt.getFullYear(), month: dt.getMonth(), invoiced: 0, recovered: 0 };
    }
    monthMap[key].invoiced += inv.amount;
    (inv.payments || []).forEach((p) => {
      const pdt = new Date(p.date);
      if (isNaN(pdt)) return;
      const pKey = `${pdt.getFullYear()}-${String(pdt.getMonth() + 1).padStart(2, '0')}`;
      if (!monthMap[pKey]) {
        monthMap[pKey] = { year: pdt.getFullYear(), month: pdt.getMonth(), invoiced: 0, recovered: 0 };
      }
      monthMap[pKey].recovered += p.amount;
    });
  });

  const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const monthlyBreakdown = Object.entries(monthMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-12)
    .map(([, v]) => ({
      month: monthNames[v.month],
      invoiced: v.invoiced,
      recovered: v.recovered,
      outstanding: v.invoiced - v.recovered,
    }));

  // Filtered shops for search
  const filteredShops = !searchQuery
    ? activeShops
    : activeShops.filter((s) => {
        const q = searchQuery.toLowerCase();
        return (
          s.name.toLowerCase().includes(q) ||
          s.route.toLowerCase().includes(q) ||
          s.contact.toLowerCase().includes(q)
        );
      });

  return {
    activeShops,
    shopOutstanding,
    grandTotalOutstanding,
    totalActiveDebtors,
    thisMonthRecovered,
    topOutstandingShops,
    filteredShops,
    paymentDistribution,
    monthlyBreakdown,
  };
}

/**
 * computeSelected — resolves the selected shop + its invoices + outstanding.
 *
 * TYPE-SAFE ID comparison: coerces both `shop.id` and `selectedShopId` to
 * Strings before comparing, so a URL param parsed as `"3"` (string) and a
 * Prisma record parsed as `3` (number) always match: `String(3) === String("3")`.
 */
function computeSelected(shops, invoices, shopOutstanding, selectedShopId) {
  // Guard against undefined/null shops array
  const safeShops = shops || [];
  const safeInvoices = invoices || [];

  const selectedShop = safeShops.find((s) => String(s.id) === String(selectedShopId)) || null;
  const selectedShopInvoices = selectedShopId == null
    ? []
    : safeInvoices
        .filter((t) => String(t.shopId) === String(selectedShopId))
        .sort((a, b) => new Date(b.date) - new Date(a.date));
  const selectedShopOutstanding = Math.max(0, shopOutstanding?.[selectedShopId] || 0);
  return { selectedShop, selectedShopTransactions: selectedShopInvoices, selectedShopOutstanding };
}

function normalizePaymentMode(value) {
  return String(value || '').trim().toLowerCase().replace(/[-\s]+/g, '_');
}

function derivePaymentSelector(record = {}) {
  const normalizedType = normalizePaymentMode(record.paymentType);
  const normalizedMode = normalizePaymentMode(record.paymentMode);
  const normalizedMethod = normalizePaymentMode(record.paymentMethod);
  const normalizedDocType = normalizePaymentMode(record.docType);

  if (
    normalizedType === 'bank_slip' ||
    normalizedType === 'bankslip' ||
    normalizedMode === 'bank_slip' ||
    normalizedMode === 'bankslip' ||
    normalizedMethod === 'bank_slip' ||
    normalizedMethod === 'bankslip' ||
    normalizedType === 'bank_slip_payment' ||
    normalizedMode === 'bank_slip_payment' ||
    normalizedMethod === 'bank_slip_payment'
  ) {
    return 'BANK_SLIP';
  }
  if (
    normalizedType === 'cheque' ||
    normalizedMode === 'cheque' ||
    normalizedMethod === 'cheque' ||
    normalizedType === 'cheque_payment' ||
    normalizedMode === 'cheque_payment' ||
    normalizedMethod === 'cheque_payment' ||
    normalizedMode === 'check' ||
    normalizedMethod === 'check' ||
    Boolean(record.chequeNo || record.bankName || record.branchName)
  ) {
    return 'CHEQUE';
  }
  if (normalizedType === 'cash' || normalizedMode === 'cash' || normalizedMethod === 'cash' || normalizedDocType === 'cash_payment') {
    return 'CASH';
  }
  return 'CASH';
}

function applyInvoiceMutation(state, nextInvoices) {
  const derived = computeDerived(state.shops, nextInvoices, state.searchQuery);
  const selected = computeSelected(state.shops, nextInvoices, derived.shopOutstanding, state.selectedShopId);
  return {
    ...state,
    invoices: nextInvoices,
    transactions: nextInvoices,
    ...derived,
    ...selected,
  };
}

// ── API Data Loader ─────────────────────────────────────────────────────────

async function fetchAllData() {
  try {
    // Fetch all data in parallel with generous limits for full dataset
    const [storesRes, invoicesRes, salesPersonsRes, routesRes, summaryRes, analyticsRes] = await Promise.all([
      storesApi.list(withPagination({}, 1, 500)),       // high limit to get all stores
      invoicesApi.list(withPagination({}, 1, 2000)),     // high limit for full invoice dataset
      salesPersonsApi.list(withPagination({}, 1, 200)),
      routesApi.list(withPagination({}, 1, 300)),
      invoicesApi.summary(),
      dashboardApi.analytics(),
    ]);

    const mappedStores = extractData(storesRes).map(mapStoreFromApi);
    const mappedInvoices = extractData(invoicesRes).map(mapInvoiceFromApi);
    const mappedSalesPersons = extractData(salesPersonsRes).map(mapSalesPersonFromApi);
    const mappedRoutes = extractData(routesRes).map(mapRouteFromApi);

    const storesPagination = extractPagination(storesRes);
    const invoicesPagination = extractPagination(invoicesRes);

    return {
      stores: mappedStores,
      invoices: mappedInvoices,
      salesPersons: mappedSalesPersons,
      routes: mappedRoutes,
      storesPagination,
      invoicesPagination,
      summary: summaryRes?.data || summaryRes,
      analytics: analyticsRes?.data || analyticsRes,
      live: true,
    };
  } catch (error) {
    console.warn('⚠️ Backend API unreachable, falling back to mock data.', error.message);
    return { live: false };
  }
}

// ── Zustand Store ───────────────────────────────────────────────────────────

const useAppStore = create((set, get) => {
  return {
    // Raw state
    shops: [],
    invoices: [],
    transactions: [],
    selectedShopId: null,
    searchQuery: '',

    // Derived
    activeShops: [],
    shopOutstanding: {},
    grandTotalOutstanding: 0,
    totalActiveDebtors: 0,
    thisMonthRecovered: 0,
    topOutstandingShops: [],
    filteredShops: [],
    paymentDistribution: { cash: 0, cheque: 0, check: 0, total: 0 },
    monthlyBreakdown: [],

    // Selected shop context
    selectedShop: null,
    selectedShopTransactions: [],
    selectedShopOutstanding: 0,

    // Sales Persons
    salesPersons: [],

    // Pagination metadata
    storesPagination: { page: 1, limit: 15, totalPages: 0, totalCount: 0 },
    invoicesPagination: { page: 1, limit: 15, totalPages: 0, totalCount: 0 },
    outstandingReportPagination: { page: 1, limit: 15, totalPages: 0, totalCount: 0 },

    // Outstanding report cache (full dataset, generated from live API)
    outstandingRows: [],
    outstandingTotal: 0,
    reportFinalMarketOutstanding: 0,

    // Static (routes are UI-only, not in backend yet)
    routes: initialRoutes,
    routeNames: getRouteNames(initialRoutes),
    bankNames: initialBankNames,

    // Loading / error / initialization state
    loading: true,
    initialized: false,
    error: null,
    liveData: false,
    refreshing: false, // true during post-mutation background re-fetches

    // ── Hydrate store from backend API on mount ─────────────────────────
    hydrate: async (isBackgroundRefresh = false) => {
      // During background re-fetches (post-mutation), do NOT set loading=true
      // to avoid triggering the full-screen HydrationGate spinner.
      // Only the first-ever load should show the spinner.
      if (!isBackgroundRefresh) {
        set({ loading: true, error: null });
      } else {
        set({ refreshing: true, error: null });
      }
      try {
        const result = await fetchAllData();
        // PRESERVE the currently selected shop ID AND search query during
        // re-hydration so that mutations (updateShop, addInvoice, addPayment,
        // etc.) do NOT wipe out the active store context view (store title,
        // metrics, transaction table) or active search filter.
        const currentSelectedShopId = get().selectedShopId;
        const currentSearchQuery = get().searchQuery || '';

        if (result.live) {
          const derived = computeDerived(result.stores, result.invoices, currentSearchQuery);
          const selected = computeSelected(result.stores, result.invoices, derived.shopOutstanding, currentSelectedShopId);
          const analytics = result.analytics || {};
          const serverShopOutstanding = analytics.shopOutstanding || derived.shopOutstanding;
          set({
            shops: result.stores,
            invoices: result.invoices,
            transactions: result.invoices,
            salesPersons: result.salesPersons,
            routes: result.routes,
            routeNames: getRouteNames(result.routes),
            storesPagination: result.storesPagination,
            invoicesPagination: result.invoicesPagination,
            liveData: true,
            loading: false,
            initialized: true,
            ...derived,
            shopOutstanding: serverShopOutstanding,
            grandTotalOutstanding: Number.isFinite(Number(analytics.grandTotalOutstanding))
              ? Number(analytics.grandTotalOutstanding)
              : derived.grandTotalOutstanding,
            totalActiveDebtors: Number.isFinite(Number(analytics.totalActiveDebtors))
              ? Number(analytics.totalActiveDebtors)
              : derived.totalActiveDebtors,
            thisMonthRecovered: Number.isFinite(Number(analytics.thisMonthRecovered))
              ? Number(analytics.thisMonthRecovered)
              : derived.thisMonthRecovered,
            paymentDistribution: analytics.paymentDistribution || derived.paymentDistribution,
            monthlyBreakdown: Array.isArray(analytics.monthlyBreakdown) && analytics.monthlyBreakdown.length > 0
              ? analytics.monthlyBreakdown
              : derived.monthlyBreakdown,
            ...selected,
          });
          // Also pre-fetch outstanding report data
          get().refreshOutstandingReport();
        } else {
          // Fallback to mock data
          const derived = computeDerived(initialStores, initialInvoices, '');
          const selected = computeSelected(initialStores, initialInvoices, derived.shopOutstanding, currentSelectedShopId);
          const normalizedInitialStores = initialStores.map((store) => {
            const totalPaid = Number(store.totalPaid ?? store.totalPayments ?? 0);
            return {
              ...store,
              totalPaid,
              totalPayments: totalPaid,
            };
          });
          set({
            shops: normalizedInitialStores,
            invoices: [...initialInvoices],
            transactions: [...initialInvoices],
            salesPersons: [...fallbackSalesPersons],
            routes: [...initialRoutes],
            routeNames: getRouteNames(initialRoutes),
            liveData: false,
            loading: false,
            initialized: true,
            ...derived,
            ...selected,
          });
        }
      } catch (error) {
        set({ loading: false, initialized: true, error: error.message, liveData: false });
      }
    },

    // ── Refresh all data from API ────────────────────────────────────────
    refresh: async () => {
      await get().hydrate(true); // true = isBackgroundRefresh: don't show full-screen spinner
      set({ refreshing: false });
    },

    // ── Refresh Outstanding Report from API ──────────────────────────────
    refreshOutstandingReport: async (shopId = null, filters = {}) => {
      try {
        const { startDate, endDate, year, month } = filters || {};
        const params = withPagination(
          {
            ...(shopId ? { storeId: String(shopId) } : {}),
            ...(startDate ? { startDate } : {}),
            ...(endDate ? { endDate } : {}),
            ...(year ? { year } : {}),
            ...(month ? { month } : {}),
          },
          1,
          5000 // High limit to get full dataset for client-side grouping
        );
        const res = await outstandingApi.getReport(params);
        const rows = extractData(res).map(mapOutstandingRowFromApi);
        const pagination = extractPagination(res);

        // Calculate total from full dataset
        const total = rows.reduce((sum, r) => sum + Math.max(0, r.balanceDue), 0);

        set({
          outstandingRows: rows,
          outstandingTotal: total,
          reportFinalMarketOutstanding: total,
          outstandingReportPagination: pagination,
        });
      } catch (error) {
        console.warn('⚠️ Could not fetch outstanding report, using local computation fallback.', error.message);
        // Fallback: compute from local invoices
        const { shops, invoices } = get();
        const { rows, totalOutstanding } = computeLocalOutstanding(shops, invoices, shopId);
        set({
          outstandingRows: rows,
          outstandingTotal: totalOutstanding,
          reportFinalMarketOutstanding: totalOutstanding,
          outstandingReportPagination: { page: 1, limit: 5000, totalPages: 1, totalCount: rows.length },
        });
      }
    },

    setReportFinalMarketOutstanding: (value) => {
      set({ reportFinalMarketOutstanding: Number(value) || 0 });
    },

    // ── Route CRUD Actions (API-backed) ────────────────────────────────────

    addRoute: async (routeData) => {
      try {
        const payload = mapRouteToApi(routeData);
        const res = await routesApi.create(payload);
        if (res.success || res.data) {
          await get().refresh();
          toast.success('Route profile created successfully.');
        }
      } catch (error) {
        toast.error(error.response?.data?.message || 'The operation could not be completed. Please review the request and try again.');
        console.error('Failed to add route:', error);
        set((state) => {
          const newRoutes = [
            ...state.routes,
            { id: getNextId(state.routes), ...routeData },
          ];
          return { ...state, routes: newRoutes, routeNames: getRouteNames(newRoutes) };
        });
      }
    },

    updateRoute: async (id, data) => {
      try {
        const payload = mapRouteToApi(data);
        const res = await routesApi.update(String(id), payload);
        if (res.success || res.data) {
          await get().refresh();
          toast.success('Route profile updated successfully.');
        }
      } catch (error) {
        toast.error(error.response?.data?.message || 'The operation could not be completed. Please review the request and try again.');
        console.error('Failed to update route:', error);
        set((state) => {
          const newRoutes = state.routes.map((r) => r.id === id ? { ...r, ...data } : r);
          return { ...state, routes: newRoutes, routeNames: getRouteNames(newRoutes) };
        });
      }
    },

    deleteRoute: async (id) => {
      try {
        const res = await routesApi.delete(String(id));
        if (res.success || res.data) {
          await get().refresh();
          toast.success('Route profile removed successfully.');
        }
      } catch (error) {
        toast.error(error.response?.data?.message || 'The operation could not be completed. Please review the request and try again.');
        console.error('Failed to delete route:', error);
        set((state) => {
          const newRoutes = state.routes.filter((r) => r.id !== id);
          return { ...state, routes: newRoutes, routeNames: getRouteNames(newRoutes) };
        });
      }
    },

    // ── Sales Person CRUD Actions (API-backed) ────────────────────────────

    addSalesPerson: async (personData) => {
      try {
        const res = await salesPersonsApi.create(personData);
        if (res.success || res.data) {
          await get().refresh();
          await get().refreshOutstandingReport();
          toast.success('Sales representative profile created successfully.');
        }
      } catch (error) {
        toast.error(error.response?.data?.message || 'The operation could not be completed. Please review the request and try again.');
        console.error('Failed to add sales person:', error);
        set((state) => {
          const newPersons = [
            ...state.salesPersons,
            { id: getNextId(state.salesPersons), ...personData },
          ];
          return { ...state, salesPersons: newPersons };
        });
      }
    },

    updateSalesPerson: async (id, data) => {
      try {
        const res = await salesPersonsApi.update(id, data);
        if (res.success || res.data) {
          await get().refresh();
          await get().refreshOutstandingReport();
          toast.success('Sales representative profile updated successfully.');
        }
      } catch (error) {
        toast.error(error.response?.data?.message || 'The operation could not be completed. Please review the request and try again.');
        console.error('Failed to update sales person:', error);
        set((state) => {
          const newPersons = state.salesPersons.map((p) => p.id === id ? { ...p, ...data } : p);
          return { ...state, salesPersons: newPersons };
        });
      }
    },

    deleteSalesPerson: async (id) => {
      try {
        const res = await salesPersonsApi.delete(id);
        if (res.success || res.data) {
          await get().refresh();
          await get().refreshOutstandingReport();
          toast.success('Sales representative profile removed successfully.');
        }
      } catch (error) {
        toast.error(error.response?.data?.message || 'The operation could not be completed. Please review the request and try again.');
        console.error('Failed to delete sales person:', error);
        set((state) => {
          const newPersons = state.salesPersons.filter((p) => p.id !== id);
          return { ...state, salesPersons: newPersons };
        });
      }
    },

    // ── Navigation / UI Actions ──────────────────────────────────────────

    setSelectedShopId: (id) => {
      set((state) => {
        const derived = computeDerived(state.shops, state.invoices, state.searchQuery);
        const selected = computeSelected(state.shops, state.invoices, derived.shopOutstanding, id);
        return { ...state, selectedShopId: id, ...selected };
      });
    },

    setSearchQuery: (query) => {
      set((state) => {
        const derived = computeDerived(state.shops, state.invoices, query);
        return { ...state, searchQuery: query, ...derived };
      });
    },

    // ── Individual store sub-fetch (re-hydration safety net) ──────────────
    // Calling this after global data is known-loaded ensures the selected
    // shop + invoices are resolved in a single, predictable set() pass.
    fetchInvoicesForStore: (storeId) => {
      const state = get();
      if (!state.shops || state.shops.length === 0) return;
      const derived = computeDerived(state.shops, state.invoices, state.searchQuery);
      const selected = computeSelected(state.shops, state.invoices, derived.shopOutstanding, storeId);
      set({
        selectedShopId: storeId,
        ...selected,
      });
    },

    // ── Store CRUD Actions (API-backed) ────────────────────────────────

    addShop: async (shopData) => {
      try {
        const payload = {
          ...mapStoreToApi(shopData),
          salesPersonId: String(shopData?.salesPersonBackendId || shopData?.salesPersonId || '').trim() || null,
        };
        const res = await storesApi.create(payload);
        if (res.success || res.data) {
          const createdStore = res?.data?.data || res?.data || null;
          const createdStoreId = createdStore?.id ? String(createdStore.id) : null;

          const result = await fetchAllData();
          if (result.live) {
            const state = get();
            const nextSelectedShopId = createdStoreId || state.selectedShopId;
            const derived = computeDerived(result.stores, result.invoices, state.searchQuery);
            const selected = computeSelected(result.stores, result.invoices, derived.shopOutstanding, nextSelectedShopId);
            set({
              shops: result.stores,
              invoices: result.invoices,
              transactions: result.invoices,
              salesPersons: result.salesPersons,
              routes: result.routes,
              routeNames: getRouteNames(result.routes),
              storesPagination: result.storesPagination,
              invoicesPagination: result.invoicesPagination,
              selectedShopId: nextSelectedShopId,
              liveData: true,
              ...derived,
              ...selected,
            });
            await get().refreshOutstandingReport();
          } else {
            await get().refresh();
            await get().refreshOutstandingReport();
          }

          toast.success('Account profile created: Store configurations saved successfully.');
          return createdStoreId;
        }
        return null;
      } catch (error) {
        toast.error(error.response?.data?.message || 'The operation could not be completed. Please review the request and try again.');
        console.error('Failed to add store:', error);
        set((state) => {
          const newShops = [
            ...state.shops,
            { id: getNextId(state.shops), ...shopData, active: true, totalPaid: 0, totalPayments: 0 },
          ];
          const derived = computeDerived(newShops, state.invoices, state.searchQuery);
          const selected = computeSelected(newShops, state.invoices, derived.shopOutstanding, state.selectedShopId);
          return { ...state, shops: newShops, ...derived, ...selected };
        });
        return null;
      }
    },

    updateShop: async (id, data) => {
      try {
        const payload = {
          ...mapStoreToApi(data),
          salesPersonId: String(data?.salesPersonBackendId || data?.salesPersonId || '').trim() || null,
        };
        const res = await storesApi.update(String(id), payload);
        if (res.success || res.data) {
          const result = await fetchAllData();
          if (result.live) {
            const state = get();
            const derived = computeDerived(result.stores, result.invoices, state.searchQuery);
            const selected = computeSelected(result.stores, result.invoices, derived.shopOutstanding, state.selectedShopId);
            set({
              shops: result.stores,
              invoices: result.invoices,
              transactions: result.invoices,
              salesPersons: result.salesPersons,
              routes: result.routes,
              routeNames: getRouteNames(result.routes),
              storesPagination: result.storesPagination,
              invoicesPagination: result.invoicesPagination,
              liveData: true,
              ...derived,
              ...selected,
            });
            await get().refreshOutstandingReport();
          } else {
            await get().refresh();
            await get().refreshOutstandingReport();
          }
          toast.success('Account profile updated: Store configurations modified successfully.');
        }
      } catch (error) {
        toast.error(error.response?.data?.message || 'The operation could not be completed. Please review the request and try again.');
        console.error('Failed to update store:', error);
        set((state) => {
          const newShops = state.shops.map((s) => s.id === id ? { ...s, ...data } : s);
          const derived = computeDerived(newShops, state.invoices, state.searchQuery);
          const selected = computeSelected(newShops, state.invoices, derived.shopOutstanding, state.selectedShopId);
          return { ...state, shops: newShops, ...derived, ...selected };
        });
      }
    },

    deleteShop: async (id) => {
      try {
        const res = await storesApi.delete(String(id));
        if (res.success || res.data) {
          await get().refresh();
          await get().refreshOutstandingReport();
          toast.success('Store account removed successfully.');
        }
      } catch (error) {
        toast.error(error.response?.data?.message || 'The operation could not be completed. Please review the request and try again.');
        console.error('Failed to delete store:', error);
        set((state) => {
          const newShops = state.shops.filter((s) => s.id !== id);
          const newInvoices = state.invoices.filter((t) => t.shopId !== id);
          const derived = computeDerived(newShops, newInvoices, state.searchQuery);
          const newSelectedId = state.selectedShopId === id ? null : state.selectedShopId;
          const selected = computeSelected(newShops, newInvoices, derived.shopOutstanding, newSelectedId);
          return { ...state, shops: newShops, invoices: newInvoices, transactions: newInvoices, selectedShopId: newSelectedId, ...derived, ...selected };
        });
      }
    },

    toggleShopActive: (id) => {
      set((state) => {
        const newShops = state.shops.map((s) => s.id === id ? { ...s, active: !s.active } : s);
        const derived = computeDerived(newShops, state.invoices, state.searchQuery);
        const selected = computeSelected(newShops, state.invoices, derived.shopOutstanding, state.selectedShopId);
        return { ...state, shops: newShops, ...derived, ...selected };
      });
    },

    // ── Invoice Actions (API-backed) ────────────────────────────────────

    addInvoice: async (invoiceData) => {
      try {
        const paymentSelector = derivePaymentSelector(invoiceData);
        const normalizedInvoiceData = {
          ...invoiceData,
          paymentType: invoiceData.paymentType || invoiceData.paymentMethod || invoiceData.paymentMode || paymentSelector,
          paymentMode: invoiceData.paymentMode || invoiceData.paymentMethod || paymentSelector,
          paymentMethod: invoiceData.paymentMethod || invoiceData.paymentMode || paymentSelector,
          chequeNo: paymentSelector !== 'CASH' ? (invoiceData.chequeNo || null) : null,
          bankName: paymentSelector !== 'CASH' ? (invoiceData.bankName || null) : null,
          branchName: paymentSelector !== 'CASH' ? (invoiceData.branchName || null) : null,
        };
        const payload = mapInvoiceToApi(normalizedInvoiceData);
        const res = await invoicesApi.create(payload);
        if (res.success || res.data) {
          // FORCE immediate real-time state re-validation: pull the freshest
          // computed schemas from the backend so all summary hooks, pagination
          // limits, and active store views are re-hydrated seamlessly.
          const result = await fetchAllData();
          if (result.live) {
            const state = get();
            const derived = computeDerived(result.stores, result.invoices, state.searchQuery);
            const selected = computeSelected(result.stores, result.invoices, derived.shopOutstanding, state.selectedShopId);
            set({
              shops: result.stores,
              invoices: result.invoices,
              transactions: result.invoices,
              salesPersons: result.salesPersons,
              routes: result.routes,
              routeNames: getRouteNames(result.routes),
              storesPagination: result.storesPagination,
              invoicesPagination: result.invoicesPagination,
              liveData: true,
              ...derived,
              ...selected,
            });
            // Re-fetch outstanding report in background
            await get().refreshOutstandingReport();
          } else {
            // Fallback to regular refresh
            await get().refresh();
            await get().refreshOutstandingReport();
          }
          toast.success('Transaction ledger updated: Invoice generated successfully.');
        }
      } catch (error) {
        toast.error(error.response?.data?.message || 'System Exception: Processing failed due to an unexpected controller schema mismatch.');
        console.error('Failed to add invoice:', error);
        // Fallback: add locally
        set((state) => {
          const docNo = invoiceData.docNo || getNextDocNo('Invoice', state.invoices);
          const paymentSelector = derivePaymentSelector(invoiceData);
          const newInvoice = {
            id: getNextId(state.invoices),
            ...invoiceData,
            docNo,
            docType: invoiceData.docType || 'Invoice',
            paymentMode: paymentSelector.toLowerCase(),
            paymentMethod: paymentSelector,
            chequeNo: paymentSelector !== 'CASH' ? (invoiceData.chequeNo || '') : '',
            bankName: paymentSelector !== 'CASH' ? (invoiceData.bankName || '') : '',
            branchName: paymentSelector !== 'CASH' ? (invoiceData.branchName || '') : '',
            received: invoiceData.received || 0,
            payments: [],
          };
          const newInvoices = [...state.invoices, newInvoice];
          const derived = computeDerived(state.shops, newInvoices, state.searchQuery);
          const selected = computeSelected(state.shops, newInvoices, derived.shopOutstanding, state.selectedShopId);
          return { ...state, invoices: newInvoices, transactions: newInvoices, ...derived, ...selected };
        });
      }
    },

    addTransaction: (tData) => {
      const state = get();
      if (tData.docType === 'Payment') return;
      state.addInvoice({
        shopId: tData.shopId,
        date: tData.date,
        amount: tData.amount,
        received: tData.received || 0,
        description: tData.description || '',
        salesPerson: tData.salesPerson || '',
        salesPersonPhone: tData.salesPersonPhone || '',
        route: tData.route || '',
      });
    },

    addPaymentToInvoice: async (invoiceId, paymentData) => {
      try {
        const paymentSelector = derivePaymentSelector(paymentData);
        // ══════════════════════════════════════════════════════════
        // TYPE-SAFETY LOCK: Prisma schema defines Invoice.id as String (UUID)
        // Force-stringify the invoiceId before crossing the network boundary
        // to prevent "Expected String, provided Int" Prisma crashes.
        // ══════════════════════════════════════════════════════════
        const normalizedPaymentData = {
          ...paymentData,
          invoiceId: String(invoiceId),
          paymentType: paymentData.paymentType || paymentData.paymentMethod || paymentData.paymentMode || paymentSelector,
          paymentMode: paymentData.paymentMode || paymentData.paymentMethod || paymentSelector,
          paymentMethod: paymentData.paymentMethod || paymentData.paymentMode || paymentSelector,
          chequeNo: paymentSelector !== 'CASH' ? (String(paymentData.chequeNo || '').trim() || null) : null,
          bankName: paymentSelector !== 'CASH' ? (String(paymentData.bankName || '').trim() || null) : null,
          branchName: paymentSelector !== 'CASH' ? (String(paymentData.branchName || '').trim() || null) : null,
          description: String(paymentData.description || '').trim(),
        };
        const requestBody = mapPaymentToApi(normalizedPaymentData);
        const res = await paymentsApi.collect(requestBody);
        if (res.success || res.data) {
          // FORCE immediate real-time state re-validation: pull the freshest
          // computed schemas from the backend so all summary hooks, charts,
          // and active store views reflect the new payment instantly.
          const result = await fetchAllData();
          if (result.live) {
            const state = get();
            const derived = computeDerived(result.stores, result.invoices, state.searchQuery);
            const selected = computeSelected(result.stores, result.invoices, derived.shopOutstanding, state.selectedShopId);
            set({
              shops: result.stores,
              invoices: result.invoices,
              transactions: result.invoices,
              salesPersons: result.salesPersons,
              routes: result.routes,
              routeNames: getRouteNames(result.routes),
              storesPagination: result.storesPagination,
              invoicesPagination: result.invoicesPagination,
              liveData: true,
              ...derived,
              ...selected,
            });
            // Re-fetch outstanding report in background
            await get().refreshOutstandingReport();
          } else {
            // Fallback to regular refresh
            await get().refresh();
            await get().refreshOutstandingReport();
          }
          toast.success('Financial ledger updated: Payment collection processed successfully.');
        }
      } catch (error) {
        toast.error(error.response?.data?.message || 'System Exception: Processing failed due to an unexpected controller schema mismatch.');
        console.error('Failed to add payment:', error);
        // Fallback: update locally
        set((state) => {
          const paymentSelector = derivePaymentSelector(paymentData);
          const newInvoices = state.invoices.map((inv) => {
            if (inv.id !== invoiceId) return inv;
            const newPayments = [
              ...(inv.payments || []),
              {
                id: getNextId(inv.payments || []),
                date: paymentData.date,
                amount: paymentData.amount,
                paymentMode: paymentSelector.toLowerCase(),
                paymentMethod: paymentSelector,
                chequeNo: paymentSelector !== 'CASH' ? (paymentData.chequeNo || '') : '',
                bankName: paymentSelector !== 'CASH' ? (paymentData.bankName || '') : '',
                branchName: paymentSelector !== 'CASH' ? (paymentData.branchName || '') : '',
                description: paymentData.description || '',
              },
            ];
            const totalReceived = (inv.received || 0) + paymentData.amount;
            return { ...inv, payments: newPayments, received: totalReceived };
          });
          const derived = computeDerived(state.shops, newInvoices, state.searchQuery);
          const selected = computeSelected(state.shops, newInvoices, derived.shopOutstanding, state.selectedShopId);
          return { ...state, invoices: newInvoices, transactions: newInvoices, ...derived, ...selected };
        });
      }
    },

    updateInvoice: async (id, data) => {
      try {
        const payload = mapInvoiceUpdateToApi(data);
        const res = await invoicesApi.update(String(id), payload);
        if (res.success || res.data) {
          const updatedPayload = res?.data?.data || res?.data;
          if (updatedPayload) {
            const mappedUpdatedInvoice = mapInvoiceFromApi(updatedPayload);
            set((state) => {
              const nextInvoices = state.invoices.map((inv) => (
                String(inv.id) === String(id)
                  ? { ...inv, ...mappedUpdatedInvoice, payments: mappedUpdatedInvoice.payments || inv.payments || [] }
                  : inv
              ));
              return applyInvoiceMutation(state, nextInvoices);
            });
          }

          const result = await fetchAllData();
          if (result.live) {
            const state = get();
            const derived = computeDerived(result.stores, result.invoices, state.searchQuery);
            const selected = computeSelected(result.stores, result.invoices, derived.shopOutstanding, state.selectedShopId);
            set({
              shops: result.stores,
              invoices: result.invoices,
              transactions: result.invoices,
              salesPersons: result.salesPersons,
              storesPagination: result.storesPagination,
              invoicesPagination: result.invoicesPagination,
              liveData: true,
              ...derived,
              ...selected,
            });
            await get().refreshOutstandingReport();
          } else {
            await get().refresh();
            await get().refreshOutstandingReport();
          }
          toast.success('Transaction ledger updated: Invoice modifications saved successfully.');
        }
      } catch (error) {
        toast.error(error.response?.data?.message || 'The operation could not be completed. Please review the request and try again.');
        console.error('Failed to update invoice:', error);
        set((state) => {
          const newInvoices = state.invoices.map((inv) => {
            if (inv.id !== id) return inv;
            return { ...inv, ...data, payments: inv.payments };
          });
          const derived = computeDerived(state.shops, newInvoices, state.searchQuery);
          const selected = computeSelected(state.shops, newInvoices, derived.shopOutstanding, state.selectedShopId);
          return { ...state, invoices: newInvoices, transactions: newInvoices, ...derived, ...selected };
        });
      }
    },

    updateTransaction: (id, data) => {
      get().updateInvoice(id, data);
    },

    deleteInvoice: async (id) => {
      try {
        const res = await invoicesApi.delete(String(id));
        if (res.success || res.data) {
          set((state) => {
            const nextInvoices = state.invoices.filter((inv) => String(inv.id) !== String(id));
            return applyInvoiceMutation(state, nextInvoices);
          });

          await get().refresh();
          await get().refreshOutstandingReport();
          toast.success('Invoice record removed successfully.');
        }
      } catch (error) {
        toast.error(error.response?.data?.message || 'The operation could not be completed. Please review the request and try again.');
        console.error('Failed to delete invoice:', error);
        set((state) => {
          const newInvoices = state.invoices.filter((t) => t.id !== id);
          const derived = computeDerived(state.shops, newInvoices, state.searchQuery);
          const selected = computeSelected(state.shops, newInvoices, derived.shopOutstanding, state.selectedShopId);
          return { ...state, invoices: newInvoices, transactions: newInvoices, ...derived, ...selected };
        });
      }
    },

    deleteTransaction: (id) => {
      get().deleteInvoice(id);
    },

    /**
     * deletePayment: Deletes a payment record, reverts the balance on the invoice,
     * and refreshes the full state tree to reflect the ledger rollback.
     *
     * TRANSACTIONAL PIPELINE:
     * 1. Calls paymentsApi.reverse(id) → backend atomically deletes the payment
     *    and subtracts the amountPaid from invoice.received, adds it back to balanceDue.
     * 2. On success, performs a full re-hydration fetchAllData() so all derived
     *    state (summary cards, charts, outstanding report) reflects the rollback.
     * 3. Falls back to local state mutation if API is unreachable.
     */
    deletePayment: async (paymentId) => {
      try {
        const res = await paymentsApi.reverse(String(paymentId));
        if (res.success || res.data) {
          // Full re-hydration: fetch fresh state so ledgers, balance, dashboard all update
          const result = await fetchAllData();
          if (result.live) {
            const state = get();
            const derived = computeDerived(result.stores, result.invoices, state.searchQuery);
            const selected = computeSelected(result.stores, result.invoices, derived.shopOutstanding, state.selectedShopId);
            set({
              shops: result.stores,
              invoices: result.invoices,
              transactions: result.invoices,
              salesPersons: result.salesPersons,
              routes: result.routes,
              routeNames: getRouteNames(result.routes),
              storesPagination: result.storesPagination,
              invoicesPagination: result.invoicesPagination,
              liveData: true,
              ...derived,
              ...selected,
            });
            await get().refreshOutstandingReport();
          } else {
            await get().refresh();
            await get().refreshOutstandingReport();
          }
          toast.success('Payment deleted successfully. Balance due has been reverted.');
        }
      } catch (error) {
        toast.error(error.response?.data?.message || 'Failed to delete payment. Please try again.');
        console.error('Failed to delete payment:', error);
        // Fallback: apply local state inversion immediately
        set((state) => {
          const newInvoices = state.invoices.map((inv) => {
            const filteredPayments = (inv.payments || []).filter((p) => String(p.id) !== String(paymentId));
            if (filteredPayments.length === inv.payments?.length) return inv; // no change
            const removedPayment = (inv.payments || []).find((p) => String(p.id) === String(paymentId));
            const revertAmount = removedPayment ? Number(removedPayment.amount) : 0;
            const newReceived = Math.max(0, Number(inv.received) - revertAmount);
            const newBalanceDue = Math.max(0, Number(inv.amount) - newReceived);
            return {
              ...inv,
              received: newReceived,
              balanceDue: newBalanceDue,
              payments: filteredPayments,
            };
          });
          const derived = computeDerived(state.shops, newInvoices, state.searchQuery);
          const selected = computeSelected(state.shops, newInvoices, derived.shopOutstanding, state.selectedShopId);
          return { ...state, invoices: newInvoices, transactions: newInvoices, ...derived, ...selected };
        });
      }
    },

    /**
     * generateOutstandingReport: produces per-shop rows with correct running balance.
     * If live data is available, uses the cached outstandingRows fetched from the API.
     * Otherwise falls back to local computation from the invoices array.
     * This ensures the report always shows the full dataset, not just paginated slices.
     */
    generateOutstandingReport: (shopId = null) => {
      const { shops, invoices, outstandingRows, liveData } = get();

      // If live data and we have outstanding rows from API, use those
      if (liveData && outstandingRows.length > 0) {
        let filtered = shopId
          ? outstandingRows.filter(r => String(r.shopId) === String(shopId))
          : outstandingRows;

        const sorted = [...filtered].sort((a, b) => new Date(a.date) - new Date(b.date));

        // Recalculate running balance per shop for the full dataset
        const shopRunning = {};
        const rows = [];
        sorted.forEach((row) => {
          if (!shopRunning[row.shopId]) shopRunning[row.shopId] = 0;
          const received = row.received || 0;
          shopRunning[row.shopId] += (row.amount - received);
          rows.push({
            ...row,
            balanceDue: shopRunning[row.shopId],
          });
        });

        const totalOutstanding = rows
          .filter((r) => r.docType === 'Invoice')
          .reduce((sum, r) => sum + Math.max(0, r.balanceDue), 0);

        return { rows, totalOutstanding };
      }

      // Fallback: compute locally from invoices
      return computeLocalOutstanding(shops, invoices, shopId);
    },
  };
});

/**
 * computeLocalOutstanding: fallback computation from local shops/invoices arrays.
 */
function computeLocalOutstanding(shops, invoices, shopId = null) {
  const shopMap = {};
  shops.forEach((s) => { shopMap[s.id] = s.name; });

  let filtered = [...invoices].sort((a, b) => new Date(a.date) - new Date(b.date));

  const shopTransactions = {};
  filtered.forEach((inv) => {
    if (shopId && String(inv.shopId) !== String(shopId)) return;
    if (!shopTransactions[inv.shopId]) shopTransactions[inv.shopId] = [];
    shopTransactions[inv.shopId].push(inv);
  });

  const now = new Date();
  const rows = [];

  const sortedShopIds = Object.keys(shopTransactions).sort((a, b) => a.localeCompare(b));

  sortedShopIds.forEach((sid) => {
    let runningBalance = 0;
    shopTransactions[sid].forEach((inv) => {
      const received = inv.received || 0;
      const invoiceBalanceDue = Number.isFinite(Number(inv.balanceDue))
        ? Math.max(0, Number(inv.balanceDue))
        : Math.max(0, Number(inv.amount) - Number(received));
      runningBalance += invoiceBalanceDue;
      rows.push({
        date: inv.date,
        docNo: inv.docNo,
        docType: 'Invoice',
        chequeNo: inv.chequeNo || '—',
        bankName: inv.bankName || '—',
        paymentMode: inv.paymentMode || '—',
        amount: inv.amount,
        received: received,
        balanceDue: runningBalance,
        ageDays: Math.floor((now - new Date(inv.date)) / 86400000),
        shopId: inv.shopId,
        shopName: shopMap[sid] || 'Unknown',
        description: inv.description || '',
      });
    });
  });

  const totalOutstanding = rows
    .filter((r) => r.docType === 'Invoice')
    .reduce((sum, r) => sum + Math.max(0, r.balanceDue), 0);

  return { rows, totalOutstanding };
}

export default useAppStore;