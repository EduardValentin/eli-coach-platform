import {
  ONBOARDING_FORMS,
  withoutUnreachable,
  type OnboardingAnswersByForm,
} from "@eli-coach-platform/domain/client-onboarding";
import { useCallback, useState } from "react";
import { useNavigate } from "react-router";

import { CLIENT_PORTAL_PATH } from "~/features/accounts/contracts/paths";
import type { SubmissionProblem } from "~/features/client-onboarding/contracts/onboarding";
import { SUBMIT_PROBLEM } from "~/features/client-onboarding/contracts/onboarding-copy";

import {
  submitOnboarding,
  type SubmissionOutcome,
} from "./onboarding-api-client";
import type {
  OnboardingDraftControls,
  WizardDraft,
} from "./use-onboarding-draft";

export type SubmissionRefusal = Extract<
  SubmissionOutcome,
  { kind: "invalid" | "consent-missing" }
>;

type SendToCoachOptions = {
  draft: Pick<
    OnboardingDraftControls,
    "discardUnsentDraft" | "replaceDraft" | "saveDraft" | "stopSaving"
  >;
  onRefused: (refusal: SubmissionRefusal) => void;
};

const NO_PROBLEMS: readonly SubmissionProblem[] = [];

function reachableAnswers(
  answers: OnboardingAnswersByForm,
): OnboardingAnswersByForm {
  return Object.fromEntries(
    ONBOARDING_FORMS.map((form) => [
      form.id,
      withoutUnreachable(form.fields, answers[form.id]),
    ]),
  ) as OnboardingAnswersByForm;
}

export function useSendToCoach({ draft, onRefused }: SendToCoachOptions) {
  const navigate = useNavigate();
  const [sending, setSending] = useState(false);
  const [submitProblem, setSubmitProblem] = useState<string | null>(null);
  const [answerProblems, setAnswerProblems] =
    useState<readonly SubmissionProblem[]>(NO_PROBLEMS);

  const clearSubmitProblem = useCallback(() => setSubmitProblem(null), []);

  const clearAnswerProblems = useCallback(
    () => setAnswerProblems(NO_PROBLEMS),
    [],
  );

  const send = async (next: WizardDraft) => {
    setSending(true);
    setSubmitProblem(null);
    draft.stopSaving();
    draft.replaceDraft(next);

    const outcome = await submitOnboarding({
      answers: reachableAnswers(next.answers),
      consents: next.consents,
    });

    if (outcome.kind === "accepted" || outcome.kind === "already-submitted") {
      draft.discardUnsentDraft();
      void navigate(
        outcome.kind === "accepted" ? outcome.redirectTo : CLIENT_PORTAL_PATH,
      );
      return;
    }

    setSending(false);

    if (outcome.kind === "invalid" || outcome.kind === "consent-missing") {
      onRefused(outcome);
      if (outcome.kind === "invalid") setAnswerProblems(outcome.problems);
      return;
    }

    draft.saveDraft(next);
    setSubmitProblem(SUBMIT_PROBLEM);
  };

  return {
    answerProblems,
    clearAnswerProblems,
    clearSubmitProblem,
    send,
    sending,
    submitProblem,
  };
}
