import { X, Receipt, CalendarDays, Banknote, CreditCard, Building2, FileText } from 'lucide-react';
import { formatDateYMD } from '../../utils/date';

const formatCurrency = (val) => `Rs. ${Number(val || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const formatDate = (dateStr) => formatDateYMD(dateStr);

const MODE_ICON = { cash: Banknote, cheque: CreditCard, check: Building2, bank_slip: Building2 };
const MODE_LABEL = { cash: 'Cash', cheque: 'Cheque', check: 'Direct Check', bank_slip: 'Bank Slip' };

export default function PaymentHistoryDrawer({ isOpen, onClose, invoice }) {
  if (!isOpen || !invoice) return null;

  const payments = invoice.payments || [];
  const balanceDue = Math.max(0, (invoice.amount || 0) - (invoice.received || 0));

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
              <p className="font-semibold text-emerald-600 dark:text-emerald-400 mt-0.5">{formatCurrency(invoice.received || 0)}</p>
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
          {payments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400 dark:text-slate-500">
              <Receipt size={32} className="mb-2 text-gray-300 dark:text-slate-600" />
              <p className="text-sm">No payments recorded yet</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-slate-700">
              {[...payments]
                .sort((a, b) => new Date(b.date) - new Date(a.date))
                .map((payment) => {
                  const Icon = MODE_ICON[payment.paymentMode] || Receipt;
                  return (
                    <div key={payment.id} className="px-5 py-4 hover:bg-gray-50 dark:hover:bg-slate-700/30 transition-colors">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3">
                          <div className={`p-2 rounded-lg ${
                            payment.paymentMode === 'cash' ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400' :
                            payment.paymentMode === 'cheque' ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' :
                            payment.paymentMode === 'check' ? 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400' :
                            payment.paymentMode === 'bank_slip' ? 'bg-slate-100 text-slate-600 dark:bg-slate-900/30 dark:text-slate-300' :
                            'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                          }`}>
                            <Icon size={16} />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-gray-900 dark:text-slate-100">
                                {formatCurrency(payment.amount)}
                              </span>
                              <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${
                                payment.paymentMode === 'cash' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' :
                                payment.paymentMode === 'cheque' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' :
                                payment.paymentMode === 'check' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300' :
                                payment.paymentMode === 'bank_slip' ? 'bg-slate-100 text-slate-700 dark:bg-slate-900/40 dark:text-slate-300' :
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
                              {payment.chequeNo && (
                                <span className="font-mono">{payment.chequeNo}</span>
                              )}
                            </div>
                            {payment.description && (
                              <p className="text-[11px] text-gray-400 dark:text-slate-500 mt-1">
                                {payment.description}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </div>
      </div>
    </>
  );
}