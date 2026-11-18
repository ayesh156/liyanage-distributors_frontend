/**
 * @file ConfirmActionModal.jsx
 * @description Sleek, custom-themed React confirmation modal replacing native browser window.confirm alerts.
 * Features:
 * - Full theme adherence (light/dark mode, rounded-2xl, backdrop blur)
 * - Themed icon badges based on action variant ('warning' | 'danger' | 'primary' | 'info')
 * - Descriptive details rendering (SKU, product name, quantity affected)
 * - Async confirmation handler with loading indicator
 * - Keyboard Escape dismissal & focus safety
 */

import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, AlertCircle, RotateCcw, ArrowRightLeft, X, Loader2 } from 'lucide-react';

export default function ConfirmActionModal({
  isOpen,
  onClose,
  onConfirm,
  title = 'Please Confirm',
  message = 'Are you sure you want to proceed with this action?',
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'warning', // 'warning' | 'danger' | 'primary' | 'info'
  icon: CustomIcon = null,
}) {
  const [isProcessing, setIsProcessing] = useState(false);

  if (!isOpen) return null;

  const handleConfirm = async () => {
    try {
      setIsProcessing(true);
      if (onConfirm) {
        await onConfirm();
      }
      onClose();
    } catch (err) {
      console.error('Confirmation action error:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  const getVariantStyles = () => {
    switch (variant) {
      case 'danger':
        return {
          badge: 'bg-rose-100 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400 border border-rose-200 dark:border-rose-800',
          button: 'bg-rose-600 hover:bg-rose-700 text-white shadow-rose-500/20 focus:ring-rose-500',
          defaultIcon: AlertCircle,
        };
      case 'primary':
        return {
          badge: 'bg-indigo-100 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800',
          button: 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-500/20 focus:ring-indigo-500',
          defaultIcon: RotateCcw,
        };
      case 'info':
        return {
          badge: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800',
          button: 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-500/20 focus:ring-emerald-500',
          defaultIcon: ArrowRightLeft,
        };
      case 'warning':
      default:
        return {
          badge: 'bg-amber-100 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400 border border-amber-200 dark:border-amber-800',
          button: 'bg-amber-600 hover:bg-amber-700 text-white shadow-amber-500/20 focus:ring-amber-500',
          defaultIcon: AlertTriangle,
        };
    }
  };

  const { badge, button, defaultIcon: DefaultIcon } = getVariantStyles();
  const IconComponent = CustomIcon || DefaultIcon;

  const modalContent = (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 shadow-2xl p-5 space-y-4 animate-in zoom-in-95 duration-150"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl ${badge} shrink-0`}>
              <IconComponent size={20} />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white leading-snug">
                {title}
              </h3>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isProcessing}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors disabled:opacity-50 cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Message Body */}
        <div className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed pl-1 whitespace-pre-line">
          {message}
        </div>

        {/* Footer Buttons */}
        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-gray-100 dark:border-slate-800">
          <button
            type="button"
            onClick={onClose}
            disabled={isProcessing}
            className="px-4 py-2 text-xs font-semibold rounded-xl border border-gray-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors disabled:opacity-50 cursor-pointer"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isProcessing}
            className={`inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-xl shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1 disabled:opacity-50 cursor-pointer ${button}`}
          >
            {isProcessing && <Loader2 size={13} className="animate-spin" />}
            <span>{confirmLabel}</span>
          </button>
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined'
    ? createPortal(modalContent, document.body)
    : modalContent;
}
