import {
  clearsSafetyScreening,
  hasStartedAnswering,
  ONBOARDING_FORMS,
  resolveIntro,
  withoutUnreachable,
  type OnboardingAnswersByForm,
  type OnboardingFormAnswers,
  type OnboardingFormDefinition,
  type OnboardingFormId,
} from "@eli-coach-platform/domain/client-onboarding";
import { useClientReducedMotionPreference } from "@eli-coach-platform/ui/motion";
import { Alert, Stepper } from "@eli-coach-platform/ui/primitives";
import { toast } from "@eli-coach-platform/ui/toast";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router";

import { CLIENT_PORTAL_PATH } from "~/features/accounts/contracts/paths";
import type {
  OnboardingConsentInstants,
  OnboardingPage,
  SaveDraftRequest,
  SubmissionProblem,
} from "~/features/client-onboarding/contracts/onboarding";
import {
  DISCLAIMER_ACKNOWLEDGEMENT,
  MANUAL_SCREENING_MESSAGE,
  MISSING_CONSENT,
  RESUME_NOTE,
  SAVE_LABELS,
  SCREENING_CLEARED_MESSAGE,
  SPECIAL_CATEGORY_CONSENT_COPY,
  SUBMIT_PROBLEM,
} from "~/features/client-onboarding/contracts/onboarding-copy";

import { takePendingDraft } from "./draft-sync";
import { MeasurementSystemField } from "./measurement-system-field";
import { submitOnboarding } from "./onboarding-api-client";
import {
  OnboardingConsent,
  ProgressPhotoConsent,
  type ConsentAgreement,
} from "./onboarding-consent";
import { OnboardingFormCard } from "./onboarding-form-card";
import { useDraftSync } from "./use-draft-sync";

type WizardDraft = Omit<SaveDraftRequest, "formId">;

type OnboardingWizardProps = {
  page: OnboardingPage;
};

type ConsentKey = keyof OnboardingConsentInstants;

const CONSENT_KEYS: Record<ConsentAgreement, ConsentKey> = {
  specialCategory: "specialCategoryAt",
  disclaimer: "disclaimerAt",
};

const STEP_OFFSET_PX = 16;

const STEP_DURATION_S = 0.2;

const CONTINUE_LABEL = "Continue";

const SEND_LABEL = "Send to my coach";

const SENDING_LABEL = "Sending…";

const NO_PROBLEMS: readonly SubmissionProblem[] = [];

function stepsOf(
  formIds: readonly OnboardingFormId[],
): OnboardingFormDefinition[] {
  return formIds.flatMap((formId) =>
    ONBOARDING_FORMS.filter((form) => form.id === formId),
  );
}

function wizardDraftOf({
  answers,
  consents,
  currentFormIndex,
}: WizardDraft): WizardDraft {
  return { answers, consents, currentFormIndex };
}

function stepIndexOf(
  steps: readonly OnboardingFormDefinition[],
  currentFormIndex: number,
): number {
  return Math.min(currentFormIndex, steps.length - 1);
}

function saveRequestOf(
  steps: readonly OnboardingFormDefinition[],
  draft: WizardDraft,
): SaveDraftRequest {
  const step = steps[stepIndexOf(steps, draft.currentFormIndex)];

  return { ...draft, formId: step.id };
}

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

function firstSpecialCategoryIndex(
  steps: readonly OnboardingFormDefinition[],
): number {
  return steps.findIndex((step) => step.sensitivity === "special-category");
}

function withConsent(
  consents: OnboardingConsentInstants,
  { agreement, agreed }: { agreement: ConsentAgreement; agreed: boolean },
): OnboardingConsentInstants {
  return {
    ...consents,
    [CONSENT_KEYS[agreement]]: agreed ? new Date().toISOString() : null,
  };
}

function continueLabelOf({
  isLastStep,
  sending,
}: {
  isLastStep: boolean;
  sending: boolean;
}): string {
  if (!isLastStep) return CONTINUE_LABEL;

  return sending ? SENDING_LABEL : SEND_LABEL;
}

export function OnboardingWizard({ page }: OnboardingWizardProps) {
  const navigate = useNavigate();
  const reduceMotion = useClientReducedMotionPreference();
  const steps = useMemo(() => stepsOf(page.formIds), [page.formIds]);
  const { forget, queue, resend, saveState, stop } = useDraftSync(
    page.clientId,
  );

  const [draft, setDraft] = useState<WizardDraft>(() =>
    wizardDraftOf(page.draft),
  );
  const [resumed, setResumed] = useState(page.resumed);
  const [revision, setRevision] = useState(0);
  const [navigated, setNavigated] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const [consentProblem, setConsentProblem] = useState<string | null>(null);
  const [answerProblems, setAnswerProblems] =
    useState<readonly SubmissionProblem[]>(NO_PROBLEMS);
  const [sending, setSending] = useState(false);

  const draftRef = useRef(draft);
  const focusPending = useRef(false);

  const stepIndex = stepIndexOf(steps, draft.currentFormIndex);
  const step = steps[stepIndex];
  const isLastStep = stepIndex === steps.length - 1;
  const specialCategoryIndex = firstSpecialCategoryIndex(steps);
  const asksSpecialCategory = stepIndex === specialCategoryIndex;
  const manualScreening =
    step.id === "safety-screening" && page.manualScreening;
  const cardDefinition = manualScreening ? { ...step, fields: [] } : step;
  const stepProblems = useMemo(
    () => answerProblems.filter((entry) => entry.formId === step.id),
    [answerProblems, step.id],
  );

  const persist = useCallback(
    (next: WizardDraft) => {
      draftRef.current = next;
      setDraft(next);
      setProblem(null);
      queue(saveRequestOf(steps, next));
    },
    [queue, steps],
  );

  useEffect(() => {
    const pending = takePendingDraft({
      clientId: page.clientId,
      serverUpdatedAt: page.draft.updatedAt,
    });
    if (!pending) return;

    const buffered = wizardDraftOf(pending.draft);
    draftRef.current = buffered;
    setDraft(buffered);
    setRevision((current) => current + 1);
    setResumed((current) => current || hasStartedAnswering(buffered.answers));
    resend(pending);
  }, [page.clientId, page.draft.updatedAt, resend]);

  const headingRef = useCallback((heading: HTMLHeadingElement | null) => {
    if (!heading || !focusPending.current) return;
    focusPending.current = false;
    heading.focus();
  }, []);

  const handleAnswers = useCallback(
    (answers: OnboardingFormAnswers) => {
      const current = draftRef.current;
      const formId = steps[stepIndexOf(steps, current.currentFormIndex)].id;

      persist({
        ...current,
        answers: { ...current.answers, [formId]: answers },
      });
    },
    [persist, steps],
  );

  const agree = (agreement: ConsentAgreement) => (agreed: boolean) => {
    const current = draftRef.current;
    setConsentProblem(null);
    persist({
      ...current,
      consents: withConsent(current.consents, { agreement, agreed }),
    });
  };

  const moveTo = (next: WizardDraft) => {
    focusPending.current =
      next.currentFormIndex !== draftRef.current.currentFormIndex;
    setNavigated(true);
    setConsentProblem(null);
    setAnswerProblems(NO_PROBLEMS);
    persist(next);
  };

  const goToStep = (index: number) => {
    moveTo({ ...draftRef.current, currentFormIndex: index });
  };

  const consentMissing = (consents: OnboardingConsentInstants) => {
    if (asksSpecialCategory && consents.specialCategoryAt === null) {
      return true;
    }

    return isLastStep && consents.disclaimerAt === null;
  };

  const reviewConsent = () => {
    setConsentProblem(
      consentMissing(draftRef.current.consents) ? MISSING_CONSENT : null,
    );
  };

  const sendToCoach = async (next: WizardDraft) => {
    setSending(true);
    setProblem(null);
    stop();
    draftRef.current = next;
    setDraft(next);

    const outcome = await submitOnboarding({
      answers: reachableAnswers(next.answers),
      consents: next.consents,
    });

    if (outcome.kind === "accepted" || outcome.kind === "already-submitted") {
      forget();
      void navigate(
        outcome.kind === "accepted" ? outcome.redirectTo : CLIENT_PORTAL_PATH,
      );
      return;
    }

    setSending(false);

    if (outcome.kind === "invalid") {
      const [first] = outcome.problems;
      goToStep(
        Math.max(
          0,
          steps.findIndex((form) => form.id === first.formId),
        ),
      );
      setAnswerProblems(outcome.problems);
      return;
    }

    if (outcome.kind === "consent-missing") {
      goToStep(
        outcome.consent === "special-category"
          ? Math.max(0, specialCategoryIndex)
          : steps.length - 1,
      );
      setConsentProblem(MISSING_CONSENT);
      return;
    }

    persist(next);
    setProblem(SUBMIT_PROBLEM);
  };

  const continueFrom = (answers: OnboardingFormAnswers) => {
    const current = draftRef.current;

    if (sending || consentMissing(current.consents)) return;

    const next: WizardDraft = {
      ...current,
      answers: { ...current.answers, [step.id]: answers },
      currentFormIndex: isLastStep ? stepIndex : stepIndex + 1,
    };

    if (
      step.id === "safety-screening" &&
      !manualScreening &&
      clearsSafetyScreening(next.answers)
    ) {
      toast.success(SCREENING_CLEARED_MESSAGE);
    }

    if (isLastStep) {
      void sendToCoach(next);
      return;
    }

    moveTo(next);
  };

  const back = stepIndex === 0 ? null : () => goToStep(stepIndex - 1);
  const offset = reduceMotion ? 0 : STEP_OFFSET_PX;

  return (
    <div data-parity-root="OnboardingWizard">
      <div className="mb-6 grid gap-2 px-6 sm:px-8 lg:px-10">
        <Stepper
          className="w-full"
          current={stepIndex + 1}
          data-parity="stepper"
          status={
            <p
              aria-live="polite"
              className="text-caption font-medium text-text-secondary"
              data-parity="save-status"
              role="status"
            >
              {SAVE_LABELS[saveState]}
            </p>
          }
          total={steps.length}
        />
        {resumed && (
          <p
            className="text-sm text-text-secondary"
            data-parity="resume-note"
            role="status"
          >
            {RESUME_NOTE}
          </p>
        )}
      </div>

      {problem && <Alert className="mb-4">{problem}</Alert>}

      <AnimatePresence mode="wait">
        <motion.div
          animate={{ opacity: 1, x: 0 }}
          exit={reduceMotion ? undefined : { opacity: 0, x: -offset }}
          initial={
            reduceMotion || !navigated ? false : { opacity: 0, x: offset }
          }
          key={stepIndex}
          transition={{ duration: reduceMotion ? 0 : STEP_DURATION_S }}
        >
          <OnboardingFormCard
            answers={draft.answers[step.id]}
            consent={
              asksSpecialCategory ? (
                <OnboardingConsent
                  agreement="specialCategory"
                  checked={draft.consents.specialCategoryAt !== null}
                  onChange={agree("specialCategory")}
                  problem={consentProblem}
                  statement={resolveIntro(
                    SPECIAL_CATEGORY_CONSENT_COPY,
                    page.gender,
                  )}
                />
              ) : null
            }
            continueLabel={continueLabelOf({ isLastStep, sending })}
            definition={cardDefinition}
            headingRef={headingRef}
            intro={resolveIntro(step.intro, page.gender)}
            key={`${step.id}-${revision}`}
            onAttempt={reviewConsent}
            onBack={back}
            onChange={handleAnswers}
            onContinue={continueFrom}
            problems={stepProblems}
            unitsChoice={stepIndex === 0 ? <MeasurementSystemField /> : null}
          >
            {manualScreening && (
              <p className="text-sm text-text-secondary">
                {MANUAL_SCREENING_MESSAGE}
              </p>
            )}
            {isLastStep && (
              <>
                <ProgressPhotoConsent
                  consented={draft.consents.progressPhotosAt !== null}
                  onConsentChange={(consented) =>
                    persist({
                      ...draftRef.current,
                      consents: {
                        ...draftRef.current.consents,
                        progressPhotosAt: consented
                          ? new Date().toISOString()
                          : null,
                      },
                    })
                  }
                />
                <OnboardingConsent
                  agreement="disclaimer"
                  checked={draft.consents.disclaimerAt !== null}
                  onChange={agree("disclaimer")}
                  problem={consentProblem}
                  statement={DISCLAIMER_ACKNOWLEDGEMENT}
                />
              </>
            )}
          </OnboardingFormCard>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
