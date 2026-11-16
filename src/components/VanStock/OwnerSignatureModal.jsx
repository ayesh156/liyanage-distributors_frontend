/**
 * @file OwnerSignatureModal.jsx
 * @description Modal for configuring and previewing the Warehouse Keeper / Owner
 * official digital wet-ink signature. Allows uploading new signature images (PNG/JPG),
 * resetting to the authentic corporate signature, and updating the dispatcher title/name.
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { X, RotateCcw, Check, ShieldCheck, PenTool, Eraser } from 'lucide-react';
import { toast } from 'react-toastify';
import useVanStockStore from '../../hooks/useVanStockStore';
import { DEFAULT_OWNER_SIGNATURE } from '../../data/defaultOwnerSignature';

export default function OwnerSignatureModal({ isOpen, onClose }) {
  const ownerSignatureData = useVanStockStore((s) => s.ownerSignatureData);
  const ownerSignerName = useVanStockStore((s) => s.ownerSignerName);
  const setOwnerSignatureData = useVanStockStore((s) => s.setOwnerSignatureData);

  const [signerName, setSignerName] = useState(ownerSignerName || 'W. Liyanage (Managing Director / Owner)');
  const [hasDrawn, setHasDrawn] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const canvasRef = useRef(null);
  const isDrawingRef = useRef(false);

  // Setup Retina Canvas & render initial signature if present
  const setupCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const targetWidth = Math.round(rect.width * dpr);
    const targetHeight = Math.round(rect.height * dpr);

    if (canvas.width !== targetWidth || canvas.height !== targetHeight) {
      canvas.width = targetWidth;
      canvas.height = targetHeight;
    }

    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = '#0f172a'; // Official document dark ink

    // Load existing signature onto canvas if not drawn fresh
    const initialSig = ownerSignatureData || DEFAULT_OWNER_SIGNATURE;
    if (initialSig && !hasDrawn) {
      const img = new Image();
      img.onload = () => {
        ctx.clearRect(0, 0, rect.width, rect.height);
        const scale = Math.min((rect.width - 40) / img.width, (rect.height - 40) / img.height, 1);
        const w = img.width * scale;
        const h = img.height * scale;
        const x = (rect.width - w) / 2;
        const y = (rect.height - h) / 2;
        ctx.drawImage(img, x, y, w, h);
      };
      img.src = initialSig;
    }
  }, [ownerSignatureData, hasDrawn]);

  useEffect(() => {
    if (isOpen) {
      setSignerName(ownerSignerName || 'W. Liyanage (Managing Director / Owner)');
      setHasDrawn(false);
      const timer = setTimeout(setupCanvas, 100);
      window.addEventListener('resize', setupCanvas);
      return () => {
        clearTimeout(timer);
        window.removeEventListener('resize', setupCanvas);
      };
    }
  }, [isOpen, ownerSignerName, setupCanvas]);

  // Native Non-Passive Touch Event Binding for Mobile Touch Drawing
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !isOpen) return;

    const handleTouchStart = (e) => {
      e.preventDefault();
      const rect = canvas.getBoundingClientRect();
      const touch = e.touches[0] || e.changedTouches[0];
      if (!touch) return;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const x = touch.clientX - rect.left;
      const y = touch.clientY - rect.top;
      ctx.beginPath();
      ctx.moveTo(x, y);
      isDrawingRef.current = true;
      setHasDrawn(true);
    };

    const handleTouchMove = (e) => {
      e.preventDefault();
      if (!isDrawingRef.current) return;
      const rect = canvas.getBoundingClientRect();
      const touch = e.touches[0] || e.changedTouches[0];
      if (!touch) return;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const x = touch.clientX - rect.left;
      const y = touch.clientY - rect.top;
      ctx.lineTo(x, y);
      ctx.stroke();
    };

    const handleTouchEnd = (e) => {
      e.preventDefault();
      if (isDrawingRef.current) {
        const ctx = canvas.getContext('2d');
        if (ctx) ctx.closePath();
        isDrawingRef.current = false;
        setHasDrawn(true);
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

  // Mouse fallback handlers
  const getMousePos = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const handleMouseDown = (e) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx) return;

    const { x, y } = getMousePos(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    isDrawingRef.current = true;
    setHasDrawn(true);
  };

  const handleMouseMove = (e) => {
    if (!isDrawingRef.current) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx) return;

    const { x, y } = getMousePos(e);
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const handleMouseUp = (e) => {
    if (isDrawingRef.current) {
      e?.preventDefault();
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (ctx) ctx.closePath();
      isDrawingRef.current = false;
      setHasDrawn(true);
    }
  };

  const handleClear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr);
    isDrawingRef.current = false;
    setHasDrawn(false);
    toast.info('Canvas cleared. Please draw signature.');
  };

  const handleResetDefault = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr);
    const rect = canvas.getBoundingClientRect();

    const img = new Image();
    img.onload = () => {
      const scale = Math.min((rect.width - 40) / img.width, (rect.height - 40) / img.height, 1);
      const w = img.width * scale;
      const h = img.height * scale;
      const x = (rect.width - w) / 2;
      const y = (rect.height - h) / 2;
      ctx.drawImage(img, x, y, w, h);
      setHasDrawn(true);
      toast.info('Reset signature to authentic corporate default asset.');
    };
    img.src = DEFAULT_OWNER_SIGNATURE;
  };

  const handleSave = async () => {
    if (!signerName.trim()) {
      toast.error('Signer name/title is required.');
      return;
    }
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dataUrl = canvas.toDataURL('image/png');

    setIsSaving(true);
    try {
      await setOwnerSignatureData(dataUrl, signerName.trim());
      toast.success('Owner / Warehouse Keeper signature saved and locked in.');
      onClose();
    } catch (_err) {
      toast.error('Failed to save signature.');
    } finally {
      setIsSaving(false);
    }
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
                Draw official wet-ink signature for van manifests and stock transfers
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

          {/* Signature Drawing Canvas Box */}
          <div>
            <div className="flex items-center justify-between mb-1.5 flex-wrap gap-2">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <PenTool size={13} className="text-accent-600 dark:text-accent-400" />
                <span>Draw Wet-Ink Signature (Touch / Stylus / Mouse)</span>
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleClear}
                  className="flex items-center gap-1 text-[11px] text-rose-600 dark:text-rose-400 hover:underline cursor-pointer"
                >
                  <Eraser size={12} />
                  <span>Clear</span>
                </button>
                <button
                  type="button"
                  onClick={handleResetDefault}
                  className="flex items-center gap-1 text-[11px] text-accent-600 dark:text-accent-400 hover:underline cursor-pointer"
                >
                  <RotateCcw size={12} />
                  <span>Reset Default</span>
                </button>
              </div>
            </div>

            <div className="p-1 rounded-2xl border-2 border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-950 flex flex-col items-center justify-center shadow-inner relative">
              <canvas
                ref={canvasRef}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                className="w-full h-44 bg-slate-50/70 dark:bg-slate-950 rounded-xl cursor-crosshair touch-none"
              />
              <div className="w-3/4 border-b border-dashed border-gray-300 dark:border-slate-700 mt-1 mb-1 pointer-events-none" />
              <span className="text-[10px] text-slate-400 dark:text-slate-500 pointer-events-none pb-1">
                Official Dispatcher Sign-Off Stamp
              </span>
            </div>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 text-center mt-1">
              Use mouse, finger, or stylus to draw. Saved signature updates SystemSetting globally.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 bg-slate-50 dark:bg-slate-800/80 border-t border-gray-100 dark:border-slate-800 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="px-4 py-2 text-xs font-semibold rounded-xl border border-gray-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-2 px-5 py-2 text-xs font-bold rounded-xl bg-accent-600 hover:bg-accent-700 disabled:opacity-50 text-white shadow-md shadow-accent-600/20 active:scale-95 transition-all cursor-pointer"
          >
            <Check size={14} />
            <span>{isSaving ? 'Saving...' : 'Save & Apply Signature'}</span>
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

