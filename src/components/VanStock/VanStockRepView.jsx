/**
 * @file VanStockRepView.jsx
 * @description Authenticated field sales representative load confirmation portal.
 * Accessible at /van-stock/confirm/:vanId. Displays loaded inventory categorized by status,
 * showcases the Owner/Dispatcher digital signature lock, offers strict touch canvas
 * signature acceptance via SignaturePadModal, and instant manifest printing.
 */

import React, { useState, useMemo, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  CheckCircle2,
  Clock,
  Printer,
  ShieldCheck,
  ArrowLeft,
  Truck,
  Check,
  Package,
  PenTool,
  Lock,
  UserCheck,
  CheckSquare,
  Square,
  AlertTriangle,
  AlertCircle,
  Sun,
  Moon,
} from 'lucide-react';
import { toast } from 'react-toastify';
import VanStockLayout from './VanStockLayout';
import PrintVanStockSheet from './PrintVanStockSheet';
import SignaturePadModal from './SignaturePadModal';
import useVanStockStore from '../../hooks/useVanStockStore';
import { calcNetUnitPrice, calcTotalRealValue, formatLKR } from '../../data/vanStockData';
import { DEFAULT_OWNER_SIGNATURE } from '../../data/defaultOwnerSignature';

export default function VanStockRepView() {
  const { vanId } = useParams();
  const navigate = useNavigate();

  const vehicle = useVanStockStore((s) => s.vehicle);
  const vanStock = useVanStockStore((s) => s.vanStock);
  const dailyManifest = useVanStockStore((s) => s.dailyManifest);
  const ownerSignatureData = useVanStockStore((s) => s.ownerSignatureData);
  const submitRepVerificationWithSignature = useVanStockStore((s) => s.submitRepVerificationWithSignature);
  const toggleRepItemChecked = useVanStockStore((s) => s.toggleRepItemChecked);
  const toggleAllRepItemsChecked = useVanStockStore((s) => s.toggleAllRepItemsChecked);
  const setOwnerSignatureData = useVanStockStore((s) => s.setOwnerSignatureData);
  const fetchSavedSignatures = useVanStockStore((s) => s.fetchSavedSignatures);
  const saveSignatureSetting = useVanStockStore((s) => s.saveSignatureSetting);
  const savedOwnerSignature = useVanStockStore((s) => s.savedOwnerSignature);
  const savedRepSignature = useVanStockStore((s) => s.savedRepSignature);

  const [isPrintOpen, setIsPrintOpen] = useState(false);
  const [signingModalRole, setSigningModalRole] = useState(null); // 'owner' | 'rep' | null
  const [useSavedOwnerSig, setUseSavedOwnerSig] = useState(false);
  const [useSavedRepSig, setUseSavedRepSig] = useState(false);
  const [reconciliationTab, setReconciliationTab] = useState('all'); // 'all' | 'morning' | 'evening'

  // Strict Date-bound Checklist Persistence key
  const manifestDateKey = dailyManifest?.manifestDate
    ? new Date(dailyManifest.manifestDate).toISOString().slice(0, 10)
    : new Date().toISOString().slice(0, 10);
  const eveningStorageKey = `evening_check_${vanId || 'VAN-01'}_${manifestDateKey}`;

  const [eveningChecked, setEveningChecked] = useState({});

  // Strict useEffect sync on mount / date change
  useEffect(() => {
    try {
      const raw = localStorage.getItem(eveningStorageKey);
      if (raw) {
        setEveningChecked(JSON.parse(raw));
      } else {
        const legacy = localStorage.getItem(`evening_check_${vanId || 'VAN-01'}`);
        if (legacy) {
          setEveningChecked(JSON.parse(legacy));
        } else {
          setEveningChecked({});
        }
      }
    } catch (_e) {
      setEveningChecked({});
    }
  }, [eveningStorageKey, vanId]);

  // Fetch saved signatures on mount
  useEffect(() => {
    fetchSavedSignatures(vehicle?.salesPersonId || vehicle?.id);
  }, [fetchSavedSignatures, vehicle?.salesPersonId, vehicle?.id]);

  useEffect(() => {
    if (savedOwnerSignature && (ownerSignatureData === savedOwnerSignature || dailyManifest?.ownerSignatureData === savedOwnerSignature)) {
      setUseSavedOwnerSig(true);
    }
  }, [savedOwnerSignature, ownerSignatureData, dailyManifest?.ownerSignatureData]);

  useEffect(() => {
    if (savedRepSignature && dailyManifest?.repSignatureData === savedRepSignature) {
      setUseSavedRepSig(true);
    }
  }, [savedRepSignature, dailyManifest?.repSignatureData]);

  // Filter items for this vehicle
  const items = useMemo(() => {
    return vanStock
      .filter((v) => v.quantity > 0)
      .sort((a, b) => {
        if (!a.repChecked && b.repChecked) return -1;
        if (a.repChecked && !b.repChecked) return 1;
        return 0;
      });
  }, [vanStock]);

  const verifiedCount = useMemo(() => items.filter((i) => i.repChecked).length, [items]);
  const uncheckedCount = items.length - verifiedCount;
  const allVerified = items.length > 0 && uncheckedCount === 0;

  const eveningReconciledCount = useMemo(() => {
    return items.filter((i) => Boolean(eveningChecked[i.id])).length;
  }, [items, eveningChecked]);
  const allEveningReconciled = items.length > 0 && eveningReconciledCount === items.length;

  const totalLoadedValue = useMemo(() => {
    return items.reduce((sum, item) => {
      const net = calcNetUnitPrice(item.basePrice, item.companyDiscountPercent);
      return sum + calcTotalRealValue(net, item.quantity);
    }, 0);
  }, [items]);

  const ownerSignature = ownerSignatureData || dailyManifest?.ownerSignatureData || DEFAULT_OWNER_SIGNATURE;

  const handleAttachSignature = async ({ signatureData, signerName }) => {
    const uncheckedCount = items.filter((item) => !item.repChecked).length;
    await submitRepVerificationWithSignature({
      signatureData,
      repName: signerName,
    });
    if (uncheckedCount === 0) {
      toast.success('Manifest successfully signed and fully verified.');
    } else {
      toast.warning(`Manifest signed with ${uncheckedCount} unchecked item(s) flagged as discrepancy.`);
    }
  };

  const handleToggleCheck = (itemId) => {
    toggleRepItemChecked(itemId);
  };

  const handleToggleAll = () => {
    toggleAllRepItemsChecked(!allVerified);
  };

  const handleToggleEveningCheck = (itemId) => {
    setEveningChecked((prev) => {
      const next = { ...prev, [itemId]: !prev[itemId] };
      try {
        localStorage.setItem(eveningStorageKey, JSON.stringify(next));
      } catch (e) {
        console.warn('Failed to persist evening check:', e);
      }
      return next;
    });
  };

  const handleToggleAllEvening = () => {
    const nextVal = !allEveningReconciled;
    const next = {};
    items.forEach((i) => {
      next[i.id] = nextVal;
    });
    setEveningChecked(next);
    try {
      localStorage.setItem(eveningStorageKey, JSON.stringify(next));
    } catch (e) {}
  };

  const handleToggleSavedOwnerSignature = async (checked) => {
    setUseSavedOwnerSig(checked);
    if (checked) {
      if (savedOwnerSignature) {
        await setOwnerSignatureData(savedOwnerSignature, 'W. Liyanage (Managing Director / Owner)');
        toast.success('Applied saved Owner signature.');
      } else {
        toast.info('No saved signature found for Owner. Please draw one to save.');
        setSigningModalRole('owner');
      }
    }
  };

  const handleToggleSavedRepSignature = async (checked) => {
    setUseSavedRepSig(checked);
    if (checked) {
      if (savedRepSignature) {
        await submitRepVerificationWithSignature({
          signatureData: savedRepSignature,
          repName: vehicle.repName || 'Kamal Perera',
        });
        toast.success('Applied saved Sales Rep signature.');
      } else {
        toast.info('No saved signature found for Sales Rep. Please draw and sign first.');
        setSigningModalRole('rep');
      }
    }
  };

  const handleSignatureModalSave = async ({ signatureData, signerName }) => {
    if (signingModalRole === 'owner') {
      await setOwnerSignatureData(signatureData, signerName);
      await saveSignatureSetting({ type: 'owner', signatureData });
      setUseSavedOwnerSig(true);
      toast.success('Owner signature saved and applied to manifest.');
    } else {
      await handleAttachSignature({ signatureData, signerName });
      await saveSignatureSetting({
        type: 'rep',
        repId: vehicle.salesPersonId || vehicle.id,
        signatureData,
      });
      setUseSavedRepSig(true);
    }
    setSigningModalRole(null);
  };

  return (
    <VanStockLayout>
      {/* Header Bar */}
      <div className="pt-2 sm:pt-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-gray-200 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate('/van-stock')}
            className="p-2 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
          >
            <ArrowLeft size={16} />
          </button>
          <div>
            <h1 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span>Sales Rep Digital Manifest Acceptance</span>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-accent-50 text-accent-700 border border-accent-200 dark:bg-accent-950/60 dark:text-accent-300 dark:border-accent-800/60 font-mono font-bold">
                Van
              </span>
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Assigned to: {vehicle.repName} ({vehicle.repPhone}) • Route: All Routes
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsPrintOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all cursor-pointer shadow-sm"
          >
            <Printer size={14} />
            <span>Print Sheet</span>
          </button>
        </div>
      </div>

      {/* Acceptance Status Banner */}
      <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-accent-500/10 via-emerald-500/10 to-accent-500/10 border border-accent-200 dark:border-accent-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-white dark:bg-slate-800 border border-accent-200 dark:border-accent-700 flex items-center justify-center text-accent-600 dark:text-accent-400 shadow-sm flex-shrink-0">
            <ShieldCheck size={26} />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                {dailyManifest?.status === 'PARTIAL_DISCREPANCY'
                  ? `Partial Discrepancy Manifest (${dailyManifest.uncheckedCount || uncheckedCount} Unchecked)`
                  : allVerified && dailyManifest?.repSignatureData
                  ? 'All Loaded Inventory Fully Verified & Signed'
                  : uncheckedCount > 0
                  ? `${uncheckedCount} Item${uncheckedCount === 1 ? '' : 's'} Pending Rep Physical Verification`
                  : 'All Items Ticked — Ready for Representative Signature'}
              </h2>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-800 border border-slate-300 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700">
                Rev #{dailyManifest?.manifestRevision || 1}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Verified: <strong className="text-emerald-700 dark:text-emerald-400">{verifiedCount} of {items.length} SKUs</strong> • Total Loaded:{' '}
              <strong className="text-accent-700 dark:text-accent-300 font-mono">
                {formatLKR(totalLoadedValue)}
              </strong>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <button
            type="button"
            onClick={() => setSigningModalRole('rep')}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold text-xs shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
          >
            <PenTool size={15} />
            <span>
              {dailyManifest?.repSignatureData
                ? 'Update / Re-Sign Manifest'
                : uncheckedCount > 0
                ? `Confirm & Sign (${verifiedCount}/${items.length} Verified)`
                : `Confirm & Sign Manifest (${items.length})`}
            </span>
          </button>
        </div>
      </div>

      {/* Discrepancy Alert Banner if items left unchecked */}
      {dailyManifest?.status === 'PARTIAL_DISCREPANCY' && (
        <div className="p-3.5 rounded-2xl bg-amber-500/15 border border-amber-300 dark:border-amber-700/60 text-amber-950 dark:text-amber-200 text-xs flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0" />
            <div>
              <p className="font-bold">Partial Discrepancy Active on Van</p>
              <p className="text-[11px] text-amber-800 dark:text-amber-300">
                {dailyManifest.uncheckedCount || uncheckedCount} item(s) were flagged as unverified during field count. Warehouse Dispatch has been alerted.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Dual Official Digital Signature Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Card 1: Warehouse Keeper / Owner In-App Digital Signature */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-800/90 border border-gray-200 dark:border-slate-700 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Lock size={16} className="text-amber-600 dark:text-amber-400" />
              <span className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                Dispatcher / Owner Digital Signature
              </span>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800">
              {dailyManifest?.ownerSignedAt ? 'Verified & Stamped' : 'Ready for In-App Sign'}
            </span>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-gray-100 dark:border-slate-800 flex items-center justify-between gap-3 flex-wrap sm:flex-nowrap">
            <div>
              <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                {dailyManifest?.ownerSignedBy || 'W. Liyanage (Managing Director / Owner)'}
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 font-mono">
                Stamped: {dailyManifest?.ownerSignedAt ? new Date(dailyManifest.ownerSignedAt).toLocaleString() : 'Today'}
              </p>
            </div>
            {ownerSignature && (
              <img
                src={ownerSignature}
                alt="Owner Signature"
                className="h-12 max-w-[130px] object-contain filter dark:invert-0 border border-dashed border-gray-200 dark:border-slate-700 rounded-lg p-1 bg-white dark:bg-slate-800"
              />
            )}
          </div>

          {/* Owner In-App Signing & Saved Signature Reuse */}
          <div className="flex items-center justify-between pt-1 border-t border-gray-100 dark:border-slate-800/60 text-xs">
            <label className="flex items-center gap-2 cursor-pointer select-none text-slate-700 dark:text-slate-300 font-medium">
              <input
                type="checkbox"
                checked={useSavedOwnerSig}
                onChange={(e) => handleToggleSavedOwnerSignature(e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 dark:border-slate-600 text-amber-600 focus:ring-amber-500 cursor-pointer accent-amber-600"
              />
              <span>Use Saved Signature</span>
            </label>
            <button
              type="button"
              onClick={() => setSigningModalRole('owner')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-amber-300 dark:border-amber-700 bg-amber-50/50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-300 hover:bg-amber-100/70 text-xs font-semibold transition-colors cursor-pointer"
            >
              <PenTool size={13} />
              <span>{ownerSignature ? 'Draw / Update' : 'Sign as Owner'}</span>
            </button>
          </div>
        </div>

        {/* Card 2: Sales Representative Signature Status & Reuse */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-800/90 border border-gray-200 dark:border-slate-700 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <UserCheck size={16} className="text-emerald-600 dark:text-emerald-400" />
              <span className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                Sales Representative Acceptance
              </span>
            </div>
            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                dailyManifest?.status === 'PARTIAL_DISCREPANCY'
                  ? 'bg-amber-100 text-amber-800 border border-amber-300 dark:bg-amber-950/50 dark:text-amber-300'
                  : dailyManifest?.repSignatureData
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800'
                  : 'bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800'
              }`}
            >
              {dailyManifest?.status === 'PARTIAL_DISCREPANCY'
                ? 'Signed with Discrepancy'
                : dailyManifest?.repSignatureData
                ? 'Signed & Fully Verified'
                : 'Pending Sign-Off'}
            </span>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-gray-100 dark:border-slate-800 flex items-center justify-between gap-3 flex-wrap sm:flex-nowrap">
            <div>
              <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                {dailyManifest?.repSignedBy || vehicle.repName}
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 font-mono">
                {dailyManifest?.repSignedAt
                  ? `Signed: ${new Date(dailyManifest.repSignedAt).toLocaleString()}`
                  : 'Awaiting signature'}
              </p>
            </div>

            {dailyManifest?.repSignatureData ? (
              <img
                src={dailyManifest.repSignatureData}
                alt="Rep Signature"
                className="h-12 max-w-[130px] object-contain filter dark:invert-0 border border-dashed border-gray-200 dark:border-slate-700 rounded-lg p-1 bg-white dark:bg-slate-800"
              />
            ) : (
              <button
                type="button"
                onClick={() => setSigningModalRole('rep')}
                className="px-3 py-1.5 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition-all cursor-pointer"
              >
                Sign Now
              </button>
            )}
          </div>

          {/* Rep In-App Signing & Saved Signature Reuse */}
          <div className="flex items-center justify-between pt-1 border-t border-gray-100 dark:border-slate-800/60 text-xs">
            <label className="flex items-center gap-2 cursor-pointer select-none text-slate-700 dark:text-slate-300 font-medium">
              <input
                type="checkbox"
                checked={useSavedRepSig}
                onChange={(e) => handleToggleSavedRepSignature(e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 dark:border-slate-600 text-emerald-600 focus:ring-emerald-500 cursor-pointer accent-emerald-600"
              />
              <span>Use Saved Signature</span>
            </label>
            <button
              type="button"
              onClick={() => setSigningModalRole('rep')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-emerald-300 dark:border-emerald-700 bg-emerald-50/50 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-100/70 text-xs font-semibold transition-colors cursor-pointer"
            >
              <PenTool size={13} />
              <span>{dailyManifest?.repSignatureData ? 'Draw / Update' : 'Draw & Sign'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Itemized Manifest Cards / Table with Morning Check & Evening Reconciliation */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3 flex-wrap">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Itemized Manifest Lines ({items.length})
            </h3>
            <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800 flex items-center gap-1">
              <Sun size={12} className="text-emerald-600" />
              <span>Morning: {verifiedCount}/{items.length}</span>
            </span>
            <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800 flex items-center gap-1">
              <Moon size={12} className="text-blue-600" />
              <span>Evening: {eveningReconciledCount}/{items.length}</span>
            </span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={handleToggleAll}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl border border-emerald-200 dark:border-emerald-800/80 bg-emerald-50/50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100/60 transition-all cursor-pointer"
            >
              <CheckSquare size={13} className={allVerified ? 'text-emerald-600' : 'text-slate-400'} />
              <span>{allVerified ? 'Uncheck Morning' : 'Morning: Check All'}</span>
            </button>
            <button
              type="button"
              onClick={handleToggleAllEvening}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl border border-blue-200 dark:border-blue-800/80 bg-blue-50/50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 hover:bg-blue-100/60 transition-all cursor-pointer"
            >
              <CheckSquare size={13} className={allEveningReconciled ? 'text-blue-600' : 'text-slate-400'} />
              <span>{allEveningReconciled ? 'Uncheck Evening' : 'Evening: Reconcile All'}</span>
            </button>
          </div>
        </div>

        {items.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-xs">
            <Truck className="w-10 h-10 mx-auto mb-2 opacity-30" />
            No stock loaded on Van.
          </div>
        ) : (
          <div className="p-2 space-y-2">
            {items.map((item) => {
              const netPrice = calcNetUnitPrice(item.basePrice, item.companyDiscountPercent);
              const totalVal = calcTotalRealValue(netPrice, item.quantity);
              const isChecked = Boolean(item.repChecked);
              const isEveningChecked = Boolean(eveningChecked[item.id]);
              const isDiscrepancy = item.status === 'UNVERIFIED_BY_REP' || (item.discrepancyFlag && !isChecked);

              // Distinct row highlighting:
              // Evening reconciliation: bg-blue-500/15 border-blue-500/40
              // Morning check: bg-emerald-500/15 border-emerald-500/40
              let rowStyle = 'hover:bg-slate-50/60 dark:hover:bg-slate-700/40 border-gray-200/60 dark:border-slate-700/60';
              if (isEveningChecked && isChecked) {
                rowStyle = 'bg-gradient-to-r from-emerald-500/15 to-blue-500/15 border-blue-500/40 shadow-sm';
              } else if (isEveningChecked) {
                rowStyle = 'bg-blue-500/15 border-blue-500/40 shadow-sm';
              } else if (isChecked) {
                rowStyle = 'bg-emerald-500/15 border-emerald-500/40 shadow-sm';
              } else if (isDiscrepancy) {
                rowStyle = 'bg-rose-500/15 border-rose-500/40';
              }

              return (
                <div
                  key={item.id}
                  className={`p-3.5 sm:p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors ${rowStyle}`}
                >
                  <div className="flex items-start sm:items-center gap-3 min-w-0 flex-1">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-orange-50 text-orange-700 border border-orange-200 dark:bg-orange-950/60 dark:text-orange-300 dark:border-orange-800/60">
                          {item.sku}
                        </span>
                        <h4 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                          {item.productName}
                        </h4>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                            isEveningChecked
                              ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/50 dark:text-blue-300 border border-blue-300'
                              : isChecked
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-300'
                              : isDiscrepancy
                              ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/50 dark:text-rose-300 border border-rose-300'
                              : 'bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300 border border-amber-300'
                          }`}
                        >
                          {isEveningChecked && isChecked
                            ? 'Morning Verified & Evening Reconciled'
                            : isEveningChecked
                            ? 'Evening Reconciled'
                            : isChecked
                            ? 'Morning Verified on Truck'
                            : isDiscrepancy
                            ? 'Discrepancy'
                            : 'Pending Physical Count'}
                        </span>
                      </div>

                      <div className="flex items-center gap-4 mt-1.5 text-xs text-slate-500 dark:text-slate-300 flex-wrap">
                        <span>
                          Verified Qty:{' '}
                          <strong className="text-slate-900 dark:text-white font-mono">
                            {item.quantity} {item.unit}
                          </strong>
                        </span>
                        <span>
                          Net Unit:{' '}
                          <strong className="text-slate-800 dark:text-slate-200">
                            {formatLKR(netPrice)}
                          </strong>
                        </span>
                        <span>
                          Valuation:{' '}
                          <strong className="text-accent-600 dark:text-accent-400 font-mono">
                            {formatLKR(totalVal)}
                          </strong>
                        </span>
                        {item.repCheckedAt && (
                          <span className="text-[11px] text-emerald-600 dark:text-emerald-400">
                            Morning checked: {new Date(item.repCheckedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Dual Verification Checkboxes: Morning Load & Evening Reconcile */}
                  <div className="flex items-center gap-4 self-end sm:self-center pl-2 sm:pl-4 border-t sm:border-t-0 sm:border-l border-gray-200 dark:border-slate-700 pt-2 sm:pt-0">
                    {/* Morning Checkbox */}
                    <label htmlFor={`morning-check-${item.id}`} className="flex items-center gap-1.5 cursor-pointer select-none text-xs font-semibold text-slate-700 dark:text-slate-200">
                      <input
                        id={`morning-check-${item.id}`}
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => handleToggleCheck(item.id)}
                        className="w-4 h-4 rounded border-gray-300 dark:border-slate-600 text-emerald-600 focus:ring-emerald-500 cursor-pointer accent-emerald-600"
                      />
                      <span className="flex items-center gap-1 text-[11px]">
                        <Sun size={12} className="text-emerald-600" /> Morning
                      </span>
                    </label>

                    {/* Evening Reconciled Checkbox */}
                    <label htmlFor={`evening-check-${item.id}`} className="flex items-center gap-1.5 cursor-pointer select-none text-xs font-semibold text-slate-700 dark:text-slate-200">
                      <input
                        id={`evening-check-${item.id}`}
                        type="checkbox"
                        checked={isEveningChecked}
                        onChange={() => handleToggleEveningCheck(item.id)}
                        className="w-4 h-4 rounded border-gray-300 dark:border-slate-600 text-blue-600 focus:ring-blue-500 cursor-pointer accent-blue-600"
                      />
                      <span className="flex items-center gap-1 text-[11px]">
                        <Moon size={12} className="text-blue-600" /> Evening
                      </span>
                    </label>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Strict Signature Pad Modal (Supports both Owner and Rep) */}
      <SignaturePadModal
        isOpen={signingModalRole !== null}
        onClose={() => setSigningModalRole(null)}
        onSave={handleSignatureModalSave}
        defaultSignerName={
          signingModalRole === 'owner'
            ? dailyManifest?.ownerSignedBy || 'W. Liyanage (Managing Director / Owner)'
            : vehicle.repName || 'Kamal Perera'
        }
        title={
          signingModalRole === 'owner'
            ? 'Warehouse Keeper / Owner Digital Signature'
            : 'Sales Representative Digital Acceptance Signature'
        }
        vehicleId={vanId || vehicle.id}
        manifestNo={dailyManifest?.manifestNo || 'MAN-20261105-01'}
        uncheckedCount={uncheckedCount}
        totalCount={items.length}
      />

      <PrintVanStockSheet isOpen={isPrintOpen} onClose={() => setIsPrintOpen(false)} />
    </VanStockLayout>
  );
}
