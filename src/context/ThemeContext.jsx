import { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';

const STORAGE_KEY = 'app-theme-mode';
const LEGACY_STORAGE_KEY = 'liyanage-theme';

/**
 * Checks whether the current operating system prefers dark mode.
 * @returns {boolean}
 */
function getSystemPrefersDark() {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

/**
 * Resolve the effective theme from a preference value ('system', 'dark', 'light').
 * When set to 'system', inspects system preference.
 *
 * @param {'system' | 'dark' | 'light'} mode
 * @returns {'dark' | 'light'}
 */
function resolveTheme(mode) {
  if (mode === 'dark') return 'dark';
  if (mode === 'light') return 'light';
  // 'system' — honour OS color scheme preference
  return getSystemPrefersDark() ? 'dark' : 'light';
}

/**
 * Apply the resolved theme class to <html> element.
 * Enforces strict presence of .dark or .light class.
 *
 * @param {'dark' | 'light'} resolved
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
  // 1. Initial theme mode state: defaults to 'system'
  const [theme, setThemeState] = useState(() => {
    try {
      return (
        localStorage.getItem(STORAGE_KEY) ||
        localStorage.getItem(LEGACY_STORAGE_KEY) ||
        'system'
      );
    } catch {
      return 'system';
    }
  });

  // Track system OS color preference dynamically
  const [systemIsDark, setSystemIsDark] = useState(() => getSystemPrefersDark());

  // Listen for real-time OS preference changes
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');

    const handleChange = (e) => {
      setSystemIsDark(e.matches);
      // If currently set to 'system', immediately apply to DOM
      if (theme === 'system') {
        applyThemeClass(e.matches ? 'dark' : 'light');
      }
    };

    mq.addEventListener('change', handleChange);
    return () => mq.removeEventListener('change', handleChange);
  }, [theme]);

  // Resolved theme — either 'dark' or 'light'
  const resolved = useMemo(() => {
    if (theme === 'system') {
      return systemIsDark ? 'dark' : 'light';
    }
    return theme === 'dark' ? 'dark' : 'light';
  }, [theme, systemIsDark]);

  // Apply class on mount and whenever resolved theme changes
  useEffect(() => {
    applyThemeClass(resolved);
  }, [resolved]);

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
