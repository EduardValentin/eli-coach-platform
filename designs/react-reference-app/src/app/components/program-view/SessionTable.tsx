import type { Exercise } from '../../context/TrainingContext';
import { formatRange, isWorkingSet, positionLabel, type Row, type Session, type SetSpec } from '../../domain/program';
import { repsSuffix } from '../coach-portal/program/rowFields';
import { cn } from '../ui/utils';
import { restLabel } from './programView';

type SessionTableProps = { session: Session; exercisesById: ReadonlyMap<string, Exercise> };

const HEAD_CLASS = 'border-b border-text-primary px-2 py-1.5 text-left text-xs font-semibold uppercase tracking-wide text-text-secondary first:pl-0 last:pr-0';
const CELL_CLASS = 'px-2 py-1 align-top tabular-nums first:pl-0 last:pr-0';
const NO_VALUE = '—';

function namesOf(ids: readonly string[], exercisesById: ReadonlyMap<string, Exercise>): string[] {
  return ids.flatMap(id => exercisesById.get(id)?.name ?? []);
}

function setLabels(sets: readonly SetSpec[]): string[] {
  let working = 0;
  return sets.map(set => {
    if (!isWorkingSet(set)) return 'Warm-up';
    working += 1;
    return String(working);
  });
}

function isSuperset(session: Session, row: Row): boolean {
  return positionLabel(session, row) !== row.slot;
}

type ExerciseRowsProps = { session: Session; row: Row; exercisesById: ReadonlyMap<string, Exercise> };

function ExerciseRows({ session, row, exercisesById }: ExerciseRowsProps) {
  const exercise = exercisesById.get(row.exerciseId);
  const suffix = repsSuffix(exercise);
  const swaps = namesOf(row.substitutions, exercisesById);
  const labels = setLabels(row.sets);
  const span = row.sets.length;

  return (
    <tbody data-print-keep className="border-b border-border">
      {row.sets.map((set, index) => (
        <tr key={index} className={cn({ 'text-text-secondary': !isWorkingSet(set) })}>
          {index === 0 && (
            <>
              <td rowSpan={span} className={cn(CELL_CLASS, 'py-2 font-semibold text-text-primary')}>
                <span className="block">{positionLabel(session, row)}</span>
                {isSuperset(session, row) && <span className="block text-xs font-normal text-text-secondary">Superset</span>}
              </td>
              <th scope="rowgroup" rowSpan={span} className={cn(CELL_CLASS, 'py-2 text-left font-normal')}>
                <span className="block font-semibold text-text-primary">{exercise ? exercise.name : 'Exercise removed'}</span>
                {row.cues && <span className="mt-0.5 block text-xs text-text-secondary">{row.cues}</span>}
                {swaps.length > 0 && <span className="mt-0.5 block text-xs text-text-secondary">Swap for: {swaps.join(', ')}</span>}
                {row.progression.kind === 'custom' && <span className="mt-0.5 block text-xs text-text-secondary">{row.progression.text}</span>}
              </th>
            </>
          )}
          <td className={cn(CELL_CLASS, 'whitespace-nowrap', { 'pt-2': index === 0 })}>{labels[index]}</td>
          <td className={cn(CELL_CLASS, 'whitespace-nowrap', { 'pt-2': index === 0 })}>{`${formatRange(set.reps)}${suffix}`}</td>
          <td className={cn(CELL_CLASS, { 'pt-2': index === 0 })}>{isWorkingSet(set) ? formatRange(set.rir) : NO_VALUE}</td>
          <td className={cn(CELL_CLASS, 'whitespace-nowrap', { 'pt-2': index === 0 })}>{set.weightKg === undefined ? NO_VALUE : `${set.weightKg} kg`}</td>
          {index === 0 && (
            <td rowSpan={span} className={cn(CELL_CLASS, 'py-2 whitespace-nowrap')}>
              {restLabel(row.restSeconds)}
            </td>
          )}
        </tr>
      ))}
    </tbody>
  );
}

export function SessionTable({ session, exercisesById }: SessionTableProps) {
  const rows = session.rows.filter(row => row.exerciseId !== '' && row.sets.length > 0);
  return (
    <table aria-label={`${session.name} exercises`} className="w-full border-collapse text-sm text-text-primary">
      <colgroup>
        <col className="w-[9%]" />
        <col />
        <col className="w-[12%]" />
        <col className="w-[12%]" />
        <col className="w-[7%]" />
        <col className="w-[10%]" />
        <col className="w-[9%]" />
      </colgroup>
      <thead>
        <tr>
          {['Position', 'Exercise', 'Set', 'Reps', 'RIR', 'Weight', 'Rest'].map(header => (
            <th key={header} scope="col" className={HEAD_CLASS}>
              {header}
            </th>
          ))}
        </tr>
      </thead>
      {rows.map(row => (
        <ExerciseRows key={row.id} session={session} row={row} exercisesById={exercisesById} />
      ))}
    </table>
  );
}
