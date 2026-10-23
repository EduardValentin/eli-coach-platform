import { cn } from '../ui/utils';

export function PositionBadge({ label, size }: { label: string; size: 'sm' | 'md' }) {
  return (
    <span
      className={cn('flex shrink-0 items-center justify-center rounded-full bg-surface-inverted text-xs font-semibold text-surface-inverted-foreground tabular-nums', {
        'h-7 min-w-7 px-1.5': size === 'sm',
        'size-8': size === 'md',
      })}
    >
      {label}
    </span>
  );
}
