import type { Exercise } from '../context/TrainingContext';
import type { ExerciseRole } from './exercises';
import {
  plannedSet,
  plannedSets,
  roleForSlot,
  type Block,
  type BlockType,
  type CardioSession,
  type LevelHint,
  type PlannedSet,
  type Range,
  type Row,
  type Session,
  type SetTargets,
  type Slot,
  type WorkingTargets,
  workingStarts,
} from './program';
import { cardioPreset } from './programCardio';
import { firstWeekSets, resolvedWeek, targetsOf, withLaterWeeksPruned, withoutWeekChanges, type ResolvedWeek } from './programProgression';
import { PLATE_STEP, reachableLoadDown, weightStepOf, type WeightStep } from './weightSteps';

export type RowDefaults = { start: WorkingTargets; restSeconds: number };

export const STEPS_DEFAULT = 6000;
const STEPS_STEP = 1000;
const STEPS_MIN = 4000;
const STEPS_MAX = 12000;
export const DAILY_STEP_TARGETS: readonly number[] = Array.from(
  { length: (STEPS_MAX - STEPS_MIN) / STEPS_STEP + 1 },
  (_, index) => STEPS_MIN + index * STEPS_STEP,
);
export const TARGET_MINUTES = [30, 45, 60] as const;

const FOUNDATION: RowDefaults = { start: { count: 3, reps: { min: 12, max: 15 }, rir: 3 }, restSeconds: 75 };
const LOADING_RIR = { rir: 3, lastSetRir: 2 } as const;
const SECONDARY: RowDefaults = { start: { count: 3, reps: { min: 8, max: 12 }, ...LOADING_RIR }, restSeconds: 105 };
const ISOLATION: RowDefaults = { start: { count: 3, reps: { min: 10, max: 20 }, ...LOADING_RIR }, restSeconds: 75 };
const HYPERTROPHY_MAIN: RowDefaults = { start: { count: 4, reps: { min: 6, max: 10 }, ...LOADING_RIR }, restSeconds: 150 };
const STRENGTH_MAIN: RowDefaults = { start: { count: 4, reps: { min: 3, max: 6 }, ...LOADING_RIR }, restSeconds: 150 };

const DELOAD_RIR = 4;
const MAIN_COMPOUND_WARM_UP_REPS: readonly Range[] = [
  { min: 8, max: 8 },
  { min: 5, max: 5 },
];
const DELOAD_WEIGHT_FACTOR = 0.9;
const DELOAD_LARGEST_CUT = 0.2;

function loadedDefaults(type: Exclude<BlockType, 'deload'>, role: ExerciseRole): RowDefaults {
  if (type === 'foundation') return FOUNDATION;
  if (role === 'isolation') return ISOLATION;
  if (role === 'secondary-compound') return SECONDARY;
  return type === 'strength' ? STRENGTH_MAIN : HYPERTROPHY_MAIN;
}

function deloadWeight(weightKg: number, step: WeightStep): number {
  const lighter = reachableLoadDown(weightKg * DELOAD_WEIGHT_FACTOR, step);
  return lighter < weightKg * (1 - DELOAD_LARGEST_CUT) ? weightKg : lighter;
}

function deloadedSet({ reps, weightKg }: SetTargets, step: WeightStep): SetTargets {
  return { reps: { ...reps }, rir: DELOAD_RIR, ...(weightKg === undefined ? {} : { weightKg: deloadWeight(weightKg, step) }) };
}

function halved(count: number): number {
  return Math.max(1, Math.ceil(count / 2));
}

export function rowDefaults(type: BlockType, role: ExerciseRole): RowDefaults {
  if (type !== 'deload') return structuredClone(loadedDefaults(type, role));
  const loaded = loadedDefaults('hypertrophy', role);
  const { count, reps } = loaded.start;
  return { start: { count: halved(count), ...deloadedSet({ reps, rir: DELOAD_RIR }, PLATE_STEP) }, restSeconds: loaded.restSeconds };
}

function warmUpsFor(slot: Slot, rir: number): SetTargets[] {
  if (roleForSlot(slot) !== 'main-compound') return [];
  return MAIN_COMPOUND_WARM_UP_REPS.map(reps => ({ reps: { ...reps }, rir }));
}

/** The block's first week for a new row: the warm-up sets its slot calls for, then the default working sets. */
export function defaultSets(type: BlockType, slot: Slot): PlannedSet[] {
  const { start } = rowDefaults(type, roleForSlot(slot));
  return plannedSets(warmUpsFor(slot, start.rir), start);
}

function workingStartsAt(sets: readonly PlannedSet[], defaults: WorkingTargets): PlannedSet[] {
  const working = sets.filter(set => set.kind === 'working');
  const weightKg = working[0]?.start.weightKg;
  const starts = workingStarts({ ...defaults, ...(weightKg === undefined ? {} : { weightKg }) });
  return starts.map((start, index) => (working[index] ? { ...working[index], start } : plannedSet('working', start)));
}

/** The block's defaults replace what the working sets start from; the warm-up sets and what the coach typed stay. */
export function defaultedRow(row: Row, type: BlockType): Row {
  const defaults = rowDefaults(type, roleForSlot(row.slot));
  const startSets = [...row.startSets.filter(set => set.kind === 'warm-up'), ...workingStartsAt(row.startSets, defaults.start)];
  return withLaterWeeksPruned({
    ...row,
    startSets,
    restSeconds: row.touched.includes('restSeconds') ? row.restSeconds : defaults.restSeconds,
  });
}

type SetValues = Pick<PlannedSet, 'kind' | 'start'>;

/** The warm-up sets as they are, and the first half of the working sets, lighter and further from failure. */
function deloadedSets(sets: readonly SetValues[], step: WeightStep): PlannedSet[] {
  const warmUps = sets.filter(set => set.kind === 'warm-up');
  const working = sets.filter(set => set.kind === 'working');
  return [
    ...warmUps.map(set => plannedSet('warm-up', set.start)),
    ...working.slice(0, halved(working.length)).map(set => plannedSet('working', deloadedSet(set.start, step))),
  ];
}

/** The row deloaded from the sets of one week, in the exercise's weight steps; nothing the coach did in any week stays. */
function deloadedRowFrom(row: Row, sets: readonly SetValues[], exercise: Exercise | undefined): Row {
  return { ...withoutWeekChanges(row), startSets: deloadedSets(sets, weightStepOf(exercise)), touched: [] };
}

export function deloadRow(row: Row): Row {
  return deloadedRowFrom(row, firstWeekSets(row), undefined);
}

export type DeloadSource = { level: LevelHint; library: readonly Exercise[] };
export type DeloadSwitch = DeloadSource & { previous: Block | undefined };

type DeloadedWeek = (row: Row, sessionIndex: number, exercise: Exercise | undefined) => ResolvedWeek;

/** Every row of the block deloaded from the week `weekOf` resolves for it. */
function withDeloadedRows(block: Block, library: readonly Exercise[], weekOf: DeloadedWeek): Session[] {
  const exercisesById = new Map(library.map(exercise => [exercise.id, exercise]));
  return block.sessions.map((session, sessionIndex) => ({
    ...session,
    rows: session.rows.map(row => {
      const exercise = exercisesById.get(row.exerciseId);
      const sets = weekOf(row, sessionIndex, exercise).sets.map(set => ({ kind: set.kind, start: targetsOf(set) }));
      return deloadedRowFrom(row, sets, exercise);
    }),
  }));
}

export function deloadedBlock(source: Block, { level, library }: DeloadSource): Block {
  const sessions = withDeloadedRows(source, library, (row, _session, exercise) => resolvedWeek(row, source.weeks, { block: source, level, exercise }));
  return { ...source, type: 'deload', sessions };
}

function previousRowOf(previous: Block, sessionIndex: number, exerciseId: string): Row | undefined {
  if (exerciseId === '') return undefined;
  const sameSession = previous.sessions[sessionIndex]?.rows.find(row => row.exerciseId === exerciseId);
  return sameSession ?? previous.sessions.flatMap(session => session.rows).find(row => row.exerciseId === exerciseId);
}

export function blockSwitchedToDeload(block: Block, { previous, level, library }: DeloadSwitch): Block {
  const sessions = withDeloadedRows(block, library, (row, sessionIndex, exercise) => {
    const source = previous && previousRowOf(previous, sessionIndex, row.exerciseId);
    if (previous && source) return resolvedWeek(source, previous.weeks, { block: previous, level, exercise });
    return resolvedWeek(row, 1, { block, level, exercise });
  });
  return { ...block, type: 'deload', weeks: 1, sessions };
}

export function reDefaultedBlock(block: Block, type: BlockType): Block {
  const mapRow = (row: Row) => (type === 'deload' ? deloadRow(row) : defaultedRow(row, type));
  return {
    ...block,
    type,
    sessions: block.sessions.map(session => ({ ...session, rows: session.rows.map(mapRow) })),
  };
}

/** Back to the block's defaults: nothing the coach did in any week, and the default sets (a Deload block keeps its prefilled sets). */
export function resetRowDefaults(row: Row, type: BlockType): Row {
  const cleared = withoutWeekChanges(row);
  if (type === 'deload') {
    const startSets = cleared.startSets.map(set => ({ ...set, start: { ...set.start, rir: DELOAD_RIR } }));
    return { ...cleared, startSets, touched: [] };
  }
  const defaults = rowDefaults(type, roleForSlot(row.slot));
  return { ...cleared, startSets: defaultSets(type, row.slot), restSeconds: defaults.restSeconds, touched: [] };
}

export function cardioDefaults(type: BlockType, library: readonly Exercise[]): CardioSession[] {
  if (type === 'deload') return [cardioPreset('liss', library)];
  const easy = [cardioPreset('liss', library), cardioPreset('liss', library)];
  return type === 'foundation' ? easy : [...easy, cardioPreset('moderate', library)];
}
