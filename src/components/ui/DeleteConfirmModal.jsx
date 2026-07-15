import { AlertTriangle, X } from 'lucide-react';

const ENTITY_LABELS = {
  route:   { title: 'Delete Route',      icon: 'Route' },
  store:   { title: 'Delete Store',      icon: 'Store' },
  invoice: { title: 'Delete Invoice',    icon: 'FileText' },
  payment: { title: 'Delete Payment',    icon: 'Receipt' },
  transaction: { title: 'Delete Transaction', icon: 'Receipt' },
  salesperson: { title: 'Delete Sales Person', icon: 'User' },
};

export default function DeleteConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  entityType = 'route',   // 'route' | 'store' | 'invoice' | 'payment' | 'transaction'
  entityName = 'this item',
  extraMessage = null,
  isLoading = false,
}) {
  if (!isOpen) return null;

  const config = ENTITY_LABELS[entityType] || { title: 'Delete Item', icon: 'AlertTriangle' };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      {/* Backdrop — no close on outside click */}
      <div className="absolute inset-0 bg-gray-900/20 backdrop-blur-sm dark:bg-gray-900/40" />
      {/* Modal card */}
      <div className="relative w-full max-w-sm bg-white border border-gray-200 rounded-2xl shadow-xl dark:bg-slate-800 dark:border-slate-700 overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors dark:hover:bg-slate-700"
        >
          <X size={17} />
        </button>

        <div className="p-6 pb-5">
          {/* Danger icon */}
          <div className="mx-auto mb-4 w-12 h-12 rounded-full bg-red-50 flex items-center justify-center border border-red-200 dark:bg-red-900/30 dark:border-red-700">
            <AlertTriangle size={22} className="text-red-500" />
          </div>

          {/* Title */}
          <h3 className="text-center text-lg font-bold text-gray-900 dark:text-slate-100 mb-1">
            {config.title}
          </h3>

          {/* Message */}
          <p className="text-center text-sm text-gray-600 dark:text-slate-400 leading-relaxed">
            Are you sure you want to permanently delete{' '}
            <span className="font-semibold text-gray-800 dark:text-slate-200">
              {entityName}
            </span>
            ? This action cannot be undone.
          </p>

          {/* Optional extra message */}
          {extraMessage && (
            <div className="mt-3 p-3 rounded-xl bg-amber-50 border border-amber-200 dark:bg-amber-900/20 dark:border-amber-700">
              <p className="text-xs text-amber-700 dark:text-amber-300">{extraMessage}</p>
            </div>
          )}
        </div>

        {/* Action buttons */}
        <div className="px-6 pb-6 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition-all dark:bg-slate-700 dark:text-slate-300 dark:border-slate-600 dark:hover:bg-slate-600"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold border-0 bg-red-600 text-white hover:bg-red-700 active:bg-red-800 transition-all shadow-sm shadow-red-500/20"
          >
            {isLoading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Deleting...
              </span>
            ) : (
              'Delete'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}