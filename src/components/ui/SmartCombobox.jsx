import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronsUpDown, X, Search, Store } from 'lucide-react';

/**
 * SmartCombobox — A modern searchable combobox with keyboard navigation,
 * icon support, subtitle, dropdown positioning, and dark mode support.
 *
 * When `portal={true}`, the dropdown menu is rendered at the document body
 * level via createPortal, ensuring it floats above any overflow-hidden/auto
 * parent containers (e.g., modals with overflow-y-auto).
 */
export default function SmartCombobox({
  value,
  onSelect,
  options,
  placeholder = 'Search...',
  label,
  emptyMessage = 'No matches found',
  dropdownMaxHeight = 'max-h-60',
  showSearchIcon = false,
  renderTrigger,
  className = '',
  portal = false,
  dropdownPosition = 'bottom',
}) {
  const containerRef = useRef(null);
  const dropdownRef = useRef(null);
  const inputRef = useRef(null);
  const listRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [portalStyle, setPortalStyle] = useState({});

  const selectedOption = useMemo(
    () => options.find((o) => o.value === value),
    [options, value],
  );

  const filteredOptions = useMemo(() => {
    if (!search.trim()) return options;
    const q = search.toLowerCase().trim();
    return options.filter(
      (o) =>
        o.label?.toLowerCase().includes(q) ||
        (o.subtitle && o.subtitle.toLowerCase().includes(q)),
    );
  }, [options, search]);

  useEffect(() => {
    setHighlightedIndex(-1);
  }, [filteredOptions.length]);

  /* ─── Portal position calculation ─── */
  const recalcPortalPosition = useCallback(() => {
    if (!portal || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    if (dropdownPosition === 'top') {
      setPortalStyle({
        position: 'fixed',
        left: `${rect.left}px`,
        top: 'auto',
        bottom: `${window.innerHeight - rect.top + 4}px`,
        width: `${rect.width}px`,
        zIndex: 9999,
      });
    } else {
      setPortalStyle({
        position: 'fixed',
        left: `${rect.left}px`,
        top: `${rect.bottom + 4}px`,
        width: `${rect.width}px`,
        zIndex: 9999,
      });
    }
  }, [portal, dropdownPosition]);

  /* ─── Close on outside click ─── */
  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e) => {
      if (portal) {
        // In portal mode, check if click is outside both the trigger and the dropdown
        if (
          containerRef.current &&
          !containerRef.current.contains(e.target) &&
          dropdownRef.current &&
          !dropdownRef.current.contains(e.target)
        ) {
          setOpen(false);
          setSearch('');
        }
      } else {
        if (containerRef.current && !containerRef.current.contains(e.target)) {
          setOpen(false);
          setSearch('');
        }
      }
    };
    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
    }, 0);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [open, portal]);

  useEffect(() => {
    if (!open) return;
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        setOpen(false);
        setSearch('');
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [open]);

  /* ─── Recalculate portal position on scroll/resize ─── */
  useEffect(() => {
    if (!open || !portal) return;
    recalcPortalPosition();
    window.addEventListener('scroll', recalcPortalPosition, true);
    window.addEventListener('resize', recalcPortalPosition);
    return () => {
      window.removeEventListener('scroll', recalcPortalPosition, true);
      window.removeEventListener('resize', recalcPortalPosition);
    };
  }, [open, portal, recalcPortalPosition]);

  const handleToggle = useCallback(() => {
    setOpen(!open);
    if (!open) {
      setTimeout(() => {
        inputRef.current?.focus();
        if (portal) recalcPortalPosition();
      }, 50);
    } else {
      setSearch('');
    }
  }, [open, portal, recalcPortalPosition]);

  const handleSelect = useCallback((option) => {
    onSelect(option);
    setSearch('');
    setOpen(false);
  }, [onSelect]);

  const handleKeyDown = useCallback(
    (e) => {
      if (!open) {
        if (e.key === 'Enter' || e.key === 'ArrowDown' || e.key === 'ArrowUp') {
          e.preventDefault();
          setOpen(true);
          if (portal) setTimeout(recalcPortalPosition, 50);
        }
        return;
      }
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setHighlightedIndex((prev) =>
            prev < filteredOptions.length - 1 ? prev + 1 : 0,
          );
          break;
        case 'ArrowUp':
          e.preventDefault();
          setHighlightedIndex((prev) =>
            prev > 0 ? prev - 1 : filteredOptions.length - 1,
          );
          break;
        case 'Enter':
          e.preventDefault();
          if (highlightedIndex >= 0 && highlightedIndex < filteredOptions.length) {
            handleSelect(filteredOptions[highlightedIndex]);
          }
          break;
        case 'Escape':
          e.preventDefault();
          setOpen(false);
          setSearch('');
          break;
      }
    },
    [open, filteredOptions, highlightedIndex, handleSelect, portal, recalcPortalPosition],
  );

  useEffect(() => {
    if (!open || highlightedIndex < 0 || !listRef.current) return;
    const items = listRef.current.querySelectorAll('[data-combobox-option]');
    const target = items[highlightedIndex];
    if (target) {
      target.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }, [highlightedIndex, open]);

  /* ─── Shared dropdown content ─── */
  const dropdownContent = (
    <div
      ref={dropdownRef}
      className={
        portal
          ? `rounded-lg border border-slate-200 bg-white p-2 shadow-2xl dark:border-slate-700 dark:bg-slate-900 overflow-visible`
          : `absolute z-50 w-full rounded-xl border shadow-lg overflow-hidden animate-fade-in mt-1 bg-white border-gray-200 dark:bg-slate-800 dark:border-slate-700`
      }
      style={portal ? { minWidth: '100%' } : { minWidth: '100%' }}
    >
      <div className="p-1.5 border-b border-gray-200 dark:border-slate-700">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
          <input
            type="text"
            autoComplete="off"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setHighlightedIndex(-1);
            }}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            autoFocus
            className="w-full pl-8 pr-2 py-1.5 text-xs border rounded-lg
              bg-white border-gray-300 text-gray-900 placeholder-gray-400
              focus:outline-none focus:ring-1 focus:ring-accent-500/50 focus:border-accent-500
              dark:bg-slate-800 dark:border-slate-600 dark:text-slate-100 dark:placeholder-slate-500"
          />
        </div>
      </div>

      <div ref={listRef} className={`overflow-y-auto ${portal ? 'max-h-48' : dropdownMaxHeight} space-y-1 custom-scrollbar mt-2`}>
        {filteredOptions.length > 0 ? (
          filteredOptions.map((option, index) => {
            const isSelected = option.value === value;
            const isHighlighted = index === highlightedIndex;
            return (
              <button
                key={option.value}
                data-combobox-option
                type="button"
                onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
                onClick={() => handleSelect(option)}
                onMouseEnter={() => setHighlightedIndex(index)}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-left text-xs transition-colors ${
                  isSelected
                    ? 'bg-accent-50 text-accent-700 dark:bg-accent-900/30 dark:text-accent-300'
                    : isHighlighted
                      ? 'bg-gray-100 text-gray-900 dark:bg-slate-700 dark:text-slate-100'
                      : 'text-gray-600 hover:bg-gray-50 dark:text-slate-300 dark:hover:bg-slate-700/50'
                }`}
              >
                {option.icon && (
                  <span className="flex-shrink-0 w-5 h-5 flex items-center justify-center">
                    {option.icon}
                  </span>
                )}
                <div className="flex-1 min-w-0">
                  <span className={`font-medium truncate block ${
                    isSelected ? 'text-accent-700 dark:text-accent-300' : isHighlighted ? 'text-gray-900 dark:text-slate-100' : ''
                  }`}>
                    {option.label}
                  </span>
                  {option.subtitle && (
                    <span className="text-[10px] truncate block text-gray-500 dark:text-slate-400">
                      {option.subtitle}
                    </span>
                  )}
                </div>
                {option.count !== undefined && (
                  <span className="text-[10px] text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded-full dark:bg-slate-700 dark:text-slate-400">
                    {option.count}
                  </span>
                )}
                {isSelected && (
                  <Check className="w-4 h-4 flex-shrink-0 text-accent-600 dark:text-accent-400" />
                )}
              </button>
            );
          })
        ) : (
          <div className="px-3 py-4 text-center text-xs text-gray-500 dark:text-slate-400">
            <Search className="w-5 h-5 mx-auto mb-1 opacity-40" />
            {emptyMessage}
          </div>
        )}
      </div>

      {filteredOptions.length > 0 && (
        <div className="px-3 py-1 text-[10px] font-medium border-t border-gray-200 text-gray-500 dark:border-slate-700 dark:text-slate-400">
          {filteredOptions.length} of {options.length}
        </div>
      )}
    </div>
  );

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {label && (
        <label className="block text-[10px] font-semibold mb-1.5 uppercase tracking-wider text-gray-500 dark:text-slate-400">
          {label}
        </label>
      )}

      <div
        className={`relative flex items-center border-2 rounded-xl transition-all cursor-pointer ${
          open
            ? 'border-accent-500 bg-white ring-1 ring-accent-500/20 dark:bg-slate-800 dark:border-accent-500'
            : 'border-gray-200 bg-white hover:border-gray-300 dark:bg-slate-800 dark:border-slate-600 dark:hover:border-slate-500'
        }`}
        onClick={handleToggle}
      >
        {showSearchIcon && (
          <Search
            className={`ml-3 w-4 h-4 flex-shrink-0 ${
              open ? 'text-accent-500' : 'text-gray-400'
            }`}
          />
        )}

        {renderTrigger ? (
          <div className="flex-1 px-3 py-2.5 text-sm">
            {renderTrigger(selectedOption)}
          </div>
        ) : (
          <span
            className={`flex-1 px-3 py-2.5 text-sm truncate ${
              selectedOption ? 'text-gray-900 dark:text-slate-100' : 'text-gray-400 dark:text-slate-500'
            }`}
          >
            {selectedOption ? selectedOption.label : placeholder}
          </span>
        )}

        <div className="flex items-center gap-0.5 pr-2">
          {selectedOption && !open && (
            <button
              type="button"
              onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
              onClick={(e) => {
                e.stopPropagation();
                handleSelect({ value: '', label: '' });
              }}
              className="p-0.5 rounded text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors dark:hover:bg-slate-700"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <ChevronsUpDown
            className={`w-4 h-4 transition-colors ${
              open ? 'text-accent-500' : 'text-gray-400'
            }`}
          />
        </div>
      </div>

      {open && (
        <input
          ref={inputRef}
          type="text"
          autoComplete="off"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setHighlightedIndex(-1);
          }}
          onKeyDown={handleKeyDown}
          placeholder="Type to filter..."
          className="sr-only"
          aria-hidden="true"
        />
      )}

      {open && (
        portal
          ? createPortal(
              <div style={portalStyle}>
                {dropdownContent}
              </div>,
              document.body
            )
          : dropdownContent
      )}
    </div>
  );
}