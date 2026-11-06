/**
 * @file DropdownMenu.jsx
 * @description Accessible, lightweight Shadcn UI compatible DropdownMenu component.
 * Features:
 * - Triggered by any child (e.g. 3-dots MoreVertical button)
 * - Portal-rendered via ReactDOM.createPortal directly into document.body to avoid parent overflow clipping
 * - Dynamic viewport boundary positioning (supports align="end" | "start" | "center")
 * - Keyboard navigation (Escape key dismissal) and click-outside handling
 * - Dark & Light mode contrast compliant styling
 */

import React, {
  useState,
  useRef,
  useEffect,
  useLayoutEffect,
  useCallback,
  createContext,
  useContext,
} from 'react';
import { createPortal } from 'react-dom';

const DropdownMenuContext = createContext(null);

export function DropdownMenu({ children, className = '' }) {
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef(null);

  const close = useCallback(() => setIsOpen(false), []);
  const toggle = useCallback(() => setIsOpen((prev) => !prev), []);

  return (
    <DropdownMenuContext.Provider
      value={{
        isOpen,
        setIsOpen,
        close,
        toggle,
        triggerRef,
      }}
    >
      <div className={`relative inline-block text-left ${className}`}>{children}</div>
    </DropdownMenuContext.Provider>
  );
}

export function DropdownMenuTrigger({ children, asChild = false, className = '' }) {
  const { toggle, triggerRef, isOpen } = useContext(DropdownMenuContext);

  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children, {
      ref: triggerRef,
      onClick: (e) => {
        children.props.onClick?.(e);
        toggle();
      },
      'aria-haspopup': 'true',
      'aria-expanded': isOpen,
    });
  }

  return (
    <button
      ref={triggerRef}
      type="button"
      onClick={toggle}
      aria-haspopup="true"
      aria-expanded={isOpen}
      className={className || "p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"}
    >
      {children}
    </button>
  );
}

export function DropdownMenuContent({
  children,
  align = 'end',
  side = 'auto',
  className = '',
  width = 'w-48',
}) {
  const { isOpen, close, triggerRef } = useContext(DropdownMenuContext);
  const contentRef = useRef(null);
  const [coords, setCoords] = useState({ top: -9999, left: -9999 });

  const updatePosition = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const scrollY = window.scrollY || document.documentElement.scrollTop;
    const scrollX = window.scrollX || document.documentElement.scrollLeft;

    const menuWidth = contentRef.current?.offsetWidth || (width === 'w-52' ? 208 : 192);
    const menuHeight = contentRef.current?.offsetHeight || 190;

    const distanceToBottom = window.innerHeight - rect.bottom;
    const openUpwards =
      side === 'top' ||
      (side !== 'bottom' && distanceToBottom < Math.max(200, menuHeight) && rect.top > distanceToBottom);

    const top = openUpwards
      ? Math.max(scrollY + 8, rect.top + scrollY - menuHeight - 6)
      : rect.bottom + scrollY + 6;

    let left =
      align === 'start'
        ? rect.left + scrollX
        : align === 'center'
        ? rect.left + scrollX + (rect.width - menuWidth) / 2
        : rect.right + scrollX - menuWidth;

    // Viewport bounds guards
    const maxLeft = window.innerWidth + scrollX - menuWidth - 8;
    if (left > maxLeft) left = maxLeft;
    if (left < scrollX + 8) left = scrollX + 8;

    setCoords({ top, left });
  }, [align, side, width, triggerRef]);

  useLayoutEffect(() => {
    if (!isOpen) return;
    updatePosition();
  }, [isOpen, updatePosition]);

  useEffect(() => {
    if (!isOpen) return;

    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);

    const handleClickOutside = (e) => {
      if (
        contentRef.current &&
        !contentRef.current.contains(e.target) &&
        triggerRef.current &&
        !triggerRef.current.contains(e.target)
      ) {
        close();
      }
    };

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        close();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, close, updatePosition, triggerRef]);

  if (!isOpen) return null;

  const contentElement = (
    <div
      ref={contentRef}
      style={{
        position: 'absolute',
        top: `${coords.top}px`,
        left: `${coords.left}px`,
        zIndex: 9999,
      }}
      className={`${width} bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 shadow-xl rounded-2xl py-1.5 focus:outline-none animate-in fade-in zoom-in-95 duration-150 ${className}`}
      role="menu"
      aria-orientation="vertical"
    >
      {children}
    </div>
  );

  return typeof document !== 'undefined'
    ? createPortal(contentElement, document.body)
    : contentElement;
}

export function DropdownMenuItem({
  children,
  onClick,
  icon: Icon,
  destructive = false,
  disabled = false,
  className = '',
}) {
  const { close } = useContext(DropdownMenuContext);

  const handleClick = (e) => {
    e.stopPropagation();
    if (disabled) return;
    close();
    onClick?.(e);
  };

  return (
    <button
      type="button"
      role="menuitem"
      disabled={disabled}
      onClick={handleClick}
      className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold transition-colors text-left cursor-pointer ${
        destructive
          ? 'text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40'
          : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-zinc-700/60 hover:text-slate-900 dark:hover:text-white'
      } ${disabled ? 'opacity-40 cursor-not-allowed' : ''} ${className}`}
    >
      {Icon && <Icon size={14} className={destructive ? 'text-rose-500' : 'text-slate-400 dark:text-zinc-400'} />}
      <span className="truncate">{children}</span>
    </button>
  );
}

export function DropdownMenuSeparator({ className = '' }) {
  return <div className={`my-1 border-t border-slate-200 dark:border-zinc-700 ${className}`} />;
}

export function DropdownMenuLabel({ children, className = '' }) {
  return (
    <div className={`px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-400 ${className}`}>
      {children}
    </div>
  );
}

export default DropdownMenu;

// Reusable aliases for polymorphic action menus
export {
  DropdownMenu as Dropdown,
  DropdownMenu as ActionMenu,
  DropdownMenuTrigger as ActionMenuTrigger,
  DropdownMenuContent as ActionMenuContent,
  DropdownMenuItem as ActionMenuItem,
};

