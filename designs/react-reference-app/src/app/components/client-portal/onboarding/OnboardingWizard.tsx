import { useCallback, useId, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useNavigate } from 'react-router';
import { toast } from 'sonner';
import { useAppState } from '../../../context/AppContext';
import { useClientJourneys } from '../../../context/ClientJourneyContext';
import {
  DISCLAIMER_ACKNOWLEDGEMENT,
  SPECIAL_CATEGORY_CONSENT_COPY,
} from '../../../domain/onboardingCopy';
import { progressPhotoRefusalMessage } from '../../../domain/measurements';
import {
  copyForGender,
  formsForGender,
  type OnboardingFormDefinition,
} from '../../../domain/onboardingSchema';
import {
  needsManualScreening,
  screeningOutcome,
} from '../../../domain/safetyScreening';
import {
  NO_PROGRESS_PHOTOS,
  type JourneyOnboarding,
  type OnboardingConsents,
  type OnboardingDraft,
  type OnboardingFormAnswers,
  type ProgressPhotoSet,
} from '../../../domain/journey';
import {
  forgetDraft,
  loadDraft,
  submit,
} from '../../../services/onboardingService';
import { Alert } from '../../ui/alert';
import { Stepper } from '../../ui/stepper';
import { MeasurementSystemField } from './MeasurementSystemField';
import { OnboardingConsent, type ConsentAgreement } from './OnboardingConsent';
import { OnboardingFormCard } from './OnboardingFormCard';
import { ProgressPhotoBlock } from './ProgressPhotoBlock';
import { useDraftAutosave, type SaveState } from './useDraftAutosave';

const SUBMIT_PROBLEM =
  "Your answers could not be sent just now. They're saved — try again in a moment.";

const MISSING_CONSENT = 'Tick the box to carry on.';

const RESUME_NOTE = 'Picking up where you left off.';

const PHOTOS_SEND_NOTE = 'Your photos are sent with your answers.';

const MANUAL_SCREENING_MESSAGE =
  "These safety questions are designed for ages 15 to 69. I'll go through your health questions with you directly before building your program.";

const SCREENING_CLEARED_MESSAGE =
  "Thank you. Nothing here needs a doctor's sign-off — let's keep going.";

const SAVE_LABELS: Record<SaveState, string> = {
  idle: '',
  saving: 'Saving…',
  saved: 'Saved',
  unsaved: "Not saved yet. We'll try again when you're back online.",
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
  key: ConsentAgreement,
  agreed: boolean,
): OnboardingConsents {
  return key === 'disclaimer'
    ? { ...consents, disclaimer: agreed }
    : { ...consents, specialCategory: agreed };
}

export function OnboardingWizard() {
  const navigate = useNavigate();
  const { appState } = useAppState();
  const { demoJourney, saveOnboardingDraft, submitOnboarding } =
    useClientJourneys();
  const prefersReducedMotion = useReducedMotion() ?? false;
  const stepCountId = useId();
  const journeyId = demoJourney.callId;
  const {
    saveState,
    queueDraftSave,
    queueUnitPreferenceSave,
    cancelQueuedSave,
    pendingSave,
  } = useDraftAutosave(journeyId);

  const { gender } = demoJourney.identity;
  const steps = useMemo(() => formsForGender(gender), [gender]);

  const [savedDraft] = useState(() => loadDraft(journeyId));
  const [draft, setDraft] = useState<OnboardingDraft>(
    () => savedDraft ?? draftOf(demoJourney.onboarding),
  );
  const [photos, setPhotos] = useState<ProgressPhotoSet>(NO_PROGRESS_PHOTOS);
  const [problem, setProblem] = useState<string | null>(null);
  const [consentProblem, setConsentProblem] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  const draftRef = useRef(draft);
  draftRef.current = draft;
  const focusPending = useRef(false);

  const stepIndex = Math.min(draft.currentFormIndex, steps.length - 1);
  const step = steps[stepIndex];
  const isLastStep = stepIndex === steps.length - 1;
  const asksSpecialCategory = stepIndex === firstSpecialCategoryIndex(steps);
  const manualScreening =
    step.id === 'safety-screening' &&
    needsManualScreening(demoJourney.identity.dateOfBirth, new Date());
  const cardDefinition = manualScreening ? { ...step, fields: [] } : step;

  const persist = useCallback(
    (next: OnboardingDraft) => {
      setDraft(next);
      setProblem(null);
      queueDraftSave(next);
    },
    [queueDraftSave],
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

  const agree = (key: ConsentAgreement) => (agreed: boolean) => {
    const current = draftRef.current;
    setConsentProblem(null);
    persist({
      ...current,
      consents: withConsent(current.consents, key, agreed),
    });
  };

  const goToStep = (index: number) => {
    focusPending.current = true;
    setConsentProblem(null);
    persist({ ...draftRef.current, currentFormIndex: index });
  };

  const sendToCoach = async (next: OnboardingDraft) => {
    setSending(true);
    setProblem(null);
    cancelQueuedSave();
    saveOnboardingDraft(journeyId, next);

    try {
      const submitted = await submit(journeyId, {
        connection: appState.journeyConnection,
        photos: next.consents.progressPhotos ? photos : NO_PROGRESS_PHOTOS,
        photoProcessing: appState.photoProcessing,
      });
      await pendingSave();
      submitOnboarding(journeyId, {
        submittedAt: submitted.submittedAt,
        photos: submitted.photos.stored,
      });
      forgetDraft(journeyId);
      navigate('/portal');
      submitted.photos.refusedViews.forEach((view) =>
        toast.error(progressPhotoRefusalMessage(view)),
      );
    } catch {
      setSending(false);
      setProblem(SUBMIT_PROBLEM);
    }
  };

  const specialCategoryMissing = (consents: OnboardingConsents) =>
    asksSpecialCategory && !consents.specialCategory;

  const disclaimerMissing = (consents: OnboardingConsents) =>
    isLastStep && !consents.disclaimer;

  const reviewConsent = () => {
    setConsentProblem(
      specialCategoryMissing(draftRef.current.consents)
        ? MISSING_CONSENT
        : null,
    );
  };

  const continueFrom = (answers: OnboardingFormAnswers) => {
    const current = draftRef.current;

    if (
      specialCategoryMissing(current.consents) ||
      disclaimerMissing(current.consents)
    ) {
      return;
    }

    const next: OnboardingDraft = {
      ...current,
      answers: { ...current.answers, [step.id]: answers },
      currentFormIndex: isLastStep ? stepIndex : stepIndex + 1,
    };

    if (
      step.id === 'safety-screening' &&
      screeningOutcome(next, demoJourney.identity, new Date()) === 'cleared'
    ) {
      toast.success(SCREENING_CLEARED_MESSAGE);
    }

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
    <div data-parity-root="OnboardingWizard">
      <div
        className="mb-6 grid gap-2 px-6 sm:px-8 lg:px-10"
        data-parity="wizard-progress"
      >
        <Stepper
          className="w-full"
          countId={stepCountId}
          data-parity="stepper"
          current={stepIndex + 1}
          total={steps.length}
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
        />
        {savedDraft && (
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
                  agreement="specialCategory"
                  checked={draft.consents.specialCategory}
                  onChange={agree('specialCategory')}
                  problem={consentProblem}
                  statement={copyForGender(
                    SPECIAL_CATEGORY_CONSENT_COPY,
                    gender,
                  )}
                />
              ) : null
            }
            continueDisabled={disclaimerMissing(draft.consents)}
            continueLabel={
              isLastStep
                ? sending
                  ? 'Sending…'
                  : 'Send to my coach'
                : 'Continue'
            }
            definition={cardDefinition}
            headingRef={headingRef}
            key={step.id}
            onAttempt={reviewConsent}
            onBack={back}
            onChange={handleAnswers}
            onContinue={continueFrom}
            gender={gender}
            stepCountId={stepCountId}
            unitsChoice={
              stepIndex === 0 ? (
                <MeasurementSystemField onChoose={queueUnitPreferenceSave} />
              ) : null
            }
          >
            {manualScreening && (
              <p className="text-sm text-text-secondary">
                {MANUAL_SCREENING_MESSAGE}
              </p>
            )}
            {isLastStep && (
              <>
                <ProgressPhotoBlock
                  consent={{
                    status: 'asking',
                    ticked: draft.consents.progressPhotos,
                    onTickedChange: (ticked) =>
                      persist({
                        ...draftRef.current,
                        consents: {
                          ...draftRef.current.consents,
                          progressPhotos: ticked,
                        },
                      }),
                  }}
                  onPhotosChange={setPhotos}
                  photos={photos}
                  sendNote={PHOTOS_SEND_NOTE}
                />
                <OnboardingConsent
                  agreement="disclaimer"
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
    </div>
  );
}
