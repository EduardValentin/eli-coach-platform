import { Badge } from '../ui/badge';

interface RirBadgeProps {
  value: number | string;
  size?: 'sm' | 'md';
}

export function RirBadge({ value, size = 'sm' }: RirBadgeProps) {
  const num = typeof value === 'number' ? value : parseInt(String(value), 10);
  const isNum = !Number.isNaN(num);

  const toneClass = !isNum
    ? 'border-transparent bg-text-secondary text-brand-secondary-foreground'
    : num <= 1
      ? 'border-transparent bg-effort-critical text-brand-secondary-foreground'
      : num <= 3
        ? 'border-transparent bg-metric-energy text-brand-secondary-foreground'
        : 'border-transparent bg-training-recovery text-brand-secondary-foreground';

  const sizeClass = size === 'md' ? 'size-6' : 'size-5';

  return (
    <Badge
      title={isNum ? `RIR ${value} — reps in reserve` : `RIR ${value}`}
      aria-label={`RIR ${value}`}
      className={`rounded-full p-0 justify-center font-semibold tabular-nums ${sizeClass} ${toneClass}`}
    >
      {value}
    </Badge>
  );
}
