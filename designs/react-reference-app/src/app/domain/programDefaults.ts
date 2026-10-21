import type { ExerciseRole } from './exercises';
import {
  newId,
  roleForSlot,
  type Block,
  type BlockType,
  type CardioSession,
  type CardioType,
  type Range,
  type Row,
  type SetSpec,
  type Weekday,
} from './program';

export type RowDefaults = { sets: SetSpec[]; restSeconds: number };

export const STEPS_DEFAULT = 6000;
export const STEPS_STEP = 1000;
export const TARGET_MINUTES = [30, 45, 60] as const;

export const CARDIO_INTENSITY_TEXT: Record<CardioType, string> = {
  liss: 'You can hold a conversation',
  moderate: 'You can talk, but not sing',
  hiit: 'Hard: only a few words at a time',
  finisher: 'Circuit of 5–8 minutes at the end of the session',
};

type Prescription = { setCount: number; set: SetSpec; restSeconds: number };

const FOUNDATION: Prescription = { setCount: 3, set: { reps: { min: 12, max: 15 }, rir: { min: 3, max: 3 } }, restSeconds: 75 };
const SECONDARY: Prescription = { setCount: 3, set: { reps: { min: 8, max: 12 }, rir: { min: 1, max: 2 } }, restSeconds: 105 };
const ISOLATION: Prescription = { setCount: 3, set: { reps: { min: 10, max: 20 }, rir: { min: 0, max: 2 } }, restSeconds: 75 };
const HYPERTROPHY_MAIN: Prescription = { setCount: 4, set: { reps: { min: 6, max: 10 }, rir: { min: 1, max: 2 } }, restSeconds: 150 };
const STRENGTH_MAIN: Prescription = { setCount: 4, set: { reps: { min: 3, max: 6 }, rir: { min: 1, max: 3 } }, restSeconds: 150 };

const DELOAD_RIR: Range = { min: 4, max: 4 };

function loadedPrescription(type: Exclude<BlockType, 'deload'>, role: ExerciseRole): Prescription {
  if (type === 'foundation') return FOUNDATION;
  if (role === 'isolation') return ISOLATION;
  if (role === 'secondary-compound') return SECONDARY;
  return type === 'strength' ? STRENGTH_MAIN : HYPERTROPHY_MAIN;
}

function defaultsOf({ setCount, set, restSeconds }: Prescription): RowDefaults {
  const sets = Array.from({ length: setCount }, () => ({ reps: { ...set.reps }, rir: { ...set.rir } }));
  return { sets, restSeconds };
}

function atDeloadRir(sets: SetSpec[]): SetSpec[] {
  return sets.map(set => ({ reps: { ...set.reps }, rir: { ...DELOAD_RIR } }));
}

function deloadSets(sets: SetSpec[]): SetSpec[] {
  return atDeloadRir(sets.slice(0, Math.max(1, Math.ceil(sets.length / 2))));
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
    sets: row.touched.includes('sets') ? row.sets : defaults.sets,
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

function cardio(type: CardioType, minutes: number, weekday: Weekday): CardioSession {
  return { id: newId(), type, minutes, intensityText: CARDIO_INTENSITY_TEXT[type], weekday, placement: 'separate' };
}

export function cardioDefaults(type: BlockType): CardioSession[] {
  if (type === 'deload') return [cardio('liss', 30, 'wed')];
  const liss = [cardio('liss', 30, 'wed'), cardio('liss', 30, 'sun')];
  return type === 'foundation' ? liss : [...liss, cardio('moderate', 25, 'sat')];
}
