import {
  ArrowDownAZ,
  ArrowDownWideNarrow,
  ArrowUpNarrowWide,
  ArrowUpZA,
  type LucideIcon,
} from "lucide-react";

import { cn } from "../lib/cn";
import { Button } from "../primitives/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../primitives/select";

type SortDirection = "asc" | "desc";

type SortOrder = "chronological" | "alphabetical";

export type SortOption<Key extends string> = {
  defaultDirection: SortDirection;
  directionLabels: Record<SortDirection, string>;
  key: Key;
  label: string;
  order: SortOrder;
};

export type SortChoice<Key extends string> = {
  direction: SortDirection;
  key: Key;
};

type SortControlProps<Key extends string> = {
  className?: string;
  onChange: (sort: SortChoice<Key>) => void;
  options: readonly SortOption<Key>[];
  size?: "sm" | "md";
  sort: SortChoice<Key>;
};

const DIRECTION_ICONS: Record<SortOrder, Record<SortDirection, LucideIcon>> = {
  alphabetical: { asc: ArrowDownAZ, desc: ArrowUpZA },
  chronological: { asc: ArrowUpNarrowWide, desc: ArrowDownWideNarrow },
};

function reversed(direction: SortDirection): SortDirection {
  return direction === "asc" ? "desc" : "asc";
}

export function SortControl<Key extends string>({
  className,
  onChange,
  options,
  size = "sm",
  sort,
}: SortControlProps<Key>) {
  const chosen =
    options.find((option) => option.key === sort.key) ?? options[0];
  const DirectionIcon = DIRECTION_ICONS[chosen.order][sort.direction];
  const directionLabel = chosen.directionLabels[sort.direction];

  const chooseKey = (value: string) => {
    const option = options.find((candidate) => candidate.key === value);
    if (option) {
      onChange({ direction: option.defaultDirection, key: option.key });
    }
  };

  return (
    <div
      className={cn("flex w-full items-center gap-2", className)}
      data-parity-root="SortControl"
    >
      <Select onValueChange={chooseKey} value={sort.key}>
        <SelectTrigger
          aria-label="Sort by"
          className="min-w-0 flex-1"
          size={size}
        >
          <SelectValue>
            {`${chosen.label}: ${directionLabel.toLowerCase()}`}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.key} value={option.key}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button
        aria-label={directionLabel}
        aria-pressed={sort.direction !== chosen.defaultDirection}
        className="shrink-0 hover:border-primary hover:text-primary aria-pressed:border-primary aria-pressed:bg-primary aria-pressed:text-primary-foreground"
        onClick={() =>
          onChange({ direction: reversed(sort.direction), key: sort.key })
        }
        size={size === "md" ? "icon-md" : "icon-sm"}
        type="button"
        variant="outline"
      >
        <DirectionIcon aria-hidden="true" className="size-4" />
      </Button>
    </div>
  );
}
