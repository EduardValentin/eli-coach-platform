import { useId } from 'react';
import { LABEL_CLASS } from '../typography';

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

type RoutineCardProps = { title: string; listLabel: string; note?: string; lines: readonly string[] };

export function RoutineCard({ title, listLabel, note, lines }: RoutineCardProps) {
  const headingId = useId();
  return (
    <section aria-labelledby={headingId} className="grid gap-2 rounded-control bg-surface-subtle p-3 sm:p-4">
      <h4 id={headingId} className={LABEL_CLASS}>
        {title}
      </h4>
      {note && <p className="max-w-prose text-sm leading-relaxed text-text-primary">{note}</p>}
      {lines.length > 0 && (
        <ul aria-label={listLabel} className="grid gap-x-6 divide-y divide-border-subtle text-sm text-text-primary tabular-nums sm:grid-cols-2 sm:divide-y-0">
          {lines.map(line => (
            <li key={line} className="py-1.5">
              {line}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
