import {
  ONBOARDING_FORMS,
  withoutUnreachable,
  type OnboardingAnswersByForm,
  type OnboardingConsent,
} from "@eli-coach-platform/domain/client-onboarding";
import type { ProgressPhotoView } from "@eli-coach-platform/domain/client-profile";
import { toast } from "@eli-coach-platform/ui/toast";
import {
  useCallback,
  useEffect,
  useEffectEvent,
  useMemo,
  useRef,
  useState,
} from "react";
import { useFetcher, useNavigate } from "react-router";

import { CLIENT_PORTAL_PATH } from "~/features/accounts/contracts/paths";
import {
  missingConsentSchema,
  onboardingRefusalSchema,
  SUBMIT_ONBOARDING_FIELDS,
  submissionProblemsSchema,
  submissionSentSchema,
  type SubmissionProblem,
  type SubmitRequest,
} from "~/features/client-onboarding/contracts/onboarding";
import { SUBMIT_PROBLEM } from "~/features/client-onboarding/contracts/onboarding-copy";
import { CLIENT_ONBOARDING_API_PATHS } from "~/features/client-onboarding/contracts/paths";
import { MEASUREMENTS_COPY } from "~/features/client-profile/contracts/measurements";
import {
  appendProgressPhotoParts,
  refusedPhotoViewsOf,
  type ProgressPhotoPicks,
} from "~/features/client-profile/ui/shared/photos/progress-photo-picks";

import type {
  OnboardingDraftControls,
  WizardDraft,
} from "./use-onboarding-draft";

type SubmissionOutcome =
  | {
      kind: "accepted";
      redirectTo: string;
      refusedPhotoViews: ProgressPhotoView[];
    }
  | { kind: "already-submitted" }
  | { kind: "invalid"; problems: SubmissionProblem[] }
  | { kind: "consent-missing"; consent: OnboardingConsent }
  | { kind: "failed" };

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

const SUBMISSION_FAILED: SubmissionOutcome = { kind: "failed" };

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

function submissionFormData(
  request: SubmitRequest,
  photos: ProgressPhotoPicks,
): FormData {
  const formData = new FormData();
  formData.append(SUBMIT_ONBOARDING_FIELDS.submission, JSON.stringify(request));
  appendProgressPhotoParts(formData, photos);

  return formData;
}

function isAlreadySubmitted(response: unknown): boolean {
  const refusal = onboardingRefusalSchema.safeParse(response);

  return refusal.success && refusal.data.error === "already-submitted";
}

function submissionOutcomeOf(response: unknown): SubmissionOutcome {
  const sent = submissionSentSchema.safeParse(response);
  if (sent.success) {
    return {
      kind: "accepted",
      redirectTo: sent.data.redirectTo,
      refusedPhotoViews: refusedPhotoViewsOf(sent.data.photos),
    };
  }

  if (isAlreadySubmitted(response)) return { kind: "already-submitted" };

  const problems = submissionProblemsSchema.safeParse(response);
  if (problems.success) {
    return { kind: "invalid", problems: problems.data.problems };
  }

  const missingConsent = missingConsentSchema.safeParse(response);

  return missingConsent.success
    ? { kind: "consent-missing", consent: missingConsent.data.consent }
    : SUBMISSION_FAILED;
}

function leavesTheOnboarding(outcome: SubmissionOutcome | null): boolean {
  return outcome?.kind === "accepted" || outcome?.kind === "already-submitted";
}

type SendState = "idle" | "sending";

export function useSendToCoach({
  draftControls,
  onRefused,
}: SendToCoachOptions) {
  const navigate = useNavigate();
  const { data, state, submit } = useFetcher<unknown>();
  const sentDraft = useRef<WizardDraft | null>(null);
  const [submitProblem, setSubmitProblem] = useState<string | null>(null);
  const [answerProblems, setAnswerProblems] =
    useState<readonly SubmissionProblem[]>(NO_PROBLEMS);
  const outcome = useMemo(
    () => (data === undefined ? null : submissionOutcomeOf(data)),
    [data],
  );
  const sendState: SendState =
    state !== "idle" || leavesTheOnboarding(outcome) ? "sending" : "idle";

  const clearSubmitProblem = useCallback(() => setSubmitProblem(null), []);

  const clearAnswerProblems = useCallback(
    () => setAnswerProblems(NO_PROBLEMS),
    [],
  );

  const settle = useEffectEvent((settled: SubmissionOutcome) => {
    if (settled.kind === "accepted") {
      draftControls.discardUnsentDraft();
      settled.refusedPhotoViews.forEach((view) =>
        toast.error(MEASUREMENTS_COPY.toasts.photoRefused(view)),
      );
      void navigate(settled.redirectTo);
      return;
    }

    if (settled.kind === "already-submitted") {
      draftControls.discardUnsentDraft();
      void navigate(CLIENT_PORTAL_PATH);
      return;
    }

    if (settled.kind === "invalid") {
      onRefused(settled);
      setAnswerProblems(settled.problems);
      return;
    }

    if (settled.kind === "consent-missing") {
      onRefused(settled);
      return;
    }

    if (sentDraft.current) draftControls.saveDraft(sentDraft.current);
    setSubmitProblem(SUBMIT_PROBLEM);
  });

  useEffect(() => {
    if (outcome) {
      settle(outcome);
    }
  }, [outcome]);

  const send = (next: WizardDraft, photos: ProgressPhotoPicks) => {
    sentDraft.current = next;
    setSubmitProblem(null);
    draftControls.stopSaving();
    draftControls.replaceDraft(next);

    void submit(
      submissionFormData(
        { answers: reachableAnswers(next.answers), consents: next.consents },
        photos,
      ),
      {
        action: CLIENT_ONBOARDING_API_PATHS.submission,
        defaultShouldRevalidate: false,
        encType: "multipart/form-data",
        method: "post",
      },
    );
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
