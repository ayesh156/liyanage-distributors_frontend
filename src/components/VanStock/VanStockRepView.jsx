/**
 * @file VanStockRepView.jsx
 * @description Authenticated field sales representative load confirmation portal.
 * Accessible at /van-stock/confirm/:vanId. Displays loaded inventory categorized by status,
 * showcases the Owner/Dispatcher digital signature lock, offers strict touch canvas
 * signature acceptance via SignaturePadModal, and instant manifest printing.
 */

import React, { useState, useMemo } from 'react';
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
  const confirmSingleVanItem = useVanStockStore((s) => s.confirmSingleVanItem);

  const [isPrintOpen, setIsPrintOpen] = useState(false);
  const [isSignatureModalOpen, setIsSignatureModalOpen] = useState(false);

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

  const totalLoadedValue = useMemo(() => {
    return items.reduce((sum, item) => {
      const net = calcNetUnitPrice(item.basePrice, item.companyDiscountPercent);
      return sum + calcTotalRealValue(net, item.quantity);
    }, 0);
  }, [items]);

  const ownerSignature = ownerSignatureData || dailyManifest?.ownerSignatureData || DEFAULT_OWNER_SIGNATURE;

  const handleAttachSignature = async ({ signatureData, signerName }) => {
    // Derive unchecked items count directly from current active view items
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
                {vanId || vehicle.id}
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
            onClick={() => setIsSignatureModalOpen(true)}
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
              <p className="font-bold">Partial Discrepancy Active on Truck {vanId || vehicle.id}</p>
              <p className="text-[11px] text-amber-800 dark:text-amber-300">
                {dailyManifest.uncheckedCount || uncheckedCount} item(s) were flagged as unverified during field count. Warehouse Dispatch has been alerted.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Dual Official Digital Signature Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Card 1: Warehouse Keeper / Owner Pre-Signed Status */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-800/90 border border-gray-200 dark:border-slate-700 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Lock size={16} className="text-amber-600 dark:text-amber-400" />
              <span className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                Dispatcher / Owner Digital Signature
              </span>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800">
              Verified & Locked
            </span>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-gray-100 dark:border-slate-800 flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                {dailyManifest?.ownerSignedBy || 'W. Liyanage (Managing Director / Owner)'}
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 font-mono">
                Stamped: {dailyManifest?.ownerSignedAt ? new Date(dailyManifest.ownerSignedAt).toLocaleString() : 'Today 07:15 AM'}
              </p>
            </div>
            {ownerSignature && (
              <img
                src={ownerSignature}
                alt="Owner Signature"
                className="h-12 max-w-[130px] object-contain filter dark:invert-0"
              />
            )}
          </div>
        </div>

        {/* Card 2: Sales Representative Signature Status */}
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

          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-gray-100 dark:border-slate-800 flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                {dailyManifest?.repSignedBy || vehicle.repName}
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 font-mono">
                {dailyManifest?.repSignedAt
                  ? `Signed: ${new Date(dailyManifest.repSignedAt).toLocaleString()}`
                  : 'Awaiting touch canvas signature'}
              </p>
            </div>

            {dailyManifest?.repSignatureData ? (
              <img
                src={dailyManifest.repSignatureData}
                alt="Rep Signature"
                className="h-12 max-w-[130px] object-contain filter dark:invert-0"
              />
            ) : (
              <button
                type="button"
                onClick={() => setIsSignatureModalOpen(true)}
                className="px-3 py-1.5 text-xs font-bold rounded-xl bg-accent-600 hover:bg-accent-700 text-white shadow-sm transition-all cursor-pointer"
              >
                Sign Now
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Itemized Manifest Cards / Table with Line-Item Checkboxes */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Itemized Manifest Lines ({items.length})
            </h3>
            <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800">
              Verified {verifiedCount} of {items.length} items
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleToggleAll}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 shadow-sm transition-all cursor-pointer"
            >
              <CheckSquare size={14} className={allVerified ? 'text-emerald-600' : 'text-slate-400'} />
              <span>{allVerified ? 'Uncheck All' : 'Select / Verify All'}</span>
            </button>
          </div>
        </div>

        {items.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-xs">
            <Truck className="w-10 h-10 mx-auto mb-2 opacity-30" />
            No stock loaded on {vehicle.id}.
          </div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-slate-700">
            {items.map((item) => {
              const netPrice = calcNetUnitPrice(item.basePrice, item.companyDiscountPercent);
              const totalVal = calcTotalRealValue(netPrice, item.quantity);
              const isChecked = Boolean(item.repChecked);
              const isDiscrepancy = item.status === 'UNVERIFIED_BY_REP' || (item.discrepancyFlag && !isChecked);

              return (
                <div
                  key={item.id}
                  className={`p-4 sm:p-5 flex items-start sm:items-center gap-3.5 transition-colors ${
                    isDiscrepancy
                      ? 'bg-rose-50/50 dark:bg-rose-950/20'
                      : isChecked
                      ? 'bg-emerald-50/25 dark:bg-emerald-950/10'
                      : 'hover:bg-slate-50/60 dark:hover:bg-slate-700/40'
                  }`}
                >
                  {/* Touch-Friendly Line-Item Checkbox at Leading Edge */}
                  <label className="flex items-center justify-center p-1 cursor-pointer select-none flex-shrink-0 mt-0.5 sm:mt-0">
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => handleToggleCheck(item.id)}
                      className="w-5 h-5 rounded border-gray-300 dark:border-slate-600 text-emerald-600 focus:ring-emerald-500 cursor-pointer accent-emerald-600"
                    />
                  </label>

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
                          isDiscrepancy
                            ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/50 dark:text-rose-300 border border-rose-300'
                            : isChecked
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-300'
                            : 'bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300 border border-amber-300'
                        }`}
                      >
                        {isDiscrepancy
                          ? 'Discrepancy — Unchecked by Rep'
                          : isChecked
                          ? 'Verified on Truck'
                          : 'Pending Physical Count'}
                      </span>
                    </div>

                    <div className="flex items-center gap-4 mt-1.5 text-xs text-slate-500 dark:text-slate-300 flex-wrap">
                      <span>
                        Verified Qty:{' '}
                        <strong className="text-slate-900 dark:text-white">
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
                          Count checked: {new Date(item.repCheckedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Strict Signature Pad Modal */}
      <SignaturePadModal
        isOpen={isSignatureModalOpen}
        onClose={() => setIsSignatureModalOpen(false)}
        onSave={handleAttachSignature}
        defaultSignerName={vehicle.repName || 'Kamal Perera'}
        vehicleId={vanId || vehicle.id}
        manifestNo={dailyManifest?.manifestNo || 'MAN-20261105-01'}
        uncheckedCount={uncheckedCount}
        totalCount={items.length}
      />

      <PrintVanStockSheet isOpen={isPrintOpen} onClose={() => setIsPrintOpen(false)} />
    </VanStockLayout>
  );
}
