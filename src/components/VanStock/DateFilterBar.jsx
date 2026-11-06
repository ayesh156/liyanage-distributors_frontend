/**
 * @file DateFilterBar.jsx
 * @description Unified Date Filter Bar component featuring preset pills
 * (All Dates, Today, Yesterday, Tomorrow, This Month, This Year, Custom Range)
 * and expandable custom date range inputs with active subtotal recalculation feedback.
 */

import React from 'react';
import { Calendar, Filter, Clock, X } from 'lucide-react';
import { DATE_PRESETS } from '../../data/vanStockData';

export default function DateFilterBar({
  selectedPreset = 'ALL',
  onPresetChange,
  customStart = '',
  onCustomStartChange,
  customEnd = '',
  onCustomEndChange,
  resultCount,
  label = 'Date Filter',
  className = '',
}) {
  return (
    <div
      className={`p-2.5 sm:p-3 rounded-2xl bg-white dark:bg-slate-800/90 border border-gray-200 dark:border-slate-700 shadow-sm space-y-2.5 ${className}`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Calendar size={14} className="text-accent-600 dark:text-accent-400" />
          <span className="text-[11px] font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider">
            {label}
          </span>
          {resultCount !== undefined && (
            <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-mono text-[10px] font-semibold">
              {resultCount} record{resultCount === 1 ? '' : 's'}
            </span>
          )}
        </div>

        {selectedPreset !== 'ALL' && (
          <button
            type="button"
            onClick={() => {
              onPresetChange?.('ALL');
              onCustomStartChange?.('');
              onCustomEndChange?.('');
            }}
            className="self-start sm:self-auto flex items-center gap-1 text-[11px] text-accent-600 dark:text-accent-400 hover:underline cursor-pointer"
          >
            <X size={12} />
            <span>Reset to All Dates</span>
          </button>
        )}
      </div>

      {/* Preset Pills */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {DATE_PRESETS.map((preset) => {
          const isActive = selectedPreset === preset.id;
          return (
            <button
              key={preset.id}
              type="button"
              onClick={() => onPresetChange?.(preset.id)}
              className={`px-2.5 py-1 text-xs font-semibold rounded-xl transition-all cursor-pointer ${
                isActive
                  ? 'bg-accent-600 text-white shadow-sm ring-2 ring-accent-500/20'
                  : 'bg-slate-50 dark:bg-slate-900/60 text-slate-600 dark:text-slate-300 border border-gray-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
              }`}
            >
              {preset.label}
            </button>
          );
        })}
      </div>

      {/* Custom Date Range Expandable Inputs */}
      {selectedPreset === 'CUSTOM' && (
        <div className="pt-2 border-t border-gray-100 dark:border-slate-700/60 flex flex-col sm:flex-row sm:items-center gap-2.5 animate-in fade-in duration-150">
          <div className="flex items-center gap-2 flex-1">
            <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 min-w-10">
              From:
            </span>
            <input
              type="date"
              value={customStart}
              onChange={(e) => onCustomStartChange?.(e.target.value)}
              className="flex-1 px-2.5 py-1 text-xs rounded-xl border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-accent-500"
            />
          </div>

          <div className="flex items-center gap-2 flex-1">
            <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 min-w-6">
              To:
            </span>
            <input
              type="date"
              value={customEnd}
              onChange={(e) => onCustomEndChange?.(e.target.value)}
              className="flex-1 px-2.5 py-1 text-xs rounded-xl border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-accent-500"
            />
          </div>
        </div>
      )}
    </div>
  );
}

