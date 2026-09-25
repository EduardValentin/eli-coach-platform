import {
  Button,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@eli-coach-platform/ui/primitives";
import {
  ArrowDownAZ,
  ArrowDownWideNarrow,
  ArrowUpNarrowWide,
  ArrowUpZA,
  type LucideIcon,
} from "lucide-react";

import {
  defaultDirectionFor,
  toSortKey,
  SORT_KEYS,
  type CallSort,
  type SortDirection,
  type SortKey,
} from "~/features/assessment-calls/ui/coach/assessment-call-listing";

const SORT_KEY_LABELS: Record<SortKey, string> = {
  booked: "Booking date",
  email: "Email",
  name: "Name",
  scheduled: "Scheduled date",
};

type DirectionPresentation = Record<
  SortDirection,
  { icon: LucideIcon; label: string }
>;

function dateDirections(
  labels: Record<SortDirection, string>,
): DirectionPresentation {
  return {
    asc: { icon: ArrowUpNarrowWide, label: labels.asc },
    desc: { icon: ArrowDownWideNarrow, label: labels.desc },
  };
}

const TEXT_DIRECTIONS: DirectionPresentation = {
  asc: { icon: ArrowDownAZ, label: "A to Z" },
  desc: { icon: ArrowUpZA, label: "Z to A" },
};

const DIRECTIONS: Record<SortKey, DirectionPresentation> = {
  booked: dateDirections({ asc: "Oldest first", desc: "Newest first" }),
  email: TEXT_DIRECTIONS,
  name: TEXT_DIRECTIONS,
  scheduled: dateDirections({ asc: "Latest first", desc: "Soonest first" }),
};

type SortControlProps = {
  onChooseKey: (key: SortKey) => void;
  onToggleDirection: () => void;
  sort: CallSort;
};

export function SortControl({
  onChooseKey,
  onToggleDirection,
  sort,
}: SortControlProps) {
  const direction = DIRECTIONS[sort.key][sort.direction];
  const DirectionIcon = direction.icon;

  return (
    <div
      className="flex w-full items-center gap-2"
      data-parity-root="SortControl"
    >
      <Select
        onValueChange={(value) => onChooseKey(toSortKey(value))}
        value={sort.key}
      >
        <SelectTrigger
          aria-label="Sort by"
          className="min-w-0 flex-1"
          size="sm"
        >
          <SelectValue>
            {`${SORT_KEY_LABELS[sort.key]}: ${direction.label.toLowerCase()}`}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {SORT_KEYS.map((key) => (
            <SelectItem key={key} value={key}>
              {SORT_KEY_LABELS[key]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button
        aria-label={direction.label}
        aria-pressed={sort.direction !== defaultDirectionFor(sort.key)}
        className="shrink-0 hover:border-primary hover:text-primary aria-pressed:border-primary aria-pressed:bg-primary aria-pressed:text-primary-foreground"
        onClick={onToggleDirection}
        size="icon-sm"
        type="button"
        variant="outline"
      >
        <DirectionIcon aria-hidden="true" className="size-4" />
      </Button>
    </div>
  );
}
