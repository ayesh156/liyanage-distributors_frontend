import { useState } from 'react';
import {
  ArrowLeft, Plus, Trash2, FileText, Receipt,
  CalendarDays, ChevronDown, Edit3, Printer, DollarSign,
} from 'lucide-react';
import { formatDateYMD } from '../../utils/date';

const formatCurrency = (val) => {
  const numeric = Number(val || 0);
  const sign = numeric < 0 ? '-' : '';
  return `${sign}Rs. ${Math.abs(numeric).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const formatDate = (dateStr) => formatDateYMD(dateStr);

export default function ShopDetail({
  shop,
  transactions,
  outstanding,
  onBack,
  onAddTransaction,
  onDeleteTransaction,
  onEditShop,
  onPrintReceipt,
  onUpdateInvoice,
}) {
  const [sortOrder, setSortOrder] = useState('newest');

  const sorted = [...transactions].sort((a, b) =>
    sortOrder === 'newest'
      ? new Date(b.date) - new Date(a.date)
      : new Date(a.date) - new Date(b.date),
  );

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between mb-6 flex-wrap gap-3">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="btn-ghost p-2 -ml-2">
            <ArrowLeft size={18} />
          </button>
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-slate-100">{shop.name}</h2>
            <p className="text-sm text-gray-500 dark:text-slate-400">
              {shop.route}
              {shop.contact && <span> · {shop.contact}</span>}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => onEditShop(shop)} className="btn-ghost text-xs px-3 py-2">
            <Edit3 size={13} /> Edit
          </button>
          <button onClick={onAddTransaction} className="btn-primary text-xs">
            <Plus size={14} /> Add Invoice
          </button>
        </div>
      </div>

        {/* Summary cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div className="glass-card p-4">
            <p className="text-xs text-gray-500 mb-1 dark:text-slate-400">Total Invoiced</p>
            <p className="text-lg font-bold text-gray-900 dark:text-slate-100">
              {formatCurrency(transactions.reduce((s, t) => s + t.amount, 0))}
            </p>
          </div>
          <div className="glass-card p-4">
            <p className="text-xs text-gray-500 mb-1 dark:text-slate-400">Total Collected</p>
            <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
              {formatCurrency(transactions.reduce((s, t) => s + (t.received || 0), 0))}
            </p>
          </div>
          <div className="glass-card p-4 bg-gradient-to-br from-accent-50 to-accent-100/50 border-accent-200 dark:from-accent-900/20 dark:to-accent-800/10 dark:border-accent-700">
            <p className="text-xs text-gray-500 mb-1 dark:text-slate-400">Outstanding Balance</p>
            <p className={`text-lg font-bold ${outstanding > 0 ? 'text-accent-600 dark:text-accent-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
              {outstanding > 0 ? formatCurrency(outstanding) : 'Rs. 0'}
            </p>
          </div>
        </div>

      {/* Transactions */}
      <div className="glass-card overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-gray-200 flex items-center justify-between dark:border-slate-700">
          <h3 className="text-sm font-semibold text-gray-800 dark:text-slate-200">Transaction History</h3>
          <div className="flex items-center gap-2">
            <div className="relative">
              <select
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value)}
                className="input-field text-xs py-1.5 pr-7 appearance-none cursor-pointer"
              >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
              </select>
              <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="table-header-row">
                <th className="table-header">Date</th>
                <th className="table-header">Doc No</th>
                <th className="table-header">Doc Type</th>
                <th className="table-header">Cheque / Bank</th>
                <th className="table-header text-right">Amount</th>
                <th className="table-header text-right">Received</th>
                <th className="table-header text-right">Balance Due</th>
                <th className="table-header text-center">ACTIONS</th>
              </tr>
            </thead>
            <tbody className="table-divide">
              {sorted.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-gray-500 dark:text-slate-400 text-sm">
                    <Receipt size={28} className="mx-auto mb-2 text-gray-300 dark:text-slate-600" />
                    No transactions yet
                  </td>
                </tr>
              ) : (
                sorted.map((t) => {
                  const docTypeLabel = t.docType === 'Payment'
                    ? `Payment${t.paymentMode ? ` (${String(t.paymentMode).replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase())})` : ''}`
                    : 'Invoice';
                  const chequeDisplay = t.chequeNo
                    ? <span className="font-mono">{t.chequeNo}{t.bankName ? <span className="ml-1 text-gray-400 dark:text-slate-500">/ {t.bankName}</span> : null}</span>
                    : '—';
                  const balanceDue = Math.max(0, (t.amount || 0) - (t.received || 0));
                  return (
                    <tr key={t.id} className="group table-body-row">
                      <td className="table-cell">
                        <div className="flex items-center gap-2">
                          <CalendarDays size={12} className="text-gray-400 dark:text-slate-500" />
                          {formatDate(t.date)}
                        </div>
                      </td>
                      <td className="table-cell font-mono text-xs text-gray-500 dark:text-slate-400">{t.docNo}</td>
                      <td className="table-cell">
                        <span className="text-sm text-gray-600 dark:text-slate-300">{docTypeLabel}</span>
                      </td>
                      <td className="table-cell text-xs text-gray-500 dark:text-slate-400">{chequeDisplay}</td>
                      <td className="table-cell text-right font-semibold font-mono text-sm text-accent-600 dark:text-accent-400">
                        Rs. {Number(t.amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="table-cell text-right font-mono text-sm text-emerald-600 dark:text-emerald-400">
                        {`Rs. ${Number(t.received || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                      </td>
                      <td className="table-cell text-right font-mono text-sm font-semibold">
                        <span className={balanceDue > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}>
                          Rs. {Number(balanceDue || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </td>
                      <td className="table-cell text-center">
                        <div className="flex items-center justify-center gap-1">
                          {/* Print Invoice */}
                          {onPrintReceipt && (
                            <button onClick={() => onPrintReceipt(t)}
                              className="p-1.5 rounded-lg hover:bg-emerald-50 text-gray-400 hover:text-emerald-600 transition-all dark:hover:bg-emerald-900/20 dark:hover:text-emerald-400"
                              title="Print Invoice">
                              <Printer size={13} />
                            </button>
                          )}

                          {/* Collect Payment — only if balanceDue > 0 */}
                          {balanceDue > 0 && (
                            <button
                              onClick={() => onPrintReceipt?.(t)}
                              className="p-1.5 rounded-lg hover:bg-amber-50 text-gray-400 hover:text-amber-600 transition-all dark:hover:bg-amber-900/20 dark:hover:text-amber-400"
                              title="Collect Payment"
                            >
                              <DollarSign size={13} />
                            </button>
                          )}

                          {/* Edit */}
                          <button
                            onClick={() => onUpdateInvoice?.(t.id, t)}
                            className="p-1.5 rounded-lg hover:bg-indigo-50 text-gray-400 hover:text-indigo-600 transition-all dark:hover:bg-indigo-900/20 dark:hover:text-indigo-400"
                            title="Edit"
                          >
                            <Edit3 size={13} />
                          </button>

                          {/* Delete */}
                          <button
                            onClick={() => onDeleteTransaction(t.id)}
                            className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-all dark:hover:bg-red-900/20 dark:hover:text-red-400"
                            title="Delete"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}