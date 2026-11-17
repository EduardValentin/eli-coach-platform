import { useId, type ReactNode } from 'react';
import type { Exercise } from '../../context/TrainingContext';
import { EYEBROW_CLASS } from '../typography';
import { cn } from '../ui/utils';
import type { ExerciseLibrary } from './programView';
import type { RoutineAmountText } from './sessionExerciseDetails';

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

type RoutineSize = 'viewer' | 'document';

const AMOUNT_CLASSES: Record<RoutineSize, { value: string; unit: string }> = {
  viewer: { value: 'text-base', unit: 'text-sm' },
  document: { value: '', unit: 'text-document-note' },
};

function RoutineAmount({ amount, size }: { amount: RoutineAmountText; size: RoutineSize }) {
  const classes = AMOUNT_CLASSES[size];
  return (
    <span className={cn('font-semibold whitespace-nowrap text-text-primary tabular-nums', classes.value)}>
      {amount.value}
      {amount.unit && <span className={cn('font-normal text-text-secondary', classes.unit)}>{` ${amount.unit}`}</span>}
    </span>
  );
}

type RoutineSource<Item> = {
  exercisesById: ExerciseLibrary;
  nameOf: (item: Item, exercise: Exercise | undefined) => ReactNode;
  amountOf: (item: Item, exercise: Exercise | undefined) => RoutineAmountText;
  size: RoutineSize;
};

/** A warm-up's or cool-down's rows: each exercise's name as the caller renders it, beside its amount. */
export function routineItems<Item extends { id: string; exerciseId: string }>(items: readonly Item[], source: RoutineSource<Item>): RoutineItem[] {
  return items.map(item => {
    const exercise = source.exercisesById.get(item.exerciseId);
    return { key: item.id, name: source.nameOf(item, exercise), amount: <RoutineAmount amount={source.amountOf(item, exercise)} size={source.size} /> };
  });
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
