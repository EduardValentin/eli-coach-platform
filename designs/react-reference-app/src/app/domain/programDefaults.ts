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
  type RowField,
  type Weekday,
} from './program';

export type RowDefaults = { sets: number; reps: Range; rir: Range; restSeconds: number };

export const STEPS_DEFAULT = 6000;
export const STEPS_STEP = 1000;
export const TARGET_MINUTES = [30, 45, 60] as const;

export const CARDIO_INTENSITY_TEXT: Record<CardioType, string> = {
  liss: 'You can hold a conversation',
  moderate: 'You can talk, but not sing',
  hiit: 'Hard: only a few words at a time',
  finisher: 'Circuit of 5–8 minutes at the end of the session',
};

const FOUNDATION: RowDefaults = { sets: 3, reps: { min: 12, max: 15 }, rir: { min: 3, max: 3 }, restSeconds: 75 };
const SECONDARY: RowDefaults = { sets: 3, reps: { min: 8, max: 12 }, rir: { min: 1, max: 2 }, restSeconds: 105 };
const ISOLATION: RowDefaults = { sets: 3, reps: { min: 10, max: 20 }, rir: { min: 0, max: 2 }, restSeconds: 75 };
const HYPERTROPHY_MAIN: RowDefaults = { sets: 4, reps: { min: 6, max: 10 }, rir: { min: 1, max: 2 }, restSeconds: 150 };
const STRENGTH_MAIN: RowDefaults = { sets: 4, reps: { min: 3, max: 6 }, rir: { min: 1, max: 3 }, restSeconds: 150 };

const DELOAD_RIR: Range = { min: 4, max: 4 };

function halvedSets(sets: number): number {
  return Math.max(1, Math.ceil(sets / 2));
}

function loadedDefaults(type: Exclude<BlockType, 'deload'>, role: ExerciseRole): RowDefaults {
  if (type === 'foundation') return FOUNDATION;
  if (role === 'isolation') return ISOLATION;
  if (role === 'secondary-compound') return SECONDARY;
  return type === 'strength' ? STRENGTH_MAIN : HYPERTROPHY_MAIN;
}

export function rowDefaults(type: BlockType, role: ExerciseRole, previous?: RowDefaults): RowDefaults {
  if (type !== 'deload') {
    const defaults = loadedDefaults(type, role);
    return { ...defaults, reps: { ...defaults.reps }, rir: { ...defaults.rir } };
  }
  const source = previous ?? loadedDefaults('hypertrophy', role);
  return {
    sets: halvedSets(source.sets),
    reps: { ...source.reps },
    rir: { ...DELOAD_RIR },
    restSeconds: source.restSeconds,
  };
}

export function defaultedRow(row: Row, type: BlockType): Row {
  const defaults = rowDefaults(type, roleForSlot(row.slot), row);
  const fields: RowField[] = ['sets', 'reps', 'rir', 'restSeconds'];
  const filled = Object.fromEntries(
    fields.filter(field => !row.touched.includes(field)).map(field => [field, defaults[field as keyof RowDefaults]]),
  );
  return { ...row, ...filled };
}

export function deloadRow(row: Row): Row {
  return { ...row, sets: halvedSets(row.sets), rir: { ...DELOAD_RIR }, touched: [] };
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
