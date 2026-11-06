/**
 * @file SearchableSelect.jsx
 * @description Universal searchable combobox replacement for native <select> elements.
 * Features full keyboard navigation (ArrowUp, ArrowDown, Enter, Esc), high-DPI retina touch targets,
 * instant typeahead filtering, optional React portal rendering for modals, clearable button,
 * and WCAG-compliant high-contrast Dark & Light mode styling.
 */

import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronsUpDown, X, Search } from 'lucide-react';

export default function SearchableSelect({
  value,
  onChange,
  options = [],
  placeholder = 'Select option...',
  label,
  emptyMessage = 'No options found',
  size = 'md', // 'sm' | 'md' | 'lg'
  icon: TriggerIcon,
  clearable = true,
  portal = false,
  dropdownPosition = 'bottom',
  disabled = false,
  className = '',
  dropdownClassName = '',
}) {
  const containerRef = useRef(null);
  const dropdownRef = useRef(null);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [portalStyle, setPortalStyle] = useState({});

  // Normalize options: supports string array or object array [{ value, label, subtitle, icon, count }]
  const normalizedOptions = useMemo(() => {
    return options.map((opt) => {
      if (typeof opt === 'string' || typeof opt === 'number') {
        return {
          value: String(opt),
          label: String(opt),
        };
      }
      return {
        value: String(opt.value ?? opt.id ?? ''),
        label: String(opt.label ?? opt.name ?? opt.value ?? ''),
        subtitle: opt.subtitle,
        icon: opt.icon,
        count: opt.count,
        badgeClass: opt.badgeClass,
      };
    });
  }, [options]);

  const selectedOption = useMemo(
    () => normalizedOptions.find((o) => String(o.value) === String(value)),
    [normalizedOptions, value]
  );

  const filteredOptions = useMemo(() => {
    if (!search.trim()) return normalizedOptions;
    const q = search.toLowerCase().trim();
    return normalizedOptions.filter(
      (o) =>
        o.label.toLowerCase().includes(q) ||
        (o.subtitle && o.subtitle.toLowerCase().includes(q))
    );
  }, [normalizedOptions, search]);

  useEffect(() => {
    setHighlightedIndex(-1);
  }, [filteredOptions.length]);

  // Portal positioning
  const updatePortalPosition = useCallback(() => {
    if (!portal || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    if (dropdownPosition === 'top') {
      setPortalStyle({
        position: 'fixed',
        left: `${rect.left}px`,
        top: 'auto',
        bottom: `${window.innerHeight - rect.top + 6}px`,
        width: `${rect.width}px`,
        zIndex: 99999,
      });
    } else {
      setPortalStyle({
        position: 'fixed',
        left: `${rect.left}px`,
        top: `${rect.bottom + 6}px`,
        width: `${rect.width}px`,
        zIndex: 99999,
      });
    }
  }, [portal, dropdownPosition]);

  // Click outside listener
  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e) => {
      if (portal) {
        if (
          containerRef.current &&
          !containerRef.current.contains(e.target) &&
          dropdownRef.current &&
          !dropdownRef.current.contains(e.target)
        ) {
          setIsOpen(false);
          setSearch('');
        }
      } else {
        if (containerRef.current && !containerRef.current.contains(e.target)) {
          setIsOpen(false);
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
  }, [isOpen, portal]);

  // Reposition on scroll/resize if portal
  useEffect(() => {
    if (!isOpen || !portal) return;
    updatePortalPosition();
    window.addEventListener('scroll', updatePortalPosition, true);
    window.addEventListener('resize', updatePortalPosition);
    return () => {
      window.removeEventListener('scroll', updatePortalPosition, true);
      window.removeEventListener('resize', updatePortalPosition);
    };
  }, [isOpen, portal, updatePortalPosition]);

  const handleToggle = () => {
    if (disabled) return;
    const next = !isOpen;
    setIsOpen(next);
    if (next) {
      setTimeout(() => {
        inputRef.current?.focus();
        if (portal) updatePortalPosition();
      }, 50);
    } else {
      setSearch('');
    }
  };

  const handleSelect = (option) => {
    onChange?.(option ? option.value : '');
    setSearch('');
    setIsOpen(false);
  };

  const handleKeyDown = (e) => {
    if (!isOpen) {
      if (e.key === 'Enter' || e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        setIsOpen(true);
        if (portal) setTimeout(updatePortalPosition, 50);
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex((prev) => (prev < filteredOptions.length - 1 ? prev + 1 : 0));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : filteredOptions.length - 1));
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightedIndex >= 0 && highlightedIndex < filteredOptions.length) {
          handleSelect(filteredOptions[highlightedIndex]);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        setSearch('');
        break;
      default:
        break;
    }
  };

  // Auto-scroll highlighted item into view
  useEffect(() => {
    if (!isOpen || highlightedIndex < 0 || !listRef.current) return;
    const items = listRef.current.querySelectorAll('[data-select-option]');
    const target = items[highlightedIndex];
    if (target) {
      target.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }, [highlightedIndex, isOpen]);

  // Size styling classes
  const sizeClasses = {
    sm: 'text-xs py-1.5 px-2.5 rounded-lg min-h-[34px]',
    md: 'text-xs sm:text-sm py-2 px-3 rounded-xl min-h-[40px]',
    lg: 'text-sm py-2.5 px-3.5 rounded-xl min-h-[46px]',
  }[size] || 'text-xs py-2 px-3 rounded-xl min-h-[40px]';

  const dropdownList = (
    <div
      ref={dropdownRef}
      className={`${
        portal
          ? 'rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-2xl overflow-hidden'
          : 'absolute left-0 right-0 z-50 mt-1.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-xl overflow-hidden'
      } ${dropdownClassName}`}
      style={portal ? portalStyle : undefined}
    >
      {/* Search Input Box */}
      <div className="p-2 border-b border-gray-100 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-900/50">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 dark:text-slate-400" />
          <input
            ref={inputRef}
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setHighlightedIndex(-1);
            }}
            onKeyDown={handleKeyDown}
            placeholder="Type to filter..."
            className="w-full pl-8 pr-2.5 py-1.5 text-xs rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-accent-500"
          />
        </div>
      </div>

      {/* Options Scrollable List */}
      <div
        ref={listRef}
        className="max-h-56 overflow-y-auto py-1 divide-y divide-gray-50 dark:divide-slate-700/50"
      >
        {filteredOptions.length > 0 ? (
          filteredOptions.map((opt, idx) => {
            const isSelected = String(opt.value) === String(value);
            const isHighlighted = idx === highlightedIndex;

            return (
              <button
                key={`${opt.value}-${idx}`}
                data-select-option
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
                onClick={() => handleSelect(opt)}
                onMouseEnter={() => setHighlightedIndex(idx)}
                className={`w-full flex items-center justify-between gap-2 px-3 py-2 text-left text-xs transition-colors cursor-pointer ${
                  isSelected
                    ? 'bg-accent-50 text-accent-700 dark:bg-accent-950/40 dark:text-accent-300 font-semibold'
                    : isHighlighted
                    ? 'bg-slate-100 text-slate-900 dark:bg-slate-700 dark:text-slate-100'
                    : 'text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-700/50'
                }`}
              >
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  {opt.icon && (
                    <span className="flex-shrink-0 text-slate-400">
                      {React.isValidElement(opt.icon)
                        ? opt.icon
                        : typeof opt.icon === 'function' || (typeof opt.icon === 'object' && opt.icon !== null)
                        ? React.createElement(opt.icon, { className: 'w-3.5 h-3.5' })
                        : null}
                    </span>
                  )}
                  <div className="min-w-0 flex-1">
                    <span className="truncate block">{opt.label}</span>
                    {opt.subtitle && (
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 truncate block">
                        {opt.subtitle}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1.5 flex-shrink-0">
                  {opt.count !== undefined && (
                    <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-mono font-medium">
                      {opt.count}
                    </span>
                  )}
                  {isSelected && (
                    <Check className="w-3.5 h-3.5 text-accent-600 dark:text-accent-400 flex-shrink-0" />
                  )}
                </div>
              </button>
            );
          })
        ) : (
          <div className="py-6 px-3 text-center text-xs text-slate-400 dark:text-slate-500">
            {emptyMessage}
          </div>
        )}
      </div>

      {filteredOptions.length > 0 && (
        <div className="px-3 py-1 bg-slate-50/50 dark:bg-slate-900/40 border-t border-gray-100 dark:border-slate-700 text-[10px] text-slate-500 dark:text-slate-400 flex items-center justify-between">
          <span>{filteredOptions.length} of {normalizedOptions.length}</span>
          <span className="text-[9px] text-slate-400">↑↓ to navigate, ↵ to select</span>
        </div>
      )}
    </div>
  );

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {label && (
        <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
          {label}
        </label>
      )}

      {/* Trigger Button */}
      <div
        role="button"
        tabIndex={disabled ? -1 : 0}
        onClick={handleToggle}
        onKeyDown={handleKeyDown}
        className={`w-full flex items-center justify-between gap-2 border bg-white dark:bg-slate-800 transition-all select-none ${sizeClasses} ${
          disabled
            ? 'opacity-50 cursor-not-allowed bg-slate-100 dark:bg-slate-900 border-gray-200 dark:border-slate-800'
            : isOpen
            ? 'border-accent-500 ring-2 ring-accent-500/20 dark:border-accent-400 cursor-pointer'
            : 'border-gray-200 hover:border-gray-300 dark:border-slate-700 dark:hover:border-slate-600 cursor-pointer shadow-sm'
        }`}
      >
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {TriggerIcon ? (
            <TriggerIcon className="w-3.5 h-3.5 text-slate-400 dark:text-slate-400 flex-shrink-0" />
          ) : selectedOption?.icon ? (
            <span className="flex-shrink-0 text-slate-400 dark:text-slate-400">
              {React.isValidElement(selectedOption.icon)
                ? selectedOption.icon
                : typeof selectedOption.icon === 'function' || (typeof selectedOption.icon === 'object' && selectedOption.icon !== null)
                ? React.createElement(selectedOption.icon, { className: 'w-3.5 h-3.5' })
                : null}
            </span>
          ) : null}
          <span
            className={`truncate block ${
              selectedOption
                ? 'text-slate-900 dark:text-slate-100 font-medium'
                : 'text-slate-400 dark:text-slate-500'
            }`}
          >
            {selectedOption ? selectedOption.label : placeholder}
          </span>
        </div>

        <div className="flex items-center gap-1 flex-shrink-0 text-slate-400">
          {clearable && selectedOption && !disabled && (
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
              onClick={(e) => {
                e.stopPropagation();
                handleSelect(null);
              }}
              className="p-0.5 rounded hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
              title="Clear selection"
            >
              <X size={13} />
            </button>
          )}
          <ChevronsUpDown size={14} className={isOpen ? 'text-accent-500' : ''} />
        </div>
      </div>

      {/* Dropdown Menu */}
      {isOpen && (portal ? createPortal(dropdownList, document.body) : dropdownList)}
    </div>
  );
}

