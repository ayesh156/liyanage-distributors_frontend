import { useState, useEffect, useMemo } from 'react';
import { X, Store, MapPin, Phone, Map, Route } from 'lucide-react';
import { toast } from 'react-toastify';
import RouteSearchSelect from '../ui/RouteSearchSelect';
import SalesPersonSearchSelect from '../ui/SalesPersonSearchSelect';
import useAppStore from '../../hooks/useAppStore';

function emptyForm() {
  return { name: '', route: '', routeId: null, contact: '', address: '', salesPerson: '', salesPersonId: null, salesPersonBackendId: null };
}

export default function AddShopModal({ isOpen, onClose, onSave, routes, editShop }) {
  const [form, setForm] = useState(emptyForm());
  const [showNameSuggestions, setShowNameSuggestions] = useState(false);
  const shops = useAppStore((s) => s.shops || []);
  const salesPersons = useAppStore((s) => s.salesPersons || []);
  const isEditing = !!editShop;

  const normalizedNameQuery = String(form.name || '').trim().toLowerCase();

  const scoredStoreSuggestions = useMemo(() => {
    if (!normalizedNameQuery) return [];

    const hardwareHints = ['hardware', 'hardwares', 'hardwares', 'electrical', 'electric', 'tools'];

    const scoreStore = (store) => {
      const name = String(store?.name || '').trim().toLowerCase();
      const routeName = String(store?.route || '').trim().toLowerCase();
      const isExact = name === normalizedNameQuery;
      const isPrefix = name.startsWith(normalizedNameQuery);
      const hasQuery = name.includes(normalizedNameQuery) || routeName.includes(normalizedNameQuery);
      const hasHardwareHint = hardwareHints.some((hint) => name.includes(hint));

      if (!hasQuery) return -1;

      let score = 0;
      if (isExact) score += 500;
      if (isPrefix) score += 300;
      if (hasHardwareHint) score += 150;
      score += Math.max(0, 60 - Math.abs(name.length - normalizedNameQuery.length));
      return score;
    };

    return shops
      .filter((store) => !(isEditing && String(store.id) === String(editShop?.id)))
      .map((store) => ({ store, score: scoreStore(store) }))
      .filter((entry) => entry.score >= 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 8)
      .map((entry) => entry.store);
  }, [shops, normalizedNameQuery, isEditing, editShop?.id]);

  // Sync form when editShop changes or modal opens
  useEffect(() => {
    if (isOpen) {
      if (editShop) {
        const defaultRepId = editShop?.salesPersonId || editShop?.salesPerson?.id || null;
        const matchedRep = defaultRepId
          ? salesPersons.find((rep) => String(rep?.id) === String(defaultRepId))
          : null;
        const resolvedSalesPersonName =
          matchedRep?.name ||
          (typeof editShop.salesPerson === 'string' ? editShop.salesPerson : editShop.salesPerson?.name) ||
          editShop.salesPersonName ||
          '';

        setForm({
          name: editShop.name || '',
          route: editShop.route || '',
          routeId: editShop.routeId != null ? String(editShop.routeId) : null,
          contact: editShop.contact || '',
          address: editShop.address || '',
          salesPerson: resolvedSalesPersonName,
          salesPersonId: defaultRepId ? String(defaultRepId) : null,
          salesPersonBackendId: String(editShop.salesPersonBackendId || defaultRepId || '') || null,
        });
      } else {
        setForm(emptyForm());
      }
    }
  }, [isOpen, editShop, salesPersons]);

  useEffect(() => {
    if (!isOpen) setShowNameSuggestions(false);
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    const normalizedName = String(form.name || '').trim().toLowerCase();
    if (!normalizedName) return;

    const duplicateStore = shops.find((store) => {
      if (isEditing && String(store.id) === String(editShop?.id)) return false;
      return String(store?.name || '').trim().toLowerCase() === normalizedName;
    });

    if (duplicateStore) {
      toast.error('Store name already exists');
      return;
    }

    onSave(isEditing ? { ...form, id: editShop.id } : form);
    onClose();
  };

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
      <div
        className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="relative w-full sm:max-w-lg max-h-[92vh] sm:max-h-[85vh] bg-white border-t sm:border border-gray-200 rounded-t-3xl sm:rounded-2xl shadow-2xl dark:bg-slate-800 dark:border-slate-700 flex flex-col pb-safe overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-gray-200 dark:border-slate-700 sticky top-0 bg-white dark:bg-slate-800 z-10">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-accent-100 dark:bg-accent-900/40 flex items-center justify-center">
              <Store size={16} className="text-accent-600 dark:text-accent-400" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-gray-900 dark:text-slate-100">
                {isEditing ? 'Edit Hardware Store' : 'Register New Store'}
              </h3>
              {isEditing && (
                <p className="text-xs text-gray-500 mt-0.5 font-mono">#{String(editShop.id).padStart(3, '0')}</p>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 dark:hover:bg-slate-700 transition-colors"
            aria-label="Close modal"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 sm:p-5 space-y-4 overflow-y-auto flex-1">
          {/* Shop Name */}
          <div>
            <label className="input-label">
              <Store size={13} className="inline mr-1 text-gray-400" /> Shop Name <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder="e.g., Shanthi Electricals"
                value={form.name}
                onFocus={() => setShowNameSuggestions(true)}
                onBlur={() => setTimeout(() => setShowNameSuggestions(false), 120)}
                onChange={(e) => {
                  setForm((f) => ({ ...f, name: e.target.value }));
                  setShowNameSuggestions(true);
                }}
                className="input-field"
                required
                autoFocus
              />
              {showNameSuggestions && scoredStoreSuggestions.length > 0 && (
                <div className="absolute left-0 top-full z-50 mt-1 w-full overflow-hidden rounded-xl border border-gray-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-800">
                  {scoredStoreSuggestions.map((store) => (
                    <button
                      key={store.id}
                      type="button"
                      onMouseDown={(event) => {
                        event.preventDefault();
                        const matchedRep = salesPersons.find((rep) => {
                          const repName = String(rep?.name || '').trim().toLowerCase();
                          const storeRepName = String(store?.salesPersonName || store?.salesPerson?.name || '').trim().toLowerCase();
                          return repName && storeRepName && repName === storeRepName;
                        });

                        setForm((f) => ({
                          ...f,
                          name: store.name || '',
                          route: store.route || f.route,
                          routeId: store.routeId != null ? String(store.routeId) : f.routeId,
                          contact: store.contact || store.phone || f.contact,
                          address: store.address || f.address,
                          salesPerson: store.salesPersonName || store.salesPerson?.name || f.salesPerson,
                          salesPersonId: matchedRep?.id ? String(matchedRep.id) : f.salesPersonId,
                          salesPersonBackendId: matchedRep?.backendId || matchedRep?.id || f.salesPersonBackendId,
                        }));
                        setShowNameSuggestions(false);
                      }}
                      className="w-full px-3 py-2.5 text-left transition-colors hover:bg-gray-50 dark:hover:bg-slate-700/60"
                    >
                      <p className="text-sm font-semibold text-gray-900 dark:text-slate-100">{store.name}</p>
                      <p className="text-xs text-gray-500 dark:text-slate-400">{store.route || 'No route'}{store.contact ? ` • ${store.contact}` : ''}</p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Route — Premium Floating Search Select */}
          <div>
            <label className="input-label">
              <Route size={13} className="inline mr-1 text-gray-400" /> Route / Area
            </label>
            <RouteSearchSelect
              value={form.routeId}
              onSelect={(val) => {
                const selectedRoute = routes.find((route) => String(route.id) === String(val));
                setForm((f) => ({
                  ...f,
                  routeId: String(val || '').trim() || null,
                  route: selectedRoute?.name || '',
                }));
              }}
              placeholder="Search & select a route..."
              dropdownPosition="top"
            />
          </div>

          {/* Contact — single field */}
          <div>
            <label className="input-label">
              <Phone size={13} className="inline mr-1 text-gray-400" /> Phone
            </label>
            <input type="text" placeholder="071-XXXXXXX"
              value={form.contact} onChange={set('contact')}
              className="input-field" />
          </div>

          {/* Sales Person — Premium Search Select Only */}
          <div>
            <label className="input-label">
              <Store size={13} className="inline mr-1 text-gray-400" /> Sales Person
            </label>
            <SalesPersonSearchSelect
              value={form.salesPerson}
              onSelect={(val) => {
                const matched = salesPersons.find(
                  (rep) => String(rep.name).trim().toLowerCase() === String(val).trim().toLowerCase(),
                );
                setForm((f) => ({
                  ...f,
                  salesPerson: val,
                  salesPersonId: matched?.id || null,
                  salesPersonBackendId: matched?.backendId || matched?.id || null,
                }));
              }}
              placeholder="Search & select a sales person..."
              dropdownPosition="top"
            />
          </div>

          <div>
            <label className="input-label">
              <Map size={13} className="inline mr-1 text-gray-400" /> Address
            </label>
            <textarea placeholder="e.g., 23 Galle Rd, Morawaka"
              value={form.address} onChange={set('address')}
              className="input-field resize-none" rows={2} />
          </div>

          {/* Sticky Action buttons */}
          <div className="sticky bottom-0 bg-white dark:bg-slate-800 pt-3 pb-1 border-t sm:border-t-0 border-gray-100 dark:border-slate-700/60 flex flex-col-reverse sm:flex-row gap-2 sm:gap-3">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary h-11 sm:h-10 w-full sm:flex-1"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary h-11 sm:h-10 w-full sm:flex-1 font-semibold"
            >
              {isEditing ? 'Save Changes' : 'Register Store'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}