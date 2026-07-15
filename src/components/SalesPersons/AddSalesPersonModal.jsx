import { useState, useEffect, useMemo } from 'react';
import { X, User, Phone, Fingerprint, Mail, MapPin } from 'lucide-react';
import { toast } from 'react-toastify';
import useAppStore from '../../hooks/useAppStore';

function emptyForm() {
  return { name: '', phone: '', nic: '', email: '', address: '' };
}

export default function AddSalesPersonModal({ isOpen, onClose, onSave, editPerson }) {
  const [form, setForm] = useState(emptyForm());
  const [showSuggestions, setShowSuggestions] = useState(false);
  const salesPersons = useAppStore((s) => s.salesPersons || []);
  const isEditing = !!editPerson;

  const normalizedNameQuery = String(form.name || '').trim().toLowerCase();

  const nameSuggestions = useMemo(() => {
    if (!normalizedNameQuery) return [];
    return salesPersons
      .filter((person) => {
        if (isEditing && String(person.id) === String(editPerson?.id)) return false;
        const personName = String(person?.name || '').trim().toLowerCase();
        const personPhone = String(person?.phone || '').trim().toLowerCase();
        return personName.includes(normalizedNameQuery) || personPhone.includes(normalizedNameQuery);
      })
      .slice(0, 8);
  }, [salesPersons, normalizedNameQuery, isEditing, editPerson?.id]);

  useEffect(() => {
    if (isOpen) {
      if (editPerson) {
        setForm({
          name: editPerson.name || '',
          phone: editPerson.phone || '',
          nic: editPerson.nic || '',
          email: editPerson.email || '',
          address: editPerson.address || '',
        });
      } else {
        setForm(emptyForm());
      }
    }
  }, [isOpen, editPerson]);

  useEffect(() => {
    if (!isOpen) setShowSuggestions(false);
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    const normalizedName = String(form.name || '').trim().toLowerCase();
    const normalizedPhone = String(form.phone || '').trim();
    if (!normalizedName) return;

    const duplicateRecord = salesPersons.find((person) => {
      if (isEditing && String(person.id) === String(editPerson?.id)) return false;
      const personName = String(person?.name || '').trim().toLowerCase();
      const personPhone = String(person?.phone || '').trim();
      return personName === normalizedName && personPhone === normalizedPhone;
    });

    if (duplicateRecord) {
      toast.error('Sales person with this name and phone number already exists');
      return;
    }

    onSave(isEditing ? { ...form, id: editPerson.id } : form);
    onClose();
  };

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-gray-900/20 backdrop-blur-sm dark:bg-gray-900/40" />
      <div className="relative w-full max-w-md bg-white border border-gray-200 rounded-2xl shadow-xl dark:bg-slate-800 dark:border-slate-700">

        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-200 dark:border-slate-700">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-orange-100 dark:bg-orange-900/40 flex items-center justify-center">
              <User size={16} className="text-orange-600 dark:text-orange-400" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-gray-900 dark:text-slate-100">
                {isEditing ? 'Edit Sales Person' : 'Add Sales Person'}
              </h3>
              {isEditing && (
                <p className="text-xs text-gray-500 mt-0.5 font-mono">#{String(editPerson.id).padStart(3, '0')}</p>
              )}
            </div>
          </div>
          <button onClick={onClose}
            className="p-1 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Full Name */}
          <div>
            <label className="input-label">
              <User size={13} className="inline mr-1 text-gray-400" /> Full Name <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder="e.g., Kamal Perera"
                value={form.name}
                onFocus={() => setShowSuggestions(true)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 120)}
                onChange={(e) => {
                  setForm((f) => ({ ...f, name: e.target.value }));
                  setShowSuggestions(true);
                }}
                className="input-field"
                required
                autoFocus
              />
              {showSuggestions && nameSuggestions.length > 0 && (
                <div className="absolute left-0 top-full z-50 mt-1 w-full overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-800">
                  {nameSuggestions.map((person) => (
                    <button
                      key={person.id}
                      type="button"
                      onMouseDown={(event) => {
                        event.preventDefault();
                        setForm((f) => ({
                          ...f,
                          name: person.name || '',
                          phone: person.phone || f.phone,
                          nic: person.nic || f.nic,
                          email: person.email || f.email,
                          address: person.address || f.address,
                        }));
                        setShowSuggestions(false);
                      }}
                      className="w-full px-3 py-2.5 text-left transition-colors hover:bg-gray-50 dark:hover:bg-slate-700/60"
                    >
                      <p className="text-sm font-medium text-gray-900 dark:text-slate-100">{person.name}</p>
                      <p className="text-xs text-gray-500 dark:text-slate-400">{person.phone || 'No phone'}</p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Phone + NIC */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="input-label">
                <Phone size={13} className="inline mr-1 text-gray-400" /> Mobile Number
              </label>
              <input type="text" placeholder="077-XXXXXXX"
                value={form.phone} onChange={set('phone')}
                className="input-field" />
            </div>
            <div>
              <label className="input-label">
                <Fingerprint size={13} className="inline mr-1 text-gray-400" /> NIC Number
              </label>
              <input type="text" placeholder="e.g., 851234567V"
                value={form.nic} onChange={set('nic')}
                className="input-field" />
            </div>
          </div>

          {/* Email */}
          <div>
            <label className="input-label">
              <Mail size={13} className="inline mr-1 text-gray-400" /> Email Address
            </label>
            <input type="email" placeholder="e.g., kamal@example.com"
              value={form.email} onChange={set('email')}
              className="input-field" />
          </div>

          {/* Address */}
          <div>
            <label className="input-label">
              <MapPin size={13} className="inline mr-1 text-gray-400" /> Address
            </label>
            <textarea placeholder="e.g., 23 Temple Road, Morawaka"
              value={form.address} onChange={set('address')}
              className="input-field resize-none" rows={2} />
          </div>

          {/* Action buttons */}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="btn-secondary flex-1">Cancel</button>
            <button type="submit" className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold border-0 bg-orange-500 text-white hover:bg-orange-600 active:bg-orange-700 transition-all shadow-sm shadow-orange-500/20">
              {isEditing ? 'Save Changes' : 'Add Sales Person'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}