import {
  clearsSafetyScreening,
  resolveIntro,
  type OnboardingFormAnswers,
} from "@eli-coach-platform/domain/client-onboarding";
import { useClientReducedMotionPreference } from "@eli-coach-platform/ui/motion";
import { Alert, Stepper } from "@eli-coach-platform/ui/primitives";
import { toast } from "@eli-coach-platform/ui/toast";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useMemo, useRef, useState } from "react";

import type {
  OnboardingConsentInstants,
  OnboardingPage,
} from "~/features/client-onboarding/contracts/onboarding";
import {
  DISCLAIMER_ACKNOWLEDGEMENT,
  MANUAL_SCREENING_MESSAGE,
  MISSING_CONSENT,
  RESUME_NOTE,
  SAVE_LABELS,
  SCREENING_CLEARED_MESSAGE,
  SPECIAL_CATEGORY_CONSENT_COPY,
} from "~/features/client-onboarding/contracts/onboarding-copy";

import { MeasurementSystemField } from "./measurement-system-field";
import { OnboardingConsent, ProgressPhotoConsent } from "./onboarding-consent";
import {
  OnboardingFormCard,
  type ContinueAttempt,
} from "./onboarding-form-card";
import {
  currentStepOf,
  firstSpecialCategoryIndex,
  stepIndexOf,
  stepIndexOfForm,
  stepsOf,
} from "./onboarding-steps";
import {
  useOnboardingDraft,
  type Consent,
  type WizardDraft,
} from "./use-onboarding-draft";
import { useSendToCoach, type SubmissionRefusal } from "./use-send-to-coach";

type OnboardingWizardProps = {
  page: OnboardingPage;
};

type ContinueStage = "answering" | "ready-to-send" | "sending";

const CONTINUE_LABELS: Record<ContinueStage, string> = {
  answering: "Continue",
  "ready-to-send": "Send to my coach",
  sending: "Sending…",
};

const STEP_OFFSET_PX = 16;

const STEP_DURATION_S = 0.2;

export function OnboardingWizard({ page }: OnboardingWizardProps) {
  const reduceMotion = useClientReducedMotionPreference();
  const steps = useMemo(() => stepsOf(page.formIds), [page.formIds]);
  const onboardingDraft = useOnboardingDraft({ page, steps });
  const {
    draft,
    formResetKey,
    grantConsent,
    latestDraft,
    resumed,
    saveDraft,
    saveState,
    withdrawConsent,
  } = onboardingDraft;
  const {
    answerProblems,
    clearAnswerProblems,
    clearSubmitProblem,
    send,
    sendState,
    submitProblem,
  } = useSendToCoach({
    draftControls: onboardingDraft,
    onRefused: (refusal) => showRefusal(refusal),
  });
  const [navigated, setNavigated] = useState(false);
  const [consentProblem, setConsentProblem] = useState<string | null>(null);
  const focusPending = useRef(false);

  const stepIndex = stepIndexOf(steps, draft);
  const step = currentStepOf(steps, draft);
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

  const headingRef = useCallback((heading: HTMLHeadingElement | null) => {
    if (!heading || !focusPending.current) return;
    focusPending.current = false;
    heading.focus();
  }, []);

  const handleAnswers = useCallback(
    (answers: OnboardingFormAnswers) => {
      const current = latestDraft();
      clearSubmitProblem();
      saveDraft({
        ...current,
        answers: {
          ...current.answers,
          [currentStepOf(steps, current).id]: answers,
        },
      });
    },
    [clearSubmitProblem, latestDraft, saveDraft, steps],
  );

  function recordConsent(consent: Consent) {
    return (agreed: boolean) => {
      setConsentProblem(null);
      clearSubmitProblem();
      if (agreed) grantConsent(consent);
      else withdrawConsent(consent);
    };
  }

  function moveTo(next: WizardDraft) {
    focusPending.current =
      next.currentFormIndex !== latestDraft().currentFormIndex;
    setNavigated(true);
    setConsentProblem(null);
    clearSubmitProblem();
    saveDraft(next);
  }

  function goToStep(index: number) {
    moveTo({ ...latestDraft(), currentFormIndex: index });
  }

  function showRefusal(refusal: SubmissionRefusal) {
    if (refusal.kind === "invalid") {
      goToStep(stepIndexOfForm(steps, refusal.problems[0].formId));
      return;
    }

    goToStep(
      refusal.consent === "special-category"
        ? Math.max(0, specialCategoryIndex)
        : steps.length - 1,
    );
    setConsentProblem(MISSING_CONSENT);
  }

  function consentMissing(consents: OnboardingConsentInstants) {
    if (asksSpecialCategory && consents.specialCategoryAt === null) {
      return true;
    }

    return isLastStep && consents.disclaimerAt === null;
  }

  function continueFrom(attempt: ContinueAttempt) {
    const current = latestDraft();
    const missingConsent = consentMissing(current.consents);
    setConsentProblem(missingConsent ? MISSING_CONSENT : null);

    if (
      attempt.kind === "incomplete" ||
      missingConsent ||
      sendState === "sending"
    ) {
      return;
    }

    const next: WizardDraft = {
      ...current,
      answers: { ...current.answers, [step.id]: attempt.answers },
      currentFormIndex: isLastStep ? stepIndex : stepIndex + 1,
    };

    if (
      step.id === "safety-screening" &&
      !manualScreening &&
      clearsSafetyScreening(next.answers)
    ) {
      toast.success(SCREENING_CLEARED_MESSAGE);
    }

    clearAnswerProblems();

    if (isLastStep) {
      void send(next);
      return;
    }

    moveTo(next);
  }

  function continueStage(): ContinueStage {
    if (!isLastStep) return "answering";
    if (sendState === "sending") return "sending";

    return "ready-to-send";
  }

  function back() {
    clearAnswerProblems();
    goToStep(stepIndex - 1);
  }

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

      {submitProblem && <Alert className="mb-4">{submitProblem}</Alert>}

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
                  onChange={recordConsent("specialCategory")}
                  problem={consentProblem}
                  statement={resolveIntro(
                    SPECIAL_CATEGORY_CONSENT_COPY,
                    page.gender,
                  )}
                />
              ) : null
            }
            continueLabel={CONTINUE_LABELS[continueStage()]}
            definition={cardDefinition}
            headingRef={headingRef}
            intro={resolveIntro(step.intro, page.gender)}
            key={`${step.id}-${formResetKey}`}
            onBack={stepIndex === 0 ? null : back}
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
                  onConsentChange={recordConsent("progressPhotos")}
                />
                <OnboardingConsent
                  agreement="disclaimer"
                  checked={draft.consents.disclaimerAt !== null}
                  onChange={recordConsent("disclaimer")}
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
