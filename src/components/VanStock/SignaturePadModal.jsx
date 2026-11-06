/**
 * @file SignaturePadModal.jsx
 * @description Strict modal containing high-DPI retina touch/stylus/mouse HTML5 canvas
 * signature pad for Sales Representative mobile load sheet sign-off.
 *
 * Strict Guardrails:
 * - Backdrop click-to-close is strictly disabled.
 * - Escape key dismissal is strictly disabled.
 * - Submission validated: prevents submitting a blank canvas.
 * - Inks normalized to dark official document navy/black (#0f172a) on export.
 */

import React, { useRef, useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { X, RotateCcw, CheckCircle2, PenTool, ShieldCheck, AlertCircle } from 'lucide-react';
import { toast } from 'react-toastify';
import { formatDateYYYYMMDD } from '../../utils/date';

export default function SignaturePadModal({
  isOpen,
  onClose,
  onSave,
  defaultSignerName = 'Kamal Perera',
  title = 'Sales Representative Digital Acceptance Signature',
  vehicleId = 'VAN-01',
  manifestNo = 'MAN-20261105-01',
  uncheckedCount = 0,
  totalCount = 0,
}) {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);
  const [signerName, setSignerName] = useState(defaultSignerName);
  const [signDate, setSignDate] = useState('');

  // Set local timestamp
  useEffect(() => {
    if (isOpen) {
      setSignDate(formatDateYYYYMMDD(new Date(), true));
      setSignerName(defaultSignerName);
      setHasDrawn(false);
    }
  }, [isOpen, defaultSignerName]);

  // Strict Escape Key Disabler
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        // STRICT GUARD: Block accidental escape dismissal
        e.preventDefault();
        e.stopPropagation();
      }
    };
    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [isOpen]);

  // Setup Retina Canvas
  const setupCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;

    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;

    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = '#0f172a'; // Official dark document ink
  }, []);

  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(setupCanvas, 100);
      window.addEventListener('resize', setupCanvas);
      return () => {
        clearTimeout(timer);
        window.removeEventListener('resize', setupCanvas);
      };
    }
  }, [isOpen, setupCanvas]);

  // Coordinates helper
  const getCoordinates = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();

    if (e.touches && e.touches.length > 0) {
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top,
      };
    }
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  const startDrawing = (e) => {
    e.preventDefault();
    const { x, y } = getCoordinates(e);
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx) return;

    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
    setHasDrawn(true);
  };

  const draw = (e) => {
    if (!isDrawing) return;
    e.preventDefault();
    const { x, y } = getCoordinates(e);
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx) return;

    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = (e) => {
    if (isDrawing) {
      e?.preventDefault();
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (ctx) ctx.closePath();
      setIsDrawing(false);
    }
  };

  const handleClear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr);
    setHasDrawn(false);
  };

  const handleSave = () => {
    if (!hasDrawn) {
      toast.warning('Please provide a handwritten signature on the canvas pad before confirming.');
      return;
    }
    if (!signerName.trim()) {
      toast.warning('Representative signer name is required.');
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;

    // Export signature as clean transparent/crisp PNG data URL
    const signatureDataUrl = canvas.toDataURL('image/png');

    onSave?.({
      signatureData: signatureDataUrl,
      signerName: signerName.trim(),
      timestamp: new Date().toISOString(),
    });

    onClose?.();
  };

  if (!isOpen) return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/80 backdrop-blur-md animate-in fade-in duration-200"
      /* STRICT GUARD: Clicking backdrop does NOTHING */
      onClick={(e) => e.stopPropagation()}
    >
      <div
        className="w-full max-w-xl bg-white dark:bg-slate-900 rounded-3xl border border-gray-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Bar with explicit close button */}
        <div className="px-5 py-4 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/60 dark:bg-slate-800/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-accent-50 dark:bg-accent-950/40 text-accent-600 dark:text-accent-400 border border-accent-200 dark:border-accent-800 flex items-center justify-center">
              <PenTool size={20} />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                {title}
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Vehicle: <strong>{vehicleId}</strong> â€¢ Manifest: <strong>{manifestNo}</strong>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            title="Cancel & Close Modal"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-4">
          {/* Signer Identity Input */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Representative Signer Full Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={signerName}
                onChange={(e) => setSignerName(e.target.value)}
                placeholder="e.g. Kamal Perera"
                className="w-full px-3 py-2 text-xs rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-accent-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Sign-Off Timestamp
              </label>
              <div className="px-3 py-2 text-xs rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-mono truncate">
                {signDate || 'Current Local Time'}
              </div>
            </div>
          </div>

          {/* Canvas Signature Pad Container */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <span>Handwritten Ink Signature</span>
                <span className="text-[10px] text-accent-600 dark:text-accent-400 font-normal">
                  (Touch screen, stylus or mouse)
                </span>
              </label>

              <button
                type="button"
                onClick={handleClear}
                className="flex items-center gap-1 text-[11px] text-slate-500 hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-400 font-medium transition-colors cursor-pointer"
              >
                <RotateCcw size={12} />
                <span>Clear Pad</span>
              </button>
            </div>

            <div className="relative rounded-2xl border-2 border-dashed border-gray-300 dark:border-slate-700 bg-[#f8fafc] dark:bg-slate-950 overflow-hidden shadow-inner">
              <canvas
                ref={canvasRef}
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                onTouchStart={startDrawing}
                onTouchMove={draw}
                onTouchEnd={stopDrawing}
                className="w-full h-44 sm:h-52 cursor-crosshair touch-none block"
              />

              {!hasDrawn && (
                <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center text-slate-400 dark:text-slate-600 select-none">
                  <PenTool className="w-8 h-8 mb-1.5 opacity-30 animate-bounce" />
                  <span className="text-xs font-medium">Draw signature here</span>
                  <span className="text-[10px] text-slate-400/80">
                    Signing certifies custodial responsibility for all loaded stock
                  </span>
                </div>
              )}

              {/* Watermark baseline */}
              <div className="absolute bottom-6 left-8 right-8 border-b border-gray-200 dark:border-slate-800 pointer-events-none" />
            </div>
          </div>

          {/* Verification Status Feedback Banner */}
          {uncheckedCount > 0 ? (
            <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 text-[11px] text-amber-900 dark:text-amber-200 leading-relaxed flex items-start gap-2.5">
              <AlertCircle size={16} className="text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Partial Discrepancy Notice</p>
                <p className="mt-0.5">
                  <strong>{uncheckedCount}</strong> of <strong>{totalCount}</strong> items are currently unticked.
                  Signing and confirming will certify only ticked items and flag an official <strong>Partial Discrepancy</strong> manifest to Warehouse Dispatch.
                </p>
              </div>
            </div>
          ) : (
            <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 text-[11px] text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
              <CheckCircle2 size={16} className="text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
              <p>
                <strong>100% Item-Verified:</strong> All {totalCount} items counted on truck. Ready for full manifest sign-off.
              </p>
            </div>
          )}

          {/* Custodial Legal Notice */}
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-gray-200 dark:border-slate-700/80 text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed flex items-start gap-2.5">
            <ShieldCheck size={16} className="text-accent-600 dark:text-accent-400 flex-shrink-0 mt-0.5" />
            <p>
              I hereby acknowledge physical verification and acceptance of all loaded products on{' '}
              <strong className="text-slate-900 dark:text-white">{vehicleId}</strong>. I accept
              custodial responsibility for these goods and agree to reconcile all sales invoices and
              returns against this manifest.
            </p>
          </div>
        </div>

        {/* Footer Actions */}
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
            disabled={!hasDrawn}
            className={`flex items-center gap-2 px-5 py-2 text-xs font-bold rounded-xl text-white shadow-md active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer ${
              uncheckedCount > 0
                ? 'bg-amber-600 hover:bg-amber-700 shadow-amber-600/20'
                : 'bg-accent-600 hover:bg-accent-700 shadow-accent-600/20'
            }`}
          >
            <CheckCircle2 size={15} />
            <span>
              {uncheckedCount > 0 ? `Confirm Partial Manifest (${uncheckedCount} Unchecked)` : 'Confirm & Attach Signature'}
            </span>
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

