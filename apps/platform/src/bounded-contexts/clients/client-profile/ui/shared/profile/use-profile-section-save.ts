import { toast } from "~/shared/design-system/toast";
import { useEffect, useEffectEvent, useRef } from "react";
import type { FieldPath, FieldValues, UseFormReturn } from "react-hook-form";
import { useFetcher, type SubmitTarget } from "react-router";

import { PROFILE_SAVE_TOASTS } from "./profile-form-section";

type AnswerReading<Answer> =
  { success: true; data: Answer } | { success: false };

type AnswerSchema<Answer> = {
  safeParse: (answer: unknown) => AnswerReading<Answer>;
};

type ProfileSectionEndpoint<Problems> = {
  action: string;
  savedAnswer: AnswerSchema<{ status: "saved" }>;
  problemsAnswer: AnswerSchema<{ problems: Problems }>;
};

type ProfileProblemMessage<Values extends FieldValues> = {
  field: FieldPath<Values>;
  message: string;
};

type ProfileSectionSave<Values extends FieldValues, Problems> = {
  form: UseFormReturn<Values>;
  endpoint: ProfileSectionEndpoint<Problems>;
  problemMessagesOf: (problems: Problems) => ProfileProblemMessage<Values>[];
};

export function useProfileSectionSave<Values extends FieldValues, Problems>({
  form,
  endpoint,
  problemMessagesOf,
}: ProfileSectionSave<Values, Problems>) {
  const { data, state, submit } = useFetcher<unknown>();
  const submitted = useRef<Values | null>(null);

  const showProblems = (answer: unknown) => {
    const refused = endpoint.problemsAnswer.safeParse(answer);
    const problems = refused.success
      ? problemMessagesOf(refused.data.problems)
      : [];

    if (problems.length === 0) {
      toast.error(PROFILE_SAVE_TOASTS.unsaved);
      return;
    }

    problems.forEach(({ field, message }, index) =>
      form.setError(field, { message }, { shouldFocus: index === 0 }),
    );
  };

  const settle = useEffectEvent((answer: unknown) => {
    const values = submitted.current;
    submitted.current = null;

    if (!values) return;

    if (endpoint.savedAnswer.safeParse(answer).success) {
      form.reset(values);
      toast.success(PROFILE_SAVE_TOASTS.saved);
      return;
    }

    showProblems(answer);
  });

  useEffect(() => {
    if (data !== undefined) {
      settle(data);
    }
  }, [data]);

  const save = (values: Values, request: SubmitTarget) => {
    if (submitted.current) return;

    submitted.current = values;
    void submit(request, {
      action: endpoint.action,
      encType: "application/json",
      method: "put",
    });
  };

  return { save, saving: state !== "idle" };
}
