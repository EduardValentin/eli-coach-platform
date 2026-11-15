import type { Exercise } from '../context/TrainingContext';
import type { ProgramVersion, Row } from './program';

export type ExerciseGuide = { exercise: Exercise; cues: string[]; swaps: Exercise[] };

type GuideInput = { exerciseId: string; library: readonly Exercise[]; version: ProgramVersion | undefined };

function isActive(exercise: Exercise | undefined): exercise is Exercise {
  return exercise !== undefined && exercise.archivedAt === undefined;
}

function rowsOf(version: ProgramVersion | undefined, exerciseId: string): Row[] {
  if (!version) return [];
  return version.content.plan.blocks.flatMap(block =>
    block.sessions.flatMap(session => session.rows.filter(row => row.exerciseId === exerciseId)),
  );
}

function distinct(values: readonly string[]): string[] {
  return [...new Set(values)];
}

function filled(texts: readonly string[]): string[] {
  return distinct(texts.map(text => text.trim()).filter(text => text.length > 0));
}

export function exerciseGuide({ exerciseId, library, version }: GuideInput): ExerciseGuide | null {
  const exercisesById = new Map(library.map(exercise => [exercise.id, exercise]));
  const exercise = exercisesById.get(exerciseId);
  if (!isActive(exercise)) return null;

  const rows = rowsOf(version, exerciseId);
  const programCues = filled(rows.map(row => row.cues));
  const swaps = distinct(rows.flatMap(row => row.substitutions))
    .filter(id => id !== exerciseId)
    .map(id => exercisesById.get(id))
    .filter(isActive);

  return {
    exercise,
    cues: programCues.length > 0 ? programCues : filled([exercise.cues]),
    swaps,
  };
}
