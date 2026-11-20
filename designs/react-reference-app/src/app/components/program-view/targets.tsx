import { Fragment, type ReactNode } from 'react';
import { formatRange, formatRest, LAST_SET_TECHNIQUE_LABELS, rirSpan, setsBreakdown, type Row, type WeekRow } from '../../domain/program';
import { firstLoadingWeek, hasDifferentWorkingSets, resolvedWeeks, workingSetsOf, type ProgressionContext, type ResolvedWeek } from '../../domain/programProgression';
import { counted } from '../../utils/counted';
import { repsUnit, weekRunsText } from './programView';
import { RirValue } from './RirValue';

export type Target = { term: string; value: ReactNode };

export type RowPlace = 'alone' | 'in-superset';

export const TARGET_TERMS = { warmUp: 'Warm-up', working: 'Working', rir: 'RIR', weight: 'Weight', progression: 'Progression' } as const;

const NO_SETS: Target = { term: 'Sets', value: 'None yet' };

function restOf(row: WeekRow): Target {
  return { term: 'Rest', value: formatRest(row.restSeconds) };
}

/** "4 sets × 6–10 s", breaking only around the ×, so a unit never ends up alone on a line. */
export function workingValue(count: number, reps: string): ReactNode {
  return (
    <span>
      <span className="whitespace-nowrap">{counted(count, 'set')}</span> × <span className="whitespace-nowrap">{reps}</span>
    </span>
  );
}

export function WeightValue({ weightKg }: { weightKg: number }) {
  return (
    <span className="whitespace-nowrap">
      {weightKg} <span className="font-normal text-text-secondary">kg</span>
    </span>
  );
}

export function rowTargets(row: WeekRow, repsSuffix: string): Target[] {
  const { warmUp, working, reps, rir } = setsBreakdown(row.sets, repsSuffix);
  if (warmUp + working === 0) return [NO_SETS];
  return [
    ...(warmUp > 0 ? [{ term: TARGET_TERMS.warmUp, value: counted(warmUp, 'set') }] : []),
    ...(working > 0 ? [{ term: TARGET_TERMS.working, value: reps ? workingValue(working, reps) : `${counted(working, 'set')}, varied` }] : []),
    ...(rir ? [{ term: TARGET_TERMS.rir, value: <RirValue rir={rir} /> }] : []),
    restOf(row),
  ];
}

export function rowRestAndTechnique(row: WeekRow, place: RowPlace): Target[] {
  if (row.sets.length === 0) return [NO_SETS];
  return [
    ...(place === 'in-superset' ? [] : [restOf(row)]),
    ...(row.tempo ? [{ term: 'Tempo', value: row.tempo }] : []),
    ...(row.lastSetTechnique === 'none' ? [] : [{ term: 'Last set', value: LAST_SET_TECHNIQUE_LABELS[row.lastSetTechnique] }]),
  ];
}

type Change = { from: string; to: string };

function goesBothWays(values: readonly number[]): boolean {
  const steps = values.slice(1).map((value, index) => Math.sign(value - values[index]));
  return steps.includes(1) && steps.includes(-1);
}

function countChange(counts: readonly number[]): Change[] {
  const [from] = counts;
  const to = counts[counts.length - 1];
  return from === to ? [] : [{ from: String(from), to: `${to} sets` }];
}

function weekRir(week: ResolvedWeek): string {
  return formatRange(rirSpan(workingSetsOf(week).map(set => set.rir.value)));
}

/** Between two weeks whose working sets are each one kind of set, so the first set speaks for the weight and reps and the RIR spans every set. */
function targetChanges(startWeek: ResolvedWeek, lastWeek: ResolvedWeek, context: ProgressionContext): Change[] {
  const [start] = workingSetsOf(startWeek);
  const [last] = workingSetsOf(lastWeek);
  const from = start.weightKg.value;
  const to = last.weightKg.value;
  const weight = from !== undefined && to !== undefined && from !== to ? [{ from: String(from), to: `${to} kg` }] : [];
  const rir = weekRir(startWeek) === weekRir(lastWeek) ? [] : [{ from: `RIR ${weekRir(startWeek)}`, to: weekRir(lastWeek) }];
  if (weight.length + rir.length > 0) return [...weight, ...rir];
  return start.reps.value.min === last.reps.value.min ? [] : [{ from: String(start.reps.value.min), to: `${last.reps.value.min} ${repsUnit(context.exercise, 'spelled')}` }];
}

function changeValue(changes: readonly Change[], notes: readonly string[] = []): ReactNode {
  const visual = [...changes.map(({ from, to }) => `${from} → ${to}`), ...notes];
  return (
    <>
      <span aria-hidden="true">
        {visual.map((text, index) => (
          <Fragment key={text}>
            {index > 0 && ' · '}
            <span className="whitespace-nowrap">{text}</span>
          </Fragment>
        ))}
      </span>
      <span className="sr-only">{[...changes.map(({ from, to }) => `${from} to ${to}`), ...notes].join(', ')}</span>
    </>
  );
}

function differingWeeksNote(planWeeks: readonly number[]): string {
  return `${planWeeks.length === 1 ? 'week' : 'weeks'} ${weekRunsText(planWeeks)} ${planWeeks.length === 1 ? 'differs' : 'differ'}`;
}

function weeksValue(weeks: readonly ResolvedWeek[], context: ProgressionContext, firstPlanWeek: number): ReactNode | null {
  const counts = weeks.map(week => workingSetsOf(week).length);
  if (!weeks.some(hasDifferentWorkingSets) && !goesBothWays(counts)) {
    const changes = [...countChange(counts), ...targetChanges(weeks[0], weeks[weeks.length - 1], context)];
    return changes.length === 0 ? null : changeValue(changes);
  }
  const isUniform = (week: ResolvedWeek) => !hasDifferentWorkingSets(week) && workingSetsOf(week).length === counts[0];
  const uniform = weeks.filter(isUniform);
  const differing = weeks.flatMap((week, index) => (isUniform(week) ? [] : [firstPlanWeek + index]));
  if (uniform.length === 0) return 'every week differs';
  const changes = uniform.length >= 2 ? targetChanges(uniform[0], uniform[uniform.length - 1], context) : [];
  return changeValue(changes, [differingWeeksNote(differing)]);
}

/** How the row's targets move across the block's weeks, read from its first loading week (the calibration week has no weight). */
export function weekRangeTargets(row: Row, context: ProgressionContext, firstPlanWeek: number): Target[] {
  const { block } = context;
  const startIndex = firstLoadingWeek(block) - 1;
  if (block.weeks - startIndex < 2) return [];
  const value = weeksValue(resolvedWeeks(row, context).slice(startIndex), context, firstPlanWeek + startIndex);
  if (value === null) return [];
  return [{ term: TARGET_TERMS.progression, value }];
}
