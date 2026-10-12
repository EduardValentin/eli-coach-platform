import { ChevronDownIcon } from "lucide-react";
import { Badge } from "./ui/badge";
import { Checkbox } from "./ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { selectTriggerClasses } from "./ui/select";

function triggerName(label: string, chosen: number): string {
  return chosen === 0 ? label : `${label}, ${chosen} selected`;
}

export function CountedMultiSelect<Value extends string>({
  label,
  selected,
  options,
  labels,
  counts,
  onToggle,
}: {
  label: string;
  selected: readonly Value[];
  options: readonly Value[];
  labels: Record<Value, string>;
  counts: Record<Value, number>;
  onToggle: (value: Value) => void;
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          data-slot="select-trigger"
          data-size="sm"
          aria-label={triggerName(label, selected.length)}
          className={selectTriggerClasses("w-full")}
        >
          <span data-slot="select-value">
            {label}
            {selected.length > 0 && <Badge tone="count">{selected.length}</Badge>}
          </span>
          <ChevronDownIcon className="size-4 opacity-50" aria-hidden="true" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-56 p-1">
        <ul aria-label={label} className="flex flex-col">
          {options.map((option) => (
            <li key={option}>
              <label className="flex cursor-default items-center gap-2 rounded-tile px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground">
                <Checkbox
                  checked={selected.includes(option)}
                  onCheckedChange={() => onToggle(option)}
                />
                {labels[option]} <Badge tone="count">{counts[option]}</Badge>
              </label>
            </li>
          ))}
        </ul>
      </PopoverContent>
    </Popover>
  );
}
