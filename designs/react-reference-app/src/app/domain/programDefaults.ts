import type { Exercise } from '../context/TrainingContext';
import type { ExerciseRole } from './exercises';
import {
  isWorkingSet,
  roleForSlot,
  workingSets,
  type Block,
  type BlockType,
  type CardioSession,
  type Range,
  type Row,
  type SetSpec,
  type WorkingSet,
} from './program';
import { cardioPreset } from './programCardio';

export type RowDefaults = { sets: SetSpec[]; restSeconds: number };

export const STEPS_DEFAULT = 6000;
export const STEPS_STEP = 1000;
export const TARGET_MINUTES = [30, 45, 60] as const;

type Prescription = { setCount: number; reps: Range; rir: Range; restSeconds: number };

const FOUNDATION: Prescription = { setCount: 3, reps: { min: 12, max: 15 }, rir: { min: 3, max: 3 }, restSeconds: 75 };
const SECONDARY: Prescription = { setCount: 3, reps: { min: 8, max: 12 }, rir: { min: 1, max: 2 }, restSeconds: 105 };
const ISOLATION: Prescription = { setCount: 3, reps: { min: 10, max: 20 }, rir: { min: 0, max: 2 }, restSeconds: 75 };
const HYPERTROPHY_MAIN: Prescription = { setCount: 4, reps: { min: 6, max: 10 }, rir: { min: 1, max: 2 }, restSeconds: 150 };
const STRENGTH_MAIN: Prescription = { setCount: 4, reps: { min: 3, max: 6 }, rir: { min: 1, max: 3 }, restSeconds: 150 };

const DELOAD_RIR: Range = { min: 4, max: 4 };
const DELOAD_WEIGHT_FACTOR = 0.85;
const WEIGHT_STEPS_PER_KG = 2;

function loadedPrescription(type: Exclude<BlockType, 'deload'>, role: ExerciseRole): Prescription {
  if (type === 'foundation') return FOUNDATION;
  if (role === 'isolation') return ISOLATION;
  if (role === 'secondary-compound') return SECONDARY;
  return type === 'strength' ? STRENGTH_MAIN : HYPERTROPHY_MAIN;
}

function defaultsOf({ setCount, reps, rir, restSeconds }: Prescription): RowDefaults {
  const sets = Array.from({ length: setCount }, (): SetSpec => ({ kind: 'working', reps: { ...reps }, rir: { ...rir } }));
  return { sets, restSeconds };
}

function warmUpSetsOf(sets: SetSpec[]): SetSpec[] {
  return sets.filter(set => !isWorkingSet(set));
}

function atDeloadRir(sets: SetSpec[]): SetSpec[] {
  return sets.map(set => (isWorkingSet(set) ? { ...set, rir: { ...DELOAD_RIR } } : set));
}

function lighter(set: WorkingSet): WorkingSet {
  if (set.weightKg === undefined) return set;
  return { ...set, weightKg: Math.round(set.weightKg * DELOAD_WEIGHT_FACTOR * WEIGHT_STEPS_PER_KG) / WEIGHT_STEPS_PER_KG };
}

function deloadSets(sets: SetSpec[]): SetSpec[] {
  const working = workingSets(sets);
  const kept = working.slice(0, Math.max(1, Math.ceil(working.length / 2))).map(lighter);
  return [...warmUpSetsOf(sets), ...atDeloadRir(kept)];
}

export function rowDefaults(type: BlockType, role: ExerciseRole, previous?: RowDefaults): RowDefaults {
  if (type !== 'deload') return defaultsOf(loadedPrescription(type, role));
  const source = previous ?? defaultsOf(loadedPrescription('hypertrophy', role));
  return { sets: deloadSets(source.sets), restSeconds: source.restSeconds };
}

export function defaultedRow(row: Row, type: BlockType): Row {
  const defaults = rowDefaults(type, roleForSlot(row.slot), row);
  return {
    ...row,
    sets: row.touched.includes('sets') ? row.sets : [...warmUpSetsOf(row.sets), ...workingSets(defaults.sets)],
    restSeconds: row.touched.includes('restSeconds') ? row.restSeconds : defaults.restSeconds,
  };
}

export function deloadRow(row: Row): Row {
  return { ...row, sets: deloadSets(row.sets), touched: [] };
}

export function reDefaultedBlock(block: Block, type: BlockType): Block {
  const mapRow = (row: Row) => (type === 'deload' ? deloadRow(row) : defaultedRow(row, type));
  return {
    ...block,
    type,
    sessions: block.sessions.map(session => ({ ...session, rows: session.rows.map(mapRow) })),
  };
}

export function resetRowDefaults(row: Row, type: BlockType): Row {
  if (type === 'deload') return { ...row, sets: atDeloadRir(row.sets), touched: [] };
  return defaultedRow({ ...row, touched: [] }, type);
}

export function cardioDefaults(type: BlockType, library: readonly Exercise[]): CardioSession[] {
  if (type === 'deload') return [cardioPreset('liss', library)];
  const easy = [cardioPreset('liss', library), cardioPreset('liss', library)];
  return type === 'foundation' ? easy : [...easy, cardioPreset('moderate', library)];
}
