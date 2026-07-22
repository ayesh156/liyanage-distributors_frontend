import { useState, useEffect } from 'react';
import { X, DollarSign, Receipt, Building2, Hash } from 'lucide-react';
import FancyDatePicker from '../ui/FancyDatePicker';
import { toast } from 'react-toastify';

const toMoneyNumber = (value) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 0;
  return parseFloat(numeric.toFixed(2));
};

const computeBalanceDue = (amount, received) => {
  const computedBalanceDue = parseFloat((Number(amount) - Number(received)).toFixed(2));
  return Math.max(0, Number.isFinite(computedBalanceDue) ? computedBalanceDue : 0);
};

const formatCurrency = (val) => {
  const numeric = toMoneyNumber(val);
  return `Rs. ${numeric.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const resolvePaymentMethod = (value) => {
  const normalized = String(value || '').trim().toLowerCase().replace(/[-\s]+/g, '_');
  if (normalized === 'bank_slip' || normalized === 'bankslip' || normalized === 'bank_transfer') return 'bank_transfer';
  if (normalized === 'cheque' || normalized === 'check') return 'cheque';
  return 'cash';
};

export default function CollectPaymentModal({ isOpen, onClose, onSave, invoice }) {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [amount, setAmount] = useState('');
  const [paymentType, setPaymentType] = useState('cash');
  const [chequeNo, setChequeNo] = useState('');
  const [bankName, setBankName] = useState('');
  const [branchName, setBranchName] = useState('');
  const [description, setDescription] = useState('');
  const readDateValue = (input) => input?.target?.value ?? input ?? '';

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setDate(new Date().toISOString().split('T')[0]);
      setAmount('');
      setPaymentType('cash');
      setChequeNo('');
      setBankName('');
      setBranchName('');
      setDescription('');
    }
  }, [isOpen]);

  if (!isOpen || !invoice) return null;

  const balanceDue = computeBalanceDue(invoice.amount, invoice.received);
  const isBankBasedPayment = paymentType === 'cheque' || paymentType === 'bank_slip';

  const handleSubmit = (e) => {
    e.preventDefault();
    const amt = toMoneyNumber(amount);
    if (!amt || amt <= 0) return;
    if (amt > balanceDue) {
      toast.error("Entered amount exceeds the remaining payable balance for this invoice!");
      const amountInput = document.querySelector('input[type="number"]');
      if (amountInput) amountInput.focus();
      return;
    }

    // Lock paymentMethod directly to active tab state - force bank_slip to canonical bank_transfer
    let paymentMethod = paymentType === 'bank_slip' ? 'bank_transfer' : resolvePaymentMethod(paymentType);
    const isBankMethod = paymentMethod === 'cheque' || paymentMethod === 'bank_transfer';

    onSave({
      invoiceId: invoice.id,
      date,
      amount: amt,
      paymentType: paymentMethod,
      paymentMode: paymentMethod,
      paymentMethod, // Authoritative - locked to active tab, bank_slip → bank_transfer
      // Bank fields are 100% optional - empty strings allowed, NO validation
      chequeNo: isBankMethod ? String(chequeNo || '').trim() : '',
      bankName: isBankMethod ? String(bankName || '').trim() : '',
      branchName: isBankMethod ? String(branchName || '').trim() : '',
      description: description.trim(),
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-gray-900/20 backdrop-blur-sm dark:bg-gray-900/40" />
      <div className="relative w-full max-w-md bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-xl max-h-[90vh] overflow-visible flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-700">
          <div>
            <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
              <Receipt size={15} className="inline mr-1.5 text-emerald-500" />
              Collect Payment
            </h3>
            <p className="text-xs text-slate-500 font-mono mt-0.5 dark:text-slate-400">
              {invoice.docNo} · Balance Due: {formatCurrency(balanceDue)}
            </p>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 min-h-0">
          <form onSubmit={handleSubmit} className="p-5 space-y-4">
            {/* Date */}
            <div>
              <FancyDatePicker
                value={date}
                onChange={(val) => setDate(readDateValue(val))}
                label="Date"
                name="date"
              />
            </div>

            <div className="rounded-2xl border border-gray-200 bg-gradient-to-r from-slate-50 via-white to-slate-50 p-1.5 shadow-sm dark:border-slate-700 dark:from-slate-900/70 dark:via-slate-900 dark:to-slate-900/70">
              <p className="px-2 pb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Payment Method
              </p>
              <div className="grid grid-cols-2 gap-1">
                <button
                  type="button"
                  onClick={() => {
                    setPaymentType('cash');
                    setChequeNo('');
                    setBankName('');
                    setBranchName('');
                  }}
                  className={`rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors ${paymentType === 'cash' ? 'bg-white text-emerald-700 shadow-sm ring-1 ring-emerald-100 dark:bg-slate-800 dark:text-emerald-300 dark:ring-emerald-900/60' : 'text-gray-500 hover:bg-white/80 dark:text-slate-400 dark:hover:bg-slate-800/60'}`}
                >
                  Bill Amount
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentType('cheque')}
                  className={`rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors ${paymentType === 'cheque' ? 'bg-white text-emerald-700 shadow-sm ring-1 ring-emerald-100 dark:bg-slate-800 dark:text-emerald-300 dark:ring-emerald-900/60' : 'text-gray-500 hover:bg-white/80 dark:text-slate-400 dark:hover:bg-slate-800/60'}`}
                >
                  Cheque Payment
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentType('bank_slip')}
                  className={`rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors ${paymentType === 'bank_slip' ? 'bg-white text-emerald-700 shadow-sm ring-1 ring-emerald-100 dark:bg-slate-800 dark:text-emerald-300 dark:ring-emerald-900/60' : 'text-gray-500 hover:bg-white/80 dark:text-slate-400 dark:hover:bg-slate-800/60'}`}
                >
                  Bank Slip
                </button>
              </div>
            </div>

            {/* Amount */}
            <div>
              <label className="input-label">
                <DollarSign size={13} className="inline mr-1 text-gray-400" /> Amount (Rs.)
              </label>
              <input type="number" placeholder="0.00" min="0.01" step="0.01" max={balanceDue}
                value={amount} onChange={(e) => setAmount(e.target.value)} onWheel={(e) => e.currentTarget.blur()}
                className="input-field" required />
              <p className="text-[10px] text-slate-500 mt-0.5">
                Max: {formatCurrency(balanceDue)}
              </p>
            </div>

            {/* Cheque fields */}
            {isBankBasedPayment && (
              <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-2xl space-y-3">
                <div>
                  <label className="input-label">
                    <Hash size={13} className="inline mr-1 text-gray-400" /> {paymentType === 'bank_slip' ? 'Bank Slip No' : 'Cheque No'}
                  </label>
                  <input type="text" placeholder="e.g., CHQ-458401"
                    value={chequeNo} onChange={(e) => setChequeNo(e.target.value)}
                    className="input-field" />
                </div>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <label className="input-label">
                      <Building2 size={13} className="inline mr-1 text-gray-400" /> Bank Name
                    </label>
                    <input type="text" placeholder="e.g., BOC"
                      value={bankName} onChange={(e) => setBankName(e.target.value)}
                      className="input-field" />
                  </div>
                  <div>
                    <label className="input-label">
                      <Building2 size={13} className="inline mr-1 text-gray-400" /> Branch Name
                    </label>
                    <input type="text" placeholder="e.g., Morawaka"
                      value={branchName} onChange={(e) => setBranchName(e.target.value)}
                      className="input-field" />
                  </div>
                </div>
              </div>
            )}

            {/* Description */}
            <div>
              <label className="input-label">Description / Reference</label>
              <input type="text" placeholder="e.g., Partial payment for invoice"
                value={description} onChange={(e) => setDescription(e.target.value)}
                className="input-field" />
            </div>

            {/* Summary */}
            {toMoneyNumber(amount) > 0 && (
              <div className="bg-gradient-to-r from-emerald-50 to-green-50 border border-emerald-200 rounded-xl p-3 dark:from-emerald-900/20 dark:to-green-900/10 dark:border-emerald-700">
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between text-gray-500 dark:text-slate-400">
                    <span>Previous Received</span>
                    <span className="font-mono">{formatCurrency(invoice.received || 0)}</span>
                  </div>
                  <div className="flex justify-between text-emerald-700 dark:text-emerald-300 font-medium">
                    <span>This Payment</span>
                    <span className="font-mono">+ {formatCurrency(toMoneyNumber(amount))}</span>
                  </div>
                  <div className="border-t border-emerald-200 dark:border-emerald-700 pt-1 flex justify-between font-bold text-gray-900 dark:text-slate-100">
                    <span>New Total Received</span>
                    <span className="font-mono">{formatCurrency(toMoneyNumber(Number(invoice.received || 0) + toMoneyNumber(amount)))}</span>
                  </div>
                  <div className="flex justify-between text-amber-600 dark:text-amber-400 font-medium">
                    <span>New Balance Due</span>
                    <span className="font-mono">{formatCurrency(computeBalanceDue(balanceDue, toMoneyNumber(amount)))}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
              <button type="submit" className="btn-primary flex-1 bg-emerald-600 hover:bg-emerald-700 focus:ring-emerald-500">
                <Receipt size={14} className="inline mr-1.5" /> Record Payment
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}