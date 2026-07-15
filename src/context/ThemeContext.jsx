import { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';

const STORAGE_KEY = 'liyanage-theme';

/**
 * Resolve the effective theme from a stored preference value.
 * 'system' reads the browser's prefers-color-scheme media query.
 */
function resolveTheme(stored) {
  if (stored === 'dark')  return 'dark';
  if (stored === 'light') return 'light';
  // 'system' — honour browser preference
  if (typeof window !== 'undefined') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return 'dark'; // safe server-side default
}

/**
 * Apply the resolved theme class to <html>.
 * Only adds/removes 'dark' and 'light' — never mutates other classes.
 */
function applyThemeClass(resolved) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  if (resolved === 'dark') {
    root.classList.add('dark');
    root.classList.remove('light');
  } else {
    root.classList.remove('dark');
    root.classList.add('light');
  }
}

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) || 'dark';
    } catch {
      return 'dark';
    }
  });

  // Resolved theme — actual 'dark' or 'light'
  const resolved = useMemo(() => resolveTheme(theme), [theme]);

  // Apply class on mount and whenever resolved theme changes
  useEffect(() => {
    applyThemeClass(resolved);
  }, [resolved]);

  // Listen for system preference changes only when theme === 'system'
  useEffect(() => {
    if (theme !== 'system') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => {
      applyThemeClass(mq.matches ? 'dark' : 'light');
    };
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [theme]);

  /**
   * PRINT PROTECTION
   * ─────────────────────────────────────────────────────────────────────
   * When the browser enters print mode it may re-evaluate media queries
   * (including prefers-color-scheme). If the system theme handler fires
   * during this window it would flip the .dark class on <html>, which
   * React renders as a UI theme change after the print dialog closes.
   *
   * Fix: capture the current class state on `beforeprint` and restore it
   * on `afterprint`. This is pure DOM bookkeeping — no React state is
   * mutated, no setTheme() is called, no localStorage is touched.
   * The @media print CSS rules in index.css handle all visual rendering
   * independently via white-paper / black-ink overrides.
   * ─────────────────────────────────────────────────────────────────────
   */
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Snapshot of classes before the browser enters print mode
    let savedClasses = '';

    const onBeforePrint = () => {
      // Save the current class list on <html>
      savedClasses = document.documentElement.className;
    };

    const onAfterPrint = () => {
      // Restore the exact class list — this undoes any media-query-driven
      // mutations that happened during the print CSS evaluation cycle
      if (savedClasses !== '') {
        document.documentElement.className = savedClasses;
      }
    };

    window.addEventListener('beforeprint', onBeforePrint);
    window.addEventListener('afterprint',  onAfterPrint);

    return () => {
      window.removeEventListener('beforeprint', onBeforePrint);
      window.removeEventListener('afterprint',  onAfterPrint);
    };
  }, []); // mount-only — no dependency on theme or resolved

  const setTheme = useCallback((newTheme) => {
    setThemeState(newTheme);
    try {
      localStorage.setItem(STORAGE_KEY, newTheme);
    } catch {
      // localStorage unavailable in some sandboxed environments
    }
  }, []);

  const value = useMemo(
    () => ({ theme, resolvedTheme: resolved, setTheme }),
    [theme, resolved, setTheme],
  );

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return ctx;
}

export default ThemeContext;
