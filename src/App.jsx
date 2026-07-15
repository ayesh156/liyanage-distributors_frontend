import { useEffect } from 'react';
import { Routes, Route, Navigate, useParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import Layout from './components/Layout/Layout';
import LoginPage from './components/Auth/LoginPage';
import Dashboard from './components/Dashboard/Dashboard';
import StoresManager from './components/Stores/StoresManager';
import OutstandingReport from './components/Report/OutstandingReport';
import RouteManager from './components/Routes/RouteManager';
import SalesPersonManager from './components/SalesPersons/SalesPersonManager';
import { useAuth } from './context/AuthContext';
import useAppStore from './hooks/useAppStore';
import { setToastHandler } from './services/api';

// ---- Hydration guard ----
function HydrationGate({ children }) {
  const loading = useAppStore((s) => s.loading);
  const hydrate = useAppStore((s) => s.hydrate);

  useEffect(() => {
    hydrate();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-white dark:bg-slate-900 z-50">
        <div className="text-center">
          <Loader2 size={40} className="animate-spin text-accent-500 mx-auto mb-4" />
          <p className="text-sm text-gray-500 dark:text-slate-400 font-medium">
            Loading Liyanage Distributors...
          </p>
        </div>
      </div>
    );
  }

  return children;
}

// ---- Individual primitive selectors (guarantee stable getSnapshot) ----

function StoresView() {
  const { id } = useParams();
  const shops    = useAppStore((s) => s.filteredShops);
  const allShops = useAppStore((s) => s.shops);
  const shopOutstanding = useAppStore((s) => s.shopOutstanding);
  const selectedShopId = useAppStore((s) => s.selectedShopId);
  const setSelectedShopId = useAppStore((s) => s.setSelectedShopId);
  const fetchInvoicesForStore = useAppStore((s) => s.fetchInvoicesForStore);
  const selectedShop = useAppStore((s) => s.selectedShop);
  const selectedShopTransactions = useAppStore((s) => s.selectedShopTransactions);
  const selectedShopOutstanding = useAppStore((s) => s.selectedShopOutstanding);
  const searchQuery = useAppStore((s) => s.searchQuery);
  const setSearchQuery = useAppStore((s) => s.setSearchQuery);
  const addShop = useAppStore((s) => s.addShop);
  const updateShop = useAppStore((s) => s.updateShop);
  const deleteShop = useAppStore((s) => s.deleteShop);
  const addTransaction = useAppStore((s) => s.addTransaction);
  const addInvoice = useAppStore((s) => s.addInvoice);
  const deleteTransaction = useAppStore((s) => s.deleteTransaction);
  const updateTransaction = useAppStore((s) => s.updateTransaction);
  const routes = useAppStore((s) => s.routes);
  const initialized = useAppStore((s) => s.initialized);

  /**
   * HYDRATION-RESILIENT URL PARAM → STORE SYNC
   *
   * Problem: On hard-refresh at /stores/:id, React renders synchronously BEFORE
   * the async hydrate() call finishes. At that point `allShops` is [] and
   * `selectedShop` / `selectedShopTransactions` are all undefined/null, causing
   * the UI to freeze on a spinner and header metadata to show "···".
   *
   * Fix — three-phase approach:
   *   Phase 1 (initialized == false): shops haven't loaded yet. We store the
   *     URL param as "pending" but DON'T call setSelectedShopId yet (it would
   *     computeSelected on an empty array → no match → everything null).
   *   Phase 2 (initialized == true && shops loaded): We now have real data.
   *     Call fetchInvoicesForStore() which uses String()-coerced comparison to
   *     safely resolve the shop + invoices in a single atomic set().
   *   Phase 3 (id changes via navigation): The normal setSelectedShopId path
   *     works fine because shops are already loaded.
   */
  useEffect(() => {
    const parsedId = id && id !== 'NaN' ? String(id) : null;

    if (parsedId == null) {
      // No URL param — nothing to sync
      return;
    }

    if (!initialized) {
      // Phase 1: still hydrating. Don't call setSelectedShopId yet.
      // StoresManager will see urlShopId and render the InvoiceHistory shell
      // with isHydrating=true, showing a skeleton rather than a freeze.
      return;
    }

    // Phase 2+3: global data is loaded. Use the robust fetchInvoicesForStore
    // action which does String()-safe comparison and handles empty arrays.
    if (String(parsedId) !== String(selectedShopId)) {
      fetchInvoicesForStore(parsedId);
    }
  }, [id, initialized]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <StoresManager
      shops={shops}
      allShops={allShops}
      shopOutstanding={shopOutstanding}
      selectedShopId={selectedShopId}
      setSelectedShopId={setSelectedShopId}
      selectedShop={selectedShop}
      selectedShopTransactions={selectedShopTransactions}
      selectedShopOutstanding={selectedShopOutstanding}
      searchQuery={searchQuery}
      setSearchQuery={setSearchQuery}
      addShop={addShop}
      updateShop={updateShop}
      deleteShop={deleteShop}
      addTransaction={addTransaction}
      addInvoice={addInvoice}
      deleteTransaction={deleteTransaction}
      updateTransaction={updateTransaction}
      routes={routes}
      urlShopId={id && id !== 'NaN' ? String(id) : null}
    />
  );
}

function ReportView() {
  const shops                  = useAppStore((s) => s.filteredShops);
  const allShops               = useAppStore((s) => s.shops);
  const generateOutstandingReport = useAppStore((s) => s.generateOutstandingReport);
  return (
    <OutstandingReport
      shops={shops}
      allShops={allShops}
      generateOutstandingReport={generateOutstandingReport}
    />
  );
}

function DashboardView() {
  const grandTotalOutstanding = useAppStore((s) => s.grandTotalOutstanding);
  const totalActiveDebtors    = useAppStore((s) => s.totalActiveDebtors);
  const thisMonthRecovered    = useAppStore((s) => s.thisMonthRecovered);
  const topOutstandingShops   = useAppStore((s) => s.topOutstandingShops);
  const monthlyBreakdown      = useAppStore((s) => s.monthlyBreakdown);
  const shops                 = useAppStore((s) => s.shops);
  const shopOutstanding       = useAppStore((s) => s.shopOutstanding);
  const paymentDistribution   = useAppStore((s) => s.paymentDistribution);
  return (
    <Dashboard
      data={{
        grandTotalOutstanding,
        totalActiveDebtors,
        thisMonthRecovered,
        topOutstandingShops,
        monthlyBreakdown,
        shops,
        shopOutstanding,
        paymentDistribution,
      }}
    />
  );
}

function RoutesView() {
  return <RouteManager />;
}

function SalesPersonsView() {
  return <SalesPersonManager />;
}

export default function App() {
  const { isAuthenticated, isInitializing } = useAuth();

  // Wire up the global API toast handler to use react-toastify
  useEffect(() => {
    setToastHandler((message, type, duration) => {
      if (type === 'error') {
        toast.error(message, { autoClose: duration || 4000 });
      } else if (type === 'success') {
        toast.success(message, { autoClose: duration || 4000 });
      } else {
        toast(message, { autoClose: duration || 4000 });
      }
    });
  }, []);

  if (isInitializing) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-white dark:bg-slate-900 z-50">
        <div className="text-center">
          <Loader2 size={40} className="animate-spin text-accent-500 mx-auto mb-4" />
          <p className="text-sm text-slate-900 dark:text-slate-100 font-medium">Validating secure session...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <ToastContainer
        position="top-right"
        autoClose={4000}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="colored"
      />
      {isAuthenticated ? (
        <HydrationGate>
          <Routes>
            <Route path="/" element={<Layout />}>
              <Route index element={<DashboardView />} />
              <Route path="stores" element={<StoresView />} />
              <Route path="stores/:id" element={<StoresView />} />
              <Route path="sales-persons" element={<SalesPersonsView />} />
              <Route path="routes" element={<RoutesView />} />
              <Route path="full-report" element={<ReportView />} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </HydrationGate>
      ) : (
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      )}
    </>
  );
}