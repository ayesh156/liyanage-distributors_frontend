import { useState, useMemo } from 'react';
import { Search, User, Phone, Fingerprint, Mail, MapPin, Plus, Edit3, Trash2, X } from 'lucide-react';
import useAppStore from '../../hooks/useAppStore';
import AddSalesPersonModal from './AddSalesPersonModal';
import DeleteConfirmModal from '../ui/DeleteConfirmModal';

export default function SalesPersonManager() {
  const salesPersons    = useAppStore((s) => s.salesPersons);
  const addSalesPerson  = useAppStore((s) => s.addSalesPerson);
  const updateSalesPerson = useAppStore((s) => s.updateSalesPerson);
  const deleteSalesPerson = useAppStore((s) => s.deleteSalesPerson);

  const [searchQuery,     setSearchQuery]     = useState('');
  const [showModal,       setShowModal]       = useState(false);
  const [editingPerson,   setEditingPerson]   = useState(null);

  // Delete confirm state
  const [deleteTarget, setDeleteTarget] = useState(null);

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

  const handleAdd = () => {
    setEditingPerson(null);
    setShowModal(true);
  };

  return (
    <>
      <div className="screen-content print:hidden">
        <div className="glass-card overflow-hidden">
          {/* Toolbar */}
          <div className="p-4 sm:p-5 border-b border-gray-200 dark:border-slate-700">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-stretch sm:items-center gap-2 w-full sm:w-auto">
                {/* Search */}
                <div className="relative">
                  <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search sales persons..."
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
              </div>
              <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
                <div className="text-xs text-gray-500 dark:text-slate-400">
                  <span className="text-gray-900 dark:text-slate-100 font-semibold">{filteredPersons.length}</span> persons
                </div>
                <button onClick={handleAdd} className="btn-primary text-xs">
                  <Plus size={14} /> Add Sales Person
                </button>
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
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
                {filteredPersons.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-14 text-gray-500 dark:text-slate-400 text-sm">
                      <User size={32} className="mx-auto mb-2 text-gray-300 dark:text-slate-600" />
                      {searchQuery ? 'No sales persons match your search' : 'No sales persons available'}
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
                            onClick={() => handleEdit(person)}
                            className="p-1.5 rounded-lg hover:bg-blue-50 text-gray-400 hover:text-blue-600 transition-all dark:hover:bg-blue-900/20 dark:hover:text-blue-400"
                            title="Edit Sales Person"
                          >
                            <Edit3 size={14} />
                          </button>
                          <button
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