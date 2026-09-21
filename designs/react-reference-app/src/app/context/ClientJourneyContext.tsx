import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { useAppState } from './AppContext';
import { useAssessmentCalls } from './AssessmentCallContext';
import { useClientProfile } from './ClientProfileContext';
import {
  advance,
  type ClientJourney,
  type DetailRequest,
  type JourneyEvent,
  type JourneyIdentity,
  type JourneyPricing,
  type JourneySex,
  type JourneyStage,
  type MeasurementEntry,
  type OnboardingDraft,
  type ReviewCall,
} from '../domain/journey';
import {
  periodEnd,
  resolveDay1,
  type CoachingSubscription,
  type SubscriptionBundle,
  type SubscriptionStartPath,
  type SubscriptionStatus,
} from '../domain/coachingSubscription';
import { heldJourney, seedJourney } from '../services/clientJourneySamples';
import type { SentPaymentLink } from '../services/paymentLinkService';
import type { SentInvitation } from '../services/invitationService';

export const DEMO_JOURNEY_CALL_ID = 'ac-demo-client-1';

export type DemoJourneyOptions = {
  startPath: SubscriptionStartPath;
  subscriptionStatus: SubscriptionStatus;
  sex: JourneySex;
  reducedPricing: boolean;
};

export type JourneyPayment = {
  paidAt: Date;
  bundle: SubscriptionBundle;
  startPath: SubscriptionStartPath;
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
  recordInvitation: (callId: string, invitation: SentInvitation) => void;
  updateIdentity: (callId: string, identity: JourneyIdentity) => void;
  recordAccountCreated: (callId: string) => void;
  markWelcomeSeen: (callId: string) => void;
  saveOnboardingDraft: (callId: string, draft: OnboardingDraft) => void;
  submitOnboarding: (callId: string, submittedAt: Date) => void;
  startReview: (callId: string) => void;
  approveAnswers: (callId: string) => void;
  requestDetails: (callId: string, request: DetailRequest) => void;
  answerRequest: (callId: string, answeredAt: Date) => void;
  markProgramReady: (callId: string, readyAt: Date) => void;
  scheduleReviewCall: (callId: string, reviewCall: ReviewCall) => void;
  addMeasurements: (callId: string, entry: MeasurementEntry) => void;
  cancelSubscription: (
    callId: string,
    cancelled: CoachingSubscription,
  ) => void;
  startProgramNow: (callId: string, started: CoachingSubscription) => void;
};

const ClientJourneyContext = createContext<ClientJourneyContextType | null>(
  null,
);

function applied(journey: ClientJourney, event: JourneyEvent): ClientJourney {
  const transition = advance(journey, event);

  return transition.status === 'advanced' ? transition.journey : journey;
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

function answeredLastRequest(
  requests: DetailRequest[],
  answeredAt: Date,
): DetailRequest[] {
  return requests.map((request, index) =>
    index === requests.length - 1 ? { ...request, answeredAt } : request,
  );
}

export function ClientJourneyProvider({ children }: { children: ReactNode }) {
  const { appState } = useAppState();
  const { bookings } = useAssessmentCalls();
  const { clientProfile } = useClientProfile();
  const {
    journeyStage,
    journeyStartPath,
    journeySubscriptionStatus,
    journeySex,
    journeyReducedPricing,
  } = appState;

  const visitorPricing: JourneyPricing = journeyReducedPricing
    ? 'reduced'
    : 'regular';

  const demoPerson: DemoPerson = {
    firstName: clientProfile?.firstName ?? 'Jane',
    lastName: clientProfile?.lastName ?? 'Doe',
    email: clientProfile?.email ?? 'jane@example.com',
    age: clientProfile?.age ?? 28,
  };

  const demoPersonRef = useRef(demoPerson);
  demoPersonRef.current = demoPerson;

  const [journeys, setJourneys] = useState<Record<string, ClientJourney>>(
    () => ({
      [DEMO_JOURNEY_CALL_ID]: seedJourney({
        callId: DEMO_JOURNEY_CALL_ID,
        identity: demoIdentity(demoPerson, journeySex),
        stage: journeyStage,
        startPath: journeyStartPath,
        subscriptionStatus: journeySubscriptionStatus,
        pricing: visitorPricing,
        now: new Date(),
      }),
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
          identity: demoIdentity(demoPersonRef.current, options.sex),
          stage,
          startPath: options.startPath,
          subscriptionStatus: options.subscriptionStatus,
          pricing: options.reducedPricing ? 'reduced' : 'regular',
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
      sex: journeySex,
      reducedPricing: journeyReducedPricing,
    });
  }, [
    seedDemoJourney,
    journeyStage,
    journeyStartPath,
    journeySubscriptionStatus,
    journeySex,
    journeyReducedPricing,
  ]);

  useEffect(() => {
    setJourneys((previous) => {
      const next: Record<string, ClientJourney> = {
        [DEMO_JOURNEY_CALL_ID]: previous[DEMO_JOURNEY_CALL_ID],
      };

      for (const booking of bookings) {
        next[booking.id] =
          previous[booking.id] ?? heldJourney(booking, visitorPricing);
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
              status: 'not-started',
            },
          },
          'record-payment',
        ),
      );
    },
    [updateJourney],
  );

  const recordInvitation = useCallback(
    (callId: string, invitation: SentInvitation) => {
      updateJourney(callId, (journey) =>
        applied(
          {
            ...journey,
            invitation: {
              token: invitation.token,
              sentAt: invitation.sentAt,
              expiresAt: invitation.expiresAt,
              replaced: invitation.replaced,
              state: 'valid',
            },
          },
          'send-invitation',
        ),
      );
    },
    [updateJourney],
  );

  const updateIdentity = useCallback(
    (callId: string, identity: JourneyIdentity) => {
      updateJourney(callId, (journey) => ({ ...journey, identity }));
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
            onboarding: { ...draft, submittedAt: journey.onboarding.submittedAt },
          },
          'start-onboarding',
        ),
      );
    },
    [updateJourney],
  );

  const submitOnboarding = useCallback(
    (callId: string, submittedAt: Date) => {
      updateJourney(callId, (journey) => {
        const started = applied(journey, 'start-onboarding');
        const submitted = applied(started, 'submit-onboarding');

        return {
          ...submitted,
          onboarding: { ...submitted.onboarding, submittedAt },
        };
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
        demoJourney:
          journeys[signedInCallId] ?? journeys[DEMO_JOURNEY_CALL_ID],
        dispatch,
        seedDemoJourney,
        recordPaymentLinkSent,
        recordPaid,
        recordInvitation,
        updateIdentity,
        recordAccountCreated,
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
        cancelSubscription,
        startProgramNow,
      }}
    >
      {children}
    </ClientJourneyContext.Provider>
  );
}

type DemoPerson = {
  firstName: string;
  lastName: string;
  email: string;
  age: number;
};

function dateOfBirthForAge(age: number): string {
  const birthYear = new Date().getFullYear() - age;
  return `${birthYear}-06-15`;
}

function demoIdentity(person: DemoPerson, sex: JourneySex): JourneyIdentity {
  return {
    firstName: person.firstName,
    lastName: person.lastName,
    dateOfBirth: dateOfBirthForAge(person.age),
    email: person.email,
    sex,
    country: 'Romania',
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
