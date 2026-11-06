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
  const isDrawingRef = useRef(false);
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

  // Setup Retina Canvas with dimensions preservation
  const setupCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const targetWidth = Math.round(rect.width * dpr);
    const targetHeight = Math.round(rect.height * dpr);

    if (canvas.width !== targetWidth || canvas.height !== targetHeight) {
      // Save existing drawing snapshot if present before resizing
      let prevImage = null;
      if (canvas.width > 0 && canvas.height > 0) {
        prevImage = canvas.toDataURL('image/png');
      }

      canvas.width = targetWidth;
      canvas.height = targetHeight;

      const ctx = canvas.getContext('2d');
      ctx.scale(dpr, dpr);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = '#0f172a'; // Official dark document navy/black ink

      if (prevImage) {
        const img = new Image();
        img.onload = () => {
          ctx.drawImage(img, 0, 0, rect.width, rect.height);
        };
        img.src = prevImage;
      }
    }
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

  // Native Non-Passive Touch Event Binding for Bulletproof Mobile Touch Drawing
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !isOpen) return;

    const handleTouchStart = (e) => {
      e.preventDefault();
      const rect = canvas.getBoundingClientRect();
      const touch = e.touches[0] || e.changedTouches[0];
      if (!touch) return;

      const x = touch.clientX - rect.left;
      const y = touch.clientY - rect.top;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.beginPath();
      ctx.moveTo(x, y);
      isDrawingRef.current = true;
      setIsDrawing(true);
      setHasDrawn(true);
    };

    const handleTouchMove = (e) => {
      e.preventDefault();
      if (!isDrawingRef.current) return;
      const rect = canvas.getBoundingClientRect();
      const touch = e.touches[0] || e.changedTouches[0];
      if (!touch) return;

      const x = touch.clientX - rect.left;
      const y = touch.clientY - rect.top;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.lineTo(x, y);
      ctx.stroke();
    };

    const handleTouchEnd = (e) => {
      e.preventDefault();
      if (isDrawingRef.current) {
        const ctx = canvas.getContext('2d');
        if (ctx) ctx.closePath();
        isDrawingRef.current = false;
        setIsDrawing(false);

        // Capture and validate stroke Base64 payload on touch release
        const dataUrl = canvas.toDataURL('image/png');
        if (dataUrl && dataUrl.length > 500) {
          setHasDrawn(true);
        }
      }
    };

    canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
    canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
    canvas.addEventListener('touchend', handleTouchEnd, { passive: false });
    canvas.addEventListener('touchcancel', handleTouchEnd, { passive: false });

    return () => {
      canvas.removeEventListener('touchstart', handleTouchStart);
      canvas.removeEventListener('touchmove', handleTouchMove);
      canvas.removeEventListener('touchend', handleTouchEnd);
      canvas.removeEventListener('touchcancel', handleTouchEnd);
    };
  }, [isOpen]);

  // Mouse fallback coordinates helper
  const getMouseCoordinates = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  const startMouseDrawing = (e) => {
    e.preventDefault();
    const { x, y } = getMouseCoordinates(e);
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx) return;

    ctx.beginPath();
    ctx.moveTo(x, y);
    isDrawingRef.current = true;
    setIsDrawing(true);
    setHasDrawn(true);
  };

  const drawMouse = (e) => {
    if (!isDrawingRef.current) return;
    e.preventDefault();
    const { x, y } = getMouseCoordinates(e);
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx) return;

    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopMouseDrawing = (e) => {
    if (isDrawingRef.current) {
      e?.preventDefault();
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (ctx) ctx.closePath();
      isDrawingRef.current = false;
      setIsDrawing(false);

      const dataUrl = canvas.toDataURL('image/png');
      if (dataUrl && dataUrl.length > 500) {
        setHasDrawn(true);
      }
    }
  };

  const handleClear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr);
    isDrawingRef.current = false;
    setIsDrawing(false);
    setHasDrawn(false);
  };

  const handleSave = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Export signature as clean PNG data URL
    const signatureDataUrl = canvas.toDataURL('image/png');

    // Strict validation: Reject empty canvas or transparent blocks (< 500 bytes)
    if (!hasDrawn || !signatureDataUrl || signatureDataUrl.length < 500) {
      toast.warning('Please provide a valid signature.');
      return;
    }

    if (!signerName.trim()) {
      toast.warning('Representative signer name is required.');
      return;
    }

    onSave?.({
      signatureData: signatureDataUrl,
      repSignature: signatureDataUrl,
      signature: signatureDataUrl,
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

            {/* Canvas Signature Pad Container - Solid bright background retained in Dark Theme */}
            <div className="relative rounded-2xl border-2 border-dashed border-gray-300 dark:border-slate-500 bg-white dark:bg-white overflow-hidden shadow-inner">
              <canvas
                ref={canvasRef}
                onMouseDown={startMouseDrawing}
                onMouseMove={drawMouse}
                onMouseUp={stopMouseDrawing}
                onMouseLeave={stopMouseDrawing}
                style={{ touchAction: 'none' }}
                className="w-full h-44 sm:h-52 cursor-crosshair touch-none block bg-white"
              />

              {!hasDrawn && (
                <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center text-slate-400 select-none">
                  <PenTool className="w-8 h-8 mb-1.5 opacity-40 animate-bounce" />
                  <span className="text-xs font-semibold">Draw signature here</span>
                  <span className="text-[10px] text-slate-400/90">
                    Signing certifies custodial responsibility for all loaded stock
                  </span>
                </div>
              )}

              {/* Watermark baseline */}
              <div className="absolute bottom-6 left-8 right-8 border-b border-gray-300 pointer-events-none" />
            </div>
          </div>

          {/* Verification Status Feedback Banner with High-Contrast Dark Mode Styling */}
          {uncheckedCount > 0 ? (
            <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-400 border border-amber-300 dark:border-amber-500 text-[11px] text-amber-900 dark:text-amber-950 leading-relaxed flex items-start gap-2.5 shadow-sm">
              <AlertCircle size={16} className="text-amber-700 dark:text-amber-950 flex-shrink-0 mt-0.5" />
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

