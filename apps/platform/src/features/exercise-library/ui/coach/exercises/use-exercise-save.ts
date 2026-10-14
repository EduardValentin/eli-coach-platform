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

  const save = (request: ExerciseRequest) => {
    void submit(request, {
      action:
        exerciseId === null
          ? EXERCISE_LIBRARY_API_PATHS.exercises
          : exercisePath(exerciseId),
      defaultShouldRevalidate: false,
      encType: "application/json",
      method: exerciseId === null ? "post" : "put",
    });
  };

  return { save, saving: state !== "idle" };
}
