import type { Exercise } from '../../context/TrainingContext';
import {
  formatRange,
  positionLabel,
  type CoolDownItem,
  type PlacedRow,
  type RoundsItem,
  type RoundsSegment,
  type WeekRow,
  type SteadySegment,
  type WarmUpItem,
} from '../../domain/program';
import { roundsItemAmount, segmentMinutes } from '../../domain/programCardio';
import { counted } from '../../utils/counted';
import { exerciseDetailOf, type ExerciseDetailContent } from './exerciseDetailContent';
import { IntensityValue } from './IntensityValue';
import { perSideUnit, repsSuffix } from './programView';
import { rowTargets } from './targets';

type FindExercise = (exerciseId: string) => Exercise | undefined;

export type RoutineAmountText = { value: string; unit: string };

function warmUpEach(item: WarmUpItem, exercise: Exercise | undefined): RoutineAmountText {
  if (item.seconds !== undefined) return { value: String(item.seconds), unit: perSideUnit(exercise, 's') };
  return { value: formatRange(item.reps ?? { min: 0, max: 0 }), unit: perSideUnit(exercise, '') };
}

export function warmUpAmount(item: WarmUpItem, exercise: Exercise | undefined): RoutineAmountText {
  const each = warmUpEach(item, exercise);
  return { value: `${item.sets} × ${each.value}`, unit: each.unit };
}

export function coolDownAmount(item: CoolDownItem, exercise: Exercise | undefined): RoutineAmountText {
  return { value: String(item.seconds), unit: perSideUnit(exercise, 's') };
}

type RowExerciseDetailInput = { session: { rows: readonly PlacedRow[] }; row: WeekRow; progression: string; findExercise: FindExercise };

export function shownSwapsOf(row: WeekRow, findExercise: FindExercise): Exercise[] {
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
  const each = warmUpEach(item, exercise);
  return exerciseDetailOf(exercise, {
    targets: [{ term: 'Warm-up', value: [`${counted(item.sets, 'set')} × ${each.value}`, each.unit].filter(Boolean).join(' ') }],
  });
}

export function coolDownExerciseDetail(item: CoolDownItem, exercise: Exercise | undefined): ExerciseDetailContent | null {
  const { value, unit } = coolDownAmount(item, exercise);
  return exerciseDetailOf(exercise, { targets: [{ term: 'Hold', value: `${value} ${unit}` }] });
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
