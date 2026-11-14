import type { Exercise } from '../../context/TrainingContext';
import { formatRange, isWorkingSet, positionLabel, type Block, type Row, type Session, type SetSpec } from '../../domain/program';
import { DOCUMENT_HEAD_CLASS, DOCUMENT_NOTE_CLASS, DOCUMENT_VALUE_CLASS } from '../typography';
import { cn } from '../ui/utils';
import { PositionBadge } from './PositionBadge';
import { RirValue } from './RirValue';
import { exerciseNameOf, repsSuffix } from './programView';

type SessionTableProps = { session: Session; block: Pick<Block, 'weeks' | 'calibrationWeek'>; exercisesById: ReadonlyMap<string, Exercise> };

const SECONDS_PER_MINUTE = 60;
const CLOCK_REST_FROM_SECONDS = 90;
const LOG_COLUMN_CLASS = 'max-sm:hidden';
const HEAD_CLASS = cn(DOCUMENT_HEAD_CLASS, 'px-1.5 py-1 text-left align-bottom');
const CELL_CLASS = 'px-1.5 py-1 align-middle tabular-nums';
const BRACKET_CLASS = 'border-l-2';
const NOTE_LINE_CLASS = cn(DOCUMENT_NOTE_CLASS, 'block');

function restText(seconds: number): string {
  if (seconds < CLOCK_REST_FROM_SECONDS) return `${seconds} s`;
  const minutes = Math.floor(seconds / SECONDS_PER_MINUTE);
  const rest = String(seconds % SECONDS_PER_MINUTE).padStart(2, '0');
  return `${minutes}:${rest}`;
}

function namesOf(ids: readonly string[], exercisesById: ReadonlyMap<string, Exercise>): string[] {
  return ids.flatMap(id => exercisesById.get(id)?.name ?? []);
}

function setLabels(sets: readonly SetSpec[]): string[] {
  let warmUp = 0;
  let working = 0;
  return sets.map(set => {
    if (isWorkingSet(set)) {
      working += 1;
      return String(working);
    }
    warmUp += 1;
    return `W${warmUp}`;
  });
}

function supersetOf(session: Session, row: Row): Row[] {
  if (positionLabel(session, row) === row.slot) return [];
  return session.rows.filter(other => other.slot === row.slot && other.supersetGroup === row.supersetGroup);
}

function tailoredCue(row: Row): string {
  return row.touched.includes('cues') ? row.cues.trim() : '';
}

function restLine(session: Session, row: Row): string | null {
  const superset = supersetOf(session, row);
  if (superset.length === 0) return `Rest ${restText(row.restSeconds)}`;
  if (superset.at(-1)?.id !== row.id) return null;
  return `Rest ${restText(row.restSeconds)} after ${positionLabel(session, row)}`;
}

type ExerciseHeaderProps = { session: Session; row: Row; exercise: Exercise | undefined; swaps: string[]; columns: number; bracket: string };

function ExerciseHeader({ session, row, exercise, swaps, columns, bracket }: ExerciseHeaderProps) {
  const cue = tailoredCue(row);
  const meta = [restLine(session, row), swaps.length > 0 ? `Swap: ${swaps.join(', ')}` : null].filter(part => part !== null).join(' · ');
  return (
    <tr>
      <th scope="rowgroup" colSpan={columns} className={cn('pt-3 pr-0 pb-1 pl-1.5 text-left font-normal', bracket)}>
        <span className="flex items-start gap-2">
          <PositionBadge label={positionLabel(session, row)} size="xs" />{' '}
          <span className="min-w-0 flex-1">
            <span className="block text-document-body font-semibold text-text-primary">{exerciseNameOf(exercise)}</span>
            {meta && <span className={NOTE_LINE_CLASS}>{` ${meta}`}</span>}
            {cue && <span className={cn(NOTE_LINE_CLASS, 'max-w-measure')}>{` ${cue}`}</span>}
            {row.progression.kind === 'custom' && <span className={cn(NOTE_LINE_CLASS, 'max-w-measure')}>{` ${row.progression.text}`}</span>}
          </span>
        </span>
      </th>
    </tr>
  );
}

function repsText(set: SetSpec, suffix: string): string {
  const reps = `${formatRange(set.reps)}${suffix}`;
  return set.weightKg === undefined ? reps : `${reps} × ${set.weightKg} kg`;
}

type SetRowProps = { set: SetSpec; label: string; suffix: string; weeks: readonly number[]; bracket: string };

function SetRow({ set, label, suffix, weeks, bracket }: SetRowProps) {
  if (!isWorkingSet(set)) {
    return (
      <tr>
        <th scope="row" className={cn(CELL_CLASS, bracket, 'bg-set-warm-up-soft pl-7 text-left text-document-note font-semibold text-set-warm-up')}>
          {label}
        </th>
        <td className={cn(CELL_CLASS, 'bg-set-warm-up-soft whitespace-nowrap text-text-secondary')}>{repsText(set, suffix)}</td>
        <td className={cn(CELL_CLASS, 'bg-set-warm-up-soft')} />
        {weeks.length > 0 && <td aria-hidden="true" colSpan={weeks.length} className={LOG_COLUMN_CLASS} />}
      </tr>
    );
  }
  return (
    <tr>
      <th scope="row" className={cn(CELL_CLASS, bracket, 'pl-7 text-left', DOCUMENT_VALUE_CLASS)}>
        {label}
      </th>
      <td className={cn(CELL_CLASS, DOCUMENT_VALUE_CLASS)}>{repsText(set, suffix)}</td>
      <td className={CELL_CLASS}>
        <RirValue rir={set.rir} />
      </td>
      {weeks.map(week => (
        <td key={week} aria-hidden="true" className={cn(LOG_COLUMN_CLASS, 'h-8 border border-divider print:h-[9mm]')} />
      ))}
    </tr>
  );
}

type ExerciseRowsProps = { session: Session; row: Row; exercisesById: ReadonlyMap<string, Exercise>; weeks: readonly number[] };

function ExerciseRows({ session, row, exercisesById, weeks }: ExerciseRowsProps) {
  const exercise = exercisesById.get(row.exerciseId);
  const suffix = repsSuffix(exercise);
  const labels = setLabels(row.sets);
  const bracket = cn(BRACKET_CLASS, supersetOf(session, row).length > 0 ? 'border-l-text-primary' : 'border-l-transparent');
  return (
    <tbody data-print-keep>
      <ExerciseHeader
        session={session}
        row={row}
        exercise={exercise}
        swaps={namesOf(row.substitutions, exercisesById)}
        columns={3 + weeks.length}
        bracket={bracket}
      />
      {row.sets.map((set, index) => (
        <SetRow key={index} set={set} label={labels[index]} suffix={suffix} weeks={weeks} bracket={bracket} />
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
        <col className="sm:w-[8%]" />
        <col className="sm:w-[15%]" />
        <col className="sm:w-[9%]" />
        {weeks.map(week => (
          <col key={week} className={LOG_COLUMN_CLASS} />
        ))}
      </colgroup>
      <thead className="border-b border-text-primary">
        <tr>
          <th scope="col" rowSpan={2} className={cn(HEAD_CLASS, 'pl-7')}>
            Set
          </th>
          <th scope="col" rowSpan={2} className={HEAD_CLASS}>
            Reps
          </th>
          <th scope="col" rowSpan={2} className={HEAD_CLASS}>
            RIR
          </th>
          <th scope="colgroup" colSpan={weeks.length} aria-hidden="true" className={cn(HEAD_CLASS, LOG_COLUMN_CLASS, 'border-b border-divider text-center')}>
            Log: kg × reps
          </th>
        </tr>
        <tr>
          {weeks.map(week => (
            <th key={week} scope="col" aria-hidden="true" className={cn(HEAD_CLASS, LOG_COLUMN_CLASS)}>
              {`Week ${week}`}
              {block.calibrationWeek && week === 1 && <span className="block font-normal text-text-secondary"> calibration</span>}
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
