import { useEffect, useEffectEvent, useRef } from "react";
import { useFetcher, type SubmitTarget } from "react-router";

type AnswerReading<Answer> =
  { success: true; data: Answer } | { success: false };

type AnswerSchema<Answer> = {
  safeParse: (answer: unknown) => AnswerReading<Answer>;
};

export type ProfileSectionOutcome<Problems> =
  | { status: "saved" }
  | { status: "invalid"; problems: Problems }
  | { status: "failed" };

type ProfileSectionSave<Problems> = {
  action: string;
  savedAnswer: AnswerSchema<{ status: "saved" }>;
  problemsAnswer: AnswerSchema<{ problems: Problems }>;
  onSettled: (outcome: ProfileSectionOutcome<Problems>) => void;
};

export function useProfileSectionSave<Problems>({
  action,
  savedAnswer,
  problemsAnswer,
  onSettled,
}: ProfileSectionSave<Problems>) {
  const { data, state, submit } = useFetcher<unknown>();
  const awaitingAnswer = useRef(false);

  const outcomeOf = (answer: unknown): ProfileSectionOutcome<Problems> => {
    if (savedAnswer.safeParse(answer).success) return { status: "saved" };

    const refused = problemsAnswer.safeParse(answer);

    return refused.success
      ? { status: "invalid", problems: refused.data.problems }
      : { status: "failed" };
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

  const save = (body: SubmitTarget) => {
    if (awaitingAnswer.current) return;

    awaitingAnswer.current = true;
    void submit(body, {
      action,
      encType: "application/json",
      method: "put",
    });
  };

  return { save, saving: state !== "idle" };
}
