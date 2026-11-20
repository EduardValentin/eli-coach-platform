import type { Exercise } from '../context/TrainingContext';
import {
  copiedSessions,
  hasSameTarget,
  isSameKindOfSet,
  newId,
  rirSpan,
  SET_KIND_TARGETS,
  type Block,
  type LevelHint,
  type PlannedSet,
  type Range,
  type Row,
  type Session,
  type SetKind,
  type SetSpec,
  type SetTarget,
  type SetTargets,
  type TypedTargets,
  type WeekChanges,
  type WeekRow,
  type WeekSession,
} from './program';
import { nearestLoad, nextLoadUp, takesLoad, weightStepOf, type WeightStep } from './weightSteps';

const WEEKLY_CAPACITY_GAIN: Record<LevelHint, number> = { beginner: 0.025, intermediate: 0.01, advanced: 0.005 };
const HYPERTROPHY_RIR_FLOOR = 1;
const STRENGTH_RIR_FLOOR = 2;
const FEWEST_WEEKS_FOR_RIR_TAPER = 3;
const TIMED_STEP_SECONDS = 5;
const ADVANCED_TIMED_STEP_EVERY_WEEKS = 2;
const EPLEY_REPS_PER_UNIT = 30;
const CALIBRATION_WEEK = 1;
const FIRST_WEEK = 1;
const SET_TARGETS: readonly SetTarget[] = ['reps', 'rir', 'weightKg'];

export type ProgressionNote = 'step-too-large' | 'progress-the-variation' | 'harder-variation-or-add-load';

export type TargetSource = 'suggested' | 'typed';
export type ResolvedTarget<Value> = { value: Value; source: TargetSource };
/** One set of one week. `added` marks a set the coach added in this week rather than one that follows the first week. */
export type ResolvedSet = {
  setId: string;
  kind: SetKind;
  added: boolean;
  reps: ResolvedTarget<Range>;
  rir: ResolvedTarget<number>;
  weightKg: ResolvedTarget<number | undefined>;
  note?: ProgressionNote;
};
/** `changed` says the coach typed, added, removed or switched something in this week. */
export type ResolvedWeek = { week: number; sets: ResolvedSet[]; changed: boolean };
export type ProgressionContext = {
  block: Pick<Block, 'type' | 'weeks' | 'calibrationWeek'>;
  level: LevelHint;
  exercise?: Exercise;
};
/** Where a block sits in the plan, as the builder edits one of its rows. */
export type ProgressionSchedule = { blocks: readonly Block[]; blockIndex: number; dayOne: Date | null; level: LevelHint };
/** One set of one week, by its id. */
export type SetAt = { week: number; setId: string };

export function progressionContextOf(schedule: ProgressionSchedule, exercise: Exercise | undefined): ProgressionContext {
  return { block: schedule.blocks[schedule.blockIndex], level: schedule.level, exercise };
}

type ProgressionMode = 'held' | 'load' | 'timed' | 'bodyweight';

type ProgressionRules = {
  mode: ProgressionMode;
  level: LevelHint;
  gain: number;
  rirFloor: number;
  flatRir: boolean;
  step: WeightStep;
  weeks: number;
  calibrationWeek: boolean;
};

type WeekState = { weightKg: number | undefined; reps: number; rir: number };
type CapacityAnchor = WeekState & { index: number; capacity: number | undefined };
type RirAnchor = { index: number; rir: number };
type SuggestedWeek = WeekState & { note?: ProgressionNote; shownReps?: Range };
type Progress = { previous: SuggestedWeek; capacity: CapacityAnchor; taper: RirAnchor };

function rirFloorOf({ block }: ProgressionContext): number {
  return block.type === 'strength' ? STRENGTH_RIR_FLOOR : HYPERTROPHY_RIR_FLOOR;
}

function modeOf(row: Row, context: ProgressionContext): ProgressionMode {
  const { exercise, block } = context;
  if (row.progression.kind === 'custom' || block.type === 'deload') return 'held';
  const measure = exercise?.measuredIn ?? 'reps';
  if (measure === 'time') return 'timed';
  if (measure !== 'reps') return 'held';
  return exercise && !takesLoad(exercise.equipment) ? 'bodyweight' : 'load';
}

/** A row whose later weeks are suggested from its first week rather than repeating it. */
export function isProgressing(row: Row, context: ProgressionContext): boolean {
  return modeOf(row, context) !== 'held';
}

/** The calibration week has no weight: the client finds it by RIR. */
export function isCalibrationWeek(block: Pick<Block, 'calibrationWeek'>, week: number): boolean {
  return block.calibrationWeek && week === CALIBRATION_WEEK;
}

/** The week whose weight the block's progression starts from: the one after the calibration week when there is one. */
export function firstLoadingWeek(block: Pick<Block, 'calibrationWeek'>): number {
  return block.calibrationWeek ? CALIBRATION_WEEK + 1 : FIRST_WEEK;
}

function progressionWeeks({ weeks, calibrationWeek }: Pick<Block, 'weeks' | 'calibrationWeek'>): number {
  return calibrationWeek ? Math.max(1, weeks - 1) : weeks;
}

function rulesOf(row: Row, context: ProgressionContext): ProgressionRules {
  const { block, level, exercise } = context;
  const weeks = progressionWeeks(block);
  const mode = modeOf(row, context);
  return {
    mode,
    level,
    gain: WEEKLY_CAPACITY_GAIN[level],
    rirFloor: rirFloorOf(context),
    flatRir: mode === 'timed' || level === 'beginner' || block.type === 'foundation' || weeks < FEWEST_WEEKS_FOR_RIR_TAPER,
    step: weightStepOf(exercise),
    weeks,
    calibrationWeek: block.calibrationWeek,
  };
}

function progressionIndexOf(rules: ProgressionRules, week: number): number {
  return rules.calibrationWeek ? week - 1 : week;
}

function epleyCapacity({ weightKg, reps, rir }: WeekState): number | undefined {
  if (weightKg === undefined || weightKg <= 0) return undefined;
  return weightKg * (1 + (reps + rir) / EPLEY_REPS_PER_UNIT);
}

function anchorAt(index: number, state: WeekState): CapacityAnchor {
  return { weightKg: state.weightKg, reps: state.reps, rir: state.rir, index, capacity: epleyCapacity(state) };
}

function taperedRir(rules: ProgressionRules, taper: RirAnchor, index: number): number {
  const { rir } = taper;
  if (rules.flatRir || rir <= rules.rirFloor || taper.index >= rules.weeks) return rir;
  return rir - Math.floor(((index - taper.index) * (rir - rules.rirFloor)) / (rules.weeks - taper.index));
}

function capacityAt(rules: ProgressionRules, anchor: CapacityAnchor, index: number): number | undefined {
  if (anchor.capacity === undefined) return undefined;
  return anchor.capacity * (1 + rules.gain * (index - anchor.index));
}

function repsAtLoad(capacity: number, weightKg: number, rir: number): number {
  return Math.round(EPLEY_REPS_PER_UNIT * (capacity / weightKg - 1)) - rir;
}

function repsWithoutLoad(rules: ProgressionRules, anchor: CapacityAnchor, index: number, rir: number): number {
  const growth = Math.round(rules.gain * (index - anchor.index) * (EPLEY_REPS_PER_UNIT + anchor.reps + anchor.rir));
  return anchor.reps + growth + (anchor.rir - rir);
}

function clamp(value: number, { min, max }: Range): number {
  return Math.min(max, Math.max(min, value));
}

type WeekInput = { range: Range; progress: Progress; index: number; rir: number };

function steppedLoad(rules: ProgressionRules, input: WeekInput, capacity: number): SuggestedWeek {
  const { range, progress, rir } = input;
  const weightKg = progress.previous.weightKg as number;
  const reps = repsAtLoad(capacity, weightKg, rir);
  if (reps <= range.max) return { weightKg, rir, reps: clamp(Math.max(reps, progress.previous.reps), range) };
  let heavier = nextLoadUp(weightKg, rules.step);
  while (repsAtLoad(capacity, heavier, rir) > range.max) heavier = nextLoadUp(heavier, rules.step);
  const repsAtHeavier = repsAtLoad(capacity, heavier, rir);
  if (repsAtHeavier >= range.min) return { weightKg: heavier, rir, reps: repsAtHeavier };
  return { weightKg, rir, reps: range.max, note: 'step-too-large' };
}

function cappedReps(range: Range, reps: number, note: ProgressionNote | undefined): Pick<SuggestedWeek, 'reps' | 'note'> {
  if (reps <= range.max) return { reps: clamp(reps, range) };
  return { reps: range.max, ...(note ? { note } : {}) };
}

function timedSeconds(rules: ProgressionRules, input: WeekInput): number {
  const weeksSince = input.index - input.progress.capacity.index;
  const steps = rules.level === 'advanced' ? Math.floor(weeksSince / ADVANCED_TIMED_STEP_EVERY_WEEKS) : weeksSince;
  return input.progress.capacity.reps + steps * TIMED_STEP_SECONDS;
}

function suggestedWeek(rules: ProgressionRules, input: WeekInput): SuggestedWeek {
  const { range, progress, index, rir } = input;
  const { previous, capacity: anchor } = progress;
  const held = { weightKg: previous.weightKg, rir };
  if (rules.mode === 'timed') return { ...held, ...cappedReps(range, timedSeconds(rules, input), 'progress-the-variation') };
  const unloadedReps = Math.max(repsWithoutLoad(rules, anchor, index, rir), previous.reps);
  if (rules.mode === 'bodyweight') return { ...held, ...cappedReps(range, unloadedReps, 'harder-variation-or-add-load') };
  const capacity = capacityAt(rules, anchor, index);
  if (capacity === undefined || previous.weightKg === undefined) return { ...held, ...cappedReps(range, unloadedReps, undefined) };
  return steppedLoad(rules, input, capacity);
}

function changesAt(row: Row, week: number): WeekChanges {
  return row.weekChanges?.[week] ?? {};
}

function typedAt(row: Row, { week, setId }: SetAt): TypedTargets {
  return changesAt(row, week).typed?.[setId] ?? {};
}

function weightOf(weightKg: number | undefined): Pick<SetTargets, 'weightKg'> {
  return weightKg === undefined ? {} : { weightKg };
}

function withTyped(start: SetTargets, typed: TypedTargets): SetTargets {
  return { reps: { ...(typed.reps ?? start.reps) }, rir: typed.rir ?? start.rir, ...weightOf(typed.weightKg ?? start.weightKg) };
}

function otherKind(kind: SetKind): SetKind {
  return kind === 'warm-up' ? 'working' : 'warm-up';
}

/** Warm-up sets before working sets; a switched set closes the warm-up sets or opens the working sets. */
function setsAfter(sets: readonly PlannedSet[], changes: WeekChanges): PlannedSet[] {
  const removed = new Set(changes.removed ?? []);
  const switched = changes.switched ?? [];
  const kept = [...sets, ...(changes.added ?? [])]
    .filter(set => !removed.has(set.id))
    .map(set => (switched.includes(set.id) ? { ...set, kind: otherKind(set.kind) } : set));
  const order = (set: PlannedSet) => switched.indexOf(set.id);
  const ofKind = (kind: SetKind) => kept.filter(set => set.kind === kind);
  const warmUps = ofKind('warm-up');
  const working = ofKind('working');
  return [
    ...warmUps.filter(set => order(set) < 0),
    ...warmUps.filter(set => order(set) >= 0).sort((left, right) => order(left) - order(right)),
    ...working.filter(set => order(set) >= 0).sort((left, right) => order(right) - order(left)),
    ...working.filter(set => order(set) < 0),
  ];
}

function firstWeekPlannedSets(row: Row): PlannedSet[] {
  return setsAfter(row.startSets, changesAt(row, FIRST_WEEK));
}

function plannedSetsAt(row: Row, week: number): PlannedSet[] {
  const first = firstWeekPlannedSets(row);
  return week === FIRST_WEEK ? first : setsAfter(first, changesAt(row, week));
}

/** A set's first-week targets with what the coach typed for it in that week. */
function firstWeekTargets(row: Row, set: PlannedSet): SetTargets {
  return withTyped(set.start, typedAt(row, { week: FIRST_WEEK, setId: set.id }));
}

/** The first week's sets with what the coach typed in it, as later blocks and the Deload start from them. */
export function firstWeekSets(row: Row): PlannedSet[] {
  return firstWeekPlannedSets(row).map(set => ({ ...set, start: firstWeekTargets(row, set) }));
}

type SetChain = { range: Range; weeks: SuggestedWeek[] };
type ChainCursor = { week: number; range: Range; opening: SuggestedWeek; progress: Progress | undefined };
type ChainStep = { suggested: SuggestedWeek; progress: Progress | undefined };

/** One week of a chain: the calibration week without weight, the first loading week as the chain opens, then each week suggested from the one before. */
function nextChainWeek(rules: ProgressionRules, { week, range, opening, progress }: ChainCursor): ChainStep {
  const index = progressionIndexOf(rules, week);
  if (isCalibrationWeek(rules, week)) return { suggested: { ...opening, weightKg: undefined }, progress };
  if (!progress) return { suggested: opening, progress: { previous: opening, capacity: anchorAt(index, opening), taper: { index, rir: opening.rir } } };
  if (rules.mode === 'held') return { suggested: { ...progress.previous }, progress };
  const suggested = suggestedWeek(rules, { range, progress, index, rir: taperedRir(rules, progress.taper, index) });
  return { suggested, progress: { ...progress, previous: suggested } };
}

/** A working set of the first week, suggested week by week from what its chain starts from. */
function chainOf(rules: ProgressionRules, row: Row, { set, blockWeeks }: { set: PlannedSet; blockWeeks: number }): SetChain {
  const start = chainStartOf(rules, row, set);
  const range = start.reps;
  const opening: SuggestedWeek = { reps: range.min, rir: start.rir, weightKg: start.weightKg, shownReps: range };
  const weeks: SuggestedWeek[] = [];
  let progress: Progress | undefined;
  for (let week = FIRST_WEEK; week <= blockWeeks; week += 1) {
    const step = nextChainWeek(rules, { week, range, opening, progress });
    weeks.push(step.suggested);
    progress = step.progress;
  }
  return { range, weeks };
}

/** A working set's RIR week by week: its own first-week RIR, tapered from the first loading week as its chain would. */
function rirWeeks(rules: ProgressionRules, rir: number, blockWeeks: number): number[] {
  const weeks = Array.from({ length: blockWeeks }, (_, offset) => FIRST_WEEK + offset);
  const anchorWeek = Math.min(firstLoadingWeek(rules), blockWeeks);
  const taper = { index: progressionIndexOf(rules, anchorWeek), rir };
  return weeks.map(week => (week <= anchorWeek || rules.mode === 'held' ? rir : taperedRir(rules, taper, progressionIndexOf(rules, week))));
}

/** What a working set's chain starts from: its first week as typed, with the weight a calibration block takes from its second week. */
function chainStartOf(rules: ProgressionRules, row: Row, set: PlannedSet): SetTargets {
  const first = firstWeekTargets(row, set);
  const loadingWeek = firstLoadingWeek(rules);
  if (loadingWeek === FIRST_WEEK) return first;
  return { ...first, ...weightOf(typedAt(row, { week: loadingWeek, setId: set.id }).weightKg ?? set.start.weightKg) };
}

/** The first week's working sets of one kind, the first of them leading the group's reps and weight. */
function setGroupsOf(rules: ProgressionRules, row: Row, working: readonly PlannedSet[]): PlannedSet[][] {
  return working.reduce<PlannedSet[][]>((groups, set) => {
    const start = chainStartOf(rules, row, set);
    const group = groups.find(([leader]) => isSameKindOfSet(chainStartOf(rules, row, leader), start));
    if (!group) return [...groups, [set]];
    group.push(set);
    return groups;
  }, []);
}

type RowProgression = { row: Row; rules: ProgressionRules; firstWeek: PlannedSet[]; chains: ReadonlyMap<string, SetChain>; referenceWeek: number };

/** Sets of one kind share their leader's reps and weight every week, so only RIR tells them apart; each set's RIR tapers on its own. */
function groupChains(rules: ProgressionRules, row: Row, { group, blockWeeks }: { group: readonly PlannedSet[]; blockWeeks: number }): [string, SetChain][] {
  const [leader, ...followers] = group;
  const chain = chainOf(rules, row, { set: leader, blockWeeks });
  return [
    [leader.id, chain],
    ...followers.map((set): [string, SetChain] => {
      const rirs = rirWeeks(rules, chainStartOf(rules, row, set).rir, blockWeeks);
      return [set.id, { range: chain.range, weeks: chain.weeks.map((state, index) => ({ ...state, rir: rirs[index] })) }];
    }),
  ];
}

function rowProgressionOf(row: Row, context: ProgressionContext): RowProgression {
  const rules = rulesOf(row, context);
  const blockWeeks = Math.max(1, context.block.weeks);
  const firstWeek = firstWeekPlannedSets(row);
  const groups = setGroupsOf(rules, row, firstWeek.filter(set => set.kind === 'working'));
  const chains = new Map(groups.flatMap(group => groupChains(rules, row, { group, blockWeeks })));
  return { row, rules, firstWeek, chains, referenceWeek: Math.min(firstLoadingWeek(rules), blockWeeks) };
}

type Suggestion = { targets: SetTargets; note?: ProgressionNote };

function chainSuggestion({ range, weeks }: SetChain, week: number): Suggestion {
  const state = weeks[week - 1];
  const reps = state.shownReps ?? { min: state.reps, max: Math.max(state.reps, range.max) };
  return { targets: { reps: { ...reps }, rir: state.rir, ...weightOf(state.weightKg) }, ...(state.note ? { note: state.note } : {}) };
}

/** One planned set as it reads in one week. */
type SetInWeek = { set: PlannedSet; week: number };

function followsWarmUp(progression: RowProgression, set: PlannedSet): boolean {
  return progression.firstWeek.some(first => first.id === set.id) && !progression.chains.has(set.id);
}

/** What a set reads before the coach types in this week: its own start when added here, its chain when a working set of week 1. */
function directSuggestion(progression: RowProgression, { set, week }: SetInWeek): Suggestion {
  const chain = progression.chains.get(set.id);
  if (chain) return chainSuggestion(chain, week);
  return { targets: structuredClone(set.start) };
}

function typedInWeek(progression: RowProgression, { set, week }: SetInWeek): TypedTargets {
  const typed = typedAt(progression.row, { week, setId: set.id });
  if (!isCalibrationWeek(progression.rules, week)) return typed;
  const { weightKg: _none, ...rest } = typed;
  return rest;
}

/** The heaviest working weight of a week, from the sets that do not themselves follow it. */
function heaviestLoad(progression: RowProgression, week: number): number | undefined {
  if (isCalibrationWeek(progression.rules, week)) return undefined;
  const loads = plannedSetsAt(progression.row, week)
    .filter(set => set.kind === 'working' && !followsWarmUp(progression, set))
    .flatMap(set => {
      const inWeek = { set, week };
      const weightKg = typedInWeek(progression, inWeek).weightKg ?? directSuggestion(progression, inWeek).targets.weightKg;
      return weightKg === undefined ? [] : [weightKg];
    });
  return loads.length === 0 ? undefined : Math.max(...loads);
}

function warmUpSuggestion(progression: RowProgression, { set, week }: SetInWeek): Suggestion {
  const first = firstWeekTargets(progression.row, set);
  if (isCalibrationWeek(progression.rules, week)) return { targets: { reps: first.reps, rir: first.rir } };
  const load = heaviestLoad(progression, week);
  const reference = heaviestLoad(progression, progression.referenceWeek);
  if (first.weightKg === undefined || load === undefined || reference === undefined || reference <= 0 || load === reference) return { targets: first };
  return { targets: { ...first, weightKg: nearestLoad((first.weightKg * load) / reference, progression.rules.step) } };
}

function resolvedSetOf(progression: RowProgression, inWeek: SetInWeek): ResolvedSet {
  const { set, week } = inWeek;
  const typed = typedInWeek(progression, inWeek);
  const { targets, note } = followsWarmUp(progression, set) ? warmUpSuggestion(progression, inWeek) : directSuggestion(progression, inWeek);
  const sourceOf = (target: SetTarget): TargetSource => (typed[target] === undefined ? 'suggested' : 'typed');
  const kept = note && typed.reps === undefined && typed.weightKg === undefined && set.kind === 'working' ? { note } : {};
  const added = week === FIRST_WEEK ? !progression.row.startSets.some(start => start.id === set.id) : !progression.firstWeek.some(first => first.id === set.id);
  return {
    setId: set.id,
    kind: set.kind,
    added,
    reps: { value: { ...(typed.reps ?? targets.reps) }, source: sourceOf('reps') },
    rir: { value: typed.rir ?? targets.rir, source: sourceOf('rir') },
    weightKg: { value: typed.weightKg ?? targets.weightKg, source: sourceOf('weightKg') },
    ...kept,
  };
}

function resolvedWeekOf(progression: RowProgression, week: number): ResolvedWeek {
  const sets = plannedSetsAt(progression.row, week).map(set => resolvedSetOf(progression, { set, week }));
  return { week, sets, changed: progression.row.weekChanges?.[week] !== undefined };
}

export function resolvedWeeks(row: Row, context: ProgressionContext): ResolvedWeek[] {
  const progression = rowProgressionOf(row, context);
  return Array.from({ length: Math.max(1, context.block.weeks) }, (_, index) => resolvedWeekOf(progression, index + 1));
}

export function resolvedWeek(row: Row, week: number, context: ProgressionContext): ResolvedWeek {
  const weeks = Math.max(1, context.block.weeks);
  return resolvedWeekOf(rowProgressionOf(row, context), Math.min(Math.max(week, 1), weeks));
}

export function workingSetsOf(week: ResolvedWeek): ResolvedSet[] {
  return week.sets.filter(set => set.kind === 'working');
}

export function targetsOf(set: ResolvedSet): SetTargets {
  return { reps: { ...set.reps.value }, rir: set.rir.value, ...weightOf(set.weightKg.value) };
}

export function hasDifferentWorkingSets(week: ResolvedWeek): boolean {
  const [first, ...others] = workingSetsOf(week).map(targetsOf);
  return others.some(other => !isSameKindOfSet(first, other));
}

function setSpecOf(set: ResolvedSet): SetSpec {
  const weight = weightOf(set.weightKg.value);
  if (set.kind === 'warm-up') return { kind: 'warm-up', reps: { ...set.reps.value }, ...weight };
  return { kind: 'working', reps: { ...set.reps.value }, rir: set.rir.value, ...weight };
}

/** Neighbouring working sets of the same kind; their RIR may step down from set to set. */
export type SetRun = { count: number; set: ResolvedSet; rir: Range };

/**
 * A week's working sets as runs of neighbouring sets of one kind, in the order the client performs them, so a top set
 * between two runs reads in its place. The progression instead groups sets of one kind wherever they sit, as they share a chain.
 */
export function workingSetRuns(week: ResolvedWeek): SetRun[] {
  const runs = workingSetsOf(week).reduce<ResolvedSet[][]>((groups, set) => {
    const last = groups.at(-1);
    if (last && isSameKindOfSet(targetsOf(last[0]), targetsOf(set))) return [...groups.slice(0, -1), [...last, set]];
    return [...groups, [set]];
  }, []);
  return runs.map(run => ({ count: run.length, set: run[0], rir: rirSpan(run.map(set => set.rir.value)) }));
}

function setsOfWeek(week: ResolvedWeek): SetSpec[] {
  return week.sets.map(setSpecOf);
}

export function rowAtWeek(row: Row, week: number, context: ProgressionContext): WeekRow {
  const { startSets: _start, weekChanges: _changes, ...rest } = row;
  return { ...rest, sets: setsOfWeek(resolvedWeek(row, week, context)) };
}

export type SessionWeekPlace = { block: ProgressionContext['block']; level: LevelHint; exercisesById: ReadonlyMap<string, Exercise> };

export function sessionAtWeek(session: Session, week: number, place: SessionWeekPlace): WeekSession {
  const rows = session.rows.map(row => rowAtWeek(row, week, { block: place.block, level: place.level, exercise: place.exercisesById.get(row.exerciseId) }));
  return { ...session, rows };
}

function withoutEmptyTargets(typed: TypedTargets): TypedTargets {
  return Object.fromEntries(Object.entries(typed).filter(([, value]) => value !== undefined));
}

function compacted(changes: WeekChanges): WeekChanges | undefined {
  const typed = Object.entries(changes.typed ?? {}).filter(([, targets]) => targets && Object.keys(targets).length > 0);
  const lists = (['added', 'removed', 'switched'] as const).filter(key => (changes[key]?.length ?? 0) > 0);
  const kept: WeekChanges = {
    ...(typed.length > 0 ? { typed: Object.fromEntries(typed) } : {}),
    ...Object.fromEntries(lists.map(key => [key, changes[key]])),
  };
  return Object.keys(kept).length === 0 ? undefined : kept;
}

function withWeekChanges(row: Row, week: number, changes: WeekChanges | undefined): Row {
  const { [week]: _previous, ...others } = row.weekChanges ?? {};
  const kept = changes && compacted(changes);
  const weekChanges = kept ? { ...others, [week]: kept } : others;
  const { weekChanges: _dropped, ...rest } = row;
  return Object.keys(weekChanges).length === 0 ? rest : { ...rest, weekChanges };
}

function changedWeek(row: Row, week: number, change: (changes: WeekChanges) => WeekChanges): Row {
  return withWeekChanges(row, week, change(changesAt(row, week)));
}

function withTypedSet(changes: WeekChanges, setId: string, typed: TypedTargets): WeekChanges {
  return { ...changes, typed: { ...changes.typed, [setId]: withoutEmptyTargets(typed) } };
}

/** Later weeks forget what they changed on sets the first week no longer has. */
export function withLaterWeeksPruned(row: Row): Row {
  const firstIds = new Set(firstWeekPlannedSets(row).map(set => set.id));
  return Object.keys(row.weekChanges ?? {})
    .map(Number)
    .filter(week => week !== FIRST_WEEK)
    .reduce((next, week) => {
      const changes = changesAt(next, week);
      const known = new Set([...firstIds, ...(changes.added ?? []).map(set => set.id)]);
      return withWeekChanges(next, week, {
        ...changes,
        typed: Object.fromEntries(Object.entries(changes.typed ?? {}).filter(([setId]) => known.has(setId))),
        removed: changes.removed?.filter(setId => firstIds.has(setId)),
        switched: changes.switched?.filter(setId => known.has(setId)),
      });
    }, row);
}

export function withTypedTargets(row: Row, at: SetAt, typed: TypedTargets): Row {
  return changedWeek(row, at.week, changes => withTypedSet(changes, at.setId, { ...changes.typed?.[at.setId], ...typed }));
}

export function withoutTypedTarget(row: Row, at: SetAt, target: SetTarget): Row {
  return changedWeek(row, at.week, changes => {
    const { [target]: _cleared, ...rest } = changes.typed?.[at.setId] ?? {};
    return withTypedSet(changes, at.setId, rest);
  });
}

function typedCopy(set: ResolvedSet): TypedTargets {
  return Object.fromEntries(SET_TARGETS.filter(target => set[target].source === 'typed').map(target => [target, set[target].value]));
}

/** A new working set copies the week's last working set, so three equal sets are one filled in and two added. */
export function withSetAdded(row: Row, week: number, context: ProgressionContext): Row {
  const source = workingSetsOf(resolvedWeek(row, week, context)).at(-1);
  if (!source) return row;
  const added = { id: newId(), kind: 'working' as const, start: targetsOf(source) };
  return changedWeek(row, week, changes => withTypedSet({ ...changes, added: [...(changes.added ?? []), added] }, added.id, typedCopy(source)));
}

/** The week's only working set stays: a week always has one. */
export function isOnlyWorkingSet(row: Row, { week, setId }: SetAt): boolean {
  const working = plannedSetsAt(row, week).filter(set => set.kind === 'working');
  return working.length === 1 && working[0].id === setId;
}

function prunedAfterEditIn(row: Row, week: number): Row {
  return week === FIRST_WEEK ? withLaterWeeksPruned(row) : row;
}

export function withSetRemoved(row: Row, at: SetAt): Row {
  if (isOnlyWorkingSet(row, at)) return row;
  const { week, setId } = at;
  const removed = changedWeek(row, week, changes => {
    const { [setId]: _typed, ...typed } = changes.typed ?? {};
    const wasAdded = changes.added?.some(set => set.id === setId) ?? false;
    return {
      ...changes,
      typed,
      added: changes.added?.filter(set => set.id !== setId),
      switched: changes.switched?.filter(id => id !== setId),
      removed: wasAdded ? changes.removed : [...(changes.removed ?? []), setId],
    };
  });
  return prunedAfterEditIn(removed, week);
}

export function withSetSwitched(row: Row, at: SetAt): Row {
  if (isOnlyWorkingSet(row, at)) return row;
  return changedWeek(row, at.week, changes => {
    const switched = changes.switched ?? [];
    return { ...changes, switched: switched.includes(at.setId) ? switched.filter(id => id !== at.setId) : [...switched, at.setId] };
  });
}

/** Every working set of the week takes the first one's reps and weight; each keeps its own RIR. */
export function withWorkingSetsMatched(row: Row, week: number, context: ProgressionContext): Row {
  const [first, ...others] = workingSetsOf(resolvedWeek(row, week, context));
  if (!first) return row;
  const model = targetsOf(first);
  return others.reduce((next, other) => {
    const differing = SET_KIND_TARGETS.filter(target => model[target] !== undefined && !hasSameTarget(target, model, targetsOf(other)));
    const typed: TypedTargets = Object.fromEntries(differing.map(target => [target, structuredClone(model[target])]));
    return differing.length === 0 ? next : withTypedTargets(next, { week, setId: other.setId }, typed);
  }, row);
}

export function withWeekReset(row: Row, week: number): Row {
  return prunedAfterEditIn(withWeekChanges(row, week, undefined), week);
}

export function withoutWeekChanges(row: Row): Row {
  const { weekChanges: _changes, ...rest } = row;
  return rest;
}

function rowFromFirstWeek(row: Row): Row {
  const first = row.weekChanges?.[FIRST_WEEK];
  return { ...withoutWeekChanges(row), ...(first ? { weekChanges: { [FIRST_WEEK]: structuredClone(first) } } : {}) };
}

/** A block built from another block's sessions copies them from their first week: what the coach did in later weeks stays behind. */
export function sessionsCopiedFromFirstWeek(sessions: readonly Session[]): Session[] {
  return copiedSessions(sessions).map(session => ({ ...session, rows: session.rows.map(rowFromFirstWeek) }));
}
