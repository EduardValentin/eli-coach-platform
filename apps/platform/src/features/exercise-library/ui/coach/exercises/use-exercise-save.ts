import { useUploadState } from "@eli-coach-platform/infrastructure/http";
import { useEffect, useEffectEvent, useRef } from "react";
import { useFetcher } from "react-router";

import { exerciseVideoUploadProgress } from "~/features/exercise-library/public/exercise-video-upload-progress";
import {
  EXERCISE_FORM_FIELDS,
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

function multipartSaveOf(request: ExerciseRequest, video: File): FormData {
  const formData = new FormData();
  formData.append(EXERCISE_FORM_FIELDS.exercise, JSON.stringify(request));
  formData.append(EXERCISE_FORM_FIELDS.video, video);

  return formData;
}

export function useExerciseSave(
  exerciseId: string | null,
  onSettled: (outcome: ExerciseSaveOutcome) => void,
) {
  const { data, state, submit } = useFetcher<unknown>();
  const awaitingAnswer = useRef(false);
  const uploadState = useUploadState(exerciseVideoUploadProgress, state);

  const settle = useEffectEvent((answer: unknown) => {
    awaitingAnswer.current = false;
    onSettled(outcomeOf(answer));
  });

  useEffect(() => {
    if (data !== undefined) {
      settle(data);
    }
  }, [data]);

  const target = saveTargetOf(exerciseId);

  const save = (request: ExerciseRequest, video: File | null) => {
    if (awaitingAnswer.current) return;

    awaitingAnswer.current = true;
    const options = { ...target, defaultShouldRevalidate: false };
    void (video
      ? submit(multipartSaveOf(request, video), {
          ...options,
          encType: "multipart/form-data",
        })
      : submit(request, { ...options, encType: "application/json" }));
  };

  return { save, saving: state !== "idle", uploadState };
}
