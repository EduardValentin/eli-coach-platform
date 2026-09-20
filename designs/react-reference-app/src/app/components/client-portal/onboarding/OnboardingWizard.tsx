import { useCallback, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useNavigate } from 'react-router';
import { useClientJourneys } from '../../../context/ClientJourneyContext';
import {
  DISCLAIMER_ACKNOWLEDGEMENT,
  SPECIAL_CATEGORY_CONSENT_COPY,
} from '../../../domain/onboardingCopy';
import { measurementEntryFrom } from '../../../domain/measurements';
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
import { ConsentCard } from './ConsentCard';
import { OnboardingFormCard } from './OnboardingFormCard';
import {
  EMPTY_PROGRESS_PHOTOS,
  ProgressPhotoConsent,
  type ProgressPhotos,
} from './ProgressPhotoConsent';

const SAVE_DEBOUNCE_MS = 400;

const SUBMIT_PROBLEM =
  "Your answers could not be sent just now. They're saved — try again in a moment.";

const CONSENT_TITLES = {
  disclaimer: 'Before we start',
  'special-category': 'About the next questions',
};

const CONSENT_INTROS = {
  disclaimer: 'One thing to confirm, then we get going.',
  'special-category': 'Read this, then tick the box to carry on.',
};

const CONSENT_STATEMENTS = {
  disclaimer: DISCLAIMER_ACKNOWLEDGEMENT,
  'special-category': SPECIAL_CATEGORY_CONSENT_COPY,
};

type ConsentGate = keyof typeof CONSENT_TITLES;

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

function restoredDraft(
  journeyId: string,
  onboarding: JourneyOnboarding,
): OnboardingDraft {
  return loadDraft(journeyId) ?? draftOf(onboarding);
}

function pendingConsent(
  step: OnboardingFormDefinition,
  stepIndex: number,
  consents: OnboardingConsents,
): ConsentGate | null {
  if (stepIndex === 0 && !consents.disclaimer) return 'disclaimer';
  if (step.sensitivity === 'special-category' && !consents.specialCategory) {
    return 'special-category';
  }

  return null;
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

  const [draft, setDraft] = useState<OnboardingDraft>(() =>
    restoredDraft(journeyId, demoJourney.onboarding),
  );
  const [photos, setPhotos] = useState<ProgressPhotos>(EMPTY_PROGRESS_PHOTOS);
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [problem, setProblem] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  const draftRef = useRef(draft);
  draftRef.current = draft;
  const saveTimer = useRef<number | null>(null);
  const saving = useRef<Promise<unknown> | null>(null);
  const focusPending = useRef(false);

  const stepIndex = Math.min(draft.currentFormIndex, steps.length - 1);
  const step = steps[stepIndex];
  const gate = pendingConsent(step, stepIndex, draft.consents);
  const isLastStep = stepIndex === steps.length - 1;

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

  const agree = (consent: ConsentGate) => {
    const current = draftRef.current;
    const consents: OnboardingConsents =
      consent === 'disclaimer'
        ? { ...current.consents, disclaimer: true }
        : { ...current.consents, specialCategory: true };

    focusPending.current = true;
    persist({ ...current, consents });
  };

  const goToStep = (index: number) => {
    focusPending.current = true;
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
      const entry = measurementEntryFrom(next.answers.measurements, submitted.submittedAt);
      if (entry) addMeasurements(journeyId, entry);
      submitOnboarding(journeyId, submitted.submittedAt);
      forgetDraft(journeyId);
      navigate('/portal');
    } catch (failure) {
      setSending(false);
      setProblem(problemMessage(failure));
    }
  };

  const continueFrom = (answers: OnboardingFormAnswers) => {
    const current = draftRef.current;
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

  const back = stepIndex === 0 && gate === 'disclaimer' ? null : () => goToStep(Math.max(stepIndex - 1, 0));
  const offset = prefersReducedMotion ? 0 : 16;

  return (
    <>
      <div className="mb-6 flex items-end justify-between gap-4">
        <Stepper className="w-full max-w-xs" current={stepIndex + 1} total={steps.length} />
        <p
          aria-live="polite"
          className="shrink-0 text-caption font-medium text-text-secondary"
          role="status"
        >
          {SAVE_LABELS[saveState]}
        </p>
      </div>

      {problem && <Alert className="mb-4">{problem}</Alert>}

      <AnimatePresence mode="wait">
        <motion.div
          animate={{ opacity: 1, x: 0 }}
          exit={prefersReducedMotion ? undefined : { opacity: 0, x: -offset }}
          initial={prefersReducedMotion ? false : { opacity: 0, x: offset }}
          key={`${stepIndex}-${gate ?? 'form'}`}
          transition={{ duration: prefersReducedMotion ? 0 : 0.2 }}
        >
          {gate ? (
            <ConsentCard
              headingRef={headingRef}
              intro={CONSENT_INTROS[gate]}
              onAgree={() => agree(gate)}
              onBack={back}
              statement={CONSENT_STATEMENTS[gate]}
              title={CONSENT_TITLES[gate]}
            />
          ) : (
            <OnboardingFormCard
              answers={draft.answers[step.id]}
              continueLabel={
                isLastStep ? (sending ? 'Sending…' : 'Send to my coach') : 'Continue'
              }
              definition={step}
              headingRef={headingRef}
              key={step.id}
              onBack={back}
              onChange={handleAnswers}
              onContinue={continueFrom}
            >
              {isLastStep && (
                <ProgressPhotoConsent
                  consented={draft.consents.progressPhotos}
                  onConsentChange={(consented) =>
                    persist({
                      ...draftRef.current,
                      consents: { ...draftRef.current.consents, progressPhotos: consented },
                    })
                  }
                  onPhotosChange={setPhotos}
                  photos={photos}
                />
              )}
            </OnboardingFormCard>
          )}
        </motion.div>
      </AnimatePresence>
    </>
  );
}
