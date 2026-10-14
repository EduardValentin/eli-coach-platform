import { useEffect, useEffectEvent } from "react";
import { useFetcher } from "react-router";

import {
  exerciseProblemsAnswerSchema,
  exerciseSavedAnswerSchema,
  type ExerciseProblems,
  type ExerciseRequest,
} from "~/features/exercise-library/public/exercises";
import {
  EXERCISE_LIBRARY_API_PATHS,
  exercisePath,
} from "~/features/exercise-library/public/paths";

export type ExerciseSaveOutcome =
  | { status: "saved"; redirectTo: string }
  | { status: "refused"; problems: ExerciseProblems }
  | { status: "failed" };

function outcomeOf(answer: unknown): ExerciseSaveOutcome {
  const saved = exerciseSavedAnswerSchema.safeParse(answer);
  if (saved.success) {
    return { status: "saved", redirectTo: saved.data.redirectTo };
  }

  const refused = exerciseProblemsAnswerSchema.safeParse(answer);
  if (refused.success) {
    return { status: "refused", problems: refused.data.problems };
  }

  return { status: "failed" };
}

type ExerciseSaveTarget = { action: string; method: "post" | "put" };

function saveTargetOf(exerciseId: string | null): ExerciseSaveTarget {
  return exerciseId === null
    ? { action: EXERCISE_LIBRARY_API_PATHS.exercises, method: "post" }
    : { action: exercisePath(exerciseId), method: "put" };
}

export function useExerciseSave(
  exerciseId: string | null,
  onSettled: (outcome: ExerciseSaveOutcome) => void,
) {
  const { data, state, submit } = useFetcher<unknown>();

  const settle = useEffectEvent((answer: unknown) => {
    onSettled(outcomeOf(answer));
  });

  useEffect(() => {
    if (data !== undefined) {
      settle(data);
    }
  }, [data]);

  const target = saveTargetOf(exerciseId);

  const save = (request: ExerciseRequest) => {
    void submit(request, {
      ...target,
      defaultShouldRevalidate: false,
      encType: "application/json",
    });
  };

  return { save, saving: state !== "idle" };
}
