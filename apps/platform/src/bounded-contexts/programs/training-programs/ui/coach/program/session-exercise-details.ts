import {
  SessionEditing,
  type CoolDownItem,
  type LibraryExercise,
  type Session,
  type WarmUpItem,
  type WeekRow,
} from "~/bounded-contexts/programs/training-programs/public/program-editing";
import {
  exerciseDetailOf,
  type ExerciseDetailContent,
} from "~/bounded-contexts/programs/training-programs/ui/shared/program-view/exercise-detail-content";
import {
  counted,
  formatRange,
  perSideUnit,
  repsSuffix,
} from "~/bounded-contexts/programs/training-programs/ui/shared/program-view/program-view";
import type { RoutineAmountText } from "~/bounded-contexts/programs/training-programs/ui/shared/program-view/routine-list";
import { rowTargets } from "~/bounded-contexts/programs/training-programs/ui/shared/program-view/targets";

type FindExercise = (exerciseId: string) => LibraryExercise | undefined;

type RowExerciseDetailInput = {
  session: Session;
  row: WeekRow;
  progression: string;
  findExercise: FindExercise;
};

function warmUpEach(
  item: WarmUpItem,
  exercise: LibraryExercise | undefined,
): RoutineAmountText {
  if (item.seconds !== undefined) {
    return {
      value: String(item.seconds),
      unit: perSideUnit(exercise, "s"),
    };
  }

  return {
    value: formatRange(item.reps ?? { min: 0, max: 0 }),
    unit: perSideUnit(exercise, ""),
  };
}

function shownSwapsOf(
  row: WeekRow,
  findExercise: FindExercise,
): LibraryExercise[] {
  return row.substitutions.flatMap((id) => {
    const swap = findExercise(id);

    return swap && !swap.archived ? [swap] : [];
  });
}

export function rowExerciseDetail({
  session,
  row,
  progression,
  findExercise,
}: RowExerciseDetailInput): ExerciseDetailContent | null {
  const exercise = findExercise(row.exerciseId);

  return exerciseDetailOf(exercise, {
    swapContext: `Swap for ${SessionEditing.positionLabel(session, row)} · ${exercise?.name ?? ""}`,
    targets: rowTargets(row, repsSuffix(exercise)),
    cues: row.cues,
    swaps: shownSwapsOf(row, findExercise),
    progression,
  });
}

export function warmUpExerciseDetail(
  item: WarmUpItem,
  exercise: LibraryExercise | undefined,
): ExerciseDetailContent | null {
  const each = warmUpEach(item, exercise);

  return exerciseDetailOf(exercise, {
    targets: [
      {
        term: "Warm-up",
        value: [`${counted(item.sets, "set")} × ${each.value}`, each.unit]
          .filter(Boolean)
          .join(" "),
      },
    ],
  });
}

export function coolDownExerciseDetail(
  item: CoolDownItem,
  exercise: LibraryExercise | undefined,
): ExerciseDetailContent | null {
  const unit = perSideUnit(exercise, "s");

  return exerciseDetailOf(exercise, {
    targets: [{ term: "Hold", value: `${item.seconds} ${unit}` }],
  });
}
