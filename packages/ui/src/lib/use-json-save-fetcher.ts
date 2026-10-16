import { useEffect, useEffectEvent } from "react";
import { useFetcher, type SubmitTarget } from "react-router";

type AnswerReading<Answer> =
  { success: true; data: Answer } | { success: false };

type AnswerSchema<Answer> = {
  safeParse: (answer: unknown) => AnswerReading<Answer>;
};

export type JsonSaveTarget = { action: string; method: "post" | "put" };

export type JsonSaveOutcome<Problems> =
  | { status: "saved"; redirectTo: string }
  | { status: "refused"; problems: Problems }
  | { status: "failed" };

type JsonSaveOptions<Problems> = {
  target: JsonSaveTarget;
  savedAnswer: AnswerSchema<{ redirectTo: string }>;
  refusedAnswer: AnswerSchema<{ problems: Problems }>;
  onSettled: (outcome: JsonSaveOutcome<Problems>) => void;
};

export function useJsonSaveFetcher<Problems>({
  target,
  savedAnswer,
  refusedAnswer,
  onSettled,
}: JsonSaveOptions<Problems>) {
  const { data, state, submit } = useFetcher<unknown>();

  const outcomeOf = (answer: unknown): JsonSaveOutcome<Problems> => {
    const saved = savedAnswer.safeParse(answer);
    if (saved.success) {
      return { status: "saved", redirectTo: saved.data.redirectTo };
    }

    const refused = refusedAnswer.safeParse(answer);
    if (refused.success) {
      return { status: "refused", problems: refused.data.problems };
    }

    return { status: "failed" };
  };

  const settle = useEffectEvent((answer: unknown) => {
    onSettled(outcomeOf(answer));
  });

  useEffect(() => {
    if (data !== undefined) {
      settle(data);
    }
  }, [data]);

  const save = (request: SubmitTarget) => {
    void submit(request, {
      ...target,
      defaultShouldRevalidate: false,
      encType: "application/json",
    });
  };

  return { save, saving: state !== "idle" };
}
