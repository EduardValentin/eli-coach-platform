import { useId, useRef, type KeyboardEvent, type ReactNode, type RefObject } from 'react';
import { addDays, format } from 'date-fns';
import { ChevronDown, Info, Plus, RotateCcw, X } from 'lucide-react';
import type { Exercise } from '../../../context/TrainingContext';
import { formatRange, numberedSets, type Range, type Row, type SetTarget, type TypedTargets } from '../../../domain/program';
import { blockDates, blockSpan } from '../../../domain/programCalendar';
import {
  firstLoadingWeek,
  hasDifferentWorkingSets,
  isCalibrationWeek,
  isOnlyWorkingSet,
  isProgressing,
  progressionContextOf,
  resolvedWeeks,
  withoutTypedTarget,
  withSetAdded,
  withSetRemoved,
  withSetSwitched,
  withTypedTargets,
  withWeekReset,
  withWorkingSetsMatched,
  workingSetRuns,
  workingSetsOf,
  type ProgressionContext,
  type ProgressionNote,
  type ProgressionSchedule,
  type ResolvedSet,
  type ResolvedWeek,
  type SetRun,
} from '../../../domain/programProgression';
import { takesLoad } from '../../../domain/weightSteps';
import { counted } from '../../../utils/counted';
import { repsSuffix, repsUnit } from '../../program-view/programView';
import { RirValue } from '../../program-view/RirValue';
import { SetMark } from '../../program-view/SetMark';
import { WARM_UP_RIR_MARK } from '../../program-view/SetTable';
import { TARGET_TERMS, WeightValue, workingValue } from '../../program-view/targets';
import { DisclosureContent, DisclosureTrigger, TextDisclosureGroup, useDisclosureOpen } from '../../program-view/TextDisclosure';
import { TargetColumns, type TargetColumn } from '../../program-view/TargetsSummary';
import { IconActionButton } from '../../IconActionButton';
import { CAPTION_CLASS, LABEL_CLASS } from '../../typography';
import { Badge } from '../../ui/badge';
import { Button } from '../../ui/button';
import { Checkbox } from '../../ui/checkbox';
import { LabelSuffix } from '../../ui/label';
import { cn } from '../../ui/utils';
import { ChangedMark } from './ChangedMark';
import { useEditorAnnouncer } from './editorAnnouncer';
import { useRowTextField } from './RowTextField';
import { parseRange, parseWholeNumber, RANGE_PROBLEM, RIR_PROBLEM } from './rowFields';
import { usePendingFocus } from './usePendingFocus';

const WEIGHT_PROBLEM = 'Use a weight in kg, or leave it empty';
const NO_WEIGHT = 'by RIR';
const QUIET_VALUE_CLASS = 'font-normal text-text-secondary';
const FIRST_WEEK = 1;
const REPS_FORMAT = '8 or 8–10';
const MOVE_HINT = 'Arrow Up and Arrow Down move to the same field of the set above or below.';

/** The lead track holds a set's mark in its line and a week's label in its row, so both start their columns at the same place. */
const LEAD_TRACK = '[--set-lead-track:7rem]';

/**
 * Below the set-line container width a set is its lead and warm-up switch over its fields and Remove;
 * from it, one table line with the columns Set, Warm-up, Reps, RIR, Weight and Remove. The empty track before Remove keeps it on the chevron's axis.
 */
const COLUMNS_WITH_WEIGHT = 'grid-cols-[repeat(3,minmax(0,1fr))_auto] @set-line:grid-cols-[var(--set-lead-track)_5rem_5rem_4rem_5rem_minmax(0,1fr)_auto]';
const COLUMNS_WITHOUT_WEIGHT = 'grid-cols-[repeat(2,minmax(0,1fr))_auto] @set-line:grid-cols-[var(--set-lead-track)_5rem_5rem_4rem_minmax(0,1fr)_auto]';

/**
 * A closed week's columns, with the gap the columns list keeps between them. Below the set-line width the short columns take what their content needs
 * and Working takes the rest; from it they are shares of the row. Either way the row is equally wide in every week, so reading down a column follows it
 * through the block, and a column the block lacks leaves its track at the end.
 */
const SUMMARY_COLUMNS_WITH_WARM_UP =
  'gap-x-6 grid-cols-[max-content_minmax(min-content,1fr)_max-content_max-content] @set-line:grid-cols-[minmax(0,2fr)_minmax(0,4fr)_minmax(0,1.5fr)_minmax(0,3fr)]';
const SUMMARY_COLUMNS_WITHOUT_WARM_UP =
  'gap-x-6 grid-cols-[minmax(min-content,1fr)_max-content_max-content_max-content] @set-line:grid-cols-[minmax(0,4fr)_minmax(0,1.5fr)_minmax(0,3fr)_minmax(0,2fr)]';

/** Reset and the chevron take the two tracks at the end of a week row; the chevron's sits on the axis of the sets' Remove buttons. */
const WEEK_ROW_TRACKS = cn(
  '[--week-gap:1rem] [--week-reset-track:2rem] [--week-chevron-track:3rem]',
  '[--week-actions:calc(var(--week-reset-track)_+_var(--week-chevron-track)_+_2_*_var(--week-gap))]',
  'grid-cols-[minmax(0,1fr)_var(--week-reset-track)_var(--week-chevron-track)] gap-x-(--week-gap)',
);

function parseWeight(text: string): number | undefined | null {
  const trimmed = text.trim().replace(',', '.');
  if (trimmed === '') return undefined;
  const weight = Number(trimmed);
  return Number.isFinite(weight) && weight > 0 ? weight : null;
}

function formatWeight(weight: number | undefined): string {
  return weight === undefined ? '' : String(weight);
}

function parseOptional<Value>(parse: (text: string) => Value | null): (text: string) => Value | undefined | null {
  return text => (text.trim() === '' ? undefined : parse(text));
}

type SetCellProps = { className?: string; children?: ReactNode };

function SetCell({ className, children }: SetCellProps) {
  return (
    <td role="cell" className={cn('grid min-w-0 content-start', className)}>
      {children}
    </td>
  );
}

function StaticCell({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <span className={cn('flex h-(--size-control-md) items-center px-3 text-sm tabular-nums @max-set-line:justify-center @max-set-line:px-1.5', className)}>
      {children}
    </span>
  );
}

type SetLineProps = {
  columns: string;
  setId: string;
  kind: ResolvedSet['kind'];
  lead: ReactNode;
  cells: ReactNode;
  switcher: ReactNode;
  problems: ReactNode;
  actions?: ReactNode;
};

/** A field's problem shows under the line, across the fields, only while there is one; it is also in the field's description. */
function SetLine({ columns, lead, cells, switcher, problems, actions, setId, kind }: SetLineProps) {
  return (
    <tr role="row" data-set-id={setId} data-kind={kind} className={cn('grid items-center gap-x-2 gap-y-2', columns)}>
      <th
        role="rowheader"
        scope="row"
        className="row-start-1 flex min-w-0 items-center text-left font-normal [grid-column:1/-3] @set-line:row-start-auto @set-line:[grid-column:auto]"
      >
        {lead}
      </th>
      <td
        role="cell"
        className="row-start-1 flex justify-end [grid-column:-3/-1] @set-line:row-start-auto @set-line:justify-start @set-line:[grid-column:auto]"
      >
        {switcher}
      </td>
      {cells}
      <td role="cell" className="row-start-2 flex items-center justify-end [grid-column:-2/-1] @set-line:row-start-auto">
        {actions}
      </td>
      {problems && (
        <td role="cell" className="col-span-full flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 @set-line:row-start-2 @set-line:[grid-column:3/-2]">
          {problems}
        </td>
      )}
    </tr>
  );
}

type HeaderLabel = { key: string; label: ReactNode; shown: 'always' | 'wide' | 'never' };

const HEADER_SHOWN_CLASS: Record<HeaderLabel['shown'], string> = {
  always: '',
  wide: 'sr-only @set-line:not-sr-only',
  never: 'sr-only',
};

function SetLineHeader({ columns, labels }: { columns: string; labels: readonly HeaderLabel[] }) {
  return (
    <thead role="rowgroup">
      <tr role="row" className={cn('grid gap-x-2 pb-1', columns, LABEL_CLASS)}>
        {labels.map(({ key, label, shown }) => (
          <th key={key} role="columnheader" scope="col" className={cn('text-left font-medium', HEADER_SHOWN_CLASS[shown])}>
            {label}
          </th>
        ))}
      </tr>
    </thead>
  );
}

type Frame = {
  row: Row;
  context: ProgressionContext;
  weeks: ResolvedWeek[];
  firstPlanWeek: number;
  blockStart: Date | null;
  columns: string;
  showsWeight: boolean;
  showsWarmUps: boolean;
  repsName: string;
  repsSuffix: string;
  progresses: boolean;
  onChange: (row: Row) => void;
};

function planWeekOf(frame: Frame, week: number): number {
  return frame.firstPlanWeek + week - 1;
}

function weekValue(week: number): string {
  return `week-${week}`;
}

function noteText(note: ProgressionNote, set: ResolvedSet): string {
  if (note === 'step-too-large') return `Next step too large · stays at ${set.weightKg.value} kg`;
  if (note === 'progress-the-variation') return `At ${set.reps.value.max} s · progress the variation`;
  return `At ${set.reps.value.max} reps · harder variation or add load`;
}

function notedTarget(note: ProgressionNote): SetTarget {
  return note === 'step-too-large' ? 'weightKg' : 'reps';
}

function weekDate(frame: Frame, week: number): Date | null {
  return frame.blockStart ? addDays(frame.blockStart, (week - 1) * 7) : null;
}

function WeekLabel({ planWeek, date }: { planWeek: number; date: Date | null }) {
  return (
    <span className="flex flex-wrap items-baseline gap-x-1 @set-line:grid @set-line:gap-0">
      <span className="text-sm text-text-primary">{`Week ${planWeek}`}</span>
      {date && (
        <span className={cn(CAPTION_CLASS, 'tabular-nums')}>
          <span className="@set-line:hidden">· </span>
          {format(date, 'd MMM')}
        </span>
      )}
    </span>
  );
}

function weekName(planWeek: number, date: Date | null): string {
  return date ? `Week ${planWeek}, from ${format(date, 'd MMMM')}` : `Week ${planWeek}`;
}

/** "2 warm-up sets; 3 sets of 8–10, RIR 2–3, 60 kg", each run of equal working sets spoken on its own when they differ. */
function spokenWeek(frame: Frame, week: ResolvedWeek): string {
  const warmUps = week.sets.length - workingSetsOf(week).length;
  const runs = workingSetRuns(week);
  const rirOf = (run: SetRun) => `RIR ${formatRange(run.rir)}`;
  const sharedRir = runs.length > 1 && runs.every(run => rirOf(run) === rirOf(runs[0]));
  const parts = runs.map(run => {
    const { count, set } = run;
    const reps = `${formatRange(set.reps.value)}${frame.repsSuffix}`;
    const weight = set.weightKg.value === undefined ? null : `${set.weightKg.value} kg`;
    return [`${counted(count, 'set')} of ${reps}`, sharedRir ? null : rirOf(run), weight].filter(Boolean).join(', ');
  });
  return [...(warmUps > 0 ? [counted(warmUps, 'warm-up set')] : []), ...parts, ...(sharedRir ? [rirOf(runs[0])] : [])].join('; ');
}

function showsCalibration(frame: Frame, week: number): boolean {
  return frame.showsWeight && isCalibrationWeek(frame.context.block, week);
}

function weightColumn(frame: Frame, week: ResolvedWeek, runs: readonly SetRun[]): ReactNode[] {
  if (showsCalibration(frame, week.week)) return [<Badge tone="muted">Calibration</Badge>];
  return runs.map(({ set }) =>
    set.weightKg.value === undefined ? <span className={QUIET_VALUE_CLASS}>{NO_WEIGHT}</span> : <WeightValue weightKg={set.weightKg.value} />,
  );
}

/** A closed week's columns: every week carries the same ones so they line up down the list, with one line per run of equal working sets. */
function weekColumns(frame: Frame, week: ResolvedWeek): TargetColumn[] {
  const warmUps = week.sets.length - workingSetsOf(week).length;
  const runs = workingSetRuns(week);
  return [
    ...(frame.showsWarmUps
      ? [{ term: TARGET_TERMS.warmUp, lines: [warmUps > 0 ? counted(warmUps, 'set') : <span className={QUIET_VALUE_CLASS}>None</span>] }]
      : []),
    { term: TARGET_TERMS.working, lines: runs.map(({ count, set }) => workingValue(count, `${formatRange(set.reps.value)}${frame.repsSuffix}`)) },
    { term: TARGET_TERMS.rir, lines: runs.map(({ rir }) => <RirValue rir={rir} />) },
    ...(frame.showsWeight ? [{ term: TARGET_TERMS.weight, lines: weightColumn(frame, week, runs) }] : []),
  ];
}

function weekNoteText(week: ResolvedWeek): string | null {
  const noted = week.sets.find(set => set.note);
  return noted?.note ? noteText(noted.note, noted) : null;
}

function WeekNote({ week }: { week: ResolvedWeek }) {
  const text = weekNoteText(week);
  if (!text) return null;
  return (
    <span className={cn(CAPTION_CLASS, 'col-span-full flex items-start gap-1')}>
      <Info aria-hidden="true" size={12} className="mt-0.5 shrink-0" />
      {text}
    </span>
  );
}

function weekToggleName(frame: Frame, week: ResolvedWeek): string {
  const planWeek = planWeekOf(frame, week.week);
  const note = weekNoteText(week);
  const facts = [
    `${weekName(planWeek, weekDate(frame, week.week))}: ${spokenWeek(frame, week)}.`,
    showsCalibration(frame, week.week) ? 'Calibration week.' : null,
    note ? `${note}.` : null,
    week.changed ? 'Changed by you.' : null,
  ];
  return facts.filter(Boolean).join(' ');
}

type WeekHeaderProps = { frame: Frame; week: ResolvedWeek; onReset: () => void };

/**
 * The toggle lies under the whole row, drawn over without taking pointer events since a button cannot hold the items' description list,
 * so its hover band and its focus ring cover the row. Reset sits above it in a cell reaching across the gaps beside it,
 * which keeps the toggle's pointer area 8px clear of Reset's. Below the set-line width the label, Reset and the chevron share the first line
 * and the columns take the full width under them.
 */
function WeekHeader({ frame, week, onReset }: WeekHeaderProps) {
  const planWeek = planWeekOf(frame, week.week);
  return (
    <div className={cn('group/week grid', WEEK_ROW_TRACKS)}>
      <div className="relative col-span-full row-start-1 grid min-h-12 grid-cols-[minmax(0,1fr)] items-center gap-x-2 gap-y-1.5 px-2 py-1.5 @set-line:grid-cols-[var(--set-lead-track)_minmax(0,1fr)] @set-line:pr-[calc(var(--week-actions)_+_0.5rem)]">
        <DisclosureTrigger value={weekValue(week.week)}>
          <Button variant="disclosure" size="inline" data-week-toggle={week.week} className="absolute inset-0 size-full rounded-field">
            <span className="sr-only">{weekToggleName(frame, week)}</span>
          </Button>
        </DisclosureTrigger>
        <span
          aria-hidden="true"
          className="pointer-events-none relative flex min-h-9 items-center gap-1.5 @max-set-line:pr-[calc(var(--week-actions)_-_0.5rem)] @set-line:items-start"
        >
          <WeekLabel planWeek={planWeek} date={weekDate(frame, week.week)} />
          {week.changed && <ChangedMark placement="inline" className="@set-line:mt-1.5" />}
        </span>
        <span
          aria-hidden="true"
          className={cn(
            'pointer-events-none relative grid gap-y-1 @set-line:col-start-2 @set-line:row-start-1',
            frame.showsWarmUps ? SUMMARY_COLUMNS_WITH_WARM_UP : SUMMARY_COLUMNS_WITHOUT_WARM_UP,
          )}
        >
          <TargetColumns columns={weekColumns(frame, week)} size="sm" />
          <WeekNote week={week} />
        </span>
      </div>
      {week.changed && (
        <span className="relative col-start-2 row-start-1 mx-[calc(-1_*_var(--week-gap))] flex h-14 items-start justify-center self-start pt-2 @set-line:h-auto @set-line:items-center @set-line:self-stretch @set-line:pt-0">
          <IconActionButton icon={RotateCcw} label={`Reset week ${planWeek}`} hint="Reset week" onClick={onReset} />
        </span>
      )}
      <span
        aria-hidden="true"
        className="pointer-events-none relative col-start-3 row-start-1 flex h-12 items-center justify-center self-start @set-line:h-auto @set-line:self-stretch"
      >
        <ChevronDown className="size-4 text-text-secondary transition-transform group-has-[[data-week-toggle]:hover]/week:text-text-primary group-has-[[data-week-toggle][data-state=open]]/week:rotate-180 group-has-[[data-week-toggle][data-state=open]]/week:text-text-primary motion-reduce:transition-none" />
      </span>
    </div>
  );
}

/** One set as it reads in one week, numbered among the sets of its kind. */
type SetInWeek = { week: ResolvedWeek; set: ResolvedSet; number: number };

function setNameOf({ set, number }: Pick<SetInWeek, 'set' | 'number'>): string {
  return set.kind === 'warm-up' ? `warm-up set ${number}` : `set ${number}`;
}

function sourceText(frame: Frame, { week, set }: SetInWeek, target: SetTarget): string {
  if (set[target].source === 'typed') return 'Set by you.';
  if (set.added) return 'Copied when added.';
  if (week.week === FIRST_WEEK) return 'Block default.';
  if (set.kind === 'warm-up' && target === 'weightKg') return 'Follows the working weight.';
  if (!frame.progresses || set.kind === 'warm-up') return `Same as week ${frame.firstPlanWeek}.`;
  return 'Suggested.';
}

function descriptionOf(frame: Frame, inWeek: SetInWeek, target: SetTarget): string {
  const { note } = inWeek.set;
  const noted = note && notedTarget(note) === target ? ` ${noteText(note, inWeek.set)}.` : '';
  const byRir = target === 'weightKg' && inWeek.set.weightKg.value === undefined ? ' No weight: the client finds it by RIR.' : '';
  return `${sourceText(frame, inWeek, target)}${noted}${byRir}`;
}

type TypedValue = { value: TypedTargets; spoken: string };

function typedValue<Value>(value: Value | undefined, typed: (value: Value) => TypedValue): TypedValue | undefined {
  return value === undefined ? undefined : typed(value);
}

function useSetFields(frame: Frame, inWeek: SetInWeek) {
  const announce = useEditorAnnouncer();
  const { week, set } = inWeek;
  const planWeek = planWeekOf(frame, week.week);
  const name = `Week ${planWeek} ${setNameOf(inWeek)}`;
  const flows = week.week === FIRST_WEEK && frame.weeks.length > 1;

  function commit(target: SetTarget, field: string, typed: TypedValue | undefined) {
    const at = { week: week.week, setId: set.setId };
    const label = `${name} ${field}`;
    if (typed) {
      frame.onChange(withTypedTargets(frame.row, at, typed.value));
      announce(`${label} ${typed.spoken}.${flows ? ' Later weeks updated.' : ''}`);
      return;
    }
    if (set[target].source !== 'typed') return;
    frame.onChange(withoutTypedTarget(frame.row, at, target));
    announce(`${label} back to suggested.`);
  }

  const shared = { commitOn: 'blur' as const, density: 'compact' as const, selection: 'all-on-focus' as const, className: 'w-full' };
  const markOf = (target: SetTarget) => (set[target].source === 'typed' ? ('changed' as const) : ('none' as const));
  const reps = useRowTextField<Range | undefined>({
    ...shared,
    label: `${name} ${frame.repsName.toLowerCase()}`,
    value: set.reps.value,
    format: value => (value ? formatRange(value) : ''),
    parse: parseOptional(parseRange),
    problem: RANGE_PROBLEM,
    mark: markOf('reps'),
    description: descriptionOf(frame, inWeek, 'reps'),
    onCommit: value =>
      commit(
        'reps',
        frame.repsName.toLowerCase(),
        typedValue(value, reps => ({ value: { reps }, spoken: formatRange(reps) })),
      ),
  });
  const rir = useRowTextField<number | undefined>({
    ...shared,
    inputMode: 'numeric',
    label: `${name} RIR`,
    value: set.rir.value,
    format: value => (value === undefined ? '' : String(value)),
    parse: parseOptional(parseWholeNumber),
    problem: RIR_PROBLEM,
    mark: markOf('rir'),
    description: descriptionOf(frame, inWeek, 'rir'),
    onCommit: value =>
      commit(
        'rir',
        'RIR',
        typedValue(value, rir => ({ value: { rir }, spoken: String(rir) })),
      ),
  });
  const weight = useRowTextField<number | undefined>({
    ...shared,
    inputMode: 'decimal',
    label: `${name} weight in kg`,
    placeholder: NO_WEIGHT,
    value: set.weightKg.value,
    format: formatWeight,
    parse: parseWeight,
    problem: WEIGHT_PROBLEM,
    mark: markOf('weightKg'),
    description: descriptionOf(frame, inWeek, 'weightKg'),
    onCommit: value =>
      commit(
        'weightKg',
        'weight',
        typedValue(value, weightKg => ({ value: { weightKg }, spoken: `${weightKg} kg` })),
      ),
  });
  return { name, reps, rir, weight };
}

type SetActions = { onSwitch: (inWeek: SetInWeek) => void; onRemove: (inWeek: SetInWeek) => void };
type SetLineRowProps = { frame: Frame; inWeek: SetInWeek; actions: SetActions };

function SetLineRow({ frame, inWeek, actions }: SetLineRowProps) {
  const { week, set, number } = inWeek;
  const { name, reps, rir, weight } = useSetFields(frame, inWeek);
  const calibration = isCalibrationWeek(frame.context.block, week.week);
  const warmUp = set.kind === 'warm-up';
  const onlyWorking = isOnlyWorkingSet(frame.row, { week: week.week, setId: set.setId });
  const problems = [reps.problem, warmUp ? null : rir.problem, frame.showsWeight && !calibration ? weight.problem : null].filter(Boolean);
  return (
    <SetLine
      columns={frame.columns}
      setId={set.setId}
      kind={set.kind}
      lead={
        <span className="flex min-h-(--size-control-md) min-w-0 items-center gap-2">
          <SetMark kind={set.kind} number={number} caption="written" />
        </span>
      }
      cells={
        <>
          <SetCell>{reps.field}</SetCell>
          <SetCell>
            {warmUp ? (
              <StaticCell className="text-text-secondary">
                <span aria-hidden="true">{WARM_UP_RIR_MARK}</span>
                <span className="sr-only">{`${name} RIR: none on a warm-up set`}</span>
              </StaticCell>
            ) : (
              rir.field
            )}
          </SetCell>
          {frame.showsWeight && (
            <SetCell>
              {calibration ? (
                <StaticCell className="text-text-secondary">
                  <span aria-hidden="true">{NO_WEIGHT}</span>
                  <span className="sr-only">{`${name} weight: none, the client finds it by RIR in the calibration week`}</span>
                </StaticCell>
              ) : (
                weight.field
              )}
            </SetCell>
          )}
        </>
      }
      switcher={
        <label className="flex min-h-(--size-control-md) cursor-pointer items-center gap-2 text-sm whitespace-nowrap text-text-primary has-disabled:cursor-not-allowed">
          <Checkbox aria-label={`${name} is a warm-up set`} checked={warmUp} disabled={onlyWorking} onCheckedChange={() => actions.onSwitch(inWeek)} />
          <span aria-hidden="true" className="@set-line:hidden">
            Warm-up
          </span>
        </label>
      }
      problems={problems.length > 0 ? problems : null}
      actions={
        onlyWorking ? null : (
          <IconActionButton
            icon={X}
            className="ml-2 @set-line:ml-0"
            label={`Remove ${name.toLowerCase()}`}
            hint="Remove set"
            onClick={() => actions.onRemove(inWeek)}
          />
        )
      }
    />
  );
}

function headerLabels(frame: Frame): HeaderLabel[] {
  return [
    { key: 'set', label: 'Set', shown: 'wide' },
    { key: 'warm-up', label: 'Warm-up', shown: 'wide' },
    {
      key: 'reps',
      label: (
        <>
          {frame.repsName}{' '}
          <LabelSuffix aria-hidden="true" className="whitespace-nowrap">
            {REPS_FORMAT}
          </LabelSuffix>
        </>
      ),
      shown: 'always',
    },
    { key: 'rir', label: 'RIR', shown: 'always' },
    ...(frame.showsWeight
      ? [
          {
            key: 'weight',
            label: (
              <>
                <span aria-hidden="true" className="@set-line:hidden">
                  kg
                </span>
                <span className="sr-only @set-line:not-sr-only">
                  Weight <LabelSuffix>kg</LabelSuffix>
                </span>
              </>
            ),
            shown: 'always' as const,
          },
        ]
      : []),
    { key: 'actions', label: 'Remove', shown: 'never' },
  ];
}

type WeekActions = SetActions & { onAddSet: () => void; onMatch: () => void };
type WeekSetsProps = { frame: Frame; week: ResolvedWeek; actions: WeekActions };

function WeekSets({ frame, week, actions }: WeekSetsProps) {
  const planWeek = planWeekOf(frame, week.week);
  const hintId = useId();
  return (
    <>
      <p id={hintId} className="sr-only">
        {MOVE_HINT}
      </p>
      <table role="table" aria-describedby={hintId} className="grid grid-cols-[minmax(0,1fr)]">
        <caption className="sr-only">{`Week ${planWeek} sets`}</caption>
        <SetLineHeader columns={frame.columns} labels={headerLabels(frame)} />
        <tbody role="rowgroup" className="grid grid-cols-[minmax(0,1fr)] gap-y-2">
          {numberedSets(week.sets).map(({ set, number }) => (
            <SetLineRow key={set.setId} frame={frame} inWeek={{ week, set, number }} actions={actions} />
          ))}
        </tbody>
      </table>
      <div className="flex flex-wrap gap-x-2 gap-y-6 pt-2">
        <Button variant="ghost" size="xs" data-add="set" onClick={actions.onAddSet}>
          <Plus aria-hidden="true" />
          <span className="sr-only">{`Add a set to week ${planWeek}`}</span>
          <span aria-hidden="true">Set</span>
        </Button>
        {hasDifferentWorkingSets(week) && (
          <Button variant="ghost" size="xs" onClick={actions.onMatch}>
            Apply to all working sets
            <span className="sr-only">{` of week ${planWeek}`}</span>
          </Button>
        )}
      </div>
    </>
  );
}

const LINE_CONTROL = 'input:not(:disabled), button:not(:disabled)';

/** Arrow Up and Down move to the same column in the set above or below, across open weeks, from a field, the warm-up switch or Remove. */
function moveBetweenLines(event: KeyboardEvent<HTMLElement>) {
  if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') return;
  if (event.shiftKey || event.altKey || event.ctrlKey || event.metaKey) return;
  const control = event.target;
  if (!(control instanceof HTMLElement) || !control.matches('input, button')) return;
  const cell = control.closest('td');
  const line = cell?.parentElement;
  if (!cell || !line) return;
  const lines = Array.from(event.currentTarget.querySelectorAll('tbody > tr'));
  if (!lines.includes(line)) return;
  const column = Array.from(line.children).indexOf(cell);
  const step = event.key === 'ArrowUp' ? -1 : 1;
  for (let index = lines.indexOf(line) + step; index >= 0 && index < lines.length; index += step) {
    const target = lines[index].children[column]?.querySelector<HTMLElement>(LINE_CONTROL);
    if (target) {
      event.preventDefault();
      target.focus();
      return;
    }
  }
}

function frameOf({ row, exercise, schedule, onChange }: SetGridProps): Frame {
  const context = progressionContextOf(schedule, exercise);
  const weeks = resolvedWeeks(row, context);
  const hasWeight = weeks.some(week => week.sets.some(set => set.weightKg.value !== undefined));
  const showsWeight = hasWeight || !exercise || takesLoad(exercise.equipment);
  const showsWarmUps = weeks.some(week => week.sets.some(set => set.kind === 'warm-up'));
  return {
    row,
    context,
    weeks,
    firstPlanWeek: blockSpan(schedule.blocks, schedule.blockIndex).startWeek,
    blockStart: schedule.dayOne ? blockDates(schedule.blocks, schedule.blockIndex, schedule.dayOne).start : null,
    columns: showsWeight ? COLUMNS_WITH_WEIGHT : COLUMNS_WITHOUT_WEIGHT,
    showsWeight,
    showsWarmUps,
    repsName: repsUnit(exercise, 'column'),
    repsSuffix: repsSuffix(exercise),
    progresses: isProgressing(row, context),
    onChange,
  };
}

function legendOf(frame: Frame): string {
  const typed = 'Set by you.';
  if (frame.weeks.length === 1) return typed;
  const loadingWeek = firstLoadingWeek(frame.context.block);
  const weights = loadingWeek === FIRST_WEEK ? '' : ` (weights: week ${planWeekOf(frame, loadingWeek)})`;
  const warmUps = frame.weeks.some(week => week.sets.some(set => set.kind === 'warm-up' && set.weightKg.value !== undefined))
    ? ' Warm-up weights follow the heaviest set.'
    : '';
  return `${typed} Later weeks ${frame.progresses ? 'follow' : 'repeat'} week ${frame.firstPlanWeek}${weights} and keep their own changes.${warmUps}`;
}

/** The set actions of each week, each handing focus to where the coach goes on and announcing what changed. */
function useWeekSetActions(frame: Frame, weekList: RefObject<HTMLUListElement | null>) {
  const { row, onChange } = frame;
  const announce = useEditorAnnouncer();
  const focusLater = usePendingFocus();
  const inWeek = (week: number, selector: string) => () => weekList.current?.querySelector<HTMLElement>(`li[data-week="${week}"] ${selector}`);
  const lastWorkingSwitch = (week: number) => () =>
    Array.from(weekList.current?.querySelectorAll<HTMLElement>(`li[data-week="${week}"] tr[data-kind="working"]`) ?? [])
      .at(-1)
      ?.querySelector<HTMLElement>('[role="checkbox"]');

  function actionsFor(week: ResolvedWeek): WeekActions {
    const planWeek = planWeekOf(frame, week.week);
    const workingCount = workingSetsOf(week).length;
    return {
      onAddSet() {
        onChange(withSetAdded(row, week.week, frame.context));
        focusLater(lastWorkingSwitch(week.week));
        announce(`Set added to week ${planWeek}, ${counted(workingCount + 1, 'working set')}.`);
      },
      onMatch() {
        onChange(withWorkingSetsMatched(row, week.week, frame.context));
        focusLater(inWeek(week.week, 'button[data-add="set"]'));
        announce(`Week ${planWeek}: every working set now matches set 1.`);
      },
      onSwitch(switched) {
        const becomes = switched.set.kind === 'warm-up' ? 'a working set' : 'a warm-up set';
        onChange(withSetSwitched(row, { week: week.week, setId: switched.set.setId }));
        focusLater(inWeek(week.week, `tr[data-set-id="${switched.set.setId}"] [role="checkbox"]`));
        announce(`Week ${planWeek} ${setNameOf(switched)} is now ${becomes}.`);
      },
      onRemove(removed) {
        const lines = week.sets.map(set => set.setId);
        const index = lines.indexOf(removed.set.setId);
        const neighbours = [...lines.slice(index + 1), ...lines.slice(0, index).reverse()];
        onChange(withSetRemoved(row, { week: week.week, setId: removed.set.setId }));
        focusLater(() => {
          const removeButtons = neighbours.map(setId => inWeek(week.week, `tr[data-set-id="${setId}"] button[aria-label^="Remove"]`)());
          return removeButtons.find(Boolean) ?? inWeek(week.week, 'button[data-add="set"]')();
        });
        announce(`${setNameOf(removed).replace(/^./, letter => letter.toUpperCase())} removed from week ${planWeek}.`);
      },
    };
  }

  function resetWeek(week: number) {
    onChange(withWeekReset(row, week));
    focusLater(inWeek(week, 'button[data-week-toggle]'));
    announce(`Week ${planWeekOf(frame, week)} back to suggested.`);
  }

  return { actionsFor, resetWeek };
}

type WeekItemProps = { frame: Frame; week: ResolvedWeek; first: boolean; actions: WeekActions; onReset: () => void };

function WeekItem({ frame, week, first, actions, onReset }: WeekItemProps) {
  const open = useDisclosureOpen(weekValue(week.week));
  const previousOpen = useDisclosureOpen(weekValue(week.week - 1));
  return (
    <li
      data-week={week.week}
      className={cn('-mx-2 py-1', {
        'border-t border-border-subtle': !first && !open && !previousOpen,
        'my-1 rounded-field bg-surface-base ring-1 ring-border-subtle': open,
      })}
    >
      <WeekHeader frame={frame} week={week} onReset={onReset} />
      <DisclosureContent value={weekValue(week.week)}>
        <div className="grid grid-cols-[minmax(0,1fr)] gap-2 px-2 pt-2 pb-3">
          <WeekSets frame={frame} week={week} actions={actions} />
        </div>
      </DisclosureContent>
    </li>
  );
}

type SetGridProps = { row: Row; exercise: Exercise | undefined; schedule: ProgressionSchedule; exerciseName: string; onChange: (row: Row) => void };

export function SetGrid(props: SetGridProps) {
  const frame = frameOf(props);
  const weekList = useRef<HTMLUListElement>(null);
  const { actionsFor, resetWeek } = useWeekSetActions(frame, weekList);

  return (
    <div className={cn('@container grid grid-cols-[minmax(0,1fr)] gap-3', LEAD_TRACK)}>
      <TextDisclosureGroup type="multiple">
        <ul
          ref={weekList}
          role="list"
          aria-label={`Sets for ${props.exerciseName}, week by week`}
          className="grid grid-cols-[minmax(0,1fr)]"
          onKeyDown={moveBetweenLines}
        >
          {frame.weeks.map((week, index) => (
            <WeekItem key={week.week} frame={frame} week={week} first={index === 0} actions={actionsFor(week)} onReset={() => resetWeek(week.week)} />
          ))}
        </ul>
      </TextDisclosureGroup>
      <p className={CAPTION_CLASS}>
        <ChangedMark placement="inline" className="mr-1.5 align-middle" />
        {legendOf(frame)}
      </p>
    </div>
  );
}
