import type { Exercise } from '../app/context/TrainingContext';
import { currentBlock, viewOf, type ProgramView } from '../app/components/program-view/programView';
import type { Equipment } from '../app/domain/exercises';
import { currentVersion, type Block, type Row, type Session, type SetSpec } from '../app/domain/program';
import { SAMPLE_EXERCISES } from '../app/services/exerciseSamples';
import { programForSeed, type ProgramSeed } from '../app/services/programSamples';

export function exercise(id: string, overrides: Partial<Exercise> = {}): Exercise {
  return {
    id,
    name: id,
    cues: '',
    type: 'resistance',
    measuredIn: 'reps',
    perSide: false,
    equipment: [],
    difficulty: 'Beginner',
    primaryMuscles: [],
    secondaryMuscles: [],
    tags: [],
    ...overrides,
  };
}

export function equippedExercise(id: string, equipment: Equipment[], overrides: Partial<Exercise> = {}): Exercise {
  return exercise(id, { equipment, primaryMuscles: ['Chest'], pattern: 'horizontal-push', ...overrides });
}

export function workingSets(count: number): SetSpec[] {
  return Array.from({ length: count }, () => ({ kind: 'working', reps: { min: 8, max: 12 }, rir: { min: 1, max: 2 } }));
}

export function row(overrides: Partial<Row> = {}): Row {
  return {
    id: 'r',
    exerciseId: 'e',
    slot: 'A',
    sets: workingSets(3),
    restSeconds: 60,
    lastSetTechnique: 'none',
    substitutions: [],
    progression: { kind: 'double' },
    cues: '',
    touched: [],
    ...overrides,
  };
}

export function session(overrides: Partial<Session> = {}): Session {
  const id = overrides.id ?? 's';
  return {
    id,
    originId: id,
    name: id,
    warmUp: { items: [] },
    coolDown: { enabled: false, items: [] },
    rows: [],
    ...overrides,
  };
}

export function currentBlockOf(view: ProgramView): Block {
  const block = currentBlock(view);
  if (!block) throw new Error('block missing');
  return block;
}

type SeededViewOptions = { seed: ProgramSeed; dayOne: Date; today: Date; exercises?: readonly Exercise[]; clientName?: string };

/** The demo client's program, seeded to start on `dayOne`, as the viewer and the document read it on `today`. */
export function seededProgramView({ seed, dayOne, today, exercises = SAMPLE_EXERCISES, clientName }: SeededViewOptions): ProgramView {
  const program = programForSeed(seed, { callId: 'ac-demo-client-1', dayOne, equipment: [] }, SAMPLE_EXERCISES);
  const version = program && currentVersion(program);
  if (!program || !version) throw new Error(`seed ${seed} has no current version`);
  return viewOf({ program, version, dayOne, today, preferredWeekday: 'mon', exercises, clientName });
}
