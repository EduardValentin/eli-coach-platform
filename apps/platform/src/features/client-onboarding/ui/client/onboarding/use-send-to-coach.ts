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
  draftControls: Pick<
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

export type SendState = "idle" | "sending";

export function useSendToCoach({
  draftControls,
  onRefused,
}: SendToCoachOptions) {
  const navigate = useNavigate();
  const [sendState, setSendState] = useState<SendState>("idle");
  const [submitProblem, setSubmitProblem] = useState<string | null>(null);
  const [answerProblems, setAnswerProblems] =
    useState<readonly SubmissionProblem[]>(NO_PROBLEMS);

  const clearSubmitProblem = useCallback(() => setSubmitProblem(null), []);

  const clearAnswerProblems = useCallback(
    () => setAnswerProblems(NO_PROBLEMS),
    [],
  );

  const send = async (next: WizardDraft) => {
    setSendState("sending");
    setSubmitProblem(null);
    draftControls.stopSaving();
    draftControls.replaceDraft(next);

    const outcome = await submitOnboarding({
      answers: reachableAnswers(next.answers),
      consents: next.consents,
    });

    if (outcome.kind === "accepted" || outcome.kind === "already-submitted") {
      draftControls.discardUnsentDraft();
      void navigate(
        outcome.kind === "accepted" ? outcome.redirectTo : CLIENT_PORTAL_PATH,
      );
      return;
    }

    setSendState("idle");

    if (outcome.kind === "invalid") {
      onRefused(outcome);
      setAnswerProblems(outcome.problems);
      return;
    }

    if (outcome.kind === "consent-missing") {
      onRefused(outcome);
      return;
    }

    draftControls.saveDraft(next);
    setSubmitProblem(SUBMIT_PROBLEM);
  };

  return {
    answerProblems,
    clearAnswerProblems,
    clearSubmitProblem,
    send,
    sendState,
    submitProblem,
  };
}
