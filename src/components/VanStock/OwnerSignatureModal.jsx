/**
 * @file OwnerSignatureModal.jsx
 * @description Modal for configuring and previewing the Warehouse Keeper / Owner
 * official digital wet-ink signature. Allows uploading new signature images (PNG/JPG),
 * resetting to the authentic corporate signature, and updating the dispatcher title/name.
 */

import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Upload, RotateCcw, Check, ShieldCheck, PenTool, Image as ImageIcon } from 'lucide-react';
import { toast } from 'react-toastify';
import useVanStockStore from '../../hooks/useVanStockStore';
import { DEFAULT_OWNER_SIGNATURE } from '../../data/defaultOwnerSignature';

export default function OwnerSignatureModal({ isOpen, onClose }) {
  const ownerSignatureData = useVanStockStore((s) => s.ownerSignatureData);
  const ownerSignerName = useVanStockStore((s) => s.ownerSignerName);
  const setOwnerSignatureData = useVanStockStore((s) => s.setOwnerSignatureData);

  const [previewDataUrl, setPreviewDataUrl] = useState(ownerSignatureData || DEFAULT_OWNER_SIGNATURE);
  const [signerName, setSignerName] = useState(ownerSignerName || 'W. Liyanage (Managing Director / Owner)');
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setPreviewDataUrl(ownerSignatureData || DEFAULT_OWNER_SIGNATURE);
      setSignerName(ownerSignerName || 'W. Liyanage (Managing Director / Owner)');
    }
  }, [isOpen, ownerSignatureData, ownerSignerName]);

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please upload a valid image file (PNG, JPG, SVG).');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast.error('Signature file must be smaller than 2MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result;
      if (typeof dataUrl === 'string') {
        setPreviewDataUrl(dataUrl);
        toast.info('New signature preview loaded.');
      }
    };
    reader.readAsDataURL(file);
  };

  const handleResetDefault = () => {
    setPreviewDataUrl(DEFAULT_OWNER_SIGNATURE);
    toast.info('Reset signature preview to authentic default asset.');
  };

  const handleSave = () => {
    if (!signerName.trim()) {
      toast.error('Signer name/title is required.');
      return;
    }
    setOwnerSignatureData(previewDataUrl, signerName.trim());
    toast.success('Owner / Warehouse Keeper signature saved and locked in.');
    onClose();
  };

  if (!isOpen) return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/80 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl border border-gray-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/60 dark:bg-slate-800/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800 flex items-center justify-center">
              <ShieldCheck size={20} />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                Warehouse Keeper / Owner Signature
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Official signature asset attached to daily van manifests
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 overflow-y-auto space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Dispatcher / Owner Signer Name & Title
            </label>
            <input
              type="text"
              value={signerName}
              onChange={(e) => setSignerName(e.target.value)}
              placeholder="e.g. W. Liyanage (Managing Director / Owner)"
              className="w-full px-3 py-2 text-xs rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-accent-500"
            />
          </div>

          {/* Signature Preview Canvas Box */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Active Digital Wet-Ink Signature
              </label>
              <button
                type="button"
                onClick={handleResetDefault}
                className="flex items-center gap-1 text-[11px] text-accent-600 dark:text-accent-400 hover:underline cursor-pointer"
              >
                <RotateCcw size={12} />
                <span>Reset to Default</span>
              </button>
            </div>

            <div className="p-4 rounded-2xl border-2 border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-950 flex flex-col items-center justify-center min-h-[140px] shadow-inner relative">
              {previewDataUrl ? (
                <img
                  src={previewDataUrl}
                  alt="Owner Signature"
                  className="max-h-24 max-w-full object-contain filter dark:invert-0"
                />
              ) : (
                <div className="text-slate-400 text-xs flex flex-col items-center">
                  <ImageIcon className="w-8 h-8 mb-1 opacity-40" />
                  <span>No signature configured</span>
                </div>
              )}
              <div className="w-3/4 border-b border-dashed border-gray-300 dark:border-slate-700 mt-2" />
              <span className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">
                Official Dispatcher Sign-Off Stamp
              </span>
            </div>
          </div>

          {/* Upload Input Action */}
          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/svg+xml"
              onChange={handleFileUpload}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border border-dashed border-accent-300 dark:border-accent-700/80 bg-accent-50/50 dark:bg-accent-950/20 text-accent-700 dark:text-accent-300 hover:bg-accent-100/50 text-xs font-semibold transition-all cursor-pointer"
            >
              <Upload size={14} />
              <span>Upload Signature Image (PNG / JPG)</span>
            </button>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 text-center mt-1">
              Supports transparent PNG or black ink on white background (under 2MB)
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 bg-slate-50 dark:bg-slate-800/80 border-t border-gray-100 dark:border-slate-800 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold rounded-xl border border-gray-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="flex items-center gap-2 px-5 py-2 text-xs font-bold rounded-xl bg-accent-600 hover:bg-accent-700 text-white shadow-md shadow-accent-600/20 active:scale-95 transition-all cursor-pointer"
          >
            <Check size={14} />
            <span>Save & Apply Signature</span>
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

