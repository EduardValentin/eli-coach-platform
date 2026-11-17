import type { Exercise } from '../../context/TrainingContext';
import {
  formatRange,
  positionLabel,
  type CoolDownItem,
  type RoundsItem,
  type RoundsSegment,
  type Row,
  type Session,
  type SteadySegment,
  type WarmUpItem,
} from '../../domain/program';
import { roundsItemAmount, segmentMinutes } from '../../domain/programCardio';
import { counted } from '../../utils/counted';
import { exerciseDetailOf, type ExerciseDetailContent } from './exerciseDetailContent';
import { IntensityValue } from './IntensityValue';
import { repsSuffix } from './programView';
import { rowTargets } from './targets';

type FindExercise = (exerciseId: string) => Exercise | undefined;

export function perSideUnit(exercise: Exercise | undefined, unit: string): string {
  return [unit, exercise?.perSide ? 'per side' : ''].filter(Boolean).join(' ');
}

export function warmUpAmount(item: WarmUpItem, exercise: Exercise | undefined): { each: string; unit: string } {
  if (item.seconds !== undefined) return { each: String(item.seconds), unit: perSideUnit(exercise, 's') };
  return { each: formatRange(item.reps ?? { min: 0, max: 0 }), unit: perSideUnit(exercise, '') };
}

type RowExerciseDetailInput = { session: Session; row: Row; progression: string; findExercise: FindExercise };

function shownSwapsOf(row: Row, findExercise: FindExercise): Exercise[] {
  return row.substitutions.flatMap(id => {
    const swap = findExercise(id);
    return swap && swap.archivedAt === undefined ? [swap] : [];
  });
}

export function rowExerciseDetail({ session, row, progression, findExercise }: RowExerciseDetailInput): ExerciseDetailContent | null {
  const exercise = findExercise(row.exerciseId);
  return exerciseDetailOf(exercise, {
    swapContext: `Swap for ${positionLabel(session, row)} · ${exercise?.name ?? ''}`,
    targets: rowTargets(row, repsSuffix(exercise)),
    cues: row.cues,
    swaps: shownSwapsOf(row, findExercise),
    progression,
  });
}

export function warmUpExerciseDetail(item: WarmUpItem, exercise: Exercise | undefined): ExerciseDetailContent | null {
  const { each, unit } = warmUpAmount(item, exercise);
  return exerciseDetailOf(exercise, {
    targets: [{ term: 'Warm-up', value: [`${counted(item.sets, 'set')} × ${each}`, unit].filter(Boolean).join(' ') }],
  });
}

export function coolDownExerciseDetail(item: CoolDownItem, exercise: Exercise | undefined): ExerciseDetailContent | null {
  const unit = perSideUnit(exercise, 's');
  return exerciseDetailOf(exercise, { targets: [{ term: 'Hold', value: `${item.seconds} ${unit}` }] });
}

export function steadyExerciseDetail(segment: SteadySegment, exercise: Exercise | undefined): ExerciseDetailContent | null {
  return exerciseDetailOf(exercise, {
    targets: [
      { term: 'Duration', value: `${segmentMinutes(segment)} min` },
      { term: 'Intensity', value: <IntensityValue intensity={segment.intensity} /> },
    ],
  });
}

export function roundsItemExerciseDetail(segment: RoundsSegment, item: RoundsItem, exercise: Exercise | undefined): ExerciseDetailContent | null {
  return exerciseDetailOf(exercise, {
    targets: [
      { term: 'Work', value: roundsItemAmount(item) },
      { term: 'Rounds', value: segment.rounds },
      { term: 'Intensity', value: <IntensityValue intensity={segment.intensity} /> },
    ],
  });
}
