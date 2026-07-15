import { useState, useEffect } from 'react';
import { X, FileText, DollarSign, Receipt, User, Hash, Building2 } from 'lucide-react';
import FancyDatePicker from '../ui/FancyDatePicker';
import SalesPersonSearchSelect from '../ui/SalesPersonSearchSelect';
import useAppStore from '../../hooks/useAppStore';

const formatCurrency = (val) => {
  const num = parseFloat(val) || 0;
  return `Rs. ${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

export default function AddInvoiceModal({ isOpen, onClose, onSave, shopName, shopProfile, shopSalesPerson, editInvoice }) {
  const salesPersons = useAppStore((s) => s.salesPersons || []);
  const activeStore = useAppStore((s) => s.selectedShop || null);
  const [docNo, setDocNo] = useState('');
  const [amount, setAmount] = useState('');
  const [alreadyReceived, setAlreadyReceived] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [salesPerson, setSalesPerson] = useState(
    typeof shopSalesPerson === 'string' ? shopSalesPerson : (shopSalesPerson?.name || ''),
  );
  const [salesPersonId, setSalesPersonId] = useState(null);
  const [salesPersonBackendId, setSalesPersonBackendId] = useState(null);
  const [isSalesPersonLocked, setIsSalesPersonLocked] = useState(false);
  const [description, setDescription] = useState('');
  
  // Payment type toggle: 'cash' or 'cheque'
  const [paymentType, setPaymentType] = useState('cash');
  const [chequeNo, setChequeNo] = useState('');
  const [bankName, setBankName] = useState('');
  const [branchName, setBranchName] = useState('');

  const isEditMode = !!editInvoice;
  const activeStoreContext = shopProfile || activeStore;
  const readDateValue = (input) => input?.target?.value ?? input ?? '';

  const resolveSalesPerson = (candidateId, candidateName) => {
    if (candidateId !== undefined && candidateId !== null && candidateId !== '') {
      const byId = salesPersons.find((rep) => {
        const selectedId = Number(candidateId);
        const currentId = Number(rep.id);
        if (Number.isFinite(selectedId) && Number.isFinite(currentId)) {
          return Number(selectedId) === Number(currentId);
        }
        return String(candidateId) === String(rep.id);
      });
      if (byId) return byId;
    }

    if (candidateName) {
      const byName = salesPersons.find(
        (rep) => String(rep.name).trim().toLowerCase() === String(candidateName).trim().toLowerCase(),
      );
      if (byName) return byName;
    }

    return null;
  };

  const resolveFromParentAccount = () => {
    const storeSalesPerson = shopProfile?.invoices?.[0]?.salesPerson;
    const resolvedFromLatestStoreInvoice = resolveSalesPerson(storeSalesPerson?.id, storeSalesPerson?.name);
    if (resolvedFromLatestStoreInvoice) {
      return { rep: resolvedFromLatestStoreInvoice, source: 'latestStoreInvoice' };
    }

    const parentSalesPersonIds = [
      shopProfile?.salesPersonId,
      shopProfile?.assignedSalesPersonId,
      shopProfile?.salesPerson?.id,
      shopProfile?.account?.salesPersonId,
      shopProfile?.account?.assignedSalesPersonId,
    ];
    const parentSalesPersonNames = [
      typeof shopProfile?.salesPerson === 'string' ? shopProfile.salesPerson : shopProfile?.salesPerson?.name,
      shopProfile?.salesPersonName,
      shopProfile?.assignedSalesPerson,
      shopProfile?.account?.salesPerson,
      shopProfile?.account?.salesPersonName,
      typeof shopSalesPerson === 'string' ? shopSalesPerson : shopSalesPerson?.name,
    ];

    for (const idCandidate of parentSalesPersonIds) {
      const matched = resolveSalesPerson(idCandidate, null);
      if (matched) return { rep: matched, source: 'storeProfile' };
    }

    for (const nameCandidate of parentSalesPersonNames) {
      const matched = resolveSalesPerson(null, nameCandidate);
      if (matched) return { rep: matched, source: 'storeProfile' };
    }

    return null;
  };

  // Reset or pre-populate form whenever modal opens
  useEffect(() => {
    if (isOpen) {
      if (editInvoice) {
        const invoiceSalesPersonId =
          editInvoice?.salesPersonId ||
          editInvoice?.salesPersonBackendId ||
          editInvoice?.salesPerson?.id ||
          editInvoice?.store?.salesPerson?.id ||
          null;
        const invoiceSalesPersonName =
          (typeof editInvoice?.salesPerson === 'string' ? editInvoice.salesPerson : editInvoice?.salesPerson?.name) ||
          editInvoice?.store?.salesPerson?.name ||
          '';

        const matchedInvoiceSalesPerson = resolveSalesPerson(invoiceSalesPersonId, invoiceSalesPersonName);
        const matchedStoreSalesPerson = resolveFromParentAccount();
        const effectiveSalesPerson = matchedInvoiceSalesPerson || matchedStoreSalesPerson?.rep;

        // Edit mode: pre-populate fields from the invoice data
        setDocNo(editInvoice.docNo || '');
        setAmount(editInvoice.amount ? String(editInvoice.amount) : '');
        setAlreadyReceived(editInvoice.received ? String(editInvoice.received) : '');
        setDate(editInvoice.date || new Date().toISOString().split('T')[0]);
        setSalesPerson(
          effectiveSalesPerson?.name ||
          invoiceSalesPersonName ||
          (typeof shopSalesPerson === 'string' ? shopSalesPerson : shopSalesPerson?.name) ||
          '',
        );
        setSalesPersonId(effectiveSalesPerson?.id || invoiceSalesPersonId || null);
        setSalesPersonBackendId(effectiveSalesPerson?.backendId || invoiceSalesPersonId || null);
        setIsSalesPersonLocked(Boolean(matchedStoreSalesPerson?.source === 'latestStoreInvoice' && !matchedInvoiceSalesPerson));
        setDescription(editInvoice.description || '');
        
        // Detect payment type from existing data - normalize legacy variants (bank_transfer + bank_slip → Bank Slip tab)
        const normalizedPaymentMode = String(editInvoice.paymentMode || '').trim().toLowerCase().replace(/[-\s]+/g, '_');
        const normalizedPaymentMethod = String(editInvoice.paymentMethod || '').trim().toLowerCase().replace(/[-\s]+/g, '_');
        const hasChequeData = editInvoice.chequeNo || editInvoice.bankName || editInvoice.branchName;
        setPaymentType(
          normalizedPaymentMode === 'bank_slip' || normalizedPaymentMethod === 'bank_slip' ||
          normalizedPaymentMode === 'bank_transfer' || normalizedPaymentMethod === 'bank_transfer' ||
          normalizedPaymentMode === 'bankslip' || normalizedPaymentMethod === 'bankslip'
            ? 'bank_slip'
            : normalizedPaymentMode === 'cheque' || normalizedPaymentMethod === 'cheque' || hasChequeData
            ? 'cheque'
            : 'cash',
        );
        setChequeNo(editInvoice.chequeNo || '');
        setBankName(editInvoice.bankName || '');
        setBranchName(editInvoice.branchName || '');
      } else {
        const initialSalesPersonId =
          activeStoreContext?.salesPerson?.id ||
          activeStoreContext?.salesPersonId ||
          null;
        const activeContextSalesPersonName =
          activeStoreContext?.salesPerson?.name ||
          (typeof activeStoreContext?.salesPerson === 'string' ? activeStoreContext.salesPerson : '') ||
          activeStoreContext?.salesPersonName ||
          '';

        const matchedActiveStoreSalesPerson = resolveSalesPerson(initialSalesPersonId, activeContextSalesPersonName);
        const matchedStoreSalesPerson = resolveFromParentAccount();
        const matchedStoreRep = matchedActiveStoreSalesPerson || matchedStoreSalesPerson?.rep;

        // Add mode: reset to defaults, auto-populate sales person
        setDocNo('');
        setAmount('');
        setAlreadyReceived('');
        setDate(new Date().toISOString().split('T')[0]);
        setSalesPerson(
          matchedStoreRep?.name ||
          activeContextSalesPersonName ||
          (typeof shopSalesPerson === 'string' ? shopSalesPerson : shopSalesPerson?.name) ||
          '',
        );
        setSalesPersonId(matchedStoreRep?.id || initialSalesPersonId || null);
        setSalesPersonBackendId(matchedStoreRep?.backendId || matchedStoreRep?.id || null);
        setIsSalesPersonLocked(Boolean(initialSalesPersonId || matchedStoreSalesPerson?.source === 'latestStoreInvoice'));
        setDescription('');
        setPaymentType('cash');
        setChequeNo('');
        setBankName('');
        setBranchName('');
      }
    }
  }, [isOpen, shopProfile, shopSalesPerson, editInvoice, salesPersons, activeStoreContext]);

  // Live due balance computation
  const dueBalance = (() => {
    const amt = parseFloat(amount) || 0;
    const rec = parseFloat(alreadyReceived) || 0;
    return Math.max(0, amt - rec);
  })();

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();

    // ── SALES REP GUARD: Block submission if no sales representative selected ──
    const effectiveSalesRepId = salesPersonId || salesPersonBackendId;
    const effectiveSalesRepName = salesPerson.trim();
    if (!effectiveSalesRepId && !effectiveSalesRepName) {
      const existingAlert = document.querySelector('.sales-rep-guard-alert');
      if (!existingAlert) {
        const alertDiv = document.createElement('div');
        alertDiv.className = 'sales-rep-guard-alert';
        alertDiv.style.cssText = 'position:fixed;top:16px;left:50%;transform:translateX(-50%);z-index:99999;background:#dc2626;color:#fff;padding:14px 28px;border-radius:12px;font-weight:700;font-size:14px;box-shadow:0 8px 32px rgba(220,38,38,0.4);display:flex;align-items:center;gap:10px;max-width:500px;text-align:center;';
        alertDiv.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg> Please select a Sales Rep before proceeding.';
        document.body.appendChild(alertDiv);
        setTimeout(() => { alertDiv.remove(); }, 5000);
      }
      return; // ⛔ Abort – do not fire API or save
    }

    const amt = parseFloat(amount);
    const normalizedChequeNo = chequeNo.trim();
    const normalizedBankName = bankName.trim();
    const normalizedBranchName = branchName.trim();
    
    // Force bank_slip UI tab to canonical database enum: bank_transfer
    const dbPaymentMethod = paymentType === 'bank_slip' ? 'bank_transfer' : paymentType;
    const payload = {
      docNo: docNo.trim(),
      date,
      amount: amt,
      received: parseFloat(alreadyReceived) || 0,
      description: description.trim(),
      salesPerson: salesPerson.trim(),
      salesPersonId,
      salesPersonBackendId,
      route: '', // Inferred from parent shop context
      paymentMethod: dbPaymentMethod,
      paymentMode: dbPaymentMethod,
    };

    // Bank fields are 100% optional - NO validation, empty strings allowed
    const isBankMethod = paymentType === 'cheque' || paymentType === 'bank_slip';
    payload.chequeNo = isBankMethod ? normalizedChequeNo : '';
    payload.bankName = isBankMethod ? normalizedBankName : '';
    payload.branchName = isBankMethod ? normalizedBranchName : '';

    if (isEditMode) {
      // In edit mode, include the id so the handler knows which invoice to update
      payload.id = editInvoice.id;
    }

    onSave(payload);
    onClose();
  };

  const title = isEditMode ? 'Update Invoice' : 'Add Invoice';
  const submitLabel = isEditMode ? 'Update Invoice' : 'Add Invoice';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-gray-900/20 backdrop-blur-sm dark:bg-gray-900/40" />
      <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-xl max-h-[90vh] overflow-visible flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-700 sticky top-0 bg-white dark:bg-slate-900 z-10">
          <div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">{title}</h3>
            {shopName && <p className="text-xs text-slate-500 mt-0.5 dark:text-slate-400">{shopName}</p>}
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 min-h-0">
          <form onSubmit={handleSubmit} className="p-5 space-y-4">
            {/* Document No — editable text input */}
            <div>
              <label className="input-label">
                <FileText size={13} className="inline mr-1 text-gray-400" /> Document No
              </label>
              <input type="text" placeholder="e.g., INV-2026-001"
                value={docNo} onChange={(e) => setDocNo(e.target.value)}
                className="input-field font-mono font-semibold" required />
            </div>

            {/* Date */}
            <div>
              <FancyDatePicker
                value={date}
                onChange={(val) => setDate(readDateValue(val))}
                label="Date"
                name="date"
              />
            </div>

            <div className="flex border-b border-slate-200 dark:border-slate-700 mb-4">
              <button
                type="button"
                onClick={() => {
                  setPaymentType('cash');
                  setChequeNo('');
                  setBankName('');
                  setBranchName('');
                }}
                className={`flex-1 py-2 text-center font-medium ${paymentType === 'cash' ? 'text-orange-500 border-b-2 border-orange-500' : 'text-gray-400'}`}
              >
                Bill Amount
              </button>
              <button
                type="button"
                onClick={() => setPaymentType('cheque')}
                className={`flex-1 py-2 text-center font-medium ${paymentType === 'cheque' ? 'text-orange-500 border-b-2 border-orange-500' : 'text-gray-400'}`}
              >
                Cheque Payment
              </button>
              <button
                type="button"
                onClick={() => setPaymentType('bank_slip')}
                className={`flex-1 py-2 text-center font-medium ${paymentType === 'bank_slip' ? 'text-orange-500 border-b-2 border-orange-500' : 'text-gray-400'}`}
              >
                Bank Slip
              </button>
            </div>

            {/* Amount */}
            <div>
              <label className="input-label">
                <DollarSign size={13} className="inline mr-1 text-gray-400" /> Amount (Rs.)
              </label>
              <input type="number" placeholder="0.00" min="1" step="0.01"
                value={amount} onChange={(e) => setAmount(e.target.value)} onWheel={(e) => e.currentTarget.blur()}
                className="input-field" required />
            </div>

            {/* Already Received */}
            <div>
              <label className="input-label">
                <Receipt size={13} className="inline mr-1 text-gray-400" /> Already Received (Rs.)
              </label>
              <input type="number" placeholder="0.00" min="0" step="0.01"
                value={alreadyReceived} onChange={(e) => setAlreadyReceived(e.target.value)} onWheel={(e) => e.currentTarget.blur()}
                className="input-field" />
            </div>

            {(paymentType === 'cheque' || paymentType === 'bank_slip') && (
              <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-2xl space-y-3">
                <div>
                  <label className="input-label">
                    <Hash size={13} className="inline mr-1 text-gray-400" /> {paymentType === 'bank_slip' ? 'Bank Slip No' : 'Cheque No'}
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., CHQ-458401"
                    value={chequeNo}
                    onChange={(e) => setChequeNo(e.target.value)}
                    className="input-field"
                  />
                </div>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <label className="input-label">
                      <Building2 size={13} className="inline mr-1 text-gray-400" /> Bank Name
                    </label>
                    <input
                      type="text"
                      placeholder="e.g., BOC"
                      value={bankName}
                      onChange={(e) => setBankName(e.target.value)}
                      className="input-field"
                    />
                  </div>
                  <div>
                    <label className="input-label">
                      <Building2 size={13} className="inline mr-1 text-gray-400" /> Branch Name
                    </label>
                    <input
                      type="text"
                      placeholder="e.g., Morawaka"
                      value={branchName}
                      onChange={(e) => setBranchName(e.target.value)}
                      className="input-field"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Live Due Balance */}
            {(parseFloat(amount) || 0) > 0 && (
              <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-3 dark:from-amber-900/20 dark:to-orange-900/10 dark:border-amber-700">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-amber-700 dark:text-amber-300">Due Balance</span>
                  <span className={`text-lg font-bold font-mono ${dueBalance > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                    {formatCurrency(dueBalance)}
                  </span>
                </div>
                <div className="text-[10px] text-amber-500 dark:text-amber-400 mt-0.5">
                  {formatCurrency(parseFloat(amount) || 0)} − {formatCurrency(parseFloat(alreadyReceived) || 0)} = {formatCurrency(dueBalance)}
                </div>
              </div>
            )}

            {/* Sales Person — Auto-inferred from shop, search-select */}
            <div>
              <label className="input-label">
                <User size={13} className="inline mr-1 text-gray-400" /> Sales Person
              </label>
              <SalesPersonSearchSelect
                value={salesPerson}
                onSelect={(val) => {
                  if (isSalesPersonLocked) {
                    return;
                  }
                  setSalesPerson(val);
                  const matched = salesPersons.find(
                    (rep) => String(rep.name).trim().toLowerCase() === String(val).trim().toLowerCase(),
                  );
                  setSalesPersonId(matched?.id || null);
                  setSalesPersonBackendId(matched?.backendId || null);
                }}
                placeholder="Search & select a sales person..."
              />
              {isSalesPersonLocked && (
                <p className="text-[10px] text-gray-500 mt-1 dark:text-slate-400">
                  Sales person is locked from latest store invoice assignment.
                </p>
              )}
              {(shopProfile?.salesPerson || shopSalesPerson) && (
                <p className="text-[10px] text-gray-400 mt-0.5">
                  Default assigned: <span className="font-medium text-gray-500 dark:text-slate-300">{shopProfile?.salesPerson || shopSalesPerson}</span>
                </p>
              )}
            </div>

            {/* Description */}
            <div>
              <label className="input-label">Description</label>
              <input type="text" placeholder="e.g., Wiring supplies & cables"
                value={description} onChange={(e) => setDescription(e.target.value)}
                className="input-field" />
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
              <button type="submit" className="btn-primary flex-1">
                <FileText size={14} className="inline mr-1.5" /> {submitLabel}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}