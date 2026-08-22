interface RirBadgeProps {
  value: number | string;
  size?: 'sm' | 'md';
}

export function RirBadge({ value, size = 'sm' }: RirBadgeProps) {
  const num = typeof value === 'number' ? value : parseInt(String(value), 10);
  const isNum = !Number.isNaN(num);

  const colorClass = !isNum
    ? 'bg-neutral-500'
    : num <= 1
      ? 'bg-effort-critical'
      : num <= 3
        ? 'bg-metric-energy'
        : 'bg-training-recovery';

  const sizeClass = size === 'md'
    ? 'w-6 h-6 text-[11px]'
    : 'w-5 h-5 text-[10px]';

  return (
    <span
      title={isNum ? `RIR ${value} — reps in reserve` : `RIR ${value}`}
      aria-label={`RIR ${value}`}
      className={`inline-flex items-center justify-center rounded-full font-bold text-white tabular-nums shrink-0 ${colorClass} ${sizeClass}`}
    >
      {value}
    </span>
  );
}
