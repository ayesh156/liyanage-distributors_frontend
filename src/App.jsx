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
import SettingsManager from './components/Settings/SettingsManager';
import WarehouseManagement from './components/Warehouse/WarehouseManagement';
import VanStockManagement from './components/VanStock/VanStockManagement';
import VanStockTransferDashboard from './components/VanStock/VanStockTransferDashboard';
import VanStockRepView from './components/VanStock/VanStockRepView';
import VanStockShareView from './components/VanStock/VanStockShareView';
import OfflineSentinel from './components/ui/OfflineSentinel';
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

  useEffect(() => {
    const parsedId = id && id !== 'NaN' ? String(id) : null;

    if (parsedId == null) {
      return;
    }

    if (!initialized) {
      return;
    }

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

function SettingsView() {
  return <SettingsManager />;
}

export default function App() {
  const { isAuthenticated, isInitializing } = useAuth();

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
      {/* Network Resilience Layer: Zero-state-loss monitoring */}
      <OfflineSentinel />

      {isAuthenticated ? (
        <HydrationGate>
          <Routes>
            <Route path="/" element={<Layout />}>
              <Route index element={<DashboardView />} />
              {/* Dedicated Central Warehouse Module */}
              <Route path="warehouse" element={<WarehouseManagement />} />
              <Route path="stores" element={<StoresView />} />
              <Route path="stores/:id" element={<StoresView />} />
              {/* Field Van Stock & Multi-Location Subsystem Admin Routes */}
              <Route path="van-stock" element={<VanStockManagement />} />
              <Route path="van-stock/transfer" element={<VanStockTransferDashboard />} />
              <Route path="van-stock/confirm/:vanId" element={<VanStockRepView />} />
              <Route path="sales-persons" element={<SalesPersonsView />} />
              <Route path="routes" element={<RoutesView />} />
              <Route path="full-report" element={<ReportView />} />
              <Route path="settings" element={<SettingsView />} />
              <Route path="settings/users" element={<SettingsView />} />
            </Route>
            {/* Standalone Zero-Login Public Manifest Routes outside admin sidebar chrome */}
            <Route path="/share/van-manifest" element={<VanStockShareView />} />
            <Route path="/share/van-manifest/:manifestNo" element={<VanStockShareView />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </HydrationGate>
      ) : (
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          {/* Standalone Zero-Login Public Manifest Routes accessible without login */}
          <Route path="/share/van-manifest" element={<VanStockShareView />} />
          <Route path="/share/van-manifest/:manifestNo" element={<VanStockShareView />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      )}
    </>
  );
}
