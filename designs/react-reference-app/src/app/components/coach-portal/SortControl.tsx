import {
  ArrowDownAZ,
  ArrowDownWideNarrow,
  ArrowUpNarrowWide,
  ArrowUpZA,
  type LucideIcon,
} from 'lucide-react';
import {
  defaultDirectionFor,
  parseSortKey,
  type CallSort,
  type SortDirection,
  type SortKey,
} from '../../utils/assessmentCallListing';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { Button } from '../ui/button';
import { cn } from '../ui/utils';

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: 'scheduled', label: 'Call date' },
  { key: 'booked', label: 'Booking date' },
  { key: 'name', label: 'Name' },
  { key: 'email', label: 'Email' },
];

function labelForSortKey(key: SortKey): string {
  return SORT_OPTIONS.find((option) => option.key === key)?.label ?? '';
}

const DIRECTION_LABELS: Record<SortKey, Record<SortDirection, string>> = {
  scheduled: { desc: 'Soonest first', asc: 'Latest first' },
  booked: { desc: 'Newest first', asc: 'Oldest first' },
  name: { asc: 'A to Z', desc: 'Z to A' },
  email: { asc: 'A to Z', desc: 'Z to A' },
};

const DIRECTION_ICONS: Record<SortKey, Record<SortDirection, LucideIcon>> = {
  scheduled: { desc: ArrowDownWideNarrow, asc: ArrowUpNarrowWide },
  booked: { desc: ArrowDownWideNarrow, asc: ArrowUpNarrowWide },
  name: { asc: ArrowDownAZ, desc: ArrowUpZA },
  email: { asc: ArrowDownAZ, desc: ArrowUpZA },
};

function reversed(direction: SortDirection): SortDirection {
  return direction === 'asc' ? 'desc' : 'asc';
}

export function SortControl({
  sort,
  onChange,
  className,
}: {
  sort: CallSort;
  onChange: (sort: CallSort) => void;
  className?: string;
}) {
  const DirectionIcon = DIRECTION_ICONS[sort.key][sort.direction];
  const directionLabel = DIRECTION_LABELS[sort.key][sort.direction];

  const chooseKey = (value: string) => {
    const key = parseSortKey(value);
    onChange({ key, direction: defaultDirectionFor(key) });
  };

  return (
    <div className={cn('flex w-full items-center gap-2', className)}>
      <Select value={sort.key} onValueChange={chooseKey}>
        <SelectTrigger
          aria-label="Sort by"
          size="sm"
          className="min-w-0 flex-1"
        >
          <SelectValue>
            {`${labelForSortKey(sort.key)}: ${directionLabel.toLowerCase()}`}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {SORT_OPTIONS.map((option) => (
            <SelectItem key={option.key} value={option.key}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button
        type="button"
        variant="outline"
        size="icon-sm"
        className="shrink-0 hover:border-primary hover:text-primary aria-pressed:border-primary aria-pressed:bg-active-surface aria-pressed:text-primary-foreground"
        aria-pressed={sort.direction !== defaultDirectionFor(sort.key)}
        aria-label={directionLabel}
        onClick={() =>
          onChange({ key: sort.key, direction: reversed(sort.direction) })
        }
      >
        <DirectionIcon className="size-4" aria-hidden="true" />
      </Button>
    </div>
  );
}
