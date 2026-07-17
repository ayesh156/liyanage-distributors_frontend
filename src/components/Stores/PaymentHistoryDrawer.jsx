import { useState, useEffect } from 'react';
import { X, Receipt, CalendarDays, Banknote, CreditCard, Building2, FileText, Trash2, AlertTriangle, Loader2 } from 'lucide-react';
import { formatDateYMD } from '../../utils/date';
import useAppStore from '../../hooks/useAppStore';

const formatCurrency = (val) => `Rs. ${Number(val || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const formatDate = (dateStr) => formatDateYMD(dateStr);

const MODE_ICON = { cash: Banknote, cheque: CreditCard, check: Building2, bank_slip: Building2, bank_transfer: Receipt };
const MODE_LABEL = { cash: 'Cash', cheque: 'Cheque', check: 'Direct Check', bank_slip: 'Bank Slip', bank_transfer: 'Bank Transfer' };

export default function PaymentHistoryDrawer({ isOpen, onClose, invoice }) {
  const deletePayment = useAppStore((s) => s.deletePayment);
  const [deleteConfirmPayment, setDeleteConfirmPayment] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // ── Local state mirror for live UI removal without drawer toggle ──────
  const [localPayments, setLocalPayments] = useState([]);
  const [localReceived, setLocalReceived] = useState(0);

  // Sync local state whenever the drawer opens or the invoice prop changes
  useEffect(() => {
    if (isOpen && invoice) {
      setLocalPayments(invoice.payments || []);
      setLocalReceived(invoice.received || 0);
    }
  }, [isOpen, invoice]);

  if (!isOpen || !invoice) return null;

  const balanceDue = Math.max(0, (invoice.amount || 0) - localReceived);

  const handleDeleteClick = (payment) => {
    setDeleteConfirmPayment(payment);
  };

  const handleDeleteCancel = () => {
    setDeleteConfirmPayment(null);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteConfirmPayment) return;
    setIsDeleting(true);
    const targetId = deleteConfirmPayment.id;
    const deletedAmount = Number(deleteConfirmPayment.amount || 0);
    try {
      await deletePayment(targetId, invoice);
      // ── LIVE UI REMOVAL: instantly filter the deleted item from the local
      //    array AND subtract its amount from the summary counters, so the
      //    operator sees the payment vanish and the balances re-calc without
      //    needing a drawer toggle cycle ──────────────────────────────────
      setLocalPayments((prev) => prev.filter((p) => String(p.id) !== String(targetId)));
      setLocalReceived((prev) => Math.max(0, prev - deletedAmount));
      setDeleteConfirmPayment(null);
    } catch (err) {
      // error handled by store toast
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40 bg-gray-900/20 backdrop-blur-sm dark:bg-gray-900/40"
        onClick={onClose} />

      {/* Drawer */}
      <div className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-white border-l border-gray-200 shadow-2xl flex flex-col dark:bg-slate-800 dark:border-slate-700">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-200 dark:border-slate-700">
          <div>
            <h3 className="text-base font-semibold text-gray-900 dark:text-slate-100">
              <Receipt size={15} className="inline mr-1.5 text-emerald-500" />
              Payment History
            </h3>
            <p className="text-xs text-gray-500 font-mono mt-0.5 dark:text-slate-400">
              {invoice.docNo}
            </p>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Invoice Summary */}
        <div className="px-5 py-4 bg-gray-50 border-b border-gray-200 dark:bg-slate-700/50 dark:border-slate-700">
          <div className="grid grid-cols-3 gap-3 text-xs">
            <div>
              <span className="text-gray-500 dark:text-slate-400">Invoice Amount</span>
              <p className="font-semibold text-gray-900 dark:text-slate-100 mt-0.5">{formatCurrency(invoice.amount)}</p>
            </div>
            <div>
              <span className="text-gray-500 dark:text-slate-400">Total Received</span>
              <p className="font-semibold text-emerald-600 dark:text-emerald-400 mt-0.5">{formatCurrency(localReceived)}</p>
            </div>
            <div>
              <span className="text-gray-500 dark:text-slate-400">Balance Due</span>
              <p className={`font-semibold mt-0.5 ${balanceDue > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                {formatCurrency(balanceDue)}
              </p>
            </div>
          </div>
        </div>

        {/* Payments List */}
        <div className="flex-1 overflow-y-auto">
          {localPayments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400 dark:text-slate-500">
              <Receipt size={32} className="mb-2 text-gray-300 dark:text-slate-600" />
              <p className="text-sm">No payments recorded yet</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-slate-700">
              {[...localPayments]
                .sort((a, b) => new Date(b.date) - new Date(a.date))
                .map((payment) => {
                  const Icon = MODE_ICON[payment.paymentMode] || Receipt;

                  // ── Multi-property description fallback ────────────────
                  // Exhaustively probe every key the API response shape may use
                  // so that backend-generated descriptions like "Payment collected
                  // for 2341" survive re-hydration without being silently dropped.
                  const textPayload = (
                    payment.description ||
                    payment.amountPaidDescription ||
                    payment.desc ||
                    payment.notes ||
                    payment.paymentDescription ||
                    payment.reason ||
                    payment.msg ||
                    ""
                  ).trim();

                  return (
                    <div key={payment.id} className="px-5 py-4 hover:bg-gray-50 dark:hover:bg-slate-700/30 transition-colors group">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                          <div className={`p-2 rounded-lg shrink-0 ${
                            payment.paymentMode === 'cash' ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400' :
                            payment.paymentMode === 'cheque' ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' :
                            payment.paymentMode === 'check' ? 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400' :
                            payment.paymentMode === 'bank_slip' ? 'bg-slate-100 text-slate-600 dark:bg-slate-900/30 dark:text-slate-300' :
                            payment.paymentMode === 'bank_transfer' ? 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400' :
                            'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                          }`}>
                            <Icon size={16} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm font-medium text-gray-900 dark:text-slate-100">
                                {formatCurrency(payment.amount)}
                              </span>
                              <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded shrink-0 ${
                                payment.paymentMode === 'cash' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' :
                                payment.paymentMode === 'cheque' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' :
                                payment.paymentMode === 'check' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300' :
                                payment.paymentMode === 'bank_slip' ? 'bg-slate-100 text-slate-700 dark:bg-slate-900/40 dark:text-slate-300' :
                                payment.paymentMode === 'bank_transfer' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300' :
                                'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                              }`}>
                                {MODE_LABEL[payment.paymentMode] || payment.paymentMode}
                              </span>
                            </div>
                            <div className="flex items-center gap-3 mt-1 text-[11px] text-gray-500 dark:text-slate-400">
                              <span className="flex items-center gap-1">
                                <CalendarDays size={10} />
                                {formatDate(payment.date)}
                              </span>
                              {payment.chequeNo && payment.paymentMode !== 'bank_transfer' && (
                                <span className="font-mono">{payment.chequeNo}</span>
                              )}
                            </div>
                            {/* ── Multi-line description with 2-line clamp ── */}
                            {textPayload.trim() && (
                              <p className="line-clamp-2 break-words text-xs text-gray-500 font-normal dark:text-slate-400 mt-1 block whitespace-normal leading-relaxed">
                                {textPayload}
                              </p>
                            )}
                          </div>
                        </div>
                        {/* ── Delete payment button ── */}
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDeleteClick(payment); }}
                          className="p-2 rounded-xl text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 dark:hover:text-red-400 transition-colors shrink-0 ml-auto"
                          title="Delete this payment"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </div>
      </div>

      {/* ── Delete Confirmation Modal ───────────────────────────────────── */}
      {deleteConfirmPayment && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-gray-900/30 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-700 w-full max-w-sm shadow-2xl">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2.5 rounded-full bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400">
                  <AlertTriangle size={20} />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-gray-900 dark:text-slate-100">Delete Payment</h4>
                  <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">
                    {formatCurrency(deleteConfirmPayment.amount)} — {formatDate(deleteConfirmPayment.date)}
                  </p>
                </div>
              </div>
              <p className="text-sm text-gray-600 dark:text-slate-300 mb-6">
                Are you sure you want to delete this payment? This will revert the balance due on the invoice.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={handleDeleteCancel}
                  disabled={isDeleting}
                  className="btn-secondary flex-1 text-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteConfirm}
                  disabled={isDeleting}
                  className="flex-1 px-4 py-2.5 text-sm font-medium rounded-xl bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                >
                  {isDeleting ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    <>
                      <Trash2 size={14} />
                      Delete Payment
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}