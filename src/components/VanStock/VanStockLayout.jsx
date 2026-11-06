/**
 * @file VanStockLayout.jsx
 * @description Responsive shell wrapper and network resilience container for the
 * Van Stock module. Aligns seamlessly with the global OfflineSentinel by providing
 * a non-intrusive sticky local offline mutation indicator and auto-sync queue drain.
 */

import React, { useState, useEffect } from 'react';
import { WifiOff, RefreshCw, CheckCircle2, ShieldCheck, Database } from 'lucide-react';
import useVanStockStore from '../../hooks/useVanStockStore';

export default function VanStockLayout({ children, title, subtitle, actions }) {
  const isOnline = useVanStockStore((s) => s.isOnline);
  const setIsOnline = useVanStockStore((s) => s.setIsOnline);
  const offlineQueue = useVanStockStore((s) => s.offlineQueue);
  const processOfflineQueue = useVanStockStore((s) => s.processOfflineQueue);
  const isSyncing = useVanStockStore((s) => s.isSyncing);

  const [justReconnected, setJustReconnected] = useState(false);
  const [reconnectCount, setReconnectCount] = useState(0);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      const drained = processOfflineQueue();
      if (drained > 0) {
        setReconnectCount(drained);
        setJustReconnected(true);
        setTimeout(() => setJustReconnected(false), 3500);
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [setIsOnline, processOfflineQueue]);

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Offline Zero-State-Loss Non-Intrusive Notification Bar */}
      {!isOnline && (
        <div
          role="status"
          className="no-print flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-2xl bg-gradient-to-r from-amber-500/15 via-orange-500/10 to-amber-500/15 border border-amber-300 dark:border-amber-700/60 text-amber-900 dark:text-amber-200 text-xs sm:text-sm font-medium shadow-sm transition-all animate-in fade-in duration-200"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="relative flex h-2.5 w-2.5 flex-shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500" />
            </span>
            <WifiOff className="w-4 h-4 flex-shrink-0 text-amber-600 dark:text-amber-400" />
            <p className="truncate">
              <strong className="font-semibold">Field Offline Mode Active</strong>
              <span className="hidden sm:inline">
                {' '}
                — Operations safely cached locally. Zero state loss guaranteed.
              </span>
            </p>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            {offlineQueue.length > 0 && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-200/60 dark:bg-amber-900/40 text-amber-950 dark:text-amber-200 text-xs font-mono font-medium">
                <Database className="w-3 h-3" />
                {offlineQueue.length} queued
              </span>
            )}
          </div>
        </div>
      )}

      {/* Reconnected Toast Badge */}
      {justReconnected && (
        <div
          role="status"
          className="no-print flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-700/60 text-emerald-900 dark:text-emerald-200 text-xs sm:text-sm font-medium shadow-sm animate-in fade-in slide-in-from-top-1 duration-200"
        >
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
            <span>
              <strong>Reconnected</strong> — {reconnectCount} local operation
              {reconnectCount === 1 ? '' : 's'} synchronized successfully.
            </span>
          </div>
        </div>
      )}

      {/* Page Context Header if title passed */}
      {(title || actions) && (
        <div className="no-print flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            {title && (
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                {title}
              </h1>
            )}
            {subtitle && (
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                {subtitle}
              </p>
            )}
          </div>
          {actions && <div className="flex items-center gap-2 flex-wrap">{actions}</div>}
        </div>
      )}

      {/* Main View Body */}
      {children}
    </div>
  );
}

