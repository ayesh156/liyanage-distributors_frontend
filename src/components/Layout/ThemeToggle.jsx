import { useTheme } from '../../context/ThemeContext';
import { Sun, Moon, Monitor } from 'lucide-react';

/**
 * 3-State theme options configuration.
 * Icons: Sun (Light), Moon (Dark), Monitor (System).
 */
const THEME_OPTIONS = [
  {
    value: 'light',
    label: 'Light',
    icon: Sun,
    activeClasses: 'bg-white text-amber-600 shadow-sm border-gray-200/80 dark:bg-slate-700 dark:text-amber-400 dark:border-slate-600',
  },
  {
    value: 'dark',
    label: 'Dark',
    icon: Moon,
    activeClasses: 'bg-white text-indigo-600 shadow-sm border-gray-200/80 dark:bg-slate-700 dark:text-indigo-400 dark:border-slate-600',
  },
  {
    value: 'system',
    label: 'Auto',
    icon: Monitor,
    activeClasses: 'bg-white text-blue-600 shadow-sm border-gray-200/80 dark:bg-slate-700 dark:text-blue-400 dark:border-slate-600',
  },
];

/**
 * ThemeToggle — Executive 3-State Segmented Control (Light / Dark / Auto).
 *
 * Responsiveness & Accessibility:
 * - Provides 3 tactile icon buttons with subtle hover feedback and smooth active pill animations.
 * - Icon-only on mobile (<640px) to conserve horizontal navbar space, with expanded labels on desktop.
 */
export default function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <div
      role="group"
      aria-label="Theme selection control"
      className="inline-flex items-center p-1 bg-gray-100 dark:bg-slate-800/90 rounded-2xl border border-gray-200/90 dark:border-slate-700/80 shadow-inner"
    >
      {THEME_OPTIONS.map(({ value, label, icon: Icon, activeClasses }) => {
        const isActive = theme === value;
        return (
          <button
            key={value}
            type="button"
            onClick={() => setTheme(value)}
            title={`Switch to ${label} theme`}
            aria-pressed={isActive}
            className={`flex items-center gap-1.5 px-2 sm:px-2.5 py-1.5 rounded-xl text-xs font-semibold border transition-all duration-200 active:scale-95 ${
              isActive
                ? `${activeClasses} font-bold`
                : 'border-transparent text-gray-500 hover:text-gray-900 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-gray-200/50 dark:hover:bg-slate-700/40'
            }`}
          >
            <Icon size={14} className="flex-shrink-0" />
            <span className="hidden md:inline text-[11px]">{label}</span>
          </button>
        );
      })}
    </div>
  );
}