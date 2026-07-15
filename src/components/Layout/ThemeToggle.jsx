import { useTheme } from '../../context/ThemeContext';
import { Sun, Moon, Monitor } from 'lucide-react';

const OPTIONS = [
  { value: 'light',  label: 'Light',  icon: Sun,     activeClass: 'bg-amber-100 text-amber-700 border-amber-200' },
  { value: 'dark',   label: 'Dark',   icon: Moon,    activeClass: 'bg-slate-700 text-slate-100 border-slate-500' },
  { value: 'system', label: 'System', icon: Monitor, activeClass: 'bg-blue-100 text-blue-700 border-blue-200' },
];

const defaultClass = 'bg-white text-gray-500 border-gray-200 hover:border-gray-300 dark:bg-slate-800 dark:text-gray-400 dark:border-slate-600 dark:hover:border-slate-500';

export default function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="flex items-center gap-1 bg-gray-100 dark:bg-slate-800/50 rounded-xl p-1 border border-gray-200 dark:border-slate-700">
      {OPTIONS.map(({ value, label, icon: Icon, activeClass }) => {
        const isActive = theme === value;
        return (
          <button
            key={value}
            onClick={() => setTheme(value)}
            title={`${label} mode`}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 ${
              isActive
                ? activeClass + ' shadow-sm'
                : defaultClass
            }`}
          >
            <Icon size={14} />
            <span className="hidden sm:inline">{label}</span>
          </button>
        );
      })}
    </div>
  );
}