import { useState, type ComponentProps } from "react";
import { ChevronDownIcon } from "lucide-react";
import { SearchField } from "./SearchField";
import { Badge } from "./ui/badge";
import { Checkbox } from "./ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { FIELD_TAB_INDEX, SelectTrigger, selectTriggerClasses } from "./ui/select";
import { cn } from "./ui/utils";

type Summary = "count" | "names";
type TriggerSize = ComponentProps<typeof SelectTrigger>["size"];

const SEARCHABLE_ABOVE = 8;

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
    return selected.map((value) => (
      <Badge key={value} tone="muted">
        {labels[value]}
      </Badge>
    ));
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

function OptionList<Value extends string>({
  label,
  selected,
  options,
  labels,
  onToggle,
  counts,
}: {
  label: string;
  selected: readonly Value[];
  options: readonly Value[];
  labels: Record<Value, string>;
  onToggle: (value: Value) => void;
  counts?: Record<Value, number>;
}) {
  const [query, setQuery] = useState("");
  const searchable = options.length > SEARCHABLE_ABOVE;
  const needle = query.trim().toLowerCase();
  const shown = options.filter((option) => labels[option].toLowerCase().includes(needle));

  return (
    <>
      {searchable && (
        <SearchField
          size="sm"
          placeholder="Search"
          aria-label={`Search ${label.toLowerCase()}`}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          className="m-1 shrink-0"
        />
      )}
      {shown.length === 0 ? (
        <p className="px-2 py-1.5 text-sm text-text-secondary">No matches</p>
      ) : (
        <ul aria-label={label} className="flex max-h-72 min-h-0 flex-col overflow-y-auto">
          {shown.map((option) => (
            <li key={option}>
              <label className="flex cursor-default items-center gap-2 rounded-tile px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground" data-parity="multi-select-option">
                <Checkbox checked={selected.includes(option)} onCheckedChange={() => onToggle(option)} />
                {labels[option]}
                {counts && <Badge tone="count">{counts[option]}</Badge>}
              </label>
            </li>
          ))}
        </ul>
      )}
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
  const pills = summary === "names" && selected.length > 0;

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
          <span
            data-slot="select-value"
            className={cn("flex min-w-0 items-center gap-2", { "flex-wrap": pills })}
          >
            <TriggerSummary label={label} selected={selected} labels={labels} summary={summary} placeholder={placeholder} />
          </span>
          <ChevronDownIcon className="size-4 opacity-50" aria-hidden="true" />
        </button>
      </PopoverTrigger>
      <PopoverContent aria-label={label} align="start" className="flex w-(--radix-popover-trigger-width) min-w-56 max-w-md flex-col gap-1 p-1">
        <OptionList label={label} selected={selected} options={options} labels={labels} onToggle={onToggle} counts={counts} />
      </PopoverContent>
    </Popover>
  );
}
