import { useCallback, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useNavigate } from 'react-router';
import { useClientJourneys } from '../../../context/ClientJourneyContext';
import {
  DISCLAIMER_ACKNOWLEDGEMENT,
  SPECIAL_CATEGORY_CONSENT_COPY,
} from '../../../domain/onboardingCopy';
import { submittedMeasurementEntry } from '../../../domain/measurements';
import {
  formsForSex,
  type OnboardingFormDefinition,
} from '../../../domain/onboardingSchema';
import type {
  JourneyOnboarding,
  OnboardingConsents,
  OnboardingDraft,
  OnboardingFormAnswers,
} from '../../../domain/journey';
import {
  forgetDraft,
  loadDraft,
  saveDraft,
  submit,
} from '../../../services/onboardingService';
import { Alert } from '../../ui/alert';
import { Stepper } from '../../ui/stepper';
import { OnboardingConsent } from './OnboardingConsent';
import { OnboardingFormCard } from './OnboardingFormCard';
import {
  EMPTY_PROGRESS_PHOTOS,
  ProgressPhotoBlock,
  type ProgressPhotos,
} from './ProgressPhotoBlock';

const SAVE_DEBOUNCE_MS = 400;

const SUBMIT_PROBLEM =
  "Your answers could not be sent just now. They're saved — try again in a moment.";

const MISSING_CONSENT = 'Tick the box to carry on.';

const RESUME_NOTE = 'Picking up where you left off.';

type ConsentKey = 'specialCategory' | 'disclaimer';

type SaveState = 'idle' | 'saving' | 'saved';

const SAVE_LABELS: Record<SaveState, string> = {
  idle: '',
  saving: 'Saving…',
  saved: 'Saved',
};

function draftOf(onboarding: JourneyOnboarding): OnboardingDraft {
  return {
    answers: onboarding.answers,
    currentFormIndex: onboarding.currentFormIndex,
    consents: onboarding.consents,
  };
}

function firstSpecialCategoryIndex(
  steps: readonly OnboardingFormDefinition[],
): number {
  return steps.findIndex((step) => step.sensitivity === 'special-category');
}

function withConsent(
  consents: OnboardingConsents,
  key: ConsentKey,
  agreed: boolean,
): OnboardingConsents {
  return key === 'disclaimer'
    ? { ...consents, disclaimer: agreed }
    : { ...consents, specialCategory: agreed };
}

function problemMessage(problem: unknown): string {
  return problem instanceof Error ? problem.message : SUBMIT_PROBLEM;
}

export function OnboardingWizard() {
  const navigate = useNavigate();
  const { addMeasurements, demoJourney, saveOnboardingDraft, submitOnboarding } =
    useClientJourneys();
  const prefersReducedMotion = useReducedMotion() ?? false;
  const journeyId = demoJourney.callId;

  const steps = useMemo(
    () => formsForSex(demoJourney.identity.sex),
    [demoJourney.identity.sex],
  );

  const [savedDraft] = useState(() => loadDraft(journeyId));
  const [draft, setDraft] = useState<OnboardingDraft>(
    () => savedDraft ?? draftOf(demoJourney.onboarding),
  );
  const [photos, setPhotos] = useState<ProgressPhotos>(EMPTY_PROGRESS_PHOTOS);
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [problem, setProblem] = useState<string | null>(null);
  const [consentProblem, setConsentProblem] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  const draftRef = useRef(draft);
  draftRef.current = draft;
  const saveTimer = useRef<number | null>(null);
  const saving = useRef<Promise<unknown> | null>(null);
  const focusPending = useRef(false);

  const stepIndex = Math.min(draft.currentFormIndex, steps.length - 1);
  const step = steps[stepIndex];
  const isLastStep = stepIndex === steps.length - 1;
  const asksSpecialCategory = stepIndex === firstSpecialCategoryIndex(steps);

  const persist = useCallback(
    (next: OnboardingDraft) => {
      setDraft(next);
      setSaveState('saving');
      setProblem(null);

      if (saveTimer.current !== null) window.clearTimeout(saveTimer.current);
      saveTimer.current = window.setTimeout(() => {
        saveOnboardingDraft(journeyId, next);
        saving.current = saveDraft(journeyId, next)
          .then(() => setSaveState('saved'))
          .catch((failure) => {
            setSaveState('idle');
            setProblem(problemMessage(failure));
          });
      }, SAVE_DEBOUNCE_MS);
    },
    [journeyId, saveOnboardingDraft],
  );

  const headingRef = useCallback((heading: HTMLHeadingElement | null) => {
    if (!heading || !focusPending.current) return;
    focusPending.current = false;
    heading.focus();
  }, []);

  const handleAnswers = useCallback(
    (answers: OnboardingFormAnswers) => {
      const current = draftRef.current;
      const index = Math.min(current.currentFormIndex, steps.length - 1);

      persist({
        ...current,
        answers: { ...current.answers, [steps[index].id]: answers },
      });
    },
    [persist, steps],
  );

  const agree = (key: ConsentKey) => (agreed: boolean) => {
    const current = draftRef.current;
    setConsentProblem(null);
    persist({ ...current, consents: withConsent(current.consents, key, agreed) });
  };

  const goToStep = (index: number) => {
    focusPending.current = true;
    setConsentProblem(null);
    persist({ ...draftRef.current, currentFormIndex: index });
  };

  const sendToCoach = async (next: OnboardingDraft) => {
    setSending(true);
    setProblem(null);
    if (saveTimer.current !== null) window.clearTimeout(saveTimer.current);
    saveOnboardingDraft(journeyId, next);

    try {
      const submitted = await submit(journeyId);
      await saving.current;
      const entry = submittedMeasurementEntry(next.answers, submitted.submittedAt);
      if (entry) addMeasurements(journeyId, entry);
      submitOnboarding(journeyId, submitted.submittedAt);
      forgetDraft(journeyId);
      navigate('/portal');
    } catch (failure) {
      setSending(false);
      setProblem(problemMessage(failure));
    }
  };

  const consentMissing = (consents: OnboardingConsents) => {
    if (asksSpecialCategory && !consents.specialCategory) return true;

    return isLastStep && !consents.disclaimer;
  };

  const reviewConsent = () => {
    setConsentProblem(
      consentMissing(draftRef.current.consents) ? MISSING_CONSENT : null,
    );
  };

  const continueFrom = (answers: OnboardingFormAnswers) => {
    const current = draftRef.current;

    if (consentMissing(current.consents)) return;

    const next: OnboardingDraft = {
      ...current,
      answers: { ...current.answers, [step.id]: answers },
      currentFormIndex: isLastStep ? stepIndex : stepIndex + 1,
    };

    if (isLastStep) {
      void sendToCoach(next);
      return;
    }

    focusPending.current = true;
    persist(next);
  };

  const back = stepIndex === 0 ? null : () => goToStep(stepIndex - 1);
  const offset = prefersReducedMotion ? 0 : 16;

  return (
    <>
      <div className="mb-6 grid gap-2">
        <div className="flex items-end justify-between gap-4">
          <Stepper className="w-full max-w-xs" current={stepIndex + 1} total={steps.length} />
          <p
            aria-live="polite"
            className="shrink-0 text-caption font-medium text-text-secondary"
            role="status"
          >
            {SAVE_LABELS[saveState]}
          </p>
        </div>
        {savedDraft && (
          <p className="text-sm text-text-secondary" role="status">
            {RESUME_NOTE}
          </p>
        )}
      </div>

      {problem && <Alert className="mb-4">{problem}</Alert>}

      <AnimatePresence mode="wait">
        <motion.div
          animate={{ opacity: 1, x: 0 }}
          exit={prefersReducedMotion ? undefined : { opacity: 0, x: -offset }}
          initial={prefersReducedMotion ? false : { opacity: 0, x: offset }}
          key={stepIndex}
          transition={{ duration: prefersReducedMotion ? 0 : 0.2 }}
        >
          <OnboardingFormCard
            answers={draft.answers[step.id]}
            consent={
              asksSpecialCategory ? (
                <OnboardingConsent
                  checked={draft.consents.specialCategory}
                  onChange={agree('specialCategory')}
                  problem={consentProblem}
                  statement={SPECIAL_CATEGORY_CONSENT_COPY[demoJourney.identity.sex]}
                />
              ) : null
            }
            continueLabel={
              isLastStep ? (sending ? 'Sending…' : 'Send to my coach') : 'Continue'
            }
            definition={step}
            headingRef={headingRef}
            key={step.id}
            onAttempt={reviewConsent}
            onBack={back}
            onChange={handleAnswers}
            onContinue={continueFrom}
          >
            {isLastStep && (
              <>
                <ProgressPhotoBlock
                  consented={draft.consents.progressPhotos}
                  onConsentChange={(consented) =>
                    persist({
                      ...draftRef.current,
                      consents: {
                        ...draftRef.current.consents,
                        progressPhotos: consented,
                      },
                    })
                  }
                  onPhotosChange={setPhotos}
                  photos={photos}
                />
                <OnboardingConsent
                  checked={draft.consents.disclaimer}
                  onChange={agree('disclaimer')}
                  problem={consentProblem}
                  statement={DISCLAIMER_ACKNOWLEDGEMENT}
                />
              </>
            )}
          </OnboardingFormCard>
        </motion.div>
      </AnimatePresence>
    </>
  );
}
