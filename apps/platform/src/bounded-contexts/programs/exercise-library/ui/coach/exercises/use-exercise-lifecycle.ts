import { toast } from "~/shared/design-system/toast";
import { useEffect, useEffectEvent, useState, type RefObject } from "react";
import { useFetcher, useSubmit } from "react-router";

import {
  exerciseLifecycleAnswerSchema,
  type ExerciseView,
} from "~/bounded-contexts/programs/exercise-library/public/exercises";
import {
  exerciseArchivePath,
  exercisePath,
  exerciseRestorePath,
} from "~/bounded-contexts/programs/exercise-library/public/paths";

type ExerciseLifecycleAction = "archive" | "restore" | "delete";

export type ExerciseWriteOutcomes = {
  succeeded: (key: string) => void;
  failed: (key: string) => void;
};

type ExerciseWrite = {
  method: "post" | "delete";
  pathOf: (exerciseId: string) => string;
};

export type PendingExerciseWrite = {
  action: ExerciseLifecycleAction;
  key: string;
  name: string;
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

  const write = (action: ExerciseLifecycleAction, exercise: ExerciseView) => {
    const { method, pathOf } = WRITES[action];
    const key = pathOf(exercise.id);

    setPending((current) => [
      ...current.filter((pendingWrite) => pendingWrite.key !== key),
      { action, key, name: exercise.name },
    ]);
    void submit(null, {
      action: key,
      fetcherKey: key,
      method,
      navigate: false,
    });
  };

  const drop = (key: string) =>
    setPending((current) =>
      current.filter((pendingWrite) => pendingWrite.key !== key),
    );

  const outcomes: ExerciseWriteOutcomes = {
    succeeded: (key) => {
      drop(key);
      heading.current?.focus();
    },
    failed: drop,
  };

  return {
    pending,
    outcomes,
    archive: (exercise: ExerciseView) => write("archive", exercise),
    restore: (exercise: ExerciseView) => write("restore", exercise),
    remove: (exercise: ExerciseView) => write("delete", exercise),
  };
}

export function useExerciseLifecycleAnswer(
  pendingWrite: PendingExerciseWrite,
  outcomes: ExerciseWriteOutcomes,
) {
  const { data, state } = useFetcher<unknown>({ key: pendingWrite.key });

  const settle = useEffectEvent((received: unknown) => {
    const answer = exerciseLifecycleAnswerSchema.safeParse(received);

    if (answer.success) {
      toast.success(successCopyOf(pendingWrite, answer.data.name));
      outcomes.succeeded(pendingWrite.key);
    } else {
      toast.error(
        `"${pendingWrite.name}" wasn’t ${PAST_TENSE[pendingWrite.action]}. Try again.`,
      );
      outcomes.failed(pendingWrite.key);
    }
  });

  useEffect(() => {
    if (state === "idle" && data !== undefined) {
      settle(data);
    }
  }, [data, state]);
}

function successCopyOf(
  pendingWrite: PendingExerciseWrite,
  answeredName: string,
): string {
  if (pendingWrite.action === "restore" && answeredName !== pendingWrite.name) {
    return `"${pendingWrite.name}" restored as "${answeredName}"`;
  }

  return `"${pendingWrite.name}" ${PAST_TENSE[pendingWrite.action]}`;
}
