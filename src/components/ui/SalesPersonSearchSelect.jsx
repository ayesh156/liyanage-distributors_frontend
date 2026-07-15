import { useMemo } from 'react';
import { User } from 'lucide-react';
import SmartCombobox from './SmartCombobox';
import useAppStore from '../../hooks/useAppStore';

/**
 * SalesPersonSearchSelect — Premium floating search select for sales persons.
 *
 * Reuses SmartCombobox with `portal={true}` to render the dropdown at
 * document.body level, ensuring it floats above any overflow-hidden/auto
 * parent containers (e.g., modals with overflow-y-auto) without breaking
 * modal heights or scroll boundaries.
 *
 * The trigger displays the selected sales person name with a user icon,
 * or a placeholder when nothing is selected.
 *
 * Props:
 *   value       — currently selected sales person name (string)
 *   onSelect    — callback receiving { value, label, subtitle }
 *   label       — optional label text above the combobox
 *   placeholder — search placeholder text
 *   dropdownPosition — 'bottom' (default) | 'top'
 */
export default function SalesPersonSearchSelect({
  value,
  onSelect,
  label,
  placeholder = 'Search sales person...',
  dropdownPosition = 'bottom',
}) {
  const salesPersons = useAppStore((s) => s.salesPersons);

  const salesPersonOptions = useMemo(() =>
    salesPersons.map((sp) => ({
      value: sp.name,
      label: sp.name,
      subtitle: sp.phone || '',
      icon: <span className="w-5 h-5 rounded-full bg-orange-100 dark:bg-orange-900/40 flex items-center justify-center text-orange-600 dark:text-orange-400 font-bold text-[10px]">{sp.name.charAt(0)}</span>,
    })),
  [salesPersons]);

  const handleSelect = (option) => {
    onSelect(option.value);
  };

  const selectedPerson = useMemo(
    () => salesPersons.find((sp) => sp.name === value),
    [salesPersons, value],
  );

  return (
    <SmartCombobox
      value={value}
      onSelect={handleSelect}
      options={salesPersonOptions}
      placeholder={placeholder}
      label={label}
      dropdownMaxHeight="max-h-48"
      portal
      dropdownPosition={dropdownPosition}
      renderTrigger={(selectedOption) => (
        <div className="flex items-center gap-2">
          {value ? (
            <span className="flex items-center gap-2 text-sm font-medium text-gray-900 dark:text-slate-100">
              <span className="w-5 h-5 rounded-full bg-orange-100 dark:bg-orange-900/40 flex items-center justify-center text-orange-600 dark:text-orange-400 font-bold text-[10px]">
                {value.charAt(0)}
              </span>
              {value}
              {selectedPerson?.phone && (
                <span className="text-[10px] text-gray-400 dark:text-slate-500 font-normal">
                  {selectedPerson.phone}
                </span>
              )}
            </span>
          ) : (
            <span className="text-sm text-gray-400 dark:text-slate-500 flex items-center gap-2">
              <User size={14} className="text-gray-400" />
              {placeholder}
            </span>
          )}
        </div>
      )}
    />
  );
}