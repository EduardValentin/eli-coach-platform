import * as React from "react";
import { cva } from "class-variance-authority";

import { cn } from "../lib/cn";
import { Badge } from "./badge";
import { Checkbox } from "./checkbox";
import type { FieldControlAttributes } from "./field-layout";
import type { FieldSize } from "./field-size";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";
import { SearchField } from "./search-field";
import {
  FIELD_TAB_INDEX,
  SelectTriggerChevron,
  selectTriggerClasses,
} from "./select";

type MultiSelectSummary = "count" | "names";

const SEARCHABLE_ABOVE = 8;

const growingTriggerHeight = cva("h-auto", {
  variants: {
    size: {
      sm: "min-h-(--size-control-sm)",
      md: "min-h-(--size-control-md)",
    },
  },
});

type MultiSelectSelection<Value extends string> = {
  label: string;
  selected: readonly Value[];
  labels: Readonly<Record<Value, string>>;
};

type TriggerSummaryProps<Value extends string> = MultiSelectSelection<Value> & {
  summary: MultiSelectSummary;
  placeholder?: string;
};

function TriggerSummary<Value extends string>({
  label,
  labels,
  placeholder,
  selected,
  summary,
}: TriggerSummaryProps<Value>) {
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

type OptionListProps<Value extends string> = MultiSelectSelection<Value> & {
  options: readonly Value[];
  onToggle: (value: Value) => void;
};

function OptionList<Value extends string>({
  label,
  labels,
  onToggle,
  options,
  selected,
}: OptionListProps<Value>) {
  const [query, setQuery] = React.useState("");
  const searchable = options.length > SEARCHABLE_ABOVE;
  const needle = query.trim().toLowerCase();
  const shown = options.filter((option) =>
    labels[option].toLowerCase().includes(needle),
  );

  return (
    <>
      {searchable && (
        <SearchField
          aria-label={`Search ${label.toLowerCase()}`}
          className="m-1 shrink-0"
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search"
          size="sm"
          value={query}
        />
      )}
      {shown.length === 0 ? (
        <p className="px-2 py-1.5 text-sm text-text-secondary">No matches</p>
      ) : (
        <ul
          aria-label={label}
          className="flex max-h-72 min-h-0 flex-col overflow-y-auto"
        >
          {shown.map((option) => (
            <li key={option}>
              <label
                className="flex cursor-default items-center gap-2 rounded-tile px-2 py-1.5 text-sm hover:bg-primary-soft hover:text-primary"
                data-parity="multi-select-option"
              >
                <Checkbox
                  checked={selected.includes(option)}
                  onCheckedChange={() => onToggle(option)}
                />
                {labels[option]}
              </label>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

type MultiSelectProps<Value extends string> = OptionListProps<Value> &
  Partial<FieldControlAttributes> & {
    summary?: MultiSelectSummary;
    size?: FieldSize;
    placeholder?: string;
    required?: boolean;
  };

function accessibleTriggerName(label: string, chosenCount: number): string {
  return chosenCount === 0 ? label : `${label}, ${chosenCount} selected`;
}

export function MultiSelect<Value extends string>({
  label,
  labels,
  onToggle,
  options,
  placeholder,
  required,
  selected,
  size = "sm",
  summary = "count",
  ...fieldAttributes
}: MultiSelectProps<Value>) {
  const pills = summary === "names" && selected.length > 0;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          aria-label={accessibleTriggerName(
            required ? `${label} (required)` : label,
            selected.length,
          )}
          className={cn(
            selectTriggerClasses(size),
            "min-w-auto",
            growingTriggerHeight({ size }),
          )}
          tabIndex={FIELD_TAB_INDEX}
          type="button"
          {...fieldAttributes}
        >
          <span
            className={cn("line-clamp-1 flex min-w-0 items-center gap-2", {
              "flex-wrap": pills,
            })}
          >
            <TriggerSummary
              label={label}
              labels={labels}
              placeholder={placeholder}
              selected={selected}
              summary={summary}
            />
          </span>
          <SelectTriggerChevron />
        </button>
      </PopoverTrigger>
      <PopoverContent
        aria-label={label}
        className="flex w-(--radix-popover-trigger-width) max-w-md min-w-56 flex-col gap-1 p-1"
      >
        <OptionList
          label={label}
          labels={labels}
          onToggle={onToggle}
          options={options}
          selected={selected}
        />
      </PopoverContent>
    </Popover>
  );
}
