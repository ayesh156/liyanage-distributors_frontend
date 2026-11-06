/**
 * @file RouteManager.jsx
 * @description Master Route Manager with responsive dual-mode layout:
 * - Desktop: Full tabular view (>=640px) with ID, badges, area, schedule, stores count, actions
 * - Mobile: Clean card view (<640px) eliminating horizontal clipping with touch-friendly actions
 */

import { useState, useMemo } from 'react';
import { Search, Route, Map, CalendarDays, Plus, Edit3, Trash2, X, Store } from 'lucide-react';
import useAppStore from '../../hooks/useAppStore';
import AddRouteModal from '../Stores/AddRouteModal';
import DeleteConfirmModal from '../ui/DeleteConfirmModal';

const ROUTE_BADGE = {
  Morawaka:      'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-700',
  Akuressa:      'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-700',
  Deniyaya:      'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-700',
  Urubokka:      'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-700',
  Kamburupitiya: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-900/30 dark:text-rose-300 dark:border-rose-700',
  Kotapola:      'bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-900/30 dark:text-cyan-300 dark:border-cyan-700',
  Hakmana:       'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-300 dark:border-orange-700',
};

const DAY_BADGE = {
  Monday:    'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-700',
  Tuesday:   'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-700',
  Wednesday: 'bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-900/30 dark:text-cyan-300 dark:border-cyan-700',
  Thursday:  'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-700',
  Friday:    'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-700',
  Saturday:  'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-900/30 dark:text-rose-300 dark:border-rose-700',
  Sunday:    'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-700',
};

export default function RouteManager() {
  const routes         = useAppStore((s) => s.routes);
  const addRoute       = useAppStore((s) => s.addRoute);
  const updateRoute    = useAppStore((s) => s.updateRoute);
  const deleteRoute    = useAppStore((s) => s.deleteRoute);

  const [searchQuery,     setSearchQuery]     = useState('');
  const [showModal,       setShowModal]       = useState(false);
  const [editingRoute,    setEditingRoute]    = useState(null);

  // Delete confirm state
  const [deleteTarget, setDeleteTarget] = useState(null); // { id, name }

  // Compute shop count per route
  const shops          = useAppStore((s) => s.shops);
  const routeShopCount = useMemo(() => {
    const counts = {};
    routes.forEach((r) => { counts[r.name] = 0; });
    shops.forEach((s) => {
      if (counts[s.route] !== undefined) counts[s.route]++;
    });
    return counts;
  }, [routes, shops]);

  // Filtered routes
  const filteredRoutes = useMemo(() => {
    if (!searchQuery.trim()) return routes;
    const q = searchQuery.toLowerCase();
    return routes.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        (r.description && r.description.toLowerCase().includes(q)),
    );
  }, [routes, searchQuery]);

  // ── CRUD handlers ─────────────────────────────────────────────

  const handleSave = async (data) => {
    if (data.id) await updateRoute(data.id, data);
    else await addRoute(data);
    setShowModal(false);
    setEditingRoute(null);
  };

  const handleEdit = (route) => {
    setEditingRoute(route);
    setShowModal(true);
  };

  const handleDeleteRequest = (route) => {
    setDeleteTarget({ id: route.id, name: route.name });
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    await deleteRoute(deleteTarget.id);
    setDeleteTarget(null);
  };

  const handleAdd = () => {
    setEditingRoute(null);
    setShowModal(true);
  };

  const totalAssignedStores = filteredRoutes.reduce((sum, r) => sum + (routeShopCount[r.name] || 0), 0);

  return (
    <>
      <div className="screen-content print:hidden">
        <div className="glass-card overflow-hidden">
          {/* Toolbar */}
          <div className="p-3.5 sm:p-5 border-b border-gray-200 dark:border-slate-700">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2 w-full sm:w-auto">
                {/* Search */}
                <div className="relative flex-1 sm:flex-initial">
                  <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search routes..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="input-field pl-9 w-full sm:w-60 text-xs sm:text-sm"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                    >
                      <X size={13} />
                    </button>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2.5 w-full sm:w-auto justify-between sm:justify-end">
                <div className="text-xs text-gray-500 dark:text-slate-400">
                  <span className="text-gray-900 dark:text-slate-100 font-semibold">{filteredRoutes.length}</span> routes
                </div>
                <button
                  type="button"
                  onClick={handleAdd}
                  className="btn-primary text-xs whitespace-nowrap cursor-pointer active:scale-95"
                >
                  <Plus size={14} />
                  <span className="hidden sm:inline">Add Route</span>
                  <span className="sm:hidden">+ Route</span>
                </button>
              </div>
            </div>
          </div>

          {/* Desktop Table View (>=640px) */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="table-header-row">
                  <th className="table-header">ID</th>
                  <th className="table-header">Route Name</th>
                  <th className="table-header">Area Coverage</th>
                  <th className="table-header">Delivery Schedule</th>
                  <th className="table-header text-center">Stores</th>
                  <th className="table-header text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="table-divide">
                {filteredRoutes.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-14 text-gray-500 dark:text-slate-400 text-sm">
                      <Route size={32} className="mx-auto mb-2 text-gray-300 dark:text-slate-600" />
                      {searchQuery ? 'No routes match your search' : 'No routes available'}
                    </td>
                  </tr>
                ) : (
                  filteredRoutes.map((route) => {
                    const routeBadge = ROUTE_BADGE[route.name] || 'bg-gray-100 text-gray-500 border-gray-200 dark:bg-slate-700 dark:text-slate-300';
                    const shopCount = routeShopCount[route.name] || 0;
                    return (
                      <tr key={route.id} className="group table-body-row">
                        <td className="table-cell font-mono text-xs text-gray-400 dark:text-slate-500">
                          #{String(route.id).padStart(3, '0')}
                        </td>
                        <td className="table-cell">
                          <span className={`badge border font-semibold ${routeBadge}`}>
                            <Route size={12} className="inline mr-1.5" />
                            {route.name}
                          </span>
                        </td>
                        <td className="table-cell">
                          <span className="text-sm text-gray-600 dark:text-slate-300 flex items-center gap-1.5">
                            <Map size={12} className="text-gray-400 flex-shrink-0" />
                            {route.description || '—'}
                          </span>
                        </td>
                        <td className="table-cell">
                          <div className="flex flex-wrap gap-1">
                            {route.routeDates && route.routeDates.length > 0 ? (
                              route.routeDates.map((day) => (
                                <span key={day} className={`badge border text-[10px] ${DAY_BADGE[day] || 'bg-gray-100 text-gray-500 border-gray-200'}`}>
                                  <CalendarDays size={9} className="inline mr-1" />
                                  {day.slice(0, 3)}
                                </span>
                              ))
                            ) : (
                              <span className="text-xs text-gray-400">—</span>
                            )}
                          </div>
                        </td>
                        <td className="table-cell text-center">
                          <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-semibold ${
                            shopCount > 0
                              ? 'bg-accent-50 text-accent-700 dark:bg-accent-900/30 dark:text-accent-300'
                              : 'bg-gray-100 text-gray-400 dark:bg-slate-700 dark:text-slate-400'
                          }`}>
                            {shopCount}
                          </span>
                        </td>
                        <td className="table-cell text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleEdit(route)}
                              className="p-1.5 rounded-lg hover:bg-blue-50 text-gray-400 hover:text-blue-600 transition-all dark:hover:bg-blue-900/20 dark:hover:text-blue-400 cursor-pointer"
                              title="Edit Route"
                            >
                              <Edit3 size={14} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteRequest(route)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 cursor-pointer transition-colors dark:text-slate-500 dark:hover:text-red-400"
                              title="Delete Route"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
              {filteredRoutes.length > 0 && (
                <tfoot>
                  <tr className="table-footer-row">
                    <td colSpan={4} className="table-cell text-xs text-gray-500 font-semibold uppercase tracking-wider dark:text-slate-400">
                      Total ({filteredRoutes.length} routes)
                    </td>
                    <td className="table-cell text-center font-semibold text-sm text-accent-600 dark:text-accent-400">
                      {totalAssignedStores}
                    </td>
                    <td />
                  </tr>
                </tfoot>
              )}
            </table>
          </div>

          {/* Mobile Cards View (<640px) */}
          <div className="sm:hidden divide-y divide-gray-100 dark:divide-slate-800">
            {filteredRoutes.length === 0 ? (
              <div className="text-center py-12 px-4 text-gray-500 dark:text-slate-400 text-xs">
                <Route size={28} className="mx-auto mb-2 text-gray-300 dark:text-slate-600" />
                {searchQuery ? 'No routes match your search' : 'No routes available'}
              </div>
            ) : (
              filteredRoutes.map((route) => {
                const routeBadge = ROUTE_BADGE[route.name] || 'bg-gray-100 text-gray-500 border-gray-200 dark:bg-slate-700 dark:text-slate-300';
                const shopCount = routeShopCount[route.name] || 0;

                return (
                  <div key={route.id} className="p-3.5 space-y-2.5 bg-white dark:bg-slate-800/60">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-[11px] text-gray-400 dark:text-slate-500 font-semibold">
                          #{String(route.id).padStart(3, '0')}
                        </span>
                        <span className={`badge border text-xs font-bold py-0.5 px-2.5 ${routeBadge}`}>
                          <Route size={12} className="inline mr-1" />
                          {route.name}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${
                          shopCount > 0
                            ? 'bg-accent-50 text-accent-700 dark:bg-accent-900/30 dark:text-accent-300 border border-accent-200 dark:border-accent-800/50'
                            : 'bg-gray-100 text-gray-500 dark:bg-slate-700 dark:text-slate-400'
                        }`}>
                          <Store size={11} />
                          <span>{shopCount} stores</span>
                        </span>
                      </div>
                    </div>

                    {/* Area Coverage */}
                    <div className="text-xs text-gray-600 dark:text-slate-300 flex items-start gap-1.5">
                      <Map size={13} className="text-gray-400 flex-shrink-0 mt-0.5" />
                      <span className="break-words">{route.description || 'No specific area description'}</span>
                    </div>

                    {/* Schedule Badges */}
                    <div className="flex items-center gap-1 flex-wrap pt-0.5">
                      <span className="text-[10px] text-gray-400 dark:text-slate-500 uppercase font-semibold mr-1">
                        Days:
                      </span>
                      {route.routeDates && route.routeDates.length > 0 ? (
                        route.routeDates.map((day) => (
                          <span
                            key={day}
                            className={`badge border text-[10px] px-1.5 py-0.5 ${
                              DAY_BADGE[day] || 'bg-gray-100 text-gray-500 border-gray-200'
                            }`}
                          >
                            <CalendarDays size={9} className="inline mr-1" />
                            {day.slice(0, 3)}
                          </span>
                        ))
                      ) : (
                        <span className="text-[11px] text-gray-400">No scheduled days</span>
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100 dark:border-slate-700/60">
                      <button
                        type="button"
                        onClick={() => handleEdit(route)}
                        className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border border-blue-200 dark:border-blue-800/40 cursor-pointer"
                      >
                        <Edit3 size={13} />
                        <span>Edit</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteRequest(route)}
                        className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-200 dark:border-rose-800/40 cursor-pointer"
                      >
                        <Trash2 size={13} />
                        <span>Delete</span>
                      </button>
                    </div>
                  </div>
                );
              })
            )}

            {filteredRoutes.length > 0 && (
              <div className="p-3 bg-slate-50 dark:bg-slate-900/60 flex items-center justify-between text-xs text-gray-600 dark:text-slate-400">
                <span>Total ({filteredRoutes.length} routes)</span>
                <span className="font-bold text-accent-600 dark:text-accent-400 font-mono">
                  {totalAssignedStores} Assigned Stores
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Add/Edit Route Modal */}
      <AddRouteModal
        isOpen={showModal}
        onClose={() => { setShowModal(false); setEditingRoute(null); }}
        onSave={handleSave}
        editRoute={editingRoute}
      />

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeleteConfirm}
        entityType="route"
        entityName={deleteTarget?.name || ''}
        extraMessage={
          deleteTarget && routeShopCount[deleteTarget.name] > 0
            ? `This route has ${routeShopCount[deleteTarget.name]} store(s) assigned to it. They will need to be reassigned.`
            : null
        }
      />
    </>
  );
}
