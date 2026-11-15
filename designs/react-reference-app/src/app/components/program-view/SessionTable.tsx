import type { Exercise } from '../../context/TrainingContext';
import { formatRange, isWorkingSet, positionLabel, workingSets, type Block, type Row, type Session, type SetSpec, type WorkingSet } from '../../domain/program';
import { DOCUMENT_HEAD_CLASS, DOCUMENT_NOTE_CLASS, DOCUMENT_VALUE_CLASS } from '../typography';
import { cn } from '../ui/utils';
import { ExerciseLink } from './ExerciseLink';
import { PositionBadge } from './PositionBadge';
import { RirValue } from './RirValue';
import { repsSuffix } from './programView';

type SessionTableProps = { session: Session; block: Pick<Block, 'weeks' | 'calibrationWeek'>; exercisesById: ReadonlyMap<string, Exercise> };

const SECONDS_PER_MINUTE = 60;
const CLOCK_REST_FROM_SECONDS = 90;
const LOG_COLUMN_CLASS = 'max-sm:hidden';
const ALIGN_CLASS = 'px-1.5 text-left';
const HEAD_CLASS = cn(DOCUMENT_HEAD_CLASS, ALIGN_CLASS, 'py-1 align-bottom whitespace-nowrap');
const CELL_CLASS = cn(ALIGN_CLASS, 'py-1 align-middle whitespace-nowrap tabular-nums');
const SET_INDENT_CLASS = 'pl-7 print:pl-1.5';
const RIR_INDENT_CLASS = 'pl-3';
const BRACKET_CLASS = 'border-l-2';
const NOTE_LINE_CLASS = cn(DOCUMENT_NOTE_CLASS, 'block');

function restText(seconds: number): string {
  if (seconds < CLOCK_REST_FROM_SECONDS) return `${seconds} s`;
  const minutes = Math.floor(seconds / SECONDS_PER_MINUTE);
  const rest = String(seconds % SECONDS_PER_MINUTE).padStart(2, '0');
  return `${minutes}:${rest}`;
}

function supersetOf(session: Session, row: Row): Row[] {
  if (positionLabel(session, row) === row.slot) return [];
  return session.rows.filter(other => other.slot === row.slot && other.supersetGroup === row.supersetGroup);
}

function tailoredCue(row: Row): string {
  return row.touched.includes('cues') ? row.cues.trim() : '';
}

type RestNote = { value: string; after: string };

function restNote(session: Session, row: Row): RestNote | null {
  const superset = supersetOf(session, row);
  const value = restText(row.restSeconds);
  if (superset.length === 0) return { value, after: '' };
  if (superset.at(-1)?.id !== row.id) return null;
  return { value, after: ` after ${positionLabel(session, row)}` };
}

function Rest({ note }: { note: RestNote }) {
  return (
    <span className={DOCUMENT_NOTE_CLASS}>
      {' Rest '}
      <span className={DOCUMENT_VALUE_CLASS}>{note.value}</span>
      {note.after}
    </span>
  );
}

function listed(amounts: readonly string[]): string {
  if (amounts.length === 1) return amounts[0];
  return `${amounts.slice(0, -1).join(', ')}, then ${amounts.at(-1)}`;
}

function warmUpSetsText(sets: readonly SetSpec[], exercise: Exercise | undefined): string | null {
  const warmUps = sets.filter(set => !isWorkingSet(set));
  if (warmUps.length === 0) return null;
  const timed = exercise?.measuredIn === 'time';
  const unit = timed ? ' s' : exercise?.perSide ? ' reps per side' : ' reps';
  const weighted = warmUps.some(set => set.weightKg !== undefined);
  if (!weighted) {
    const amounts = warmUps.map(set => `${formatRange(set.reps)}${timed ? ' s' : ''}`);
    return `${listed(amounts)}${timed ? '' : unit}, lighter than your working sets. No need to log them.`;
  }
  const amounts = warmUps.map(set => `${formatRange(set.reps)}${unit}${set.weightKg === undefined ? '' : ` at ${set.weightKg} kg`}`);
  return `${listed(amounts)}. No need to log them.`;
}

type ExerciseHeaderProps = { session: Session; row: Row; exercisesById: ReadonlyMap<string, Exercise>; columns: number; bracket: string };

function ExerciseHeader({ session, row, exercisesById, columns, bracket }: ExerciseHeaderProps) {
  const cue = tailoredCue(row);
  const rest = restNote(session, row);
  const warmUp = warmUpSetsText(row.sets, exercisesById.get(row.exerciseId));
  return (
    <tr>
      <th scope="rowgroup" colSpan={columns} className={cn('pt-2.5 pr-0 pb-1 pl-1.5 text-left font-normal', bracket)}>
        <span className="flex items-start gap-2">
          <PositionBadge label={positionLabel(session, row)} size="xs" />{' '}
          <span className="min-w-0 flex-1">
            <span className="flex flex-wrap items-baseline gap-x-3">
              <ExerciseLink exerciseId={row.exerciseId} exercisesById={exercisesById} className="text-document-body font-semibold text-text-primary" />
              {rest && <Rest note={rest} />}
            </span>
            {warmUp && (
              <span className={cn(NOTE_LINE_CLASS, 'max-w-measure')}>
                <span className="font-semibold text-set-warm-up"> Warm up first:</span> {warmUp}
              </span>
            )}
            {cue && <span className={cn(NOTE_LINE_CLASS, 'max-w-measure')}>{` ${cue}`}</span>}
            {row.progression.kind === 'custom' && <span className={cn(NOTE_LINE_CLASS, 'max-w-measure')}>{` ${row.progression.text}`}</span>}
          </span>
        </span>
      </th>
    </tr>
  );
}

type Columns = { weight: boolean; weeks: readonly number[] };

type SetRowProps = { set: WorkingSet; number: number; suffix: string; columns: Columns; bracket: string };

function SetRow({ set, number, suffix, columns, bracket }: SetRowProps) {
  return (
    <tr>
      <th scope="row" className={cn(CELL_CLASS, bracket, SET_INDENT_CLASS, DOCUMENT_VALUE_CLASS)}>
        {number}
      </th>
      <td className={cn(CELL_CLASS, DOCUMENT_VALUE_CLASS)}>{`${formatRange(set.reps)}${suffix}`}</td>
      {columns.weight && <td className={cn(CELL_CLASS, DOCUMENT_VALUE_CLASS)}>{set.weightKg === undefined ? '' : `${set.weightKg} kg`}</td>}
      <td className={CELL_CLASS}>
        <RirValue rir={set.rir} />
      </td>
      {columns.weeks.map(week => (
        <td key={week} aria-hidden="true" className={cn(LOG_COLUMN_CLASS, 'h-8 border border-divider print:h-[9mm]')} />
      ))}
    </tr>
  );
}

type ExerciseRowsProps = { session: Session; row: Row; exercisesById: ReadonlyMap<string, Exercise>; columns: Columns };

function ExerciseRows({ session, row, exercisesById, columns }: ExerciseRowsProps) {
  const suffix = repsSuffix(exercisesById.get(row.exerciseId));
  const bracket = cn(BRACKET_CLASS, supersetOf(session, row).length > 0 ? 'border-l-text-primary' : 'border-l-transparent');
  const span = 3 + Number(columns.weight) + columns.weeks.length;
  return (
    <tbody data-print-keep>
      <ExerciseHeader session={session} row={row} exercisesById={exercisesById} columns={span} bracket={bracket} />
      {workingSets(row.sets).map((set, index) => (
        <SetRow key={index} set={set} number={index + 1} suffix={suffix} columns={columns} bracket={bracket} />
      ))}
    </tbody>
  );
}

function prescribesWeight(rows: readonly Row[]): boolean {
  return rows.some(row => workingSets(row.sets).some(set => set.weightKg !== undefined));
}

export function SessionTable({ session, block, exercisesById }: SessionTableProps) {
  const rows = session.rows.filter(row => row.exerciseId !== '' && row.sets.length > 0);
  const columns: Columns = { weight: prescribesWeight(rows), weeks: Array.from({ length: block.weeks }, (_, index) => index + 1) };
  return (
    <table aria-label={`${session.name} exercises`} className="w-full border-collapse text-document-table text-text-primary sm:table-fixed">
      <colgroup>
        <col className="sm:w-[8%] print:w-[9mm]" />
        <col className="sm:w-[13%] print:w-[20mm]" />
        {columns.weight && <col className="sm:w-[10%] print:w-[15mm]" />}
        <col className="sm:w-[9%] print:w-[11mm]" />
        {columns.weeks.map(week => (
          <col key={week} className={LOG_COLUMN_CLASS} />
        ))}
      </colgroup>
      <thead className="border-b border-text-primary">
        <tr>
          <th scope="col" rowSpan={2} className={cn(HEAD_CLASS, SET_INDENT_CLASS)}>
            Set
          </th>
          <th scope="col" rowSpan={2} className={HEAD_CLASS}>
            Reps
          </th>
          {columns.weight && (
            <th scope="col" rowSpan={2} className={HEAD_CLASS}>
              Weight
            </th>
          )}
          <th scope="col" rowSpan={2} className={cn(HEAD_CLASS, RIR_INDENT_CLASS)}>
            RIR
          </th>
          <th
            scope="colgroup"
            colSpan={columns.weeks.length}
            aria-hidden="true"
            className={cn(HEAD_CLASS, LOG_COLUMN_CLASS, 'border-b border-divider text-center')}
          >
            Log: kg × reps
          </th>
        </tr>
        <tr>
          {columns.weeks.map(week => (
            <th key={week} scope="col" aria-hidden="true" className={cn(HEAD_CLASS, LOG_COLUMN_CLASS)}>
              {`Week ${week}`}
              {block.calibrationWeek && week === 1 && <span className="block font-normal text-text-secondary"> calibration</span>}
            </th>
          ))}
        </tr>
      </thead>
      {rows.map(row => (
        <ExerciseRows key={row.id} session={session} row={row} exercisesById={exercisesById} columns={columns} />
      ))}
    </table>
  );
}
