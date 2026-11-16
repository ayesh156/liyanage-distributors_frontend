/**
 * @file combobox.jsx
 * @description Modern Shadcn UI Combobox component for fast, searchable selection.
 * Supports both high-level single-component usage (via `options` prop)
 * and compound component usage (Combobox, ComboboxInput, ComboboxContent, ComboboxList, ComboboxItem).
 */

import React, {
  useState,
  useRef,
  useEffect,
  useMemo,
  createContext,
  useContext,
  useCallback,
} from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronsUpDown, Search, X } from 'lucide-react';

const ComboboxContext = createContext(null);

export function useCombobox() {
  const context = useContext(ComboboxContext);
  if (!context) {
    throw new Error('Combobox compound components must be used within a <Combobox>');
  }
  return context;
}

/**
 * Root Combobox Component
 */
export function Combobox({
  options = [],
  value,
  onChange,
  placeholder = 'Select option...',
  searchPlaceholder = 'Search...',
  emptyMessage = 'No results found.',
  className = '',
  disabled = false,
  portal = true,
  children,
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [portalStyle, setPortalStyle] = useState({});
  const containerRef = useRef(null);
  const dropdownRef = useRef(null);

  // Recalculate fixed positioning for Portal mode
  const recalcPosition = useCallback(() => {
    if (!portal || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const openUp = spaceBelow < 280 && rect.top > 280;

    setPortalStyle({
      position: 'fixed',
      left: `${rect.left}px`,
      top: openUp ? 'auto' : `${rect.bottom + 6}px`,
      bottom: openUp ? `${window.innerHeight - rect.top + 6}px` : 'auto',
      width: `${rect.width}px`,
      maxWidth: 'calc(100vw - 32px)',
      zIndex: 100,
    });
  }, [portal]);

  useEffect(() => {
    if (!open) return;
    if (portal) {
      recalcPosition();
      window.addEventListener('resize', recalcPosition);
      window.addEventListener('scroll', recalcPosition, true);
      return () => {
        window.removeEventListener('resize', recalcPosition);
        window.removeEventListener('scroll', recalcPosition, true);
      };
    }
  }, [open, portal, recalcPosition]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target) &&
        (!dropdownRef.current || !dropdownRef.current.contains(e.target))
      ) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [open]);

  // Close dropdown on Escape key
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'Escape' && open) {
        setOpen(false);
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open]);

  const selectedOption = useMemo(() => {
    if (value === undefined || value === null || value === '') return null;
    return options.find(
      (opt) => String(opt.value) === String(value) || String(opt.id) === String(value)
    );
  }, [options, value]);

  const filteredOptions = useMemo(() => {
    if (!search.trim()) return options;
    const q = search.toLowerCase().trim();
    return options.filter((opt) => {
      const label = opt.label || opt.name || '';
      const sub = opt.subtext || opt.subtitle || opt.sku || opt.city || '';
      return label.toLowerCase().includes(q) || sub.toLowerCase().includes(q);
    });
  }, [options, search]);

  const handleSelect = useCallback(
    (val) => {
      if (onChange) {
        onChange(val);
      }
      setOpen(false);
      setSearch('');
    },
    [onChange]
  );

  const contextValue = {
    open,
    setOpen,
    search,
    setSearch,
    value,
    selectedOption,
    handleSelect,
    disabled,
    placeholder,
    searchPlaceholder,
    emptyMessage,
  };

  // If children are provided, render compound structure
  if (children) {
    return (
      <ComboboxContext.Provider value={contextValue}>
        <div ref={containerRef} className={`relative inline-block w-full ${className}`}>
          {children}
        </div>
      </ComboboxContext.Provider>
    );
  }

  // Otherwise render self-contained high-level component
  const displayLabel = selectedOption
    ? selectedOption.label || selectedOption.name
    : '';

  return (
    <ComboboxContext.Provider value={contextValue}>
      <div ref={containerRef} className={`relative inline-block w-full ${className}`}>
        {/* Trigger Button */}
        <button
          type="button"
          disabled={disabled}
          onClick={() => {
            if (!disabled) {
              setOpen((prev) => !prev);
              if (!open) setSearch('');
            }
          }}
          className={`flex items-center justify-between w-full px-3 py-2 text-xs font-medium rounded-xl border transition-all cursor-pointer shadow-xs ${
            disabled
              ? 'opacity-50 cursor-not-allowed bg-slate-100 dark:bg-slate-800 border-gray-200 dark:border-slate-700'
              : open
                ? 'border-accent-500 ring-2 ring-accent-500/20 bg-white dark:bg-slate-900 text-slate-900 dark:text-white'
                : 'border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/80 text-slate-900 dark:text-slate-100'
          }`}
        >
          <span className={`truncate text-left ${!displayLabel ? 'text-slate-400 dark:text-slate-500' : ''}`}>
            {displayLabel || placeholder}
          </span>
          <ChevronsUpDown size={14} className="text-slate-400 dark:text-slate-500 ml-2 flex-shrink-0" />
        </button>

        {/* Popover Dropdown */}
        {open && (() => {
          const dropdownNode = (
            <div
              ref={dropdownRef}
              style={portal ? portalStyle : undefined}
              className={`${portal ? 'fixed' : 'absolute left-0 right-0 top-full mt-1.5'} z-[100] rounded-2xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 shadow-xl overflow-hidden animate-in fade-in-50 zoom-in-95 duration-100 min-w-[200px]`}
            >
              {/* Search Input */}
              <div className="p-2 border-b border-gray-100 dark:border-slate-800 flex items-center gap-2">
                <Search size={14} className="text-slate-400 dark:text-slate-500 flex-shrink-0" />
                <input
                  type="text"
                  autoFocus
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={searchPlaceholder}
                  className="w-full bg-transparent text-xs text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none"
                />
                {search && (
                  <button
                    type="button"
                    onClick={() => setSearch('')}
                    className="p-0.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400"
                  >
                    <X size={12} />
                  </button>
                )}
              </div>

              {/* List */}
              <div className="max-h-60 overflow-y-auto p-1 space-y-0.5">
                {filteredOptions.length === 0 ? (
                  <div className="py-6 text-center text-xs text-slate-400 dark:text-slate-500">
                    {emptyMessage}
                  </div>
                ) : (
                  filteredOptions.map((opt) => {
                    const optVal = opt.value !== undefined ? opt.value : opt.id;
                    const isSelected = String(value) === String(optVal);
                    return (
                      <button
                        key={String(optVal)}
                        type="button"
                        onClick={() => handleSelect(optVal)}
                        className={`flex items-center justify-between w-full px-3 py-2 text-xs rounded-xl text-left transition-colors cursor-pointer ${
                          isSelected
                            ? 'bg-accent-50 dark:bg-accent-950/40 text-accent-700 dark:text-accent-300 font-bold'
                            : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                        }`}
                      >
                        <div className="min-w-0 flex-1 pr-2">
                          <span className="block truncate">{opt.label || opt.name}</span>
                          {(opt.subtext || opt.subtitle || opt.sku || opt.city) && (
                            <span className="block text-[10px] text-slate-400 dark:text-slate-500 font-mono truncate">
                              {opt.subtext || opt.subtitle || opt.sku || opt.city}
                            </span>
                          )}
                        </div>
                        {isSelected && (
                          <Check size={14} className="text-accent-600 dark:text-accent-400 flex-shrink-0" />
                        )}
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          );
          return portal ? createPortal(dropdownNode, document.body) : dropdownNode;
        })()}
      </div>
    </ComboboxContext.Provider>
  );
}

/**
 * Compound Combobox Components
 */
export function ComboboxInput({ placeholder, className = '' }) {
  const { open, setOpen, selectedOption, disabled, placeholder: defaultPlaceholder } = useCombobox();
  const label = selectedOption ? selectedOption.label || selectedOption.name : '';

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => {
        if (!disabled) setOpen(!open);
      }}
      className={`flex items-center justify-between w-full px-3 py-2 text-xs font-medium rounded-xl border transition-all cursor-pointer shadow-xs ${
        disabled
          ? 'opacity-50 cursor-not-allowed bg-slate-100 dark:bg-slate-800 border-gray-200 dark:border-slate-700'
          : open
            ? 'border-accent-500 ring-2 ring-accent-500/20 bg-white dark:bg-slate-900 text-slate-900 dark:text-white'
            : 'border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/80 text-slate-900 dark:text-slate-100'
      } ${className}`}
    >
      <span className={`truncate text-left ${!label ? 'text-slate-400 dark:text-slate-500' : ''}`}>
        {label || placeholder || defaultPlaceholder}
      </span>
      <ChevronsUpDown size={14} className="text-slate-400 dark:text-slate-500 ml-2 flex-shrink-0" />
    </button>
  );
}

export function ComboboxContent({ children, className = '' }) {
  const { open, search, setSearch, searchPlaceholder } = useCombobox();
  if (!open) return null;

  return (
    <div className={`absolute left-0 right-0 top-full mt-1.5 z-[100] rounded-2xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 shadow-xl overflow-hidden animate-in fade-in-50 zoom-in-95 duration-100 min-w-[200px] ${className}`}>
      <div className="p-2 border-b border-gray-100 dark:border-slate-800 flex items-center gap-2">
        <Search size={14} className="text-slate-400 dark:text-slate-500 flex-shrink-0" />
        <input
          type="text"
          autoFocus
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={searchPlaceholder}
          className="w-full bg-transparent text-xs text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none"
        />
        {search && (
          <button
            type="button"
            onClick={() => setSearch('')}
            className="p-0.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400"
          >
            <X size={12} />
          </button>
        )}
      </div>
      {children}
    </div>
  );
}

export function ComboboxList({ children, className = '' }) {
  return (
    <div className={`max-h-60 overflow-y-auto p-1 space-y-0.5 ${className}`}>
      {children}
    </div>
  );
}

export function ComboboxItem({ value, children, className = '', onSelect }) {
  const { value: selectedValue, handleSelect } = useCombobox();
  const isSelected = String(selectedValue) === String(value);

  return (
    <button
      type="button"
      onClick={() => {
        if (onSelect) onSelect(value);
        else handleSelect(value);
      }}
      className={`flex items-center justify-between w-full px-3 py-2 text-xs rounded-xl text-left transition-colors cursor-pointer ${
        isSelected
          ? 'bg-accent-50 dark:bg-accent-950/40 text-accent-700 dark:text-accent-300 font-bold'
          : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
      } ${className}`}
    >
      <div className="min-w-0 flex-1 pr-2">{children}</div>
      {isSelected && (
        <Check size={14} className="text-accent-600 dark:text-accent-400 flex-shrink-0" />
      )}
    </button>
  );
}

export function ComboboxEmpty({ children }) {
  const { emptyMessage } = useCombobox();
  return (
    <div className="py-6 text-center text-xs text-slate-400 dark:text-slate-500">
      {children || emptyMessage}
    </div>
  );
}

export default Combobox;
