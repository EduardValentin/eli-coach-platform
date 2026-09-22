import {
  IconButton,
  Label,
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
  parseSortKeyParam,
  SORT_KEYS,
  type CallSort,
  type SortDirection,
  type SortKey,
} from "~/features/assessment-calls/ui/coach/assessment-call-listing";

const SORT_FIELD_ID = "assessment-call-sort";
const ICON_SIZE = 16;

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
      className="flex flex-col gap-2 xl:w-fit"
      data-parity-root="SortControl"
    >
      <Label htmlFor={SORT_FIELD_ID}>Sort by</Label>
      <div className="flex items-center gap-2">
        <Select
          onValueChange={(value) => onChooseKey(parseSortKeyParam(value))}
          value={sort.key}
        >
          <SelectTrigger className="h-8 w-40 text-sm" id={SORT_FIELD_ID}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SORT_KEYS.map((key) => (
              <SelectItem key={key} value={key}>
                {SORT_KEY_LABELS[key]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <IconButton
          aria-label={direction.label}
          aria-pressed={sort.direction !== defaultDirectionFor(sort.key)}
          className="inline-flex size-8 shrink-0 items-center justify-center rounded-control border border-control-border-soft p-0 text-text-primary transition-colors hover:bg-surface-quiet"
          onClick={onToggleDirection}
          variant="plain"
        >
          <DirectionIcon aria-hidden="true" size={ICON_SIZE} />
        </IconButton>
      </div>
    </div>
  );
}
