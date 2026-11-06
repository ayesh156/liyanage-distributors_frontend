/**
 * @file VanStockShareView.jsx
 * @description Standalone public view-only manifest page (/share/van-manifest).
 * Zero-login required. Designed explicitly for mobile field sales reps accessing
 * today's delivery truck manifest via WhatsApp/SMS links without sidebar admin chrome.
 * Includes interactive mobile signature drawer, dual official signature blocks,
 * and WCAG-compliant high-contrast Dark & Light mode tokens.
 */

import React, { useState, useMemo, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import {
  Truck,
  CheckCircle2,
  Clock,
  MapPin,
  User,
  Calendar,
  ShieldCheck,
  PenTool,
  Check,
  CheckSquare,
  Square,
  AlertTriangle,
  AlertCircle,
  History,
  RotateCcw,
} from 'lucide-react';
import { toast } from 'react-toastify';
import useVanStockStore from '../../hooks/useVanStockStore';
import { calcNetUnitPrice, calcTotalRealValue, formatLKR, formatDateYYYYMMDD } from '../../data/vanStockData';
import { DEFAULT_OWNER_SIGNATURE } from '../../data/defaultOwnerSignature';
import { vanStockApi } from '../../services/vanStockApi';
import SignaturePadModal from './SignaturePadModal';

export default function VanStockShareView() {
  const { manifestNo: routeManifestNo } = useParams();
  const [searchParams] = useSearchParams();
  const dateParam = searchParams.get('date');
  const queryManifestNo = searchParams.get('manifestNo');
  const targetCode = routeManifestNo || queryManifestNo || (dateParam ? `MAN-${dateParam.replace(/-/g, '')}-01` : null);

  const vanStock = useVanStockStore((s) => s.vanStock);
  const vehicle = useVanStockStore((s) => s.vehicle);
  const dailyManifest = useVanStockStore((s) => s.dailyManifest);
  const manifestHistory = useVanStockStore((s) => s.manifestHistory) || [];
  const getManifestByCode = useVanStockStore((s) => s.getManifestByCode);
  const ownerSignatureData = useVanStockStore((s) => s.ownerSignatureData);
  const submitRepVerificationWithSignature = useVanStockStore((s) => s.submitRepVerificationWithSignature);
  const toggleRepItemChecked = useVanStockStore((s) => s.toggleRepItemChecked);
  const toggleAllRepItemsChecked = useVanStockStore((s) => s.toggleAllRepItemsChecked);

  const [isSignatureModalOpen, setIsSignatureModalOpen] = useState(false);
  const [localItemChecks, setLocalItemChecks] = useState({});
  const [remoteManifest, setRemoteManifest] = useState(null);
  const [fetchError, setFetchError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(Boolean(targetCode));

  // Live public manifest hydration for WhatsApp zero-login links
  useEffect(() => {
    let isMounted = true;
    if (targetCode) {
      setIsLoading(true);
      setFetchError(false);
      setErrorMessage('');

      vanStockApi.getPublicManifestShare(targetCode)
        .then((res) => {
          if (!isMounted) return;
          if (res?.data) {
            setRemoteManifest(res.data);
            setFetchError(false);
          } else {
            // Check local store fallback before declaring missing manifest
            const localFallback = getManifestByCode ? getManifestByCode(targetCode) : null;
            if (!localFallback) {
              setFetchError(true);
              setErrorMessage('Manifest Not Found or Link Invalid. Please verify the link with your warehouse dispatcher.');
            }
          }
        })
        .catch((err) => {
          if (!isMounted) return;
          console.warn('[VanStockShareView] Failed to fetch manifest:', err);

          // Check if local store has this exact manifest before declaring failure
          const localFallback = getManifestByCode ? getManifestByCode(targetCode) : null;
          const foundInHistory = manifestHistory.find(
            (m) => m.manifestNo === targetCode || m.id === targetCode
          );

          if (localFallback || foundInHistory) {
            // Local offline data is available for this manifest
            setFetchError(false);
          } else {
            setFetchError(true);
            setErrorMessage('Manifest Not Found or Link Invalid. Please verify the link with your warehouse dispatcher.');
          }
        })
        .finally(() => {
          if (isMounted) {
            setIsLoading(false);
          }
        });
    } else {
      setIsLoading(false);
      setFetchError(false);
    }

    return () => {
      isMounted = false;
    };
  }, [targetCode, getManifestByCode, manifestHistory]);

  // Determine active manifest based on remote response or route/query parameters
  const matchedManifest = useMemo(() => {
    if (remoteManifest) return remoteManifest;
    if (!targetCode) return dailyManifest;
    if (getManifestByCode) {
      const found = getManifestByCode(targetCode);
      if (found) return found;
    }
    const foundInHistory = manifestHistory.find(
      (m) =>
        m.manifestNo === targetCode ||
        m.id === targetCode ||
        (dateParam && m.manifestDate && m.manifestDate.startsWith(dateParam))
    );
    if (foundInHistory) return foundInHistory;

    // Do NOT fall back to dailyManifest if a specific targetCode was requested but not found
    return null;
  }, [remoteManifest, targetCode, dateParam, dailyManifest, manifestHistory, getManifestByCode]);

  // Helper to extract revision number from manifest object or manifestNo code
  const getRevisionNumber = (manifest) => {
    if (!manifest) return 1;
    if (typeof manifest.manifestRevision === 'number') return manifest.manifestRevision;
    const match = String(manifest.manifestNo || '').match(/-R(\d+)$/i);
    return match ? parseInt(match[1], 10) : 1;
  };

  // Determine whether this manifest is the latest revision for that Van on that date
  const isLatestRevision = useMemo(() => {
    if (!matchedManifest) return true;

    // Prioritize authoritative backend evaluation if returned
    if (typeof matchedManifest.isLatestRevision === 'boolean') {
      return matchedManifest.isLatestRevision;
    }

    const currentRev = getRevisionNumber(matchedManifest);
    const currentDateStr = matchedManifest.manifestDate
      ? String(matchedManifest.manifestDate).slice(0, 10)
      : '';

    // Check store dailyManifest
    if (dailyManifest) {
      const dailyDateStr = dailyManifest.manifestDate
        ? String(dailyManifest.manifestDate).slice(0, 10)
        : '';
      const dailyRev = getRevisionNumber(dailyManifest);
      if (currentDateStr && dailyDateStr && currentDateStr === dailyDateStr && dailyRev > currentRev) {
        return false;
      }
    }

    // Check store manifestHistory for any newer revision on the same date
    if (manifestHistory && manifestHistory.length > 0) {
      const hasNewer = manifestHistory.some((m) => {
        const mDateStr = m.manifestDate ? String(m.manifestDate).slice(0, 10) : '';
        const mRev = getRevisionNumber(m);
        return mDateStr === currentDateStr && mRev > currentRev;
      });
      if (hasNewer) return false;
    }

    return true;
  }, [matchedManifest, dailyManifest, manifestHistory]);

  // Active Manifest Resolution Logic:
  // Manifest is Active (and signable) if its status is DISPATCHED or PENDING (or requires rep signature),
  // AND it is the most recent revision for that Van on that date.
  // The strict historical lock is removed if the manifest status explicitly requires a rep signature.
  const isHistorical = useMemo(() => {
    if (!matchedManifest) return false;

    // Prioritize authoritative backend evaluation if provided
    if (typeof matchedManifest.isHistorical === 'boolean') {
      return matchedManifest.isHistorical;
    }

    const status = String(matchedManifest.status || '').toUpperCase();
    const requiresRepSignature =
      status === 'DISPATCHED' || status === 'PENDING' || !matchedManifest.repSignatureData;

    // If it is the latest revision and requires rep signature, it is strictly Active (not historical)
    if (isLatestRevision && requiresRepSignature) {
      return false;
    }

    // If it is an older revision, it is historical
    if (!isLatestRevision) {
      return true;
    }

    // If it's today's latest revision, keep it active to allow verification / updates
    const todayStr = new Date().toISOString().slice(0, 10);
    const manifestDateStr = matchedManifest.manifestDate
      ? String(matchedManifest.manifestDate).slice(0, 10)
      : todayStr;

    if (manifestDateStr < todayStr && !requiresRepSignature) {
      return true;
    }

    return false;
  }, [matchedManifest, isLatestRevision]);

  const activeManifest = matchedManifest || (targetCode ? null : dailyManifest);

  // If a specific targetCode was requested, finished loading, and no manifest resolved, flag error state
  const hasUnresolvedManifest = Boolean(targetCode && !isLoading && !activeManifest);
  const showErrorScreen = fetchError || hasUnresolvedManifest;

  // Derive active van items, prioritizing snapshot from activeManifest so newly added revision items render accurately
  const activeVanItems = useMemo(() => {
    const rawItems = (activeManifest?.items && activeManifest.items.length > 0)
      ? activeManifest.items
      : vanStock.filter((v) => v.quantity > 0);

    return rawItems.map((item) => {
      const isChecked = localItemChecks[item.id] !== undefined
        ? localItemChecks[item.id]
        : Boolean(item.repChecked);
      return {
        ...item,
        repChecked: isChecked,
      };
    });
  }, [activeManifest, vanStock, localItemChecks]);

  const verifiedCount = useMemo(
    () => activeVanItems.filter((i) => i.repChecked).length,
    [activeVanItems]
  );

  const uncheckedCount = activeVanItems.length - verifiedCount;
  const allVerified = activeVanItems.length > 0 && uncheckedCount === 0;

  const totalUnits = useMemo(
    () => activeVanItems.reduce((sum, item) => sum + item.quantity, 0),
    [activeVanItems]
  );

  const totalValue = useMemo(() => {
    return activeVanItems.reduce((sum, item) => {
      const net = calcNetUnitPrice(item.basePrice, item.companyDiscountPercent);
      return sum + calcTotalRealValue(net, item.quantity);
    }, 0);
  }, [activeVanItems]);

  const currentDate = formatDateYYYYMMDD(new Date());

  const displayDate = activeManifest?.manifestDate
    ? formatDateYYYYMMDD(activeManifest.manifestDate)
    : currentDate;

  const ownerSignature =
    activeManifest?.ownerSignatureData ||
    dailyManifest?.ownerSignatureData ||
    ownerSignatureData ||
    DEFAULT_OWNER_SIGNATURE;

  const repSignature =
    activeManifest?.repSignatureData ||
    dailyManifest?.repSignatureData ||
    null;

  const repSignerName =
    activeManifest?.repSignedBy ||
    dailyManifest?.repSignedBy ||
    activeManifest?.repName ||
    vehicle.repName ||
    'Kamal Perera';

  const repSignedAt =
    activeManifest?.repSignedAt ||
    dailyManifest?.repSignedAt ||
    null;

  const handleAttachSignature = async ({ signatureData, signerName }) => {
    if (isHistorical) {
      toast.info(`Manifest ${activeManifest?.manifestNo} is an archived historical record.`);
      return;
    }

    // Validate signature data URL length before allowing API submission
    if (!signatureData || typeof signatureData !== 'string' || signatureData.trim().length < 500) {
      toast.warning('Please provide a valid signature.');
      return;
    }

    const manifestCode = activeManifest?.manifestNo || targetCode;
    const itemsSnapshot = activeVanItems.map((i) => ({ itemId: i.id, repChecked: Boolean(i.repChecked) }));
    const unchecked = activeVanItems.filter((item) => !item.repChecked).length;

    if (manifestCode) {
      try {
        await vanStockApi.signPublicManifest(manifestCode, {
          signatureData,
          repSignature: signatureData,
          signature: signatureData,
          repName: signerName,
          items: itemsSnapshot,
        });
      } catch (err) {
        console.warn('signPublicManifest fallback to verifyPublicManifest:', err);
        try {
          await vanStockApi.verifyPublicManifest(manifestCode, {
            signatureData,
            repSignature: signatureData,
            signature: signatureData,
            repName: signerName,
            items: itemsSnapshot,
          });
        } catch (innerErr) {
          console.warn('Public manifest remote verification error:', innerErr);
        }
      }
    }

    await submitRepVerificationWithSignature({
      signatureData,
      repName: signerName,
      manifestNo: manifestCode,
    });

    // Update remoteManifest state immediately so the rep's signature renders live without reload
    setRemoteManifest((prev) =>
      prev
        ? {
            ...prev,
            repSignatureData: signatureData,
            repSignature: signatureData,
            repSignedBy: signerName,
            repSignedAt: new Date().toISOString(),
            status: unchecked === 0 ? 'REP_ACCEPTED' : 'PARTIAL_DISCREPANCY',
            uncheckedCount: unchecked,
          }
        : prev
    );

    if (unchecked === 0) {
      toast.success('Manifest successfully signed and fully verified.');
    } else {
      toast.warning(`Manifest signed with ${unchecked} unchecked item(s) flagged as discrepancy.`);
    }
  };

  const handleToggleCheck = (itemId) => {
    if (isHistorical) {
      toast.info(`Manifest ${activeManifest?.manifestNo} is an archived historical record.`);
      return;
    }
    const numId = Number(itemId);
    setLocalItemChecks((prev) => {
      const currentVal = prev[numId] !== undefined
        ? prev[numId]
        : Boolean(activeVanItems.find((i) => i.id === numId)?.repChecked);
      return {
        ...prev,
        [numId]: !currentVal,
      };
    });
    toggleRepItemChecked(numId);
  };

  const handleToggleAll = () => {
    if (isHistorical) {
      toast.info(`Manifest ${activeManifest?.manifestNo} is an archived historical record.`);
      return;
    }
    const targetVal = !allVerified;
    const newChecks = {};
    activeVanItems.forEach((i) => {
      newChecks[i.id] = targetVal;
    });
    setLocalItemChecks(newChecks);
    toggleAllRepItemsChecked(targetVal);
  };

  // ── 1. Clean Mobile Loading State ──
  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col items-center justify-center p-4">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-accent-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
            Loading Delivery Van Manifest...
          </p>
        </div>
      </div>
    );
  }

  // ── 2. Fallback UI Screen for 404/500/Missing Manifest ──
  if (showErrorScreen) {
    return (
      <div className="min-h-screen bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col items-center justify-center p-4 pb-safe">
        <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl border border-rose-200 dark:border-rose-900/60 shadow-xl p-6 sm:p-8 text-center space-y-5">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-rose-100 dark:bg-rose-950/70 border border-rose-200 dark:border-rose-800/80 flex items-center justify-center text-rose-600 dark:text-rose-400 shadow-sm">
            <AlertCircle size={36} strokeWidth={2.2} />
          </div>

          <div className="space-y-2">
            <h2 className="text-xl font-black tracking-tight text-slate-900 dark:text-white">
              Manifest Not Found or Link Invalid
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              {errorMessage || 'Manifest Not Found or Link Invalid. Please verify the link with your warehouse dispatcher.'}
            </p>
          </div>

          {targetCode && (
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono text-xs text-slate-700 dark:text-slate-300">
              <span className="text-slate-400 font-sans font-medium text-[11px]">Requested:</span>
              <span className="font-bold">{targetCode}</span>
            </div>
          )}

          <div className="pt-2 flex flex-col sm:flex-row gap-2.5 justify-center">
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-accent-600 hover:bg-accent-700 active:scale-95 text-white font-semibold text-xs transition-all shadow-sm cursor-pointer"
            >
              <RotateCcw size={14} />
              <span>Retry Link</span>
            </button>
            <a
              href="/share/van-manifest"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold text-xs transition-all border border-slate-200 dark:border-slate-700"
            >
              <span>View Today&apos;s Manifest</span>
            </a>
          </div>

          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-400 dark:text-slate-500">
            Liyanage Distributors &bull; Deiyandara Warehouse Dispatch System
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100 pb-safe">
      {/* Mobile-Optimized Public Header */}
      <header className="sticky top-0 z-30 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-gray-200 dark:border-slate-800 shadow-sm px-4 py-3.5">
        <div className="max-w-xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <img
              src="/logo.jpg"
              alt="Liyanage Distributors"
              className="w-9 h-9 rounded-xl object-cover shadow"
              onError={(e) => {
                e.target.style.display = 'none';
              }}
            />
            <div>
              <h1 className="text-sm font-black tracking-tight text-slate-900 dark:text-white uppercase">
                Liyanage Distributors
              </h1>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium flex items-center gap-1">
                {isHistorical ? (
                  <span className="text-amber-600 dark:text-amber-400 font-bold flex items-center gap-1">
                    <History size={11} /> Historical Manifest ({activeManifest?.manifestNo})
                  </span>
                ) : (
                  <span>Live Field Van Manifest ({activeManifest?.manifestNo})</span>
                )}
              </p>
            </div>
          </div>

          <div className="text-right flex items-center gap-1.5">
            {isHistorical && (
              <span className="hidden sm:inline-block px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300 dark:bg-amber-400 dark:text-amber-950 dark:border-amber-500 font-mono text-[10px] font-extrabold shadow-sm">
                Archived
              </span>
            )}
            <span className="inline-block px-2.5 py-0.5 rounded-full bg-accent-50 text-accent-700 border border-accent-200 dark:bg-accent-950/60 dark:text-accent-300 dark:border-accent-800/60 font-mono font-bold text-xs">
              {activeManifest?.vehicleId || vehicle.id}
            </span>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-xl mx-auto p-3.5 sm:p-5 space-y-3.5">
        {/* Vehicle Metadata Card */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 shadow-sm space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Truck size={18} className="text-accent-600 dark:text-accent-400" />
              <span className="font-bold text-sm text-slate-900 dark:text-white">
                {vehicle.plateNumber}
              </span>
            </div>
            <span className="flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400 font-medium">
              <Calendar size={13} /> {displayDate}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-gray-100 dark:border-slate-800">
            <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
              <MapPin size={13} className="text-accent-500 flex-shrink-0" />
              <span className="truncate">Route: <strong>All Routes</strong></span>
            </div>
            <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
              <User size={13} className="text-accent-500 flex-shrink-0" />
              <span className="truncate">Rep: <strong>{vehicle.repName}</strong></span>
            </div>
          </div>
        </div>

        {/* Summary Metric Chips */}
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 shadow-sm">
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block">
              Total Loaded Units
            </span>
            <span className="text-xl font-black text-slate-900 dark:text-white font-mono mt-0.5 block">
              {totalUnits}
            </span>
            <span className="text-[10px] text-slate-400 block mt-0.5">
              Across {activeVanItems.length} active SKUs
            </span>
          </div>

          <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 shadow-sm">
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block">
              Net Manifest Value
            </span>
            <span className="text-base sm:text-lg font-black text-accent-600 dark:text-accent-400 font-mono mt-0.5 block truncate">
              {formatLKR(totalValue)}
            </span>
            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 block mt-0.5 font-medium">
              Wholesale Valuation
            </span>
          </div>
        </div>

        {/* Rep Sign Action Callout if Pending */}
        <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-500/15 via-teal-500/15 to-emerald-500/15 border border-emerald-300 dark:border-emerald-700/60 shadow-sm flex items-center justify-between gap-3 flex-wrap">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-bold text-emerald-950 dark:text-emerald-200">
                {isHistorical
                  ? `Archived Manifest Record (${activeManifest?.status || 'VERIFIED'})`
                  : (activeManifest?.status || dailyManifest?.status) === 'PARTIAL_DISCREPANCY'
                  ? `Partial Discrepancy Active (${activeManifest?.uncheckedCount || dailyManifest?.uncheckedCount || uncheckedCount} Unchecked)`
                  : allVerified && (activeManifest?.repSignatureData || dailyManifest?.repSignatureData)
                  ? 'Manifest Signed & Fully Verified'
                  : uncheckedCount > 0
                  ? `${uncheckedCount} Line Item${uncheckedCount === 1 ? '' : 's'} Pending Check`
                  : 'All Items Counted — Ready to Sign'}
              </h3>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-800 border border-slate-300 dark:bg-slate-800 dark:text-slate-200">
                Rev #{activeManifest?.manifestRevision || 1}
              </span>
            </div>
            <p className="text-[11px] text-emerald-800 dark:text-emerald-300 mt-0.5">
              {isHistorical
                ? `Historical manifest record for ${displayDate} (${activeVanItems.length} SKUs recorded)`
                : `Verified ${verifiedCount} of ${activeVanItems.length} SKUs on board ${vehicle.id}`}
            </p>
          </div>
          {!isHistorical ? (
            <button
              type="button"
              onClick={() => setIsSignatureModalOpen(true)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow transition-all active:scale-95 cursor-pointer flex-shrink-0"
            >
              <PenTool size={13} />
              <span>
                {activeManifest?.repSignatureData || dailyManifest?.repSignatureData
                  ? 'Update Signature'
                  : uncheckedCount > 0
                  ? `Sign Manifest (${verifiedCount}/${activeVanItems.length})`
                  : 'Sign Manifest'}
              </span>
            </button>
          ) : (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-100 dark:bg-amber-400 text-amber-950 dark:text-amber-950 border border-amber-300 dark:border-amber-500 text-xs font-bold shadow-sm">
              <ShieldCheck size={14} className="text-amber-800 dark:text-amber-900" />
              <span>Archived Record</span>
            </div>
          )}
        </div>

        {/* Itemized Card List (Mobile-Optimized Touch Cards with Leading Checkbox) */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between px-1 gap-2 flex-wrap">
            <div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Loaded Inventory Manifest ({activeVanItems.length})
              </h2>
              <span className="text-[11px] font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                Verified {verifiedCount} of {activeVanItems.length} items
              </span>
            </div>

            <button
              type="button"
              onClick={handleToggleAll}
              className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 shadow-sm transition-all cursor-pointer"
            >
              <CheckSquare size={13} className={allVerified ? 'text-emerald-600' : 'text-slate-400'} />
              <span>{allVerified ? 'Uncheck All' : 'Select / Verify All'}</span>
            </button>
          </div>

          {activeVanItems.map((item) => {
            const netPrice = calcNetUnitPrice(item.basePrice, item.companyDiscountPercent);
            const itemTotal = calcTotalRealValue(netPrice, item.quantity);
            const isChecked = Boolean(item.repChecked);
            const isDiscrepancy = item.status === 'UNVERIFIED_BY_REP' || (item.discrepancyFlag && !isChecked);

            return (
              <div
                key={item.id}
                className={`p-3.5 sm:p-4 rounded-2xl border shadow-sm transition-colors flex items-start gap-3 ${
                  isDiscrepancy
                    ? 'bg-rose-50/60 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/60'
                    : isChecked
                    ? 'bg-emerald-50/25 dark:bg-emerald-950/10 border-emerald-200 dark:border-emerald-800/60'
                    : 'bg-white dark:bg-slate-900 border-gray-200 dark:border-slate-800'
                }`}
              >
                {/* Touch-Friendly Line-Item Checkbox at Leading Edge */}
                <label className="flex items-center justify-center p-1 cursor-pointer select-none flex-shrink-0 mt-0.5">
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => handleToggleCheck(item.id)}
                    className="w-5 h-5 rounded border-gray-300 dark:border-slate-600 text-emerald-600 focus:ring-emerald-500 cursor-pointer accent-emerald-600"
                  />
                </label>

                <div className="min-w-0 flex-1 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-orange-50 text-orange-700 border border-orange-200 dark:bg-orange-950/60 dark:text-orange-300 dark:border-orange-800/60">
                        {item.sku}
                      </span>
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white mt-1 leading-snug">
                        {item.productName}
                      </h3>
                    </div>

                    <span
                      className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${
                        isDiscrepancy
                          ? 'bg-rose-100 text-rose-900 border border-rose-300 dark:bg-rose-400 dark:text-rose-950 dark:border-rose-500'
                          : isChecked
                          ? 'bg-emerald-100 text-emerald-900 border border-emerald-300 dark:bg-emerald-400 dark:text-emerald-950 dark:border-emerald-500'
                          : 'bg-amber-100 text-amber-900 border border-amber-300 dark:bg-amber-400 dark:text-amber-950 dark:border-amber-500'
                      }`}
                    >
                      {isDiscrepancy ? (
                        <>
                          <AlertTriangle size={11} className="text-rose-700 dark:text-rose-950" />
                          <span>Discrepancy</span>
                        </>
                      ) : isChecked ? (
                        <>
                          <CheckCircle2 size={11} className="text-emerald-700 dark:text-emerald-950" />
                          <span>Verified</span>
                        </>
                      ) : (
                        <>
                          <Clock size={11} className="text-amber-700 dark:text-amber-950" />
                          <span>Pending</span>
                        </>
                      )}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs pt-2 border-t border-gray-100 dark:border-slate-800">
                    <span className="text-slate-500 dark:text-slate-300">
                      Loaded:{' '}
                      <strong className="text-slate-900 dark:text-white font-mono text-sm">
                        {item.quantity}
                      </strong>{' '}
                      {item.unit}
                    </span>
                    <span className="text-slate-700 dark:text-slate-200 font-mono font-semibold">
                      {formatLKR(itemTotal)}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Dual Official Digital Signature Status Cards */}
        <div className="space-y-3 pt-2">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 px-1">
            Official Document Signatures
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Dispatcher Signature */}
            <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 shadow-sm space-y-2">
              <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                Warehouse Dispatcher Signature
              </span>
              {/* Dispatcher Signature with solid bright container for dark theme contrast */}
              <div className="h-14 flex items-center justify-center bg-white dark:bg-slate-100 rounded-xl p-1 border border-dashed border-gray-200 dark:border-slate-300 shadow-xs">
                {ownerSignature ? (
                  <img
                    src={ownerSignature}
                    alt="Owner Signature"
                    className="h-12 max-w-[140px] object-contain"
                  />
                ) : (
                  <span className="text-[10px] text-slate-500 italic">Pre-Signed on File</span>
                )}
              </div>
              <p className="text-[11px] font-semibold text-slate-800 dark:text-slate-200 truncate">
                {activeManifest?.ownerSignedBy || dailyManifest?.ownerSignedBy || 'W. Liyanage (Managing Director / Owner)'}
              </p>
              <p className="text-[9px] text-slate-400 font-mono">
                {activeManifest?.ownerSignedAt ? new Date(activeManifest.ownerSignedAt).toLocaleString() : 'Today'}
              </p>
            </div>

            {/* Rep Signature with solid bright container for dark theme contrast */}
            <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 shadow-sm space-y-2">
              <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                Sales Representative Signature
              </span>
              <div className="h-14 flex items-center justify-center bg-white dark:bg-slate-100 rounded-xl p-1 border border-dashed border-gray-200 dark:border-slate-300 shadow-xs">
                {repSignature ? (
                  <img
                    src={repSignature}
                    alt="Representative Signature"
                    className="h-12 max-w-[140px] object-contain"
                  />
                ) : isHistorical ? (
                  <span className="text-[10px] text-slate-500 italic">No signature on file</span>
                ) : (
                  <button
                    type="button"
                    onClick={() => setIsSignatureModalOpen(true)}
                    className="text-xs font-bold text-accent-700 hover:underline cursor-pointer flex items-center gap-1"
                  >
                    <PenTool size={12} />
                    <span>Tap to Sign Pad</span>
                  </button>
                )}
              </div>
              <p className="text-[11px] font-semibold text-slate-800 dark:text-slate-200 truncate">
                {repSignerName}
              </p>
              <p className="text-[9px] text-slate-400 font-mono">
                {repSignedAt
                  ? new Date(repSignedAt).toLocaleString()
                  : 'Pending Field Signature'}
              </p>
            </div>
          </div>
        </div>

        {/* Public Footer */}
        <footer className="text-center py-6 text-xs text-slate-400 dark:text-slate-500 space-y-1">
          <p className="font-semibold text-slate-500 dark:text-slate-400">
            Liyanage Distributors â€” Morawaka Field Sales Division
          </p>
          <p className="text-[11px]">Deiyandara Main Warehouse Dispatch System</p>
        </footer>
      </main>

      {/* Signature Pad Modal */}
      <SignaturePadModal
        isOpen={isSignatureModalOpen}
        onClose={() => setIsSignatureModalOpen(false)}
        onSave={handleAttachSignature}
        defaultSignerName={repSignerName || vehicle.repName || 'Kamal Perera'}
        vehicleId={activeManifest?.vehicleId || vehicle.id}
        manifestNo={activeManifest?.manifestNo || dailyManifest?.manifestNo || 'MAN-20261105-01'}
        uncheckedCount={uncheckedCount}
        totalCount={activeVanItems.length}
      />
    </div>
  );
}
