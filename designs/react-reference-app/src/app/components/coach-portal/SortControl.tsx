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
import { cn } from '../ui/utils';

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: 'scheduled', label: 'Scheduled date' },
  { key: 'booked', label: 'Booking date' },
  { key: 'name', label: 'Name' },
  { key: 'email', label: 'Email' },
];

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

const toggleButtonClass =
  'size-8 shrink-0 inline-flex items-center justify-center rounded-control border border-control-border-soft text-text-primary hover:bg-surface-quiet transition-colors';

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

  const chooseKey = (value: string) => {
    const key = parseSortKey(value);
    onChange({ key, direction: defaultDirectionFor(key) });
  };

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <span className="text-sm font-medium text-text-secondary">Sort by</span>
      <div className="flex items-center gap-2">
        <Select value={sort.key} onValueChange={chooseKey}>
          <SelectTrigger aria-label="Sort by" size="sm" className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SORT_OPTIONS.map((option) => (
              <SelectItem key={option.key} value={option.key}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <button
          type="button"
          className={toggleButtonClass}
          aria-pressed={sort.direction !== defaultDirectionFor(sort.key)}
          aria-label={DIRECTION_LABELS[sort.key][sort.direction]}
          onClick={() =>
            onChange({ key: sort.key, direction: reversed(sort.direction) })
          }
        >
          <DirectionIcon className="size-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
