export function ColumnBreak() {
  return <span className="sr-only"> · </span>;
}

export function Dot() {
  return <span className="text-text-label"> · </span>;
}

type DayHeaderProps = { headingId: string; name: string; meta: string };

export function DayHeader({ headingId, name, meta }: DayHeaderProps) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <h3 id={headingId} className="min-w-0 font-serif text-2xl tracking-tight text-text-primary">
        {name}
      </h3>
      <p className="shrink-0 text-sm text-text-secondary tabular-nums">{meta}</p>
    </div>
  );
}
