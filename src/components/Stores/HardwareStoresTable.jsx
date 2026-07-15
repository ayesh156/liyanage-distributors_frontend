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

  const routeOptions = useMemo(() => [
    { value: 'all', label: 'All Routes' },
    ...routes.map((r) => ({
      value: String(r.id),
      label: r.name,
      count: shops.filter((s) => String(s.routeId) === String(r.id)).length,
    })),
  ], [routes, shops]);

  // ── Filtered data (full set, used for aggregate calculations) ──
  const filtered = useMemo(() => {
    let result = shops;
    if (routeFilter !== 'all') result = result.filter((s) => String(s.routeId) === String(routeFilter));
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter((s) =>
        s.name.toLowerCase().includes(q) ||
        s.contact.toLowerCase().includes(q) ||
        String(s.route || '').toLowerCase().includes(q)
      );
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
      {/* Toolbar */}
      <div className="p-4 sm:p-5 border-b border-gray-200 dark:border-slate-700">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
            {/* Search */}
            <div className="relative">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search stores..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input-field pl-9 w-full sm:w-60"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  <X size={13} />
                </button>
              )}
            </div>
            {/* Route Filter */}
            <div className="w-full sm:w-44">
              <SmartCombobox
                value={routeFilter}
                onSelect={(opt) => setRouteFilter(opt.value)}
                options={routeOptions}
                placeholder="Filter by route..."
                dropdownMaxHeight="max-h-48"
              />
            </div>
          </div>
          <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
            <div className="text-xs text-gray-500 dark:text-slate-400">
              <span className="text-gray-900 dark:text-slate-100 font-semibold">{filtered.length}</span> stores
              <span className="mx-2 text-gray-300 dark:text-slate-600">|</span>
              <span className="text-accent-600 dark:text-accent-400 font-semibold">{formatCurrency(totalOutstanding)}</span> outstanding
            </div>
            {onAddShop && (
              <button onClick={onAddShop} className="btn-primary text-xs">
                <Plus size={14} /> Add Store
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="px-5 pb-4">
        <div className="overflow-x-auto">
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
                const totalPaid   = Number(shop.totalPaid ?? shop.totalPayments ?? 0);
                const displayStoreCode = shop.storeCode || `STR-LEGACY-${String(shop.id || '').slice(0, 8)}`;
                return (
                  <tr key={shop.id} className="group table-body-row">
                    <td className="table-cell font-mono text-xs text-gray-400 dark:text-slate-500">
                      {displayStoreCode}
                    </td>
                    <td className="table-cell">
                      <button
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
                        <span className="truncate">{shop.route || 'No route assigned'}</span>
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
                            onClick={() => onEditShop(shop)}
                            className="p-1.5 rounded-lg hover:bg-blue-50 text-gray-400 hover:text-blue-600 transition-all dark:hover:bg-blue-900/20 dark:hover:text-blue-400"
                            title="Edit Store"
                          >
                            <Edit3 size={14} />
                          </button>
                        )}
                        <button
                          onClick={() => onViewInvoiceHistory(shop.id)}
                          className="p-1.5 rounded-lg hover:bg-accent-50 text-gray-400 hover:text-accent-600 transition-all dark:hover:bg-accent-900/20 dark:hover:text-accent-400"
                          title="View Transactions"
                        >
                          <ChevronRight size={14} />
                        </button>
                        {onDeleteShop && (
                          <button
                            onClick={() => onDeleteShop(shop)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 cursor-pointer transition-colors dark:text-slate-500 dark:hover:text-red-400"
                            title="Delete Store"
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