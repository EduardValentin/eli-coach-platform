import type { Exercise } from '../../context/TrainingContext';
import { formatRange, isWorkingSet, positionLabel, type Block, type Row, type Session, type SetSpec } from '../../domain/program';
import { DOCUMENT_LABEL_CLASS, DOCUMENT_NOTE_CLASS, DOCUMENT_VALUE_CLASS } from '../typography';
import { cn } from '../ui/utils';
import { PositionBadge } from './PositionBadge';
import { RirValue } from './RirValue';
import { exerciseNameOf, repsSuffix, restLabel } from './programView';

type SessionTableProps = { session: Session; block: Pick<Block, 'weeks' | 'calibrationWeek'>; exercisesById: ReadonlyMap<string, Exercise> };

const LOG_COLUMN_CLASS = 'max-sm:hidden';
const HEAD_CLASS = cn(DOCUMENT_LABEL_CLASS, 'px-1.5 pb-1 text-left align-bottom');
const CELL_CLASS = 'px-1.5 py-1 align-middle tabular-nums';
const NOTE_LINE_CLASS = cn(DOCUMENT_NOTE_CLASS, 'block');

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

function tailoredCue(row: Row): string {
  return row.touched.includes('cues') ? row.cues.trim() : '';
}

type ExerciseHeaderProps = { session: Session; row: Row; exercise: Exercise | undefined; swaps: string[]; columns: number };

function ExerciseHeader({ session, row, exercise, swaps, columns }: ExerciseHeaderProps) {
  const cue = tailoredCue(row);
  return (
    <tr>
      <th scope="rowgroup" colSpan={columns} className="px-0 pt-3 pb-1 text-left font-normal">
        <span className="flex items-start gap-2">
          <PositionBadge label={positionLabel(session, row)} size="xs" />{' '}
          <span className="min-w-0 flex-1">
            <span className="flex flex-wrap items-baseline gap-x-2">
              <span className="text-document-body font-semibold text-text-primary">{exerciseNameOf(exercise)}</span>{' '}
              {isSuperset(session, row) && <span className={DOCUMENT_LABEL_CLASS}>Superset</span>}
            </span>
            {swaps.length > 0 && <span className={NOTE_LINE_CLASS}>{` Swap: ${swaps.join(' · ')}`}</span>}
            {cue && <span className={cn(NOTE_LINE_CLASS, 'max-w-measure')}>{` ${cue}`}</span>}
            {row.progression.kind === 'custom' && <span className={cn(NOTE_LINE_CLASS, 'max-w-measure')}>{` ${row.progression.text}`}</span>}
          </span>{' '}
          <span className="shrink-0 text-document-table whitespace-nowrap">
            <span className="text-text-secondary">Rest </span>
            <span className={DOCUMENT_VALUE_CLASS}>{restLabel(row.restSeconds)}</span>
          </span>
        </span>
      </th>
    </tr>
  );
}

type SetRowProps = { set: SetSpec; label: string; suffix: string; weeks: readonly number[] };

function SetRow({ set, label, suffix, weeks }: SetRowProps) {
  const working = isWorkingSet(set);
  return (
    <tr className={cn({ 'bg-set-warm-up-soft': !working })}>
      <td className={cn(CELL_CLASS, 'pl-7', working ? DOCUMENT_VALUE_CLASS : 'text-document-note font-medium text-set-warm-up')}>{label}</td>
      <td className={cn(CELL_CLASS, 'whitespace-nowrap')}>
        <span className={working ? DOCUMENT_VALUE_CLASS : 'text-text-secondary'}>{`${formatRange(set.reps)}${suffix}`}</span>
        {set.weightKg !== undefined && <span className={NOTE_LINE_CLASS}>{` ${set.weightKg} kg`}</span>}
      </td>
      <td className={CELL_CLASS}>{working && <RirValue rir={set.rir} />}</td>
      {weeks.map(week => (
        <td key={week} className={cn(LOG_COLUMN_CLASS, 'h-8 border border-divider', { 'bg-surface-base': working })} />
      ))}
    </tr>
  );
}

type ExerciseRowsProps = { session: Session; row: Row; exercisesById: ReadonlyMap<string, Exercise>; weeks: readonly number[] };

function ExerciseRows({ session, row, exercisesById, weeks }: ExerciseRowsProps) {
  const exercise = exercisesById.get(row.exerciseId);
  const suffix = repsSuffix(exercise);
  const labels = setLabels(row.sets);
  return (
    <tbody data-print-keep>
      <ExerciseHeader session={session} row={row} exercise={exercise} swaps={namesOf(row.substitutions, exercisesById)} columns={3 + weeks.length} />
      {row.sets.map((set, index) => (
        <SetRow key={index} set={set} label={labels[index]} suffix={suffix} weeks={weeks} />
      ))}
    </tbody>
  );
}

export function SessionTable({ session, block, exercisesById }: SessionTableProps) {
  const rows = session.rows.filter(row => row.exerciseId !== '' && row.sets.length > 0);
  const weeks = Array.from({ length: block.weeks }, (_, index) => index + 1);
  return (
    <table aria-label={`${session.name} exercises`} className="w-full border-collapse text-document-table text-text-primary sm:table-fixed">
      <colgroup>
        <col className="sm:w-[15%]" />
        <col className="sm:w-[15%]" />
        <col className="sm:w-[8%]" />
        {weeks.map(week => (
          <col key={week} className={LOG_COLUMN_CLASS} />
        ))}
      </colgroup>
      <thead>
        <tr>
          <td colSpan={3} />
          <th scope="colgroup" colSpan={weeks.length} className={cn(LOG_COLUMN_CLASS, DOCUMENT_NOTE_CLASS, 'px-1.5 text-left font-normal')}>
            Write kg × reps
          </th>
        </tr>
        <tr className="border-b border-text-primary">
          <th scope="col" className={cn(HEAD_CLASS, 'pl-7')}>
            Set
          </th>
          <th scope="col" className={HEAD_CLASS}>
            Reps
          </th>
          <th scope="col" className={HEAD_CLASS}>
            RIR
          </th>
          {weeks.map(week => (
            <th key={week} scope="col" className={cn(HEAD_CLASS, LOG_COLUMN_CLASS)}>
              {`Week ${week}`}
              {block.calibrationWeek && week === 1 && <span className="block font-normal tracking-normal [font-variant-caps:normal]"> calibration</span>}
            </th>
          ))}
        </tr>
      </thead>
      {rows.map(row => (
        <ExerciseRows key={row.id} session={session} row={row} exercisesById={exercisesById} weeks={weeks} />
      ))}
    </table>
  );
}
