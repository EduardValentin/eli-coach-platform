import type { ComponentProps } from "react";
import { ChevronDownIcon } from "lucide-react";
import { Badge } from "./ui/badge";
import { Checkbox } from "./ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { FIELD_TAB_INDEX, SelectTrigger, selectTriggerClasses } from "./ui/select";

type Summary = "count" | "names";
type TriggerSize = ComponentProps<typeof SelectTrigger>["size"];

function triggerName(label: string, chosen: number): string {
  return chosen === 0 ? label : `${label}, ${chosen} selected`;
}

function TriggerSummary<Value extends string>({
  label,
  selected,
  labels,
  summary,
  placeholder,
}: {
  label: string;
  selected: readonly Value[];
  labels: Record<Value, string>;
  summary: Summary;
  placeholder?: string;
}) {
  if (summary === "names" && selected.length > 0) {
    return <span className="truncate">{selected.map((value) => labels[value]).join(", ")}</span>;
  }
  if (summary === "names" && placeholder) {
    return <span className="truncate text-text-secondary">{placeholder}</span>;
  }
  return (
    <>
      {label}
      {selected.length > 0 && <Badge tone="count">{selected.length}</Badge>}
    </>
  );
}

export function MultiSelect<Value extends string>({
  label,
  selected,
  options,
  labels,
  onToggle,
  counts,
  summary = "count",
  size = "sm",
  placeholder,
  id,
  "aria-invalid": ariaInvalid,
  "aria-describedby": ariaDescribedBy,
}: {
  label: string;
  selected: readonly Value[];
  options: readonly Value[];
  labels: Record<Value, string>;
  onToggle: (value: Value) => void;
  counts?: Record<Value, number>;
  summary?: Summary;
  size?: TriggerSize;
  placeholder?: string;
  id?: string;
  "aria-invalid"?: boolean;
  "aria-describedby"?: string;
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          id={id}
          data-slot="select-trigger"
          data-size={size}
          tabIndex={FIELD_TAB_INDEX}
          aria-label={triggerName(label, selected.length)}
          aria-invalid={ariaInvalid}
          aria-describedby={ariaDescribedBy}
          className={selectTriggerClasses("w-full")}
        >
          <span data-slot="select-value" className="flex min-w-0 items-center gap-2">
            <TriggerSummary label={label} selected={selected} labels={labels} summary={summary} placeholder={placeholder} />
          </span>
          <ChevronDownIcon className="size-4 opacity-50" aria-hidden="true" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-56 p-1">
        <ul aria-label={label} className="flex flex-col">
          {options.map((option) => (
            <li key={option}>
              <label className="flex cursor-default items-center gap-2 rounded-tile px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground">
                <Checkbox checked={selected.includes(option)} onCheckedChange={() => onToggle(option)} />
                {labels[option]}
                {counts && <Badge tone="count">{counts[option]}</Badge>}
              </label>
            </li>
          ))}
        </ul>
      </PopoverContent>
    </Popover>
  );
}
