import { Fragment, type ReactNode } from 'react';
import { hasCoolDown, positionLabel, type Row, type Session } from '../../domain/program';
import { sessionUnits } from '../../domain/sessionEditing';
import { DOCUMENT_EYEBROW_CLASS, DOCUMENT_HEAD_CLASS, DOCUMENT_NOTE_CLASS, DOCUMENT_TERM_CLASS, DOCUMENT_VALUE_CLASS } from '../typography';
import { linkVariants } from '../ui/link';
import { cn } from '../ui/utils';
import { DayPage } from './DayPage';
import { dayPageAnchor, loggedRows, type SessionDay } from './documentWeeks';
import { ExerciseLink } from './ExerciseLink';
import { PositionBadge } from './PositionBadge';
import { exerciseNameOf, repsUnit, type ProgramView } from './programView';
import { routineItems, type RoutineItem } from './RoutineList';
import { coolDownAmount, shownSwapsOf, warmUpAmount } from './sessionExerciseDetails';
import { SetRows } from './SetTable';
import { GROUP_BRACKET_CLASS, SupersetDescription } from './SupersetGroup';
import { DOCUMENT_SET_COLUMNS } from './tableLayout';
import { rowRestAndTechnique, type RowPlace } from './targets';
import { dayDateText, type WeekDay, type WeekView } from './weekView';
import { LOG_SURFACE_CLASS, WriteInCell } from './WriteInCell';

const LOG_HEAD_CLASS = cn(DOCUMENT_HEAD_CLASS, 'border-b border-table-rule px-1.5 pt-0 pb-[0.5mm] text-left align-bottom');

function DocumentRoutine({ title, items }: { title: string; items: readonly RoutineItem[] }) {
  if (items.length === 0) return null;
  return (
    <section className="flex flex-wrap items-baseline gap-x-5 gap-y-0.5 bg-surface-subtle px-3 py-2 print:py-1.5">
      <h5 className={DOCUMENT_EYEBROW_CLASS}>
        {title}
      </h5>
      <ul className="flex flex-wrap gap-x-6 gap-y-1 text-document-table text-text-primary">
        {items.map(item => (
          <li key={item.key} className="flex flex-wrap items-baseline gap-x-2">
            {item.name}
            {item.amount}
          </li>
        ))}
      </ul>
    </section>
  );
}

function exerciseLinkOf(view: ProgramView) {
  return (item: { exerciseId: string }) => <ExerciseLink exerciseId={item.exerciseId} exercisesById={view.exercisesById} />;
}

function warmUpItems(view: ProgramView, session: Session): RoutineItem[] {
  return routineItems(session.warmUp.items, { exercisesById: view.exercisesById, nameOf: exerciseLinkOf(view), amountOf: warmUpAmount, size: 'document' });
}

function coolDownItems(view: ProgramView, session: Session): RoutineItem[] {
  if (!hasCoolDown(session)) return [];
  return routineItems(session.coolDown.items, { exercisesById: view.exercisesById, nameOf: exerciseLinkOf(view), amountOf: coolDownAmount, size: 'document' });
}

function tailoredCue(row: Row): string {
  return row.touched.includes('cues') ? row.cues.trim() : '';
}

function ExerciseNote({ view, row, place }: { view: ProgramView; row: Row; place: RowPlace }) {
  const swaps = shownSwapsOf(row, id => view.exercisesById.get(id)).map(swap => swap.id);
  const parts: ReactNode[] = [
    ...rowRestAndTechnique(row, place).map(target => (
      <>
        {`${target.term} `}
        <span className={DOCUMENT_VALUE_CLASS}>{target.value}</span>
      </>
    )),
    ...(swaps.length > 0
      ? [
          <>
            {'Swaps: '}
            {swaps.map((id, index) => (
              <Fragment key={id}>
                {index > 0 && ', '}
                <ExerciseLink exerciseId={id} exercisesById={view.exercisesById} />
              </Fragment>
            ))}
          </>,
        ]
      : []),
  ];
  if (parts.length === 0) return null;
  return (
    <span className={DOCUMENT_NOTE_CLASS}>
      {parts.map((part, index) => (
        <Fragment key={index}>
          {index > 0 && ' · '}
          {part}
        </Fragment>
      ))}
    </span>
  );
}

type ExerciseRowProps = { view: ProgramView; session: Session; row: Row; place: RowPlace; span: number };

function ExerciseRow({ view, session, row, place, span }: ExerciseRowProps) {
  const cue = tailoredCue(row);
  const custom = row.progression.kind === 'custom' ? row.progression.text : '';
  return (
    <tr>
      <th
        scope={place === 'alone' ? 'rowgroup' : 'row'}
        colSpan={span}
        className={cn('h-12 px-1.5 pt-3 pb-1 text-left align-bottom font-normal print:h-auto print:pt-[2mm] print:pb-[0.8mm]', {
          [GROUP_BRACKET_CLASS]: place === 'in-superset',
        })}
      >
        <span className="flex flex-wrap items-baseline gap-x-[0.9em] gap-y-0.5">
          <span className="inline-flex items-baseline gap-2">
            <PositionBadge label={positionLabel(session, row)} size="document" />
            <ExerciseLink exerciseId={row.exerciseId} exercisesById={view.exercisesById} className={DOCUMENT_TERM_CLASS} />
          </span>
          <ExerciseNote view={view} row={row} place={place} />
        </span>
        {(cue || custom) && (
          <span className={cn(DOCUMENT_NOTE_CLASS, 'mt-0.5 block max-w-measure pl-[2.2em]')}>
            {cue && <span className="block">{cue}</span>}
            {custom && <span className="block">{custom}</span>}
          </span>
        )}
      </th>
    </tr>
  );
}

const LOG_CELLS = (
  <>
    <td aria-hidden="true" className="max-sm:hidden" />
    <WriteInCell kind="entry" as="td" />
  </>
);

type LogColumns = { weight: 'shown' | 'none'; span: number };

type ExerciseUnitProps = { view: ProgramView; session: Session; rows: readonly Row[]; columns: LogColumns };

function ExerciseUnit({ view, session, rows, columns }: ExerciseUnitProps) {
  const place: RowPlace = rows.length > 1 ? 'in-superset' : 'alone';
  return (
    <tbody>
      {place === 'in-superset' && (
        <tr>
          <td colSpan={columns.span} className="px-1.5 pt-3 pb-0.5 print:pt-[2.5mm]">
            <span className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
              <span className={DOCUMENT_EYEBROW_CLASS}>Superset</span>
              <span className={DOCUMENT_NOTE_CLASS}>
                <SupersetDescription labels={rows.map(row => positionLabel(session, row))} restSeconds={rows[rows.length - 1].restSeconds} />
              </span>
            </span>
          </td>
        </tr>
      )}
      {rows.map(row => (
        <Fragment key={row.id}>
          <ExerciseRow view={view} session={session} row={row} place={place} span={columns.span} />
          <SetRows
            sets={row.sets}
            weight={columns.weight}
            size="document"
            group={place === 'in-superset' ? 'superset' : 'single'}
            exerciseName={exerciseNameOf(view.exercisesById.get(row.exerciseId))}
            unit={repsUnit(view.exercisesById.get(row.exerciseId))}
            trailing={LOG_CELLS}
          />
        </Fragment>
      ))}
    </tbody>
  );
}

type LogKind = 'finding-weights' | 'weight-reps';

const LOG_HEADS: Record<LogKind, string> = { 'finding-weights': 'Your log · finding your weights', 'weight-reps': 'Your log · weight × reps' };

type SessionLogProps = { view: ProgramView; session: Session; log: LogKind };

function SessionLog({ view, session, log }: SessionLogProps) {
  const rows = loggedRows(session);
  const weight = rows.some(row => row.sets.some(set => set.weightKg !== undefined)) ? 'shown' : 'none';
  const heads = ['Set', 'Reps', 'RIR', ...(weight === 'shown' ? ['Weight'] : [])];
  const columns: LogColumns = { weight, span: heads.length + 2 };
  return (
    <table aria-label={`${session.name}: sets and your log`} className="w-full border-separate border-spacing-0 text-document-table text-text-primary sm:table-fixed">
      <colgroup>
        <col className={DOCUMENT_SET_COLUMNS.set} />
        <col className={DOCUMENT_SET_COLUMNS.reps} />
        <col className={DOCUMENT_SET_COLUMNS.rir} />
        {weight === 'shown' && <col className={DOCUMENT_SET_COLUMNS.weight} />}
        <col className="w-[5mm] max-sm:hidden" />
        <col className="max-sm:hidden" />
      </colgroup>
      <thead>
        <tr>
          {heads.map(head => (
            <th key={head} scope="col" className={LOG_HEAD_CLASS}>
              {head}
            </th>
          ))}
          <td aria-hidden="true" className="max-sm:hidden" />
          <th scope="col" className={cn(LOG_HEAD_CLASS, LOG_SURFACE_CLASS, 'rounded-t-tile py-[0.8mm] pl-[0.6em]')}>
            {LOG_HEADS[log]}
          </th>
        </tr>
      </thead>
      {sessionUnits({ ...session, rows }).map(unit => (
        <ExerciseUnit key={unit.key} view={view} session={session} rows={unit.rows} columns={columns} />
      ))}
    </table>
  );
}

type StrengthDayPageProps = {
  view: ProgramView;
  week: WeekView;
  day: SessionDay;
  sameSetsAs: { week: WeekView; day: WeekDay } | null;
};

export function StrengthDayPage({ view, week, day, sameSetsAs }: StrengthDayPageProps) {
  const { session } = day.plan;
  return (
    <DayPage week={week} day={day} rhythm="tight">
      <div className={cn('space-y-document-tight', { 'max-sm:hidden': sameSetsAs !== null })}>
        <DocumentRoutine title="Warm-up" items={warmUpItems(view, session)} />
        <SessionLog view={view} session={session} log={week.calibration ? 'finding-weights' : 'weight-reps'} />
        <DocumentRoutine title="Cool-down" items={coolDownItems(view, session)} />
      </div>
      {sameSetsAs && (
        <p className="text-base text-text-primary sm:hidden">
          {'Same sets as '}
          <a href={`#${dayPageAnchor(sameSetsAs.week, sameSetsAs.day)}`} className={cn(linkVariants({ variant: 'inline', reach: 'touch' }), 'font-medium')}>
            {dayDateText(sameSetsAs.day)}
          </a>
          .
        </p>
      )}
    </DayPage>
  );
}
