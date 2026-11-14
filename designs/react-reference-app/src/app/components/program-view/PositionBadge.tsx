import { cn } from '../ui/utils';

export function PositionBadge({ label, size }: { label: string; size: 'xs' | 'sm' | 'md' }) {
  return (
    <span
      className={cn('flex shrink-0 items-center justify-center rounded-full bg-surface-inverted font-semibold text-surface-inverted-foreground tabular-nums', {
        'h-5 min-w-5 px-1 text-document-note': size === 'xs',
        'h-7 min-w-7 px-1.5 text-xs': size === 'sm',
        'size-8 text-xs': size === 'md',
      })}
    >
      {label}
    </span>
  );
}
