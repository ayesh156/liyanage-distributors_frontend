/**
 * @file SalesPersonManager.jsx
 * @description Master Sales Person Manager with responsive dual-mode layout:
 * - Desktop: Tabular view (>=640px)
 * - Mobile: Structured card view (<640px) with zero horizontal clipping and full contact info
 */

import { useState, useMemo, useEffect } from 'react';
import { Search, User, Phone, Fingerprint, Mail, MapPin, Plus, Edit3, Trash2, X, Loader2, MessageCircle } from 'lucide-react';
import { toast } from 'react-toastify';
import useAppStore from '../../hooks/useAppStore';
import { openWhatsAppChat } from '../../utils/whatsapp';
import { salesPersonsApi, withPagination } from '../../services/api';
import { extractData, mapSalesPersonFromApi } from '../../services/dataMappers';
import AddSalesPersonModal from './AddSalesPersonModal';
import DeleteConfirmModal from '../ui/DeleteConfirmModal';

export default function SalesPersonManager() {
  const salesPersons    = useAppStore((s) => s.salesPersons);
  const addSalesPerson  = useAppStore((s) => s.addSalesPerson);
  const updateSalesPerson = useAppStore((s) => s.updateSalesPerson);
  const deleteSalesPerson = useAppStore((s) => s.deleteSalesPerson);

  const [loading,         setLoading]         = useState(false);
  const [searchQuery,     setSearchQuery]     = useState('');
  const [showModal,       setShowModal]       = useState(false);
  const [editingPerson,   setEditingPerson]   = useState(null);

  // Delete confirm state
  const [deleteTarget, setDeleteTarget] = useState(null);

  // Strictly fetch real data from database on mount (eliminates hardcoded dummy data)
  useEffect(() => {
    let isMounted = true;
    const fetchLiveSalesPersons = async () => {
      setLoading(true);
      try {
        const res = await salesPersonsApi.list(withPagination({}, 1, 200));
        const realData = extractData(res).map(mapSalesPersonFromApi);
        if (isMounted) {
          useAppStore.setState({ salesPersons: realData });
        }
      } catch (err) {
        console.error('Failed to fetch real sales persons from database:', err);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };
    fetchLiveSalesPersons();
    return () => {
      isMounted = false;
    };
  }, []);

  // Filtered sales persons
  const filteredPersons = useMemo(() => {
    if (!searchQuery.trim()) return salesPersons;
    const q = searchQuery.toLowerCase();
    return salesPersons.filter(
      (sp) =>
        sp.name.toLowerCase().includes(q) ||
        (sp.phone && sp.phone.toLowerCase().includes(q)) ||
        (sp.nic && sp.nic.toLowerCase().includes(q)) ||
        (sp.email && sp.email.toLowerCase().includes(q)),
    );
  }, [salesPersons, searchQuery]);

  // ── CRUD handlers ─────────────────────────────────────────────

  const handleSave = (data) => {
    if (data.id) updateSalesPerson(data.id, data);
    else addSalesPerson(data);
    setShowModal(false);
    setEditingPerson(null);
  };

  const handleEdit = (person) => {
    setEditingPerson(person);
    setShowModal(true);
  };

  const handleDeleteRequest = (person) => {
    setDeleteTarget({ id: person.id, name: person.name });
  };

  const handleDeleteConfirm = () => {
    if (!deleteTarget) return;
    deleteSalesPerson(deleteTarget.id);
    setDeleteTarget(null);
  };

  /**
   * Dispatches a WhatsApp communication directly to the selected Sales Representative.
   * Dynamically resolves the sales person's phone number and launches openWhatsAppChat.
   *
   * @param {Object} salesPerson - The selected SalesPerson object containing name and phone
   */
  const handleWhatsApp = (salesPerson) => {
    if (!salesPerson || !salesPerson.phone) {
      toast.warning(`No phone number available for ${salesPerson?.name || 'this representative'}.`);
      return;
    }

    const message = `Hello ${salesPerson.name}, this is Liyanage Distributors Management reaching out regarding your assigned stores and route operations.`;
    const whatsappUrl = openWhatsAppChat(salesPerson.phone, message);
    if (whatsappUrl) {
      toast.success(`WhatsApp launched for ${salesPerson.name} (${salesPerson.phone})`);
    } else {
      toast.error('Invalid phone number format for WhatsApp dispatch.');
    }
  };

  const handleAdd = () => {
    setEditingPerson(null);
    setShowModal(true);
  };

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
                    placeholder="Search sales persons..."
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
                  <span className="text-gray-900 dark:text-slate-100 font-semibold">{filteredPersons.length}</span> persons
                </div>
                <button
                  type="button"
                  onClick={handleAdd}
                  className="btn-primary text-xs whitespace-nowrap cursor-pointer active:scale-95"
                >
                  <Plus size={14} />
                  <span className="hidden sm:inline">Add Sales Person</span>
                  <span className="sm:hidden">+ Rep</span>
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
                  <th className="table-header">Name</th>
                  <th className="table-header">Phone</th>
                  <th className="table-header">NIC</th>
                  <th className="table-header">Email</th>
                  <th className="table-header">Address</th>
                  <th className="table-header text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="table-divide">
                {loading && salesPersons.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-14 text-gray-500 dark:text-slate-400 text-sm">
                      <Loader2 size={32} className="mx-auto mb-2 text-accent-500 animate-spin" />
                      Loading sales representatives from database...
                    </td>
                  </tr>
                ) : filteredPersons.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-14 text-gray-500 dark:text-slate-400 text-sm">
                      <User size={32} className="mx-auto mb-2 text-gray-300 dark:text-slate-600" />
                      {searchQuery ? 'No sales persons match your search' : 'No sales representatives found in database'}
                    </td>
                  </tr>
                ) : (
                  filteredPersons.map((person) => (
                    <tr key={person.id} className="group table-body-row">
                      <td className="table-cell font-mono text-xs text-gray-400 dark:text-slate-500">
                        #{String(person.id).padStart(3, '0')}
                      </td>
                      <td className="table-cell">
                        <div className="flex items-center gap-2">
                          <span className="w-7 h-7 rounded-full bg-orange-100 dark:bg-orange-900/40 flex items-center justify-center text-orange-600 dark:text-orange-400 font-bold text-xs flex-shrink-0">
                            {person.name.charAt(0)}
                          </span>
                          <span className="text-sm font-medium text-gray-900 dark:text-slate-100">
                            {person.name}
                          </span>
                        </div>
                      </td>
                      <td className="table-cell">
                        <span className="text-sm text-gray-600 dark:text-slate-300 flex items-center gap-1.5">
                          <Phone size={12} className="text-gray-400 flex-shrink-0" />
                          {person.phone || '—'}
                        </span>
                      </td>
                      <td className="table-cell">
                        <span className="text-sm text-gray-600 dark:text-slate-300 flex items-center gap-1.5">
                          <Fingerprint size={12} className="text-gray-400 flex-shrink-0" />
                          {person.nic || '—'}
                        </span>
                      </td>
                      <td className="table-cell">
                        <span className="text-sm text-gray-600 dark:text-slate-300 flex items-center gap-1.5">
                          <Mail size={12} className="text-gray-400 flex-shrink-0" />
                          <span className="truncate max-w-[140px]">{person.email || '—'}</span>
                        </span>
                      </td>
                      <td className="table-cell">
                        <span className="text-sm text-gray-600 dark:text-slate-300 flex items-center gap-1.5">
                          <MapPin size={12} className="text-gray-400 flex-shrink-0" />
                          <span className="truncate max-w-[160px]">{person.address || '—'}</span>
                        </span>
                      </td>
                      <td className="table-cell text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleWhatsApp(person)}
                            className="p-1.5 rounded-lg hover:bg-emerald-50 text-gray-400 hover:text-emerald-600 transition-all dark:hover:bg-emerald-900/20 dark:hover:text-emerald-400 cursor-pointer"
                            title={person.phone ? `Dispatch WhatsApp message to ${person.name} (${person.phone})` : 'No phone number available'}
                          >
                            <MessageCircle size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleEdit(person)}
                            className="p-1.5 rounded-lg hover:bg-blue-50 text-gray-400 hover:text-blue-600 transition-all dark:hover:bg-blue-900/20 dark:hover:text-blue-400 cursor-pointer"
                            title="Edit Sales Person"
                          >
                            <Edit3 size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteRequest(person)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 cursor-pointer transition-colors dark:text-slate-500 dark:hover:text-red-400"
                            title="Delete Sales Person"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              {filteredPersons.length > 0 && (
                <tfoot>
                  <tr className="table-footer-row">
                    <td colSpan={6} className="table-cell text-xs text-gray-500 font-semibold uppercase tracking-wider dark:text-slate-400">
                      Total ({filteredPersons.length} sales persons)
                    </td>
                    <td />
                  </tr>
                </tfoot>
              )}
            </table>
          </div>

          {/* Mobile Cards View (<640px) */}
          <div className="sm:hidden divide-y divide-gray-100 dark:divide-slate-800">
            {loading && salesPersons.length === 0 ? (
              <div className="text-center py-12 px-4 text-gray-500 dark:text-slate-400 text-xs">
                <Loader2 size={28} className="mx-auto mb-2 text-accent-500 animate-spin" />
                Loading sales representatives from database...
              </div>
            ) : filteredPersons.length === 0 ? (
              <div className="text-center py-12 px-4 text-gray-500 dark:text-slate-400 text-xs">
                <User size={28} className="mx-auto mb-2 text-gray-300 dark:text-slate-600" />
                {searchQuery ? 'No sales persons match your search' : 'No sales representatives found in database'}
              </div>
            ) : (
              filteredPersons.map((person) => (
                <div key={person.id} className="p-3.5 space-y-2.5 bg-white dark:bg-slate-800/60">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="w-8 h-8 rounded-full bg-orange-100 dark:bg-orange-900/40 flex items-center justify-center text-orange-600 dark:text-orange-400 font-bold text-xs flex-shrink-0">
                        {person.name.charAt(0)}
                      </span>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-[10px] text-gray-400 dark:text-slate-500 font-semibold">
                            #{String(person.id).padStart(3, '0')}
                          </span>
                          <h4 className="text-sm font-bold text-gray-900 dark:text-slate-100 truncate">
                            {person.name}
                          </h4>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        type="button"
                        onClick={() => handleWhatsApp(person)}
                        className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/40 cursor-pointer"
                        title={person.phone ? `WhatsApp ${person.name}` : 'No phone number'}
                      >
                        <MessageCircle size={13} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleEdit(person)}
                        className="p-1.5 rounded-lg bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border border-blue-200 dark:border-blue-800/40 cursor-pointer"
                        title="Edit"
                      >
                        <Edit3 size={13} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteRequest(person)}
                        className="p-1.5 rounded-lg bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-200 dark:border-rose-800/40 cursor-pointer"
                        title="Delete"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>

                  {/* Contact Details Grid */}
                  <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-gray-100 dark:border-slate-700/60">
                    <div>
                      <span className="text-[10px] text-gray-400 dark:text-slate-500 block uppercase font-semibold">Phone:</span>
                      <a
                        href={person.phone ? `tel:${person.phone}` : undefined}
                        className="text-gray-800 dark:text-slate-200 font-medium flex items-center gap-1 mt-0.5 truncate hover:text-accent-600"
                      >
                        <Phone size={11} className="text-gray-400 flex-shrink-0" />
                        <span>{person.phone || '—'}</span>
                      </a>
                    </div>
                    <div>
                      <span className="text-[10px] text-gray-400 dark:text-slate-500 block uppercase font-semibold">NIC:</span>
                      <span className="text-gray-800 dark:text-slate-200 font-mono text-[11px] flex items-center gap-1 mt-0.5 truncate">
                        <Fingerprint size={11} className="text-gray-400 flex-shrink-0" />
                        <span>{person.nic || '—'}</span>
                      </span>
                    </div>
                  </div>

                  {(person.email || person.address) && (
                    <div className="space-y-1 pt-1 border-t border-gray-100 dark:border-slate-700/60 text-xs">
                      {person.email && (
                        <div className="flex items-center gap-1.5 text-gray-600 dark:text-slate-300 truncate">
                          <Mail size={11} className="text-gray-400 flex-shrink-0" />
                          <span className="truncate">{person.email}</span>
                        </div>
                      )}
                      {person.address && (
                        <div className="flex items-center gap-1.5 text-gray-600 dark:text-slate-300 truncate">
                          <MapPin size={11} className="text-gray-400 flex-shrink-0" />
                          <span className="truncate">{person.address}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))
            )}

            {filteredPersons.length > 0 && (
              <div className="p-3 bg-slate-50 dark:bg-slate-900/60 flex items-center justify-between text-xs text-gray-600 dark:text-slate-400">
                <span>Total Active Staff</span>
                <span className="font-bold text-slate-900 dark:text-slate-100 font-mono">
                  {filteredPersons.length} Sales Persons
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Add/Edit Sales Person Modal */}
      <AddSalesPersonModal
        isOpen={showModal}
        onClose={() => { setShowModal(false); setEditingPerson(null); }}
        onSave={handleSave}
        editPerson={editingPerson}
      />

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeleteConfirm}
        entityType="salesperson"
        entityName={deleteTarget?.name || ''}
      />
    </>
  );
}
