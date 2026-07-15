import { useMemo } from 'react';
import { MapPin } from 'lucide-react';
import SmartCombobox from './SmartCombobox';
import useAppStore from '../../hooks/useAppStore';

const ROUTE_ICONS = {
  Morawaka:      <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />,
  Akuressa:      <span className="w-2 h-2 rounded-full bg-blue-500 inline-block" />,
  Deniyaya:      <span className="w-2 h-2 rounded-full bg-purple-500 inline-block" />,
  Urubokka:      <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" />,
  Kamburupitiya: <span className="w-2 h-2 rounded-full bg-rose-500 inline-block" />,
  Kotapola:      <span className="w-2 h-2 rounded-full bg-cyan-500 inline-block" />,
  Hakmana:       <span className="w-2 h-2 rounded-full bg-orange-500 inline-block" />,
};

/**
 * RouteSearchSelect — Premium floating search select for routes.
 *
 * Reuses SmartCombobox with `portal={true}` to render the dropdown at
 * document.body level, ensuring it floats above any overflow-hidden/auto
 * parent containers (e.g., modals with overflow-y-auto) without breaking
 * modal heights or scroll boundaries.
 *
 * The trigger displays the selected route name with a colored dot indicator,
 * or a placeholder when nothing is selected.
 *
 * Props:
 *   value       — currently selected route name (string)
 *   onSelect    — callback receiving { value, label, subtitle }
 *   label       — optional label text above the combobox
 *   placeholder — search placeholder text
 *   dropdownPosition — 'bottom' (default) | 'top'
 */
export default function RouteSearchSelect({
  value,
  onSelect,
  label,
  placeholder = 'Filter by route...',
  dropdownPosition = 'bottom',
}) {
  const routes = useAppStore((s) => s.routes);

  const routeOptions = useMemo(() =>
    routes.map((r) => ({
      value: String(r.id),
      label: r.name,
      subtitle: r.routeDates?.join(', ') || '',
      icon: ROUTE_ICONS[r.name] || <span className="w-2 h-2 rounded-full bg-gray-400 inline-block" />,
    })),
  [routes]);

  const handleSelect = (option) => {
    onSelect(option.value);
  };

  const selectedRoute = routes.find((route) => String(route.id) === String(value));

  const routeColorMap = {
    Morawaka:      'border-emerald-500 text-emerald-700 dark:text-emerald-400',
    Akuressa:      'border-blue-500 text-blue-700 dark:text-blue-400',
    Deniyaya:      'border-purple-500 text-purple-700 dark:text-purple-400',
    Urubokka:      'border-amber-500 text-amber-700 dark:text-amber-400',
    Kamburupitiya: 'border-rose-500 text-rose-700 dark:text-rose-400',
    Kotapola:      'border-cyan-500 text-cyan-700 dark:text-cyan-400',
    Hakmana:       'border-orange-500 text-orange-700 dark:text-orange-400',
  };

  const indicatorClass = routeColorMap[selectedRoute?.name] || 'border-gray-400 text-gray-500';

  return (
    <SmartCombobox
      value={value}
      onSelect={handleSelect}
      options={routeOptions}
      placeholder={placeholder}
      label={label}
      dropdownMaxHeight="max-h-48"
      portal
      dropdownPosition={dropdownPosition}
      renderTrigger={(selectedOption) => (
        <div className="flex items-center gap-2">
          {selectedRoute ? (
            <span className={`flex items-center gap-2 text-sm font-medium ${indicatorClass}`}>
              <span className={`w-2 h-2 rounded-full ${indicatorClass.split(' ')[0]}`} />
              {selectedRoute.name}
            </span>
          ) : (
            <span className="text-sm text-gray-400 dark:text-slate-500 flex items-center gap-2">
              <MapPin size={14} className="text-gray-400" />
              {placeholder}
            </span>
          )}
        </div>
      )}
    />
  );
}