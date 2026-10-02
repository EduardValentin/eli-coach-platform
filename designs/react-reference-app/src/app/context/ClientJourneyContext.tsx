import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import {
  useAppState,
  type JourneyAgeBand,
  type PrototypeMode,
} from './AppContext';
import { useAssessmentCalls } from './AssessmentCallContext';
import { useClientProfile } from './ClientProfileContext';
import {
  advance,
  isBeforeStage,
  type ClientJourney,
  type DetailRequest,
  type JourneyEvent,
  type JourneyIdentity,
  type JourneyInvitation,
  type JourneyPhone,
  type JourneyPricing,
  type JourneyGender,
  type JourneyStage,
  type MeasurementEntry,
  type OnboardingDraft,
  type ProgressPhotoSet,
  type ProgressPhotoView,
  type ReviewCall,
} from '../domain/journey';
import {
  submittedMeasurementEntry,
  withoutProgressPhoto,
} from '../domain/measurements';
import { removeProgressPhoto } from '../services/measurementService';
import {
  periodEnd,
  resolveDay1,
  type CoachingSubscription,
  type SubscriptionBundle,
  type SubscriptionStartPath,
  type SubscriptionStatus,
} from '../domain/coachingSubscription';
import {
  heldJourney,
  seedJourney,
  type PrototypeDaysSincePayment,
  type PrototypeLifeStage,
  type PrototypeMeasurementsDue,
  type PrototypeRefund,
  type PrototypeSeededPhotos,
} from '../services/clientJourneySamples';
import { profileOfJourney } from '../domain/clientProfile';
import { PARQ_MAX_AGE, PARQ_MIN_AGE } from '../domain/safetyScreening';
import type { SentPaymentLink } from '../services/paymentLinkService';
import {
  createInvitation,
  type PrototypeInvitationStanding,
  type SentInvitation,
} from '../services/invitationService';
import type { VisitorPrimaryGoal } from '../services/visitorProfile';

export const DEMO_JOURNEY_CALL_ID = 'ac-demo-client-1';
export const AWAITING_REVIEW_CALL_ID = 'ac-seed-awaiting-review';

const AWAITING_REVIEW_PERSON: DemoPerson = {
  firstName: 'Andreea',
  lastName: 'Popescu',
  email: 'andreea@example.com',
  age: 31,
  primaryGoal: 'build_muscle',
};

const DEMO_PHONE: JourneyPhone = { diallingCode: '+40', number: '712345678' };
const DEMO_PRIMARY_GOAL: VisitorPrimaryGoal = 'lose_weight';
const DEMO_BOOKING_NOTES =
  'Wants a structured plan with someone to keep her accountable.';

export type DemoJourneyOptions = {
  startPath: SubscriptionStartPath;
  subscriptionStatus: SubscriptionStatus;
  gender: JourneyGender;
  reducedPricing: boolean;
  invitationStanding: PrototypeInvitationStanding;
  prototypeMode: PrototypeMode;
  measurementsDue: PrototypeMeasurementsDue;
  lifeStage: PrototypeLifeStage;
  seededPhotos: PrototypeSeededPhotos;
  refund: PrototypeRefund;
  paymentProblem: boolean;
  daysSincePayment: PrototypeDaysSincePayment;
};

export type JourneySubmission = {
  submittedAt: Date;
  photos: ProgressPhotoSet;
};

export type JourneyPayment = {
  paidAt: Date;
  bundle: SubscriptionBundle;
  startPath: SubscriptionStartPath;
  amountPaidCents: number;
};

type ClientJourneyContextType = {
  journeys: Record<string, ClientJourney>;
  journeyForCall: (callId: string) => ClientJourney | null;
  journeyForPaymentToken: (token: string) => ClientJourney | null;
  journeyForInvitationToken: (token: string) => ClientJourney | null;
  demoJourney: ClientJourney;
  dispatch: (callId: string, event: JourneyEvent) => void;
  seedDemoJourney: (stage: JourneyStage, options: DemoJourneyOptions) => void;
  recordPaymentLinkSent: (callId: string, link: SentPaymentLink) => void;
  recordPaid: (callId: string, payment: JourneyPayment) => void;
  recordAccountCreated: (callId: string) => void;
  recordInvitationResent: (callId: string, invitation: SentInvitation) => void;
  recordInvitationEmailFailed: (callId: string) => void;
  markWelcomeSeen: (callId: string) => void;
  saveOnboardingDraft: (callId: string, draft: OnboardingDraft) => void;
  submitOnboarding: (callId: string, submission: JourneySubmission) => void;
  startReview: (callId: string) => void;
  approveAnswers: (callId: string) => void;
  requestDetails: (callId: string, request: DetailRequest) => void;
  answerRequest: (callId: string, answeredAt: Date) => void;
  markProgramReady: (callId: string, readyAt: Date) => void;
  scheduleReviewCall: (callId: string, reviewCall: ReviewCall) => void;
  addMeasurements: (callId: string, entry: MeasurementEntry) => void;
  recordProgressPhotoConsent: (callId: string, consentedAt: Date) => void;
  removeMeasurementPhoto: (
    callId: string,
    entryId: string,
    view: ProgressPhotoView,
  ) => Promise<void>;
  cancelSubscription: (callId: string, cancelled: CoachingSubscription) => void;
  startProgramNow: (callId: string, started: CoachingSubscription) => void;
  recoverPayment: (callId: string) => void;
};

const ClientJourneyContext = createContext<ClientJourneyContextType | null>(
  null,
);

function applied(journey: ClientJourney, event: JourneyEvent): ClientJourney {
  const transition = advance(journey, event);

  return transition.status === 'advanced' ? transition.journey : journey;
}

function withProfile(journey: ClientJourney): ClientJourney {
  if (isBeforeStage(journey.stage, 'submitted')) return journey;

  return { ...journey, profile: profileOfJourney(journey) };
}

function withProgramReady(
  journey: ClientJourney,
  readyAt: Date,
): ClientJourney {
  const { subscription } = journey;
  if (!subscription) return { ...journey, programReadyAt: readyAt };

  const day1 = resolveDay1({
    purchasedAt: subscription.purchasedAt,
    programReadyAt: readyAt,
    startPath: subscription.startPath,
  });

  return {
    ...journey,
    programReadyAt: readyAt,
    subscription: day1
      ? {
          ...subscription,
          day1,
          periodEndsAt: periodEnd(day1, subscription.bundle, 0),
        }
      : subscription,
  };
}

function journeyInvitationFrom(sent: SentInvitation): JourneyInvitation {
  return {
    token: sent.token,
    sentAt: sent.sentAt,
    expiresAt: sent.expiresAt,
    state: 'valid',
    emailDelivery: 'sent',
  };
}

function answeredLastRequest(
  requests: DetailRequest[],
  answeredAt: Date,
): DetailRequest[] {
  return requests.map((request, index) =>
    index === requests.length - 1 ? { ...request, answeredAt } : request,
  );
}

function seedAwaitingReviewJourney(prototypeMode: PrototypeMode) {
  return seedJourney({
    callId: AWAITING_REVIEW_CALL_ID,
    identity: demoIdentity(AWAITING_REVIEW_PERSON, 'female'),
    stage: 'submitted',
    startPath: 'immediate',
    subscriptionStatus: 'active',
    pricing: 'regular',
    bookingNotes: null,
    invitationStanding: 'sent',
    prototypeMode,
    measurementsDue: 'none',
    lifeStage: 'none',
    seededPhotos: 'none',
    refund: 'none',
    paymentProblem: false,
    daysSincePayment: 'stage',
    now: new Date(),
  });
}

export function ClientJourneyProvider({ children }: { children: ReactNode }) {
  const { appState } = useAppState();
  const { bookings } = useAssessmentCalls();
  const { clientProfile } = useClientProfile();
  const {
    journeyStage,
    journeyStartPath,
    journeySubscriptionStatus,
    journeyGender,
    journeyAgeBand,
    journeyReducedPricing,
    journeyInvitation,
    journeyMeasurementsDue,
    journeyLifeStage,
    journeySeededPhotos,
    journeyRefund,
    journeyPaymentProblem,
    journeyDaysSincePayment,
    prototypeMode,
  } = appState;

  const visitorPricing: JourneyPricing = journeyReducedPricing
    ? 'reduced'
    : 'regular';

  const demoPerson: DemoPerson = {
    firstName: clientProfile?.firstName ?? 'Jane',
    lastName: clientProfile?.lastName ?? 'Doe',
    email: clientProfile?.email ?? 'jane@example.com',
    age: ageForBand(journeyAgeBand, clientProfile?.age ?? 28),
    phone: DEMO_PHONE,
    primaryGoal: DEMO_PRIMARY_GOAL,
  };

  const demoPersonRef = useRef(demoPerson);
  demoPersonRef.current = demoPerson;

  const [journeys, setJourneys] = useState<Record<string, ClientJourney>>(
    () => ({
      [DEMO_JOURNEY_CALL_ID]: seedJourney({
        callId: DEMO_JOURNEY_CALL_ID,
        identity: demoIdentity(demoPerson, journeyGender),
        stage: journeyStage,
        startPath: journeyStartPath,
        subscriptionStatus: journeySubscriptionStatus,
        pricing: visitorPricing,
        bookingNotes: DEMO_BOOKING_NOTES,
        invitationStanding: journeyInvitation,
        prototypeMode,
        measurementsDue: journeyMeasurementsDue,
        lifeStage: journeyLifeStage,
        seededPhotos: journeySeededPhotos,
        refund: journeyRefund,
        paymentProblem: journeyPaymentProblem,
        daysSincePayment: journeyDaysSincePayment,
        now: new Date(),
      }),
      [AWAITING_REVIEW_CALL_ID]: seedAwaitingReviewJourney(prototypeMode),
    }),
  );

  const [signedInCallId, setSignedInCallId] = useState(DEMO_JOURNEY_CALL_ID);

  const seedDemoJourney = useCallback(
    (stage: JourneyStage, options: DemoJourneyOptions) => {
      setSignedInCallId(DEMO_JOURNEY_CALL_ID);
      setJourneys((previous) => ({
        ...previous,
        [DEMO_JOURNEY_CALL_ID]: seedJourney({
          callId: DEMO_JOURNEY_CALL_ID,
          identity: demoIdentity(demoPersonRef.current, options.gender),
          stage,
          startPath: options.startPath,
          subscriptionStatus: options.subscriptionStatus,
          pricing: options.reducedPricing ? 'reduced' : 'regular',
          bookingNotes: DEMO_BOOKING_NOTES,
          invitationStanding: options.invitationStanding,
          prototypeMode: options.prototypeMode,
          measurementsDue: options.measurementsDue,
          lifeStage: options.lifeStage,
          seededPhotos: options.seededPhotos,
          refund: options.refund,
          paymentProblem: options.paymentProblem,
          daysSincePayment: options.daysSincePayment,
          now: new Date(),
        }),
      }));
    },
    [],
  );

  useEffect(() => {
    seedDemoJourney(journeyStage, {
      startPath: journeyStartPath,
      subscriptionStatus: journeySubscriptionStatus,
      gender: journeyGender,
      reducedPricing: journeyReducedPricing,
      invitationStanding: journeyInvitation,
      prototypeMode,
      measurementsDue: journeyMeasurementsDue,
      lifeStage: journeyLifeStage,
      seededPhotos: journeySeededPhotos,
      refund: journeyRefund,
      paymentProblem: journeyPaymentProblem,
      daysSincePayment: journeyDaysSincePayment,
    });
  }, [
    seedDemoJourney,
    journeyStage,
    journeyStartPath,
    journeySubscriptionStatus,
    journeyGender,
    journeyAgeBand,
    journeyReducedPricing,
    journeyInvitation,
    journeyMeasurementsDue,
    journeyLifeStage,
    journeySeededPhotos,
    journeyRefund,
    journeyPaymentProblem,
    journeyDaysSincePayment,
    prototypeMode,
  ]);

  useEffect(() => {
    setJourneys((previous) => ({
      ...previous,
      [AWAITING_REVIEW_CALL_ID]: seedAwaitingReviewJourney(prototypeMode),
    }));
  }, [prototypeMode]);

  useEffect(() => {
    setJourneys((previous) => {
      const next: Record<string, ClientJourney> = {
        [DEMO_JOURNEY_CALL_ID]: previous[DEMO_JOURNEY_CALL_ID],
        [AWAITING_REVIEW_CALL_ID]: previous[AWAITING_REVIEW_CALL_ID],
      };

      for (const booking of bookings) {
        const journey = previous[booking.id];
        next[booking.id] = journey
          ? repricedUntilPaid(journey, visitorPricing)
          : heldJourney(booking, visitorPricing);
      }

      return next;
    });
  }, [bookings, visitorPricing]);

  const updateJourney = useCallback(
    (callId: string, revise: (journey: ClientJourney) => ClientJourney) => {
      setJourneys((previous) => {
        const journey = previous[callId];
        if (!journey) return previous;

        return { ...previous, [callId]: revise(journey) };
      });
    },
    [],
  );

  const dispatch = useCallback(
    (callId: string, event: JourneyEvent) => {
      updateJourney(callId, (journey) => applied(journey, event));
    },
    [updateJourney],
  );

  const recordPaymentLinkSent = useCallback(
    (callId: string, link: SentPaymentLink) => {
      updateJourney(callId, (journey) =>
        applied(
          { ...journey, paymentLink: { ...link, state: 'valid' } },
          'send-payment-link',
        ),
      );
    },
    [updateJourney],
  );

  const recordPaid = useCallback(
    (callId: string, payment: JourneyPayment) => {
      updateJourney(callId, (journey) =>
        applied(
          {
            ...journey,
            paidAt: payment.paidAt,
            paymentLink: journey.paymentLink
              ? { ...journey.paymentLink, state: 'used' }
              : null,
            subscription: {
              bundle: payment.bundle,
              startPath: payment.startPath,
              purchasedAt: payment.paidAt,
              amountPaidCents: payment.amountPaidCents,
              status: 'not-started',
              paymentProblem: false,
            },
            invitation: journeyInvitationFrom(
              createInvitation(journey.identity.email, payment.paidAt),
            ),
          },
          'record-payment',
        ),
      );
    },
    [updateJourney],
  );

  const recordAccountCreated = useCallback(
    (callId: string) => {
      setSignedInCallId(callId);
      updateJourney(callId, (journey) =>
        applied(
          {
            ...journey,
            invitation: journey.invitation
              ? { ...journey.invitation, state: 'used' }
              : null,
          },
          'create-account',
        ),
      );
    },
    [updateJourney],
  );

  const recordInvitationResent = useCallback(
    (callId: string, invitation: SentInvitation) => {
      updateJourney(callId, (journey) => ({
        ...journey,
        invitation: journeyInvitationFrom(invitation),
      }));
    },
    [updateJourney],
  );

  const recordInvitationEmailFailed = useCallback(
    (callId: string) => {
      updateJourney(callId, (journey) => ({
        ...journey,
        invitation: journey.invitation
          ? { ...journey.invitation, emailDelivery: 'failed' }
          : null,
      }));
    },
    [updateJourney],
  );

  const markWelcomeSeen = useCallback(
    (callId: string) => {
      updateJourney(callId, (journey) => ({ ...journey, welcomeSeen: true }));
    },
    [updateJourney],
  );

  const saveOnboardingDraft = useCallback(
    (callId: string, draft: OnboardingDraft) => {
      updateJourney(callId, (journey) =>
        applied(
          {
            ...journey,
            onboarding: {
              ...draft,
              submittedAt: journey.onboarding.submittedAt,
            },
          },
          'start-onboarding',
        ),
      );
    },
    [updateJourney],
  );

  const submitOnboarding = useCallback(
    (callId: string, { submittedAt, photos }: JourneySubmission) => {
      updateJourney(callId, (journey) => {
        const started = applied(journey, 'start-onboarding');
        const submitted = applied(started, 'submit-onboarding');
        const firstEntry = submittedMeasurementEntry(
          submitted.onboarding.answers,
          { recordedAt: submittedAt, photos },
        );

        return withProfile({
          ...submitted,
          measurements: firstEntry
            ? [...submitted.measurements, firstEntry]
            : submitted.measurements,
          onboarding: { ...submitted.onboarding, submittedAt },
          progressPhotosConsentedAt: submitted.onboarding.consents
            .progressPhotos
            ? submittedAt
            : submitted.progressPhotosConsentedAt,
        });
      });
    },
    [updateJourney],
  );

  const startReview = useCallback(
    (callId: string) => {
      dispatch(callId, 'start-review');
    },
    [dispatch],
  );

  const approveAnswers = useCallback(
    (callId: string) => {
      dispatch(callId, 'approve-answers');
    },
    [dispatch],
  );

  const requestDetails = useCallback(
    (callId: string, request: DetailRequest) => {
      updateJourney(callId, (journey) =>
        applied(
          {
            ...journey,
            review: { requests: [...journey.review.requests, request] },
          },
          'request-details',
        ),
      );
    },
    [updateJourney],
  );

  const answerRequest = useCallback(
    (callId: string, answeredAt: Date) => {
      updateJourney(callId, (journey) =>
        withProfile(
          applied(
            {
              ...journey,
              review: {
                requests: answeredLastRequest(
                  journey.review.requests,
                  answeredAt,
                ),
              },
            },
            'answer-request',
          ),
        ),
      );
    },
    [updateJourney],
  );

  const markProgramReady = useCallback(
    (callId: string, readyAt: Date) => {
      updateJourney(callId, (journey) =>
        applied(withProgramReady(journey, readyAt), 'mark-program-ready'),
      );
    },
    [updateJourney],
  );

  const scheduleReviewCall = useCallback(
    (callId: string, reviewCall: ReviewCall) => {
      updateJourney(callId, (journey) =>
        applied({ ...journey, reviewCall }, 'schedule-review-call'),
      );
    },
    [updateJourney],
  );

  const addMeasurements = useCallback(
    (callId: string, entry: MeasurementEntry) => {
      updateJourney(callId, (journey) => ({
        ...journey,
        measurements: [...journey.measurements, entry],
      }));
    },
    [updateJourney],
  );

  const recordProgressPhotoConsent = useCallback(
    (callId: string, consentedAt: Date) => {
      updateJourney(callId, (journey) => ({
        ...journey,
        progressPhotosConsentedAt:
          journey.progressPhotosConsentedAt ?? consentedAt,
      }));
    },
    [updateJourney],
  );

  const removeMeasurementPhoto = useCallback(
    async (callId: string, entryId: string, view: ProgressPhotoView) => {
      await removeProgressPhoto(appState.photoRemoval);
      updateJourney(callId, (journey) => ({
        ...journey,
        measurements: journey.measurements.map((entry) =>
          entry.id === entryId ? withoutProgressPhoto(entry, view) : entry,
        ),
      }));
    },
    [appState.photoRemoval, updateJourney],
  );

  const cancelSubscription = useCallback(
    (callId: string, cancelled: CoachingSubscription) => {
      updateJourney(callId, (journey) => ({
        ...journey,
        subscription: cancelled,
      }));
    },
    [updateJourney],
  );

  const startProgramNow = useCallback(
    (callId: string, started: CoachingSubscription) => {
      updateJourney(callId, (journey) => ({
        ...journey,
        subscription: started,
      }));
    },
    [updateJourney],
  );

  const recoverPayment = useCallback(
    (callId: string) => {
      updateJourney(callId, (journey) =>
        journey.subscription
          ? {
              ...journey,
              subscription: { ...journey.subscription, paymentProblem: false },
            }
          : journey,
      );
    },
    [updateJourney],
  );

  const journeyForCall = useCallback(
    (callId: string) => journeys[callId] ?? null,
    [journeys],
  );

  const journeyForPaymentToken = useCallback(
    (token: string) =>
      Object.values(journeys).find(
        (journey) => journey.paymentLink?.token === token,
      ) ?? null,
    [journeys],
  );

  const journeyForInvitationToken = useCallback(
    (token: string) =>
      Object.values(journeys).find(
        (journey) => journey.invitation?.token === token,
      ) ?? null,
    [journeys],
  );

  return (
    <ClientJourneyContext.Provider
      value={{
        journeys,
        journeyForCall,
        journeyForPaymentToken,
        journeyForInvitationToken,
        demoJourney: journeys[signedInCallId] ?? journeys[DEMO_JOURNEY_CALL_ID],
        dispatch,
        seedDemoJourney,
        recordPaymentLinkSent,
        recordPaid,
        recordAccountCreated,
        recordInvitationResent,
        recordInvitationEmailFailed,
        markWelcomeSeen,
        saveOnboardingDraft,
        submitOnboarding,
        startReview,
        approveAnswers,
        requestDetails,
        answerRequest,
        markProgramReady,
        scheduleReviewCall,
        addMeasurements,
        recordProgressPhotoConsent,
        removeMeasurementPhoto,
        cancelSubscription,
        startProgramNow,
        recoverPayment,
      }}
    >
      {children}
    </ClientJourneyContext.Provider>
  );
}

function repricedUntilPaid(
  journey: ClientJourney,
  pricing: JourneyPricing,
): ClientJourney {
  if (!isBeforeStage(journey.stage, 'invited')) return journey;
  return { ...journey, pricing };
}

type DemoPerson = {
  firstName: string;
  lastName: string;
  email: string;
  age: number;
  phone?: JourneyPhone;
  primaryGoal: VisitorPrimaryGoal;
};

function dateOfBirthForAge(age: number): string {
  const birthYear = new Date().getFullYear() - age;
  return `${birthYear}-06-15`;
}

const AGE_BAND_AGES: Record<JourneyAgeBand, number | null> = {
  adult: null,
  'under-15': PARQ_MIN_AGE - 1,
  'over-69': PARQ_MAX_AGE + 1,
};

function ageForBand(band: JourneyAgeBand, fallback: number): number {
  return AGE_BAND_AGES[band] ?? fallback;
}

function demoIdentity(
  person: DemoPerson,
  gender: JourneyGender,
): JourneyIdentity {
  return {
    firstName: person.firstName,
    lastName: person.lastName,
    dateOfBirth: dateOfBirthForAge(person.age),
    email: person.email,
    phone: person.phone,
    gender,
    country: 'Romania',
    primaryGoal: person.primaryGoal,
  };
}

export function useClientJourneys() {
  const context = useContext(ClientJourneyContext);
  if (!context) {
    throw new Error(
      'useClientJourneys must be used within a ClientJourneyProvider',
    );
  }
  return context;
}
