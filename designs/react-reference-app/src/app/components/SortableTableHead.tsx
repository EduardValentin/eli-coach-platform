import { ChevronDown, ChevronsUpDown, ChevronUp } from 'lucide-react';
import { TableHead } from './ui/table';

export function SortableTableHead({
  label,
  active,
  direction,
  onSort,
  className,
}: {
  label: string;
  active: boolean;
  direction: 'asc' | 'desc';
  onSort: () => void;
  className?: string;
}) {
  const Icon = active
    ? direction === 'asc'
      ? ChevronUp
      : ChevronDown
    : ChevronsUpDown;

  return (
    <TableHead
      aria-sort={
        active ? (direction === 'asc' ? 'ascending' : 'descending') : 'none'
      }
      className={className}
    >
      <button
        type="button"
        onClick={onSort}
        className="inline-flex items-center gap-1 rounded-field text-[length:inherit] font-bold uppercase tracking-[inherit] text-inherit outline-none transition-colors hover:text-brand focus-visible:ring-[3px] focus-visible:ring-ring/50"
      >
        <span className={active ? 'text-brand' : undefined}>{label}</span>
        <Icon
          className={
            active ? 'size-3 text-brand' : 'size-3 text-muted-foreground'
          }
          aria-hidden="true"
        />
      </button>
    </TableHead>
  );
}
