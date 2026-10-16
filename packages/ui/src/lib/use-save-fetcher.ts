import { useEffect, useEffectEvent, useRef } from "react";
import { useFetcher, type SubmitTarget } from "react-router";

type AnswerReading<Answer> =
  { success: true; data: Answer } | { success: false };

type AnswerSchema<Answer> = {
  safeParse: (answer: unknown) => AnswerReading<Answer>;
};

export type SaveTarget = { action: string; method: "post" | "put" };

export type SaveOutcome<Problems> =
  | { status: "saved"; redirectTo: string }
  | { status: "refused"; problems: Problems }
  | { status: "failed" };

type SaveOptions<Problems> = {
  target: SaveTarget;
  savedAnswer: AnswerSchema<{ redirectTo: string }>;
  refusedAnswer: AnswerSchema<{ problems: Problems }>;
  onSettled: (outcome: SaveOutcome<Problems>) => void;
};

export function useSaveFetcher<Problems>({
  target,
  savedAnswer,
  refusedAnswer,
  onSettled,
}: SaveOptions<Problems>) {
  const { data, state, submit } = useFetcher<unknown>();
  const awaitingAnswer = useRef(false);

  const outcomeOf = (answer: unknown): SaveOutcome<Problems> => {
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
    awaitingAnswer.current = false;
    onSettled(outcomeOf(answer));
  });

  useEffect(() => {
    if (data !== undefined) {
      settle(data);
    }
  }, [data]);

  const save = (request: SubmitTarget) => {
    if (awaitingAnswer.current) return;

    awaitingAnswer.current = true;
    void submit(request, {
      ...target,
      defaultShouldRevalidate: false,
      encType:
        request instanceof FormData
          ? "multipart/form-data"
          : "application/json",
    });
  };

  return { save, saving: state !== "idle", fetcherState: state };
}
