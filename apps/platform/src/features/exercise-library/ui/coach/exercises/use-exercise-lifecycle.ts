import { toast } from "@eli-coach-platform/ui/toast";
import { useEffect, useEffectEvent, useState, type RefObject } from "react";
import { useFetcher, useSubmit } from "react-router";

import {
  exerciseLifecycleAnswerSchema,
  type ExerciseView,
} from "~/features/exercise-library/public/exercises";
import {
  exerciseArchivePath,
  exercisePath,
  exerciseRestorePath,
} from "~/features/exercise-library/public/paths";

type ExerciseLifecycleAction = "archive" | "restore" | "delete";

type ExerciseLifecycleOutcome = "succeeded" | "failed";

export type ExerciseLifecycleAnswered = (
  key: string,
  outcome: ExerciseLifecycleOutcome,
) => void;

type ExerciseWrite = {
  method: "post" | "delete";
  pathOf: (exerciseId: string) => string;
};

export type PendingExerciseWrite = {
  action: ExerciseLifecycleAction;
  key: string;
  name: string;
};

type PendingDeletion = {
  exercise: ExerciseView;
  stage: "asking" | "kept" | "confirmed";
};

const WRITES: Readonly<Record<ExerciseLifecycleAction, ExerciseWrite>> = {
  archive: { method: "post", pathOf: exerciseArchivePath },
  restore: { method: "post", pathOf: exerciseRestorePath },
  delete: { method: "delete", pathOf: exercisePath },
};

const PAST_TENSE: Readonly<Record<ExerciseLifecycleAction, string>> = {
  archive: "archived",
  restore: "restored",
  delete: "deleted",
};

export function useExerciseLifecycle(
  heading: RefObject<HTMLHeadingElement | null>,
) {
  const submit = useSubmit();
  const [pending, setPending] = useState<readonly PendingExerciseWrite[]>([]);
  const [deletion, setDeletion] = useState<PendingDeletion | null>(null);

  const write = (action: ExerciseLifecycleAction, exercise: ExerciseView) => {
    const { method, pathOf } = WRITES[action];
    const key = pathOf(exercise.id);

    setPending((current) => [
      ...current.filter((written) => written.key !== key),
      { action, key, name: exercise.name },
    ]);
    void submit(null, {
      action: key,
      fetcherKey: key,
      method,
      navigate: false,
    });
  };

  const answered: ExerciseLifecycleAnswered = (key, outcome) => {
    setPending((current) => current.filter((written) => written.key !== key));
    if (outcome === "succeeded") {
      heading.current?.focus();
    }
  };

  return {
    pending,
    answered,
    archive: (exercise: ExerciseView) => write("archive", exercise),
    restore: (exercise: ExerciseView) => write("restore", exercise),
    deletion: {
      asking: deletion?.stage === "asking",
      name: deletion?.exercise.name ?? "",
      returnFocusTo: deletion?.stage === "confirmed" ? heading : undefined,
      ask: (exercise: ExerciseView) =>
        setDeletion({ exercise, stage: "asking" }),
      keep: () => {
        if (deletion?.stage === "asking") {
          setDeletion({ ...deletion, stage: "kept" });
        }
      },
      confirm: () => {
        if (!deletion) return;

        setDeletion({ ...deletion, stage: "confirmed" });
        write("delete", deletion.exercise);
      },
    },
  };
}

export function useExerciseLifecycleAnswer(
  written: PendingExerciseWrite,
  onAnswered: ExerciseLifecycleAnswered,
) {
  const { data, state } = useFetcher<unknown>({ key: written.key });

  const answer = useEffectEvent((received: unknown) => {
    const answered = exerciseLifecycleAnswerSchema.safeParse(received);

    if (answered.success) {
      toast.success(successCopyOf(written, answered.data.name));
      onAnswered(written.key, "succeeded");
    } else {
      toast.error(
        `"${written.name}" wasn’t ${PAST_TENSE[written.action]}. Try again.`,
      );
      onAnswered(written.key, "failed");
    }
  });

  useEffect(() => {
    if (state === "idle" && data !== undefined) {
      answer(data);
    }
  }, [data, state]);
}

function successCopyOf(
  written: PendingExerciseWrite,
  answeredName: string,
): string {
  if (written.action === "restore" && answeredName !== written.name) {
    return `"${written.name}" restored as "${answeredName}"`;
  }

  return `"${written.name}" ${PAST_TENSE[written.action]}`;
}
