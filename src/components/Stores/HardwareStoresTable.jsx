import { useState, useMemo, useEffect } from 'react';
import { Search, Store, Phone, MapPin, Plus, Edit3, Trash2, ChevronRight, X } from 'lucide-react';
import DeleteConfirmModal from '../ui/DeleteConfirmModal';
import SmartCombobox from '../ui/SmartCombobox';
import Pagination from '../ui/Pagination';
import useAppStore from '../../hooks/useAppStore';

const formatCurrency = (val) => `Rs. ${Number(val || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function HardwareStoresTable({
  shops,
  shopOutstanding,
  onViewInvoiceHistory,
  searchQuery,
  setSearchQuery,
  onAddShop,
  onEditShop,
  onDeleteShop,
  onUpdateStore,
}) {
  const routes = useAppStore((s) => s.routes);
  const [routeFilter, setRouteFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(15);

  // Reset to page 1 whenever filters or rows-per-page change
  useEffect(() => { setCurrentPage(1); }, [searchQuery, routeFilter, rowsPerPage]);

  /**
   * Derive route filter options with dynamic count aggregations.
   * Compares store.routeId or store.route?.id against route.id to eliminate
   * legacy string-matching discrepancies.
   */
  const routeOptions = useMemo(() => [
    { value: 'all', label: 'All Routes' },
    ...routes.map((r) => ({
      value: String(r.id),
      label: r.name,
      count: shops.filter((s) => {
        const sRouteId = s.routeId != null ? s.routeId : (s.route?.id != null ? s.route.id : null);
        return sRouteId != null && String(sRouteId) === String(r.id);
      }).length,
    })),
  ], [routes, shops]);

  const filtered = useMemo(() => {
    let result = shops;

    // 1. Relational Route Filter (matches store.routeId or store.route?.id)
    if (routeFilter !== 'all') {
      result = result.filter((s) => {
        const sRouteId = s.routeId != null ? s.routeId : (s.route?.id != null ? s.route.id : null);
        return sRouteId != null && String(sRouteId) === String(routeFilter);
      });
    }

    // 2. Ultra-Smart Flexible Search Filter
    if (searchQuery && searchQuery.trim()) {
      const rawQuery = searchQuery.trim().toLowerCase();

      // Normalizer: strips zero-width/invisible unicode chars and folds accented
      // characters to their base letter (e.g. "é" -> "e") before any other processing.
      // Guards against mobile-keyboard artifacts (NBSP, ZWSP, smart punctuation)
      // that survive a plain [^a-z0-9] strip because they aren't literal symbols.
      const normalize = (str) =>
        String(str || '')
          .normalize('NFKD')
          .replace(/[\u0300-\u036f]/g, '')       // strip combining diacritics after NFKD split
          .replace(/[\u200B-\u200D\uFEFF]/g, '') // zero-width space/joiner/BOM
          .replace(/\u00A0/g, ' ');              // non-breaking space -> regular space

      // Helper A: Pure Alphanumeric Cleaner (Strips ALL symbols, spaces, dots, &)
      const cleanAlpha = (str) => normalize(str).toLowerCase().replace(/[^a-z0-9]/g, '');

      // Helper B: Word Tokenizer (Splits by dots, spaces, hyphens, ampersands)
      const tokenize = (str) =>
        normalize(str)
          .toLowerCase()
          .split(/[\s.\-_&,]+/)
          .filter(Boolean);

      const qClean = cleanAlpha(rawQuery);
      const qTokens = tokenize(rawQuery);

      result = result.filter((s) => {
        const storeNameRaw = s.name || s.storeName || s.shopName || '';
        if (!storeNameRaw) return false;

        const nameClean = cleanAlpha(storeNameRaw);
        const nameTokens = tokenize(storeNameRaw);

        // Check 1: Direct Alphanumeric Substring Match (Handles: "g&j" -> "gj", "esse" -> "esselectronics")
        if (qClean && nameClean.includes(qClean)) {
          return true;
        }

        // Check 2: Multi-Token / Word Prefix Match (Handles: "ess.e", "g & j", "g j")
        if (qTokens.length > 0) {
          const allTokensMatched = qTokens.every((qTok) => {
            const cleanQTok = cleanAlpha(qTok);
            if (!cleanQTok) return true;
            return nameTokens.some((nTok) => {
              const cleanNTok = cleanAlpha(nTok);
              return cleanNTok.startsWith(cleanQTok) || cleanNTok.includes(cleanQTok);
            });
          });
          if (allTokensMatched) return true;
        }

        return false;
      });
    }

    return result;
  }, [shops, routeFilter, searchQuery]);


  // ── Pagination slice — compute displayed rows for the current page ──
  const paginatedStores = useMemo(() => {
    const indexOfLastRow = currentPage * rowsPerPage;
    const indexOfFirstRow = indexOfLastRow - rowsPerPage;
    return filtered.slice(indexOfFirstRow, indexOfLastRow);
  }, [filtered, currentPage, rowsPerPage]);

  const totalPages = Math.ceil(filtered.length / rowsPerPage);

  // ── Global accumulator — computes from FULL filtered dataset, NOT sliced ──
  const totalOutstanding = filtered.reduce((s, shop) => s + Math.max(0, shopOutstanding[shop.id] || 0), 0);

  return (
    <div className="glass-card overflow-hidden">
      {/* Responsive Filter & Action Toolbar */}
      <div className="p-3.5 sm:p-5 border-b border-gray-200 dark:border-slate-700">
        <div className="flex flex-col gap-3">
          {/* Top row: Fluid search and route filter inputs */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full">
            {/* Search Input */}
            <div className="relative w-full sm:flex-1 sm:min-w-[240px]">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search stores..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input-field pl-9 w-full"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  aria-label="Clear search"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-slate-200 p-0.5"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Route Filter Dropdown */}
            <div className="w-full sm:w-56 sm:flex-shrink-0">
              <SmartCombobox
                value={routeFilter}
                onSelect={(opt) => setRouteFilter(opt.value)}
                options={routeOptions}
                placeholder="Filter by route..."
                dropdownMaxHeight="max-h-48"
              />
            </div>
          </div>

          {/* Bottom row: Store summary metrics and Primary action button */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-gray-100 dark:border-slate-800">
            <div className="text-xs text-gray-500 dark:text-slate-400 flex flex-wrap items-center gap-1.5">
              <span className="text-gray-900 dark:text-slate-100 font-semibold">{filtered.length}</span> stores
              <span className="text-gray-300 dark:text-slate-600">|</span>
              <span className="text-accent-600 dark:text-accent-400 font-semibold">{formatCurrency(totalOutstanding)}</span> outstanding
            </div>

            {onAddShop && (
              <button
                type="button"
                onClick={onAddShop}
                className="btn-primary text-xs h-11 sm:h-9 w-full sm:w-auto font-semibold shadow-sm justify-center"
              >
                <Plus size={14} /> Add Store
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Mobile Responsive Card View (<640px) ─────────────────── */}
      <div className="block sm:hidden px-3 pt-3 pb-2 space-y-3">
        {filtered.length === 0 ? (
          <div className="text-center py-12 text-gray-500 dark:text-slate-400 text-sm">
            <Store size={32} className="mx-auto mb-2 text-gray-300 dark:text-slate-600" />
            No hardware stores found
          </div>
        ) : (
          <>
            {paginatedStores.map((shop) => {
              const outstanding = shopOutstanding[shop.id] || 0;
              const totalPaid = Number(shop.totalPaid ?? shop.totalPayments ?? 0);
              const displayStoreCode = shop.storeCode || `STR-LEGACY-${String(shop.id || '').slice(0, 8)}`;
              const routeDisplayName = typeof shop.route === 'string' ? shop.route : (shop.route?.name || shop.routeName || 'No route assigned');

              return (
                <div
                  key={shop.id}
                  className="p-3.5 rounded-2xl border border-gray-200/90 bg-white/90 dark:bg-slate-800/90 dark:border-slate-700/80 shadow-sm space-y-2.5 transition-all"
                >
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                        <span className="font-mono text-[10px] text-gray-400 dark:text-slate-500 font-medium">
                          {displayStoreCode}
                        </span>
                        <span className="inline-flex items-center rounded-md border border-slate-200 bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 truncate max-w-[140px]">
                          {routeDisplayName}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => onViewInvoiceHistory(shop.id)}
                        className="text-left font-bold text-accent-600 dark:text-accent-400 hover:underline text-sm leading-snug break-words"
                      >
                        {shop.name}
                      </button>
                      {shop.address && (
                        <p className="text-[11px] text-gray-500 dark:text-slate-400 mt-0.5 flex items-center gap-1 truncate">
                          <MapPin size={10} className="flex-shrink-0" />
                          <span className="truncate">{shop.address}</span>
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Phone and Outstanding Metrics */}
                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-gray-100 dark:border-slate-700/60 text-xs">
                    <div>
                      <span className="text-[10px] text-gray-400 uppercase tracking-wider block">Contact</span>
                      {shop.contact ? (
                        <a
                          href={`tel:${shop.contact}`}
                          className="font-medium text-gray-700 dark:text-slate-300 flex items-center gap-1 hover:text-accent-500 mt-0.5 truncate"
                        >
                          <Phone size={11} className="text-gray-400 flex-shrink-0" />
                          <span>{shop.contact}</span>
                        </a>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-gray-400 uppercase tracking-wider block">Outstanding</span>
                      <span
                        className={`font-mono font-bold block mt-0.5 ${
                          outstanding > 0 ? 'text-accent-600 dark:text-accent-400' : 'text-gray-400 dark:text-slate-500'
                        }`}
                      >
                        {outstanding > 0 ? formatCurrency(outstanding) : 'Cleared'}
                      </span>
                    </div>
                  </div>

                  {/* Card Footer: Total Paid and Quick Actions */}
                  <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-slate-700/60 gap-2">
                    <div className="text-xs">
                      <span className="text-[10px] text-gray-400 block">Total Paid</span>
                      <span className="font-mono text-xs text-emerald-600 dark:text-emerald-400 font-semibold">
                        {formatCurrency(totalPaid)}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {onEditShop && (
                        <button
                          type="button"
                          onClick={() => onEditShop(shop)}
                          className="p-2 rounded-xl bg-gray-100 hover:bg-blue-50 text-gray-500 hover:text-blue-600 dark:bg-slate-700/60 dark:hover:bg-blue-900/30 dark:text-slate-300 dark:hover:text-blue-400 transition-colors"
                          title="Edit Store"
                          aria-label={`Edit ${shop.name}`}
                        >
                          <Edit3 size={15} />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => onViewInvoiceHistory(shop.id)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-accent-50 hover:bg-accent-100 text-accent-700 dark:bg-accent-900/30 dark:hover:bg-accent-900/50 dark:text-accent-300 text-xs font-semibold transition-colors"
                      >
                        <span>Ledger</span>
                        <ChevronRight size={14} />
                      </button>
                      {onDeleteShop && (
                        <button
                          type="button"
                          onClick={() => onDeleteShop(shop)}
                          className="p-2 rounded-xl bg-gray-100 hover:bg-red-50 text-gray-400 hover:text-red-500 dark:bg-slate-700/60 dark:hover:bg-red-900/30 dark:text-slate-300 dark:hover:text-red-400 transition-colors"
                          title="Delete Store"
                          aria-label={`Delete ${shop.name}`}
                        >
                          <Trash2 size={15} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Mobile Subtotal Summary Card */}
            <div className="p-3 rounded-xl bg-slate-100/80 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs flex justify-between items-center font-medium">
              <span className="text-gray-600 dark:text-slate-300">Subtotal ({filtered.length} stores)</span>
              <span className="font-mono font-bold text-accent-600 dark:text-accent-400">
                {formatCurrency(totalOutstanding)}
              </span>
            </div>
          </>
        )}
      </div>

      {/* ── Desktop & Tablet Table (sm:block) ────────────────────── */}
      <div className="hidden sm:block px-5 pb-4">
        <div className="overflow-x-auto w-full scrollbar-thin">
          <table className="w-full table-auto">
            <thead>
              <tr className="table-header-row">
                <th className="table-header">ID</th>
                <th className="table-header">Store Name</th>
                <th className="table-header">Route</th>
                <th className="table-header">Phone</th>
                <th className="table-header text-right">Total Paid</th>
                <th className="table-header text-right">Outstanding</th>
                <th className="table-header text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="table-divide">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-14 text-gray-500 dark:text-slate-400 text-sm">
                    <Store size={32} className="mx-auto mb-2 text-gray-300 dark:text-slate-600" />
                    No hardware stores found
                  </td>
                </tr>
              ) : (
                paginatedStores.map((shop) => {
                  const outstanding = shopOutstanding[shop.id] || 0;
                  const totalPaid = Number(shop.totalPaid ?? shop.totalPayments ?? 0);
                  const displayStoreCode = shop.storeCode || `STR-LEGACY-${String(shop.id || '').slice(0, 8)}`;
                  const routeDisplayName = typeof shop.route === 'string' ? shop.route : (shop.route?.name || shop.routeName || 'No route assigned');
                  return (
                    <tr key={shop.id} className="group table-body-row">
                      <td className="table-cell font-mono text-xs text-gray-400 dark:text-slate-500">
                        {displayStoreCode}
                      </td>
                      <td className="table-cell">
                        <button
                          type="button"
                          onClick={() => onViewInvoiceHistory(shop.id)}
                          className="text-left hover:text-accent-500 transition-colors"
                        >
                          <span className="font-semibold text-accent-600 dark:text-accent-400 hover:underline">{shop.name}</span>
                          {shop.address && (
                            <p className="text-[10px] text-gray-500 dark:text-slate-400 mt-0.5 flex items-center gap-1">
                              <MapPin size={9} /> {shop.address}
                            </p>
                          )}
                        </button>
                      </td>
                      <td className="table-cell">
                        <span className="inline-flex max-w-full items-center rounded-md border border-slate-200 bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100">
                          <span className="truncate">{routeDisplayName}</span>
                        </span>
                      </td>
                      <td className="table-cell">
                        <span className="flex items-center gap-1.5 text-gray-600 dark:text-slate-300 text-sm">
                          <Phone size={12} className="text-gray-400 dark:text-slate-500" />
                          {shop.contact || '—'}
                        </span>
                      </td>
                      <td className="table-cell text-right font-mono text-sm text-emerald-600 dark:text-emerald-400">
                        {formatCurrency(totalPaid)}
                      </td>
                      <td className={`table-cell text-right font-mono text-sm font-semibold ${
                        outstanding > 0 ? 'text-accent-600 dark:text-accent-400' : 'text-gray-400 dark:text-slate-500'
                      }`}>
                        {outstanding > 0 ? formatCurrency(outstanding) : '—'}
                      </td>
                      <td className="table-cell text-center">
                        <div className="flex items-center justify-center gap-1">
                          {onEditShop && (
                            <button
                              type="button"
                              onClick={() => onEditShop(shop)}
                              className="p-1.5 rounded-lg hover:bg-blue-50 text-gray-400 hover:text-blue-600 transition-all dark:hover:bg-blue-900/20 dark:hover:text-blue-400"
                              title="Edit Store"
                              aria-label={`Edit ${shop.name}`}
                            >
                              <Edit3 size={14} />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => onViewInvoiceHistory(shop.id)}
                            className="p-1.5 rounded-lg hover:bg-accent-50 text-gray-400 hover:text-accent-600 transition-all dark:hover:bg-accent-900/20 dark:hover:text-accent-400"
                            title="View Transactions"
                            aria-label={`View ${shop.name} transactions`}
                          >
                            <ChevronRight size={14} />
                          </button>
                          {onDeleteShop && (
                            <button
                              type="button"
                              onClick={() => onDeleteShop(shop)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 cursor-pointer transition-colors dark:text-slate-500 dark:hover:text-red-400"
                              title="Delete Store"
                              aria-label={`Delete ${shop.name}`}
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
            {filtered.length > 0 && (
              <tfoot>
                <tr className="table-footer-row">
                  <td colSpan={4} className="table-cell text-xs text-gray-500 font-semibold uppercase tracking-wider dark:text-slate-400">
                    Subtotal ({filtered.length} stores)
                  </td>
                  <td className="table-cell text-right font-mono text-sm text-emerald-600 dark:text-emerald-400 font-semibold">
                    {formatCurrency(filtered.reduce((s, shop) => s + Number(shop.totalPaid ?? shop.totalPayments ?? 0), 0))}
                  </td>
                  <td className="table-cell text-right font-mono text-sm text-accent-600 dark:text-accent-400 font-bold">
                    {formatCurrency(totalOutstanding)}
                  </td>
                  <td />
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* Pagination Footer — conditionally rendered when data exceeds rowsPerPage */}
      {filtered.length > rowsPerPage && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          rowsPerPage={rowsPerPage}
          onPageChange={setCurrentPage}
          onRowsPerPageChange={setRowsPerPage}
        />
      )}
    </div>
  );
}
