import { createContext, useContext } from "react";

import type { LibraryExercise } from "~/bounded-contexts/programs/training-programs/public/program-editing";

import type { Target } from "./targets";

export type ExerciseDetailContent = {
  exercise: LibraryExercise;
  targets: readonly Target[];
  cues: string;
  swaps: readonly LibraryExercise[];
  swapContext: string;
  progression: string;
};

type ExerciseDetailInput = Pick<ExerciseDetailContent, "targets"> &
  Partial<
    Pick<
      ExerciseDetailContent,
      "cues" | "swaps" | "swapContext" | "progression"
    >
  >;

function isShownExercise(
  exercise: LibraryExercise | undefined,
): exercise is LibraryExercise {
  return exercise !== undefined && !exercise.archived;
}

export function exerciseDetailOf(
  exercise: LibraryExercise | undefined,
  input: ExerciseDetailInput,
): ExerciseDetailContent | null {
  if (!isShownExercise(exercise)) return null;

  return {
    cues: "",
    swaps: [],
    swapContext: "",
    progression: "",
    ...input,
    exercise,
  };
}

type OpenExerciseDetail = (
  detail: ExerciseDetailContent,
  opener: HTMLElement,
  swap?: LibraryExercise,
) => void;

export const ExerciseDetailContext = createContext<OpenExerciseDetail>(
  () => {},
);

export function useOpenExerciseDetail(): OpenExerciseDetail {
  return useContext(ExerciseDetailContext);
}
