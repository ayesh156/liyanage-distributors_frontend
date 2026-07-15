import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';

/**
 * FancyDatePicker — A modern, dark-themed date picker with month/year navigation.
 * Replaces native <input type="date"> for consistent styling across the system.
 */
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const DAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

function getCalendarDays(year, month) {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startPadding = firstDay.getDay();
  const totalDays = lastDay.getDate();
  const days = [];
  for (let i = 0; i < startPadding; i++) days.push(null);
  for (let d = 1; d <= totalDays; d++) days.push(d);
  return days;
}

export default function FancyDatePicker({ value, onChange, label, name }) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);
  const triggerRef = useRef(null);
  const panelRef = useRef(null);
  const [panelStyle, setPanelStyle] = useState({ top: 0, left: 0 });
  const safeDateStr = typeof value === 'string' ? value : (value instanceof Date ? value.toISOString() : '');
  const normalizedValue = safeDateStr ? safeDateStr.slice(0, 10) : '';
  const parsedDate = normalizedValue ? new Date(`${normalizedValue}T00:00:00`) : new Date();
  const parsed = Number.isNaN(parsedDate.getTime()) ? new Date() : parsedDate;
  const [viewYear, setViewYear] = useState(parsed.getFullYear());
  const [viewMonth, setViewMonth] = useState(parsed.getMonth());

  // Sync view when value changes externally
  useEffect(() => {
    const nextDate = normalizedValue ? new Date(`${normalizedValue}T00:00:00`) : new Date();
    const d = Number.isNaN(nextDate.getTime()) ? new Date() : nextDate;
    setViewYear(d.getFullYear());
    setViewMonth(d.getMonth());
  }, [normalizedValue]);

  const days = getCalendarDays(viewYear, viewMonth);

  const selectedStr = normalizedValue;
  const todayStr = new Date().toISOString().split('T')[0];

  const emitChange = useCallback((nextValue) => {
    if (typeof onChange !== 'function') return;
    onChange({ target: { name, value: nextValue } });
  }, [name, onChange]);

  const handleSelect = useCallback((day) => {
    if (!day) return;
    const m = String(viewMonth + 1).padStart(2, '0');
    const d = String(day).padStart(2, '0');
    emitChange(`${viewYear}-${m}-${d}`);
    setOpen(false);
  }, [viewYear, viewMonth, emitChange]);

  const prevMonth = () => {
    if (viewMonth === 0) { setViewYear((y) => y - 1); setViewMonth(11); }
    else setViewMonth((m) => m - 1);
  };

  const nextMonth = () => {
    if (viewMonth === 11) { setViewYear((y) => y + 1); setViewMonth(0); }
    else setViewMonth((m) => m + 1);
  };

  const updatePanelPosition = useCallback(() => {
    if (!triggerRef.current) return;
    const triggerRect = triggerRef.current.getBoundingClientRect();
    const PANEL_WIDTH = 288;
    const margin = 12;
    const maxLeft = window.innerWidth - PANEL_WIDTH - margin;
    const left = Math.max(margin, Math.min(triggerRect.right - PANEL_WIDTH, maxLeft));
    setPanelStyle({
      top: triggerRect.bottom + 8,
      left,
    });
  }, []);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    updatePanelPosition();

    const handler = (e) => {
      const insideTrigger = containerRef.current && containerRef.current.contains(e.target);
      const insidePanel = panelRef.current && panelRef.current.contains(e.target);
      if (!insideTrigger && !insidePanel) {
        setOpen(false);
      }
    };

    const handleReposition = () => updatePanelPosition();
    const timer = setTimeout(() => document.addEventListener('mousedown', handler), 0);
    window.addEventListener('resize', handleReposition);
    window.addEventListener('scroll', handleReposition, true);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('mousedown', handler);
      window.removeEventListener('resize', handleReposition);
      window.removeEventListener('scroll', handleReposition, true);
    };
  }, [open, updatePanelPosition]);

  // Format display value
  const displayValue = selectedStr
    ? (() => {
        const d = new Date(`${selectedStr}T00:00:00`);
        if (Number.isNaN(d.getTime())) return '';
        const monthShort = MONTHS[d.getMonth()] ? MONTHS[d.getMonth()].slice(0, 3) : '';
        return monthShort ? `${d.getDate()} ${monthShort} ${d.getFullYear()}` : '';
      })()
    : '';

  return (
    <div ref={containerRef} className="relative">
      {label && (
        <label className="input-label">
          <CalendarDays size={13} className="inline mr-1 text-gray-400" /> {label}
        </label>
      )}
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen(!open)}
        className={`ui-contrast-field w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm border transition-all ${
          open
            ? 'border-orange-500 ring-1 ring-orange-500/20 bg-white dark:bg-slate-800'
            : 'hover:border-slate-300 dark:hover:border-slate-500'
        } ${selectedStr ? 'text-slate-800 dark:text-white' : 'text-gray-400 dark:text-slate-400'}`}
      >
        <CalendarDays size={15} className="text-gray-400 dark:text-slate-400 flex-shrink-0" />
        <span className="flex-1 text-left truncate">
          {displayValue || 'Select date...'}
        </span>
        <span className="text-[10px] text-gray-400 dark:text-slate-500">▼</span>
      </button>

      {open && createPortal(
        <div
          ref={panelRef}
          style={{ top: panelStyle.top, left: panelStyle.left }}
          className="absolute z-[99999] mt-1 p-4 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 shadow-2xl rounded-2xl w-72 left-0 text-slate-900 dark:text-slate-100"
        >
          {/* Month/Year navigation */}
          <div className="flex items-center justify-between mb-3">
            <button
              type="button"
              onClick={prevMonth}
              className="p-1 rounded-lg hover:bg-gray-100 text-gray-600 hover:text-gray-900 transition-colors dark:hover:bg-slate-700 dark:text-slate-300 dark:hover:text-white"
            >
              <ChevronLeft size={18} />
            </button>
            <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">
              {MONTHS[viewMonth]} {viewYear}
            </span>
            <button
              type="button"
              onClick={nextMonth}
              className="p-1 rounded-lg hover:bg-gray-100 text-gray-600 hover:text-gray-900 transition-colors dark:hover:bg-slate-700 dark:text-slate-300 dark:hover:text-white"
            >
              <ChevronRight size={18} />
            </button>
          </div>

          {/* Day headers */}
          <div className="grid grid-cols-7 gap-0.5 mb-1">
            {DAYS.map((d) => (
              <div key={d} className="text-center text-[10px] font-semibold text-gray-500 dark:text-slate-500 py-1">
                {d}
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7 gap-0.5">
            {days.map((day, i) => {
              if (day === null) return <div key={`empty-${i}`} />;
              const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
              const isSelected = dateStr === selectedStr;
              const isToday = dateStr === todayStr;
              return (
                <button
                  key={dateStr}
                  type="button"
                  onClick={() => handleSelect(day)}
                  className={`text-center text-xs py-1.5 rounded-lg transition-colors ${
                    isSelected
                    ? 'bg-orange-500 text-white font-bold'
                    : isToday
                      ? 'bg-orange-100 text-orange-600 font-semibold dark:bg-slate-700 dark:text-orange-400'
                      : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900 dark:text-slate-300 dark:hover:bg-slate-700 dark:hover:text-white'
                  }`}
                >
                  {day}
                </button>
              );
            })}
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
}