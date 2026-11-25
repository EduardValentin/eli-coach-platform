export function PositionBadge({ label }: { label: string }) {
  return (
    <span className="inline-flex h-7 min-w-7 shrink-0 items-center justify-center rounded-full bg-surface-neutral px-1.5 text-xs font-semibold text-text-primary tabular-nums">
      {label}
    </span>
  );
}
