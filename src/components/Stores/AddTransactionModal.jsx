import { useState, useEffect, useMemo } from 'react';
import { X, FileText, Receipt, CalendarDays, DollarSign, CreditCard, Banknote, Building2, Hash, User } from 'lucide-react';
import SmartCombobox from '../ui/SmartCombobox';
import FancyDatePicker from '../ui/FancyDatePicker';
import SalesPersonSearchSelect from '../ui/SalesPersonSearchSelect';
import useAppStore from '../../hooks/useAppStore';

const PAYMENT_MODES = [
  { value: 'cash',   label: 'Cash',         icon: Banknote,   color: 'emerald' },
  { value: 'cheque', label: 'Cheque',        icon: CreditCard, color: 'blue'    },
  { value: 'check',  label: 'Direct Check',  icon: Building2,  color: 'purple'  },
  { value: 'bank_slip', label: 'Bank Slip',  icon: Building2,  color: 'slate'   },
];

const modeColors = {
  emerald: 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-300 dark:border-emerald-700',
  blue:    'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/40 dark:text-blue-300 dark:border-blue-700',
  purple:  'bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900/40 dark:text-purple-300 dark:border-purple-700',
  slate:   'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-900/40 dark:text-slate-300 dark:border-slate-700',
};
const modeColorsInactive = 'bg-white text-slate-800 border-slate-200 hover:bg-gray-50 hover:border-slate-300 dark:bg-slate-900 dark:text-slate-300 dark:border-slate-700 dark:hover:bg-slate-800 dark:hover:border-slate-600';

function resolvePaymentMethod(value) {
  const normalized = String(value || '').trim().toLowerCase().replace(/[-\s]+/g, '_');
  if (normalized === 'bank_slip' || normalized === 'bankslip' || normalized === 'bank_transfer') return 'bank_transfer';
  if (normalized === 'cheque' || normalized === 'check') return 'cheque';
  return 'cash';
}

function emptyForm() {
  return {
    date: new Date().toISOString().split('T')[0],
    docType: 'Invoice',
    amount: '',
    received: '',
    paymentMode: 'cash',
    chequeNo: '',
    bankName: '',
    branchName: '',
    description: '',
    salesPerson: '',
    route: '',
  };
}

export default function AddTransactionModal({ isOpen, onClose, onSave, shopName }) {
  /* ─── ALL REACT HOOKS AT THE ABSOLUTE TOP (Rules of Hooks compliance) ─── */
  const bankNames = useAppStore((s) => s.bankNames);
  const routes    = useAppStore((s) => s.routes);
  const [form, setForm] = useState(emptyForm());

  // Reset form whenever modal opens
  useEffect(() => {
    if (isOpen) setForm(emptyForm());
  }, [isOpen]);

  const routeOptions = useMemo(() => routes.map((r) => ({ value: r.name, label: r.name })), [routes]);
  const bankOptions  = useMemo(() => bankNames.map((b) => ({ value: b, label: b })), [bankNames]);

  /* ─── EARLY RETURN (AFTER all hooks — order is now stable) ─── */
  if (!isOpen) return null;

  /* ─── DERIVED STATE / HANDLERS ─── */
  const needsChequeFields =
    form.docType === 'Payment' &&
    (form.paymentMode === 'cheque' || form.paymentMode === 'check' || form.paymentMode === 'bank_slip');

  const handleSubmit = (e) => {
    e.preventDefault();
    const amount = parseFloat(form.amount);
    if (!amount || amount <= 0) return;

    const received = form.docType === 'Invoice' ? parseFloat(form.received) || 0 : undefined;
    // Lock paymentMethod directly to active tab state - force bank_slip to canonical bank_transfer
    let paymentMethod = form.paymentMode === 'bank_slip' ? 'bank_transfer' : resolvePaymentMethod(form.paymentMode);
    const isBankMethod = form.docType === 'Payment' && (paymentMethod === 'cheque' || paymentMethod === 'bank_transfer');

    onSave({
      date: form.date,
      docType: form.docType,
      amount,
      ...(form.docType === 'Invoice' ? { received } : {}),
      paymentMode: form.docType === 'Invoice' ? 'credit' : paymentMethod,
      paymentMethod: form.docType === 'Invoice' ? 'credit' : paymentMethod, // Authoritative - locked to active tab, bank_slip → bank_transfer
      paymentType: form.docType === 'Invoice' ? 'credit' : paymentMethod,
      // Bank fields are 100% optional - empty strings allowed, NO validation
      chequeNo: isBankMethod ? form.chequeNo.trim() : '',
      bankName: isBankMethod ? form.bankName.trim() : '',
      branchName: isBankMethod ? form.branchName.trim() : '',
      description: form.description.trim(),
      salesPerson: form.docType === 'Invoice' ? form.salesPerson.trim() : '',
      route: form.docType === 'Invoice' ? form.route : '',
    });
    onClose();
  };

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-gray-900/20 backdrop-blur-sm dark:bg-gray-900/40" />
      <div className="relative w-full max-w-lg bg-white border border-gray-200 rounded-2xl shadow-xl max-h-[90vh] overflow-visible flex flex-col dark:bg-slate-800 dark:border-slate-700">

        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-200 sticky top-0 bg-white z-10 dark:bg-slate-800 dark:border-slate-700">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100">Add Transaction</h3>
            {shopName && <p className="text-xs text-gray-500 mt-0.5 dark:text-slate-400">{shopName}</p>}
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 min-h-0">
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Doc Type Toggle */}
          <div>
            <label className="input-label">Document Type</label>
            <div className="flex gap-2">
              <button type="button"
                onClick={() => setForm((f) => ({ ...f, docType: 'Invoice' }))}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border transition-all ${
                  form.docType === 'Invoice'
                    ? 'bg-accent-100 text-accent-700 border-accent-200 dark:bg-accent-900/40 dark:text-accent-300 dark:border-accent-700'
                    : modeColorsInactive
                }`}
              >
                <FileText size={16} /> Invoice
              </button>
              <button type="button"
                onClick={() => setForm((f) => ({ ...f, docType: 'Payment', paymentMode: 'cash' }))}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border transition-all ${
                  form.docType === 'Payment'
                    ? 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-300 dark:border-emerald-700'
                    : modeColorsInactive
                }`}
              >
                <Receipt size={16} /> Payment / Receipt
              </button>
            </div>
          </div>

          {/* Payment Mode — only when Payment selected */}
          {form.docType === 'Payment' && (
            <div>
              <label className="input-label">Payment Mode</label>
              <div className="flex gap-2">
                {PAYMENT_MODES.map(({ value, label, icon: Icon, color }) => (
                  <button key={value} type="button"
                    onClick={() => setForm((f) => ({ ...f, paymentMode: value }))}
                    className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium border transition-all ${
                      form.paymentMode === value ? modeColors[color] : modeColorsInactive
                    }`}
                  >
                    <Icon size={14} /> {label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Date + Amount */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <FancyDatePicker
                value={form.date}
                onChange={set('date')}
                label="Date"
                name="date"
              />
            </div>
            <div>
              <label className="input-label">
                <DollarSign size={13} className="inline mr-1 text-gray-400" /> Amount (Rs.)
              </label>
              <input type="number" placeholder="0.00" min="1" step="0.01"
                value={form.amount} onChange={set('amount')} onWheel={(e) => e.currentTarget.blur()}
                className="input-field" required />
            </div>
          </div>

          {/* Cheque / Check fields */}
          {needsChequeFields && (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div>
                <label className="input-label">
                  <Hash size={13} className="inline mr-1 text-gray-400" />
                  {form.paymentMode === 'bank_slip' ? 'Bank Slip No' : form.paymentMode === 'check' ? 'Check No' : 'Cheque No'}
                </label>
                <input type="text" placeholder="e.g., CHQ-458401"
                  value={form.chequeNo} onChange={set('chequeNo')}
                  className="input-field" />
              </div>
              <div>
                <label className="input-label">
                  <Building2 size={13} className="inline mr-1 text-gray-400" /> Bank Branch
                </label>
                <SmartCombobox
                  value={form.bankName}
                  onSelect={(opt) => setForm((f) => ({ ...f, bankName: opt.value }))}
                  options={bankOptions}
                  placeholder="Search bank name..."
                  dropdownMaxHeight="max-h-48"
                  portal
                />
              </div>
              <div>
                <label className="input-label">
                  <Building2 size={13} className="inline mr-1 text-gray-400" /> Branch Name
                </label>
                <input type="text" placeholder="e.g., Morawaka"
                  value={form.branchName} onChange={set('branchName')}
                  className="input-field" />
              </div>
            </div>
          )}

          {/* Received Amount — only for Invoice (Amount already handled above) */}
          {form.docType === 'Invoice' && (
            <div>
              <label className="input-label">
                <Receipt size={13} className="inline mr-1 text-gray-400" /> Already Received (Rs.)
              </label>
              <input type="number" placeholder="0.00" min="0" step="0.01"
                value={form.received} onChange={(e) => setForm((f) => ({ ...f, received: e.target.value }))} onWheel={(e) => e.currentTarget.blur()}
                className="input-field" />
              <p className="text-[10px] text-gray-400 mt-0.5">Balance Due = Amount − Received. Default: 0 if nothing collected yet.</p>
            </div>
          )}

          {/* Invoice extra fields */}
          {form.docType === 'Invoice' && (
            <>
              {/* Sales Person — Premium Search Select Only */}
              <div>
                <label className="input-label">
                  <User size={13} className="inline mr-1 text-gray-400" /> Sales Person
                </label>
                <SalesPersonSearchSelect
                  value={form.salesPerson}
                  onSelect={(val) => setForm((f) => ({ ...f, salesPerson: val }))}
                  placeholder="Search & select a sales person..."
                />
              </div>
              <div>
                <label className="input-label">Route</label>
                <SmartCombobox
                  value={form.route}
                  onSelect={(opt) => setForm((f) => ({ ...f, route: opt.value }))}
                  options={routeOptions}
                  placeholder="Filter by route..."
                  dropdownMaxHeight="max-h-48"
                  portal
                  dropdownPosition="top"
                />
              </div>
            </>
          )}

          {/* Description */}
          <div>
            <label className="input-label">Description</label>
            <input type="text" placeholder="e.g., Wiring supplies & cables"
              value={form.description} onChange={set('description')}
              className="input-field" />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" className="btn-primary flex-1">
              Add {form.docType}
            </button>
          </div>
        </form>
        </div>
      </div>
    </div>
  );
}