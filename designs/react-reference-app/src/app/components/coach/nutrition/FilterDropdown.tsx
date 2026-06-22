import { ChevronDown } from 'lucide-react';
import { Popover, PopoverTrigger, PopoverContent } from '../../ui/popover';
import { Button } from '../../ui/button';
import { Checkbox } from '../../ui/checkbox';

interface FilterOption { value: string; label: string }

interface FilterDropdownProps {
  label: string;
  options: FilterOption[];
  selected: string[];
  onToggle: (value: string) => void;
}

export function FilterDropdown({ label, options, selected, onToggle }: FilterDropdownProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
          {label}
          {selected.length > 0 && (
            <span className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-brand-soft px-1 text-[10px] font-semibold text-brand">
              {selected.length}
            </span>
          )}
          <ChevronDown size={14} aria-hidden="true" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-52 p-2 pointer-events-auto">
        <ul className="flex flex-col gap-0.5">
          {options.map((opt) => (
            <li key={opt.value}>
              <label className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm cursor-pointer hover:bg-muted">
                <Checkbox checked={selected.includes(opt.value)} onCheckedChange={() => onToggle(opt.value)} />
                {opt.label}
              </label>
            </li>
          ))}
        </ul>
      </PopoverContent>
    </Popover>
  );
}
