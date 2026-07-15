import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { Loader2 } from 'lucide-react';
import AddShopModal from './AddShopModal';
import AddInvoiceModal from './AddInvoiceModal';
import HardwareStoresTable from './HardwareStoresTable';
import InvoiceHistory from './InvoiceHistory';
import InvoicePrintView from './InvoicePrintView';
import OutstandingStatementPrintView from './OutstandingStatementPrintView';
import PrintFullReport from '../Report/PrintFullReport';
import DeleteConfirmModal from '../ui/DeleteConfirmModal';
import useAppStore from '../../hooks/useAppStore';

/**
 * StoresManager — master view controller for the Stores domain.
 *
 * HYDRATION GUARD:
 * ─────────────────────────────────────────────────────────────────────────────
 * On a hard browser refresh at /stores/:id, React renders this component
 * synchronously BEFORE the useEffect in App.jsx fires setSelectedShopId().
 * This means on the first render: urlShopId is present but selectedShopId is
 * still null and selectedShop is undefined.
 *
 * Fix: viewMode is initialized from urlShopId (passed directly from the URL
 * param) on mount — using a lazy useState initializer that reads the prop.
 * This guarantees the InvoiceHistory shell renders immediately, even before
 * the store has hydrated selectedShop. The InvoiceHistory component itself
 * renders a skeleton loader inside the table content area if `shop` is null,
 * keeping the full header/button architecture persistent.
 *
 * RACE-CONDITION SAFETY:
 * The `isHydrating` flag is true ONLY when ALL three conditions hold:
 *   1. viewMode === 'invoiceHistory' (URL has a store ID)
 *   2. urlShopId is non-null
 *   3. selectedShop is null AND the global app store hasn't finished
 *      initialization yet (useAppStore.initialized === false).
 * Once initialized is true but selectedShop is still null, we know the
 * store ID genuinely doesn't resolve → render empty table, not a spinner.
 * ─────────────────────────────────────────────────────────────────────────────
 */
export default function StoresManager({
  shops,
  allShops,
  shopOutstanding,
  selectedShopId,
  setSelectedShopId,
  selectedShop,
  selectedShopTransactions,
  selectedShopOutstanding,
  searchQuery,
  setSearchQuery,
  addShop,
  updateShop,
  deleteShop,
  addInvoice,
  addTransaction,
  deleteTransaction,
  updateTransaction,
  routes,
  urlShopId,   // ← raw URL param passed synchronously from App.jsx
}) {
  const navigate = useNavigate();
  const appInitialized = useAppStore((s) => s.initialized);
  const refreshStoreData = useAppStore((s) => s.refresh);

  // ── viewMode — initialized synchronously from URL to prevent hydration flicker ──
  // If the URL has a shop id (urlShopId), start directly in 'invoiceHistory' view.
  // This means on hard refresh the shell never falls back to 'list'.
  const [viewMode, setViewMode] = useState(() =>
    urlShopId ? 'invoiceHistory' : 'list',
  );

  /**
   * isHydrating — true ONLY during the genuine hydration window.
   *
   * Once appInitialized is true, we know the global stores[] array has been
   * populated. If selectedShop is still null at that point, it means the URL
   * store ID doesn't match any store → we should NOT show a loading spinner,
   * but instead render an empty (or "store not found") state normally.
   */
  const isHydrating = viewMode === 'invoiceHistory'
    && urlShopId != null
    && !selectedShop
    && !appInitialized;

  // UI state
  const [showAddShop,  setShowAddShop]  = useState(false);
  const [showAddTx,    setShowAddTx]    = useState(false);
  const [editingShop,  setEditingShop]  = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  // Print state
  const [printInvoice,     setPrintInvoice]     = useState(null);
  const [printOutstanding, setPrintOutstanding] = useState(false);

  // ── Keep viewMode in sync when URL param changes via navigation ──────────
  // We use a ref to track the previous urlShopId so we only update on actual
  // URL changes, not store re-renders.
  const prevUrlShopId = useRef(urlShopId);
  const printReadyTimeoutRef = useRef(null);
  const printReadyListenerRef = useRef(null);
  useEffect(() => {
    if (prevUrlShopId.current !== urlShopId) {
      prevUrlShopId.current = urlShopId;
      setViewMode(urlShopId ? 'invoiceHistory' : 'list');
    }
  }, [urlShopId]);

  // ── Shop CRUD handlers ─────────────────────────────────────────────────

  const handleSaveShop = async (data) => {
    if (data.id) {
      await updateShop(data.id, data);
    } else {
      const createdStoreId = await addShop(data);
      if (createdStoreId) {
        setSelectedShopId(createdStoreId);
        setViewMode('invoiceHistory');
        navigate(`/stores/${createdStoreId}`);
      }
    }
    setShowAddShop(false);
    setEditingShop(null);
  };

  const handleEditShop = (shop) => {
    setEditingShop(shop || selectedShop);
    setShowAddShop(true);
  };

  const handleDeleteShopRequest = (shop) => setDeleteTarget(shop);

  const handleDeleteShopConfirm = () => {
    if (!deleteTarget) return;
    const id = deleteTarget.id;
    deleteShop(id);
    setDeleteTarget(null);
    if (selectedShopId === id) {
      setSelectedShopId(null);
      setViewMode('list');
      navigate('/stores');
    }
  };

  const handleAddShop = () => {
    setEditingShop(null);
    setShowAddShop(true);
  };

  // ── Invoice handlers ───────────────────────────────────────────────────

  const handleAddInvoice = (data) => {
    addInvoice({ ...data, shopId: selectedShopId });
    setShowAddTx(false);
  };

  const handleUpdateInvoice = (id, data) => updateTransaction(id, data);

  // ── Navigation ─────────────────────────────────────────────────────────

  const handleViewInvoiceHistory = (shopId) => {
    setSelectedShopId(shopId);
    setViewMode('invoiceHistory');
    navigate(`/stores/${shopId}`);
  };

  const handleBackFromInvoiceHistory = () => {
    setSelectedShopId(null);
    setViewMode('list');
    navigate('/stores');
  };

  // ── Print ──────────────────────────────────────────────────────────────
  // Never set theme state here. All print styling via @media print in index.css.

  const handlePrintReceipt = (transaction) => {
    setPrintInvoice(transaction);
    setPrintOutstanding(false);
    requestAnimationFrame(() => requestAnimationFrame(() => window.print()));
  };

  const handlePrintOutstanding = (shopId) => {
    const targetShopId = String(shopId);

    if (printReadyTimeoutRef.current) {
      clearTimeout(printReadyTimeoutRef.current);
      printReadyTimeoutRef.current = null;
    }
    if (printReadyListenerRef.current) {
      window.removeEventListener('statement-print-ready', printReadyListenerRef.current);
      printReadyListenerRef.current = null;
    }

    const triggerPrint = () => {
      requestAnimationFrame(() => requestAnimationFrame(() => window.print()));
    };

    const onStatementReady = (event) => {
      if (String(event?.detail?.shopId) !== targetShopId) return;

      if (printReadyTimeoutRef.current) {
        clearTimeout(printReadyTimeoutRef.current);
        printReadyTimeoutRef.current = null;
      }
      window.removeEventListener('statement-print-ready', onStatementReady);
      printReadyListenerRef.current = null;
      triggerPrint();
    };

    printReadyListenerRef.current = onStatementReady;
    window.addEventListener('statement-print-ready', onStatementReady);

    setSelectedShopId(shopId);
    setPrintInvoice(null);

    Promise.resolve(refreshStoreData())
      .catch(() => {})
      .finally(() => {
        setPrintOutstanding(true);
        // Safety fallback in case the ready event is not emitted.
        printReadyTimeoutRef.current = window.setTimeout(() => {
          if (printReadyListenerRef.current) {
            window.removeEventListener('statement-print-ready', printReadyListenerRef.current);
            printReadyListenerRef.current = null;
          }
          triggerPrint();
        }, 450);
      });
  };

  useEffect(() => {
    const handler = () => { setPrintInvoice(null); setPrintOutstanding(false); };
    window.addEventListener('afterprint', handler);
    return () => {
      window.removeEventListener('afterprint', handler);
      if (printReadyTimeoutRef.current) {
        clearTimeout(printReadyTimeoutRef.current);
      }
      if (printReadyListenerRef.current) {
        window.removeEventListener('statement-print-ready', printReadyListenerRef.current);
      }
    };
  }, []);

  // Print portal — portaled to body to escape Layout's print:hidden
  const printContent = (printOutstanding || printInvoice) && (
    <div className="print-portal-content">
      <style>{`
        .print-portal-content { display: none !important; }
        @media print {
          .print-portal-content { display: block !important; }
          body > #root, header, aside, .screen-content, .no-print { display: none !important; }
        }
      `}</style>
      {printOutstanding && selectedShop && (
        <OutstandingStatementPrintView
          shop={selectedShop}
          transactions={selectedShopTransactions}
          outstanding={selectedShopOutstanding}
          currentDate={new Date().toISOString().split('T')[0]}
        />
      )}
      {printInvoice && selectedShop && (
        <InvoicePrintView shop={selectedShop} transaction={printInvoice} />
      )}
    </div>
  );

  // ── Skeleton header — rendered while store is hydrating on hard refresh ──
  // Preserves the full layout shell (back button, shop name area, action
  // buttons, column headers) while the table body shows a spinner.
  const hydrationShopPlaceholder = isHydrating ? {
    id: urlShopId,
    name: '···',
    route: '···',
    contact: '···',
  } : null;

  return (
    <>
      <div className="screen-content w-full min-w-full px-5 print:hidden">

        {/* ── Invoice History view — guards against hydration gap ──────── */}
        {viewMode === 'invoiceHistory' ? (
          <>
            <InvoiceHistory
              // During hydration, pass placeholder shop so shell stays intact.
              // InvoiceHistory renders a spinner in the table body when
              // isHydrating is true. Once initialized, even if selectedShop
              // is null (store not found), an empty table renders normally.
              shop={selectedShop || hydrationShopPlaceholder}
              transactions={selectedShopTransactions}
              outstanding={selectedShopOutstanding}
              isHydrating={isHydrating}
              onBack={handleBackFromInvoiceHistory}
              onAddTransaction={() => setShowAddTx(true)}
              onUpdateInvoice={handleUpdateInvoice}
              onDeleteTransaction={deleteTransaction}
              onPrintReceipt={handlePrintReceipt}
              onPrintOutstanding={handlePrintOutstanding}
              onEditShop={() => handleEditShop(selectedShop)}
            />
            {/* AddInvoiceModal always mounted in invoiceHistory mode */}
            <AddInvoiceModal
              isOpen={showAddTx}
              onClose={() => setShowAddTx(false)}
              onSave={handleAddInvoice}
              shopName={selectedShop?.name}
              shopProfile={selectedShop}
              shopSalesPerson={selectedShop?.salesPerson?.name || selectedShop?.salesPersonName || selectedShop?.salesPerson}
            />
          </>
        ) : (
          /* ── Store List view ─────────────────────────────────── */
          <>
            <HardwareStoresTable
              shops={shops}
              shopOutstanding={shopOutstanding}
              onViewInvoiceHistory={handleViewInvoiceHistory}
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              onAddShop={handleAddShop}
              onEditShop={handleEditShop}
              onDeleteShop={handleDeleteShopRequest}
            />
            <AddShopModal
              isOpen={showAddShop}
              onClose={() => { setShowAddShop(false); setEditingShop(null); }}
              onSave={handleSaveShop}
              routes={routes}
              editShop={editingShop}
            />
          </>
        )}
      </div>

      {/* Edit Shop modal — available from InvoiceHistory header */}
      {viewMode === 'invoiceHistory' && (
        <AddShopModal
          isOpen={showAddShop}
          onClose={() => { setShowAddShop(false); setEditingShop(null); }}
          onSave={handleSaveShop}
          routes={routes}
          editShop={editingShop}
        />
      )}

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeleteShopConfirm}
        entityType="store"
        entityName={deleteTarget?.name || ''}
        extraMessage={
          deleteTarget
            ? `All transactions and invoice history for this store will also be permanently removed.`
            : null
        }
      />

      {/* Print portal */}
      {printContent && createPortal(printContent, document.body)}
    </>
  );
}