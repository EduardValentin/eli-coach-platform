import {
  ArrowDownAZ,
  ArrowDownWideNarrow,
  ArrowUpNarrowWide,
  ArrowUpZA,
  type LucideIcon,
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import { Button } from './ui/button';
import { cn } from './ui/utils';

export type SortDirection = 'asc' | 'desc';

export type SortOrder = 'chronological' | 'alphabetical';

export type SortOption<Key extends string> = {
  key: Key;
  label: string;
  order: SortOrder;
  defaultDirection: SortDirection;
  directionLabels: Record<SortDirection, string>;
};

export type SortChoice<Key extends string> = {
  key: Key;
  direction: SortDirection;
};

const DIRECTION_ICONS: Record<SortOrder, Record<SortDirection, LucideIcon>> = {
  chronological: { desc: ArrowDownWideNarrow, asc: ArrowUpNarrowWide },
  alphabetical: { asc: ArrowDownAZ, desc: ArrowUpZA },
};

function reversed(direction: SortDirection): SortDirection {
  return direction === 'asc' ? 'desc' : 'asc';
}

export function SortControl<Key extends string>({
  options,
  sort,
  onChange,
  size = 'sm',
  className,
}: {
  options: readonly SortOption<Key>[];
  sort: SortChoice<Key>;
  onChange: (sort: SortChoice<Key>) => void;
  size?: 'sm' | 'md';
  className?: string;
}) {
  const chosen = options.find((option) => option.key === sort.key) ?? options[0];
  const DirectionIcon = DIRECTION_ICONS[chosen.order][sort.direction];
  const directionLabel = chosen.directionLabels[sort.direction];

  const chooseKey = (value: string) => {
    const option = options.find((candidate) => candidate.key === value);
    if (option) onChange({ key: option.key, direction: option.defaultDirection });
  };

  return (
    <div className={cn('flex w-full items-center gap-2', className)} data-parity-root="SortControl">
      <Select value={sort.key} onValueChange={chooseKey}>
        <SelectTrigger
          aria-label="Sort by"
          size={size}
          className="min-w-0 flex-1"
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
        type="button"
        variant="outline"
        size={size === 'md' ? 'icon-md' : 'icon-sm'}
        className="shrink-0 hover:border-primary hover:text-primary aria-pressed:border-primary aria-pressed:bg-active-surface aria-pressed:text-primary-foreground"
        aria-pressed={sort.direction !== chosen.defaultDirection}
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
