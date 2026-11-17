import { useId, type ReactNode } from 'react';
import { EYEBROW_CLASS } from '../typography';
import { cn } from '../ui/utils';

export type RoutineItem = { key: string; name: ReactNode; amount: ReactNode };

type RoutineFrame = 'band' | 'plain';

type RoutineSectionProps = { title: string; frame: RoutineFrame; action?: ReactNode; note?: ReactNode; panel?: ReactNode; children: ReactNode };

function RoutineSection({ title, frame, action, note, panel, children }: RoutineSectionProps) {
  const headingId = useId();
  return (
    <section aria-labelledby={headingId} className={cn({ 'bg-surface-subtle': frame === 'band' })}>
      <div className={cn('grid gap-1', { 'px-4 pt-3 @3xl:px-6 @3xl:pt-4': frame === 'band' })}>
        <div className="flex min-h-8 items-center justify-between gap-4">
          <h4 id={headingId} className={EYEBROW_CLASS}>
            {title}
          </h4>
          {action}
        </div>
        {note && <div className="max-w-xl pb-1 text-sm text-text-secondary">{note}</div>}
      </div>
      {panel}
      {children}
    </section>
  );
}

export function RoutineAmount({ value, unit }: { value: string; unit: string }) {
  return (
    <span className="text-base font-semibold whitespace-nowrap text-text-primary tabular-nums">
      {value}
      {unit && <span className="text-sm font-normal text-text-secondary">{` ${unit}`}</span>}
    </span>
  );
}

type RoutineListProps = { title: string; items: readonly RoutineItem[]; action?: ReactNode; note?: ReactNode; panel?: ReactNode };

export function RoutineList({ title, items, action, note, panel }: RoutineListProps) {
  if (items.length === 0) return null;
  return (
    <RoutineSection title={title} frame="band" action={action} note={note} panel={panel}>
      <ul className={cn('divide-y divide-border-subtle px-4 pb-2 @3xl:px-6 @3xl:pb-3', { 'pt-3': panel !== undefined })}>
        {items.map(item => (
          <li key={item.key} className="flex min-h-14 items-center justify-between gap-4 py-1">
            {item.name}
            {item.amount}
          </li>
        ))}
      </ul>
    </RoutineSection>
  );
}

export function EditableRoutine({ title, action, children }: { title: string; action: ReactNode; children: ReactNode }) {
  return (
    <RoutineSection title={title} frame="plain" action={action}>
      {children}
    </RoutineSection>
  );
}
