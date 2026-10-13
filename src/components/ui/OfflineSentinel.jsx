import { useState, useEffect, useRef, useCallback } from 'react';
import { WifiOff, RefreshCw, ShieldCheck } from 'lucide-react';
import { toast } from 'react-toastify';
import { healthApi } from '../../services/api';
import useAppStore from '../../hooks/useAppStore';

/**
 * OfflineSentinel: Autonomous Network Resilience and Zero-State-Loss Sentinel.
 *
 * Catches browser network failures, backend connection drops (ERR_CONNECTION_REFUSED),
 * and API timeouts. Immediately locks document scrolling and displays an executive
 * theme-adaptive full-screen overlay with radar pulsing rings.
 *
 * Conducts heartbeat ping polling to `/api/health` every 3 seconds, smoothly fading
 * out upon restoration, triggering a silent store resync, and displaying a brief
 * non-intrusive emerald top toast without page reloads.
 */
export default function OfflineSentinel() {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [isChecking, setIsChecking] = useState(false);
  const [isFadingOut, setIsFadingOut] = useState(false);
  const [countdown, setCountdown] = useState(3);
  const [restored, setRestored] = useState(false);

  const countdownIntervalRef = useRef(null);

  /**
   * Body Scroll Lock:
   * When offline (isOffline === true), lock page scrolling (document.body.style.overflow = 'hidden').
   * Restore scrolling dynamically when back online (document.body.style.overflow = 'unset').
   */
  useEffect(() => {
    if (isOffline) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOffline]);

  /**
   * Heartbeat health check ping against /api/health.
   * Auto-dismisses the overlay and triggers silent store resync upon restoration.
   */
  const checkConnectivity = useCallback(async () => {
    if (isChecking) return;
    setIsChecking(true);

    try {
      const isHealthy = await healthApi.ping(3000);

      if (isHealthy) {
        // Unlock body scroll immediately upon confirmed reachability
        document.body.style.overflow = 'unset';
        setRestored(true);

        // Notify application components that connectivity is restored
        window.dispatchEvent(new Event('app:network-online'));

        // Silently re-verify components and sync store without window.location.reload()
        try {
          const store = useAppStore.getState?.();
          if (store && typeof store.hydrate === 'function') {
            store.hydrate(true); // true = isBackgroundRefresh
          }
        } catch (_syncErr) {
          // Non-blocking silent resync
        }

        // Show brief emerald top toast: "Connection Restored. System operational." (dismisses after 3s)
        toast.success('Connection Restored. System operational.', {
          position: 'top-center',
          autoClose: 3000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: false,
        });

        // Smoothly fade out the full-screen overlay
        setIsFadingOut(true);
        setTimeout(() => {
          setIsOffline(false);
          setIsFadingOut(false);
          setRestored(false);
          setCountdown(3);
        }, 400);
      } else {
        // Server still unreachable
        setIsOffline(true);
        setRestored(false);
        setCountdown(3);
      }
    } catch (_err) {
      setIsOffline(true);
      setRestored(false);
      setCountdown(3);
    } finally {
      setIsChecking(false);
    }
  }, [isChecking]);

  // Window network and app resilience listeners
  useEffect(() => {
    const handleBrowserOffline = () => {
      setIsOffline(true);
      setIsFadingOut(false);
      setRestored(false);
      setCountdown(3);
    };

    const handleBrowserOnline = () => {
      // Don't blindly trust browser online state; verify real backend reachability
      checkConnectivity();
    };

    const handleAppOfflineEvent = () => {
      if (!isOffline) {
        setIsOffline(true);
        setIsFadingOut(false);
        setRestored(false);
        setCountdown(3);
      }
    };

    const handleAppOnlineEvent = () => {
      if (isOffline) {
        document.body.style.overflow = 'unset';
        setIsFadingOut(true);
        setTimeout(() => {
          setIsOffline(false);
          setIsFadingOut(false);
          setRestored(false);
        }, 400);
      }
    };

    window.addEventListener('offline', handleBrowserOffline);
    window.addEventListener('online', handleBrowserOnline);
    window.addEventListener('app:network-offline', handleAppOfflineEvent);
    window.addEventListener('app:network-online', handleAppOnlineEvent);

    return () => {
      window.removeEventListener('offline', handleBrowserOffline);
      window.removeEventListener('online', handleBrowserOnline);
      window.removeEventListener('app:network-offline', handleAppOfflineEvent);
      window.removeEventListener('app:network-online', handleAppOnlineEvent);
    };
  }, [checkConnectivity, isOffline]);

  // Heartbeat countdown: poll /api/health every 3 seconds while disconnected
  useEffect(() => {
    if (isOffline && !restored && !isFadingOut) {
      countdownIntervalRef.current = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            checkConnectivity();
            return 3;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
      }
    }

    return () => {
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
      }
    };
  }, [isOffline, restored, isFadingOut, checkConnectivity]);

  if (!isOffline && !isFadingOut) {
    return null;
  }

  return (
    <aside
      role="alertdialog"
      aria-modal="true"
      aria-label="Backend Connection Lost"
      className={`fixed inset-0 z-[999999] backdrop-blur-xl flex items-center justify-center p-4 select-none transition-all duration-300 ease-out bg-slate-900/40 text-slate-900 dark:bg-black/80 dark:text-white ${
        isFadingOut ? 'opacity-0 pointer-events-none scale-95' : 'opacity-100 scale-100'
      }`}
    >
      <div
        className="relative w-full max-w-lg rounded-3xl border p-6 sm:p-8 backdrop-blur-2xl transition-all duration-300 bg-white/95 border-slate-200/90 shadow-2xl shadow-slate-900/10 dark:bg-zinc-900/95 dark:border-zinc-800 dark:shadow-2xl dark:shadow-black/60"
      >
        {/* Radar Pulsing Connection Icon (amber/rose glow rings) */}
        <div className="relative flex items-center justify-center w-24 h-24 mx-auto mb-6">
          {/* Outer Radar Glow Ring (Rose glow) */}
          <span className="absolute inline-flex h-full w-full rounded-full bg-rose-500/20 dark:bg-rose-500/25 animate-ping opacity-60" />
          {/* Middle Concentric Radar Ring (Amber glow) */}
          <span className="absolute inline-flex h-20 w-20 rounded-full bg-amber-500/25 dark:bg-amber-500/20 animate-pulse" />
          {/* Inner Accent Ring */}
          <span className="absolute inline-flex h-16 w-16 rounded-full bg-amber-400/20 dark:bg-amber-400/10" />

          {/* Centered Glass Badge with WifiOff */}
          <div className="relative flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-500/20 via-rose-500/15 to-amber-600/20 border border-amber-500/30 text-amber-600 dark:text-amber-400 shadow-lg shadow-amber-500/20 backdrop-blur-md">
            <WifiOff className="w-7 h-7" />
          </div>
        </div>

        {/* Title */}
        <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-center text-slate-900 dark:text-white">
          Backend Connection Lost
        </h2>

        {/* Subtext */}
        <p className="mt-3 text-sm text-center text-slate-600 dark:text-zinc-400 leading-relaxed max-w-md mx-auto">
          Reconnecting to Liyanage Distributors Server. Zero-state loss: Form inputs, drafts, and ledgers remain safely preserved in memory.
        </p>

        {/* Zero-State-Loss Guarantee Callout */}
        <div className="mt-5 flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-emerald-50/90 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-800/60 text-emerald-800 dark:text-emerald-300 text-xs font-medium shadow-sm">
          <ShieldCheck className="w-4 h-4 flex-shrink-0 text-emerald-600 dark:text-emerald-400" />
          <span className="leading-normal">
            Zero-state loss active: All uncommitted form drafts, active filters, and ledger views are safely locked in memory.
          </span>
        </div>

        {/* Auto-reconnect countdown badge + manual "Retry Now" button */}
        <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-3 pt-5 border-t border-slate-200/80 dark:border-zinc-800">
          {/* Auto-reconnect Countdown Badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-100 dark:bg-zinc-800/90 border border-slate-200 dark:border-zinc-700/70 text-xs font-mono font-medium text-slate-700 dark:text-zinc-300">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500" />
            </span>
            <span>Auto-retrying in {countdown}s</span>
          </div>

          {/* Manual Retry Now Button */}
          <button
            type="button"
            onClick={checkConnectivity}
            disabled={isChecking}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-accent-500 hover:bg-accent-600 active:scale-95 text-white text-xs font-semibold shadow-md shadow-accent-500/20 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isChecking ? 'animate-spin' : ''}`} />
            <span>{isChecking ? 'Checking...' : 'Retry Now'}</span>
          </button>
        </div>
      </div>
    </aside>
  );
}
