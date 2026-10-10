import type { DatabaseClient } from "@eli-coach-platform/db";
import type { InvitationAcceptance } from "@eli-coach-platform/domain/account";
import type { CheckInClients } from "@eli-coach-platform/domain/check-in";
import type { ClientIdentities } from "@eli-coach-platform/domain/client";
import {
  AcceptInvitationUseCase,
  AdmitPaidClientUseCase,
  ReadClientInvitationUseCase,
  ResendInvitationUseCase,
  ResolveInvitationUseCase,
  type ClientInvitationIncidents,
  type IdentityInvitations,
} from "@eli-coach-platform/domain/client-invitation";
import {
  ClientJourney,
  MarkWelcomeSeenUseCase,
  ReadClientJourneyUseCase,
  ReadClientPortalStandingUseCase,
  ReadProgramStatusUseCase,
} from "@eli-coach-platform/domain/client-journey";
import type {
  OnboardingClients,
  OnboardingReviewStamps,
  OnboardingSubmissionStamps,
} from "@eli-coach-platform/domain/client-onboarding";
import {
  ListClientsUseCase,
  ReadClientRecordUseCase,
  type ClientRosterIncidents,
} from "@eli-coach-platform/domain/client-roster";
import {
  ReadPricingTiersUseCase,
  type PricingEligibility,
} from "@eli-coach-platform/domain/coaching-bundle";
import {
  CancelSubscriptionUseCase,
  CoachingSubscription,
  MirrorPaymentCardUseCase,
  OpenPaymentMethodSessionUseCase,
  ReadCheckoutConfirmationUseCase,
  ReadClientSubscriptionUseCase,
  ReconcileSubscriptionEventUseCase,
  RecordCheckoutCompletedUseCase,
  RefreshPaymentCardUseCase,
  StartCheckoutUseCase,
  StartProgramNowUseCase,
  type CoachingSubscriptionIncidents,
  type PaidClientAdmission,
  type PaymentCheckout,
  type PaymentCustomerCards,
  type PaymentSubscriptions,
} from "@eli-coach-platform/domain/coaching-subscription";
import type { FeatureFlagReader } from "@eli-coach-platform/domain/feature-flag";
import {
  CoachingSalesWindow,
  OpenBundlePageUseCase,
  ReadCallSalesStatesUseCase,
  ResolvePaymentLinkUseCase,
  SendPaymentLinkUseCase,
  type AssessmentCallReader,
  type CoachingSalesIncidents,
} from "@eli-coach-platform/domain/payment-link";
import type { Clock } from "@eli-coach-platform/domain/shared";
import type { MeasurementClients } from "@eli-coach-platform/domain/client-profile";
import type { ResourceClients } from "@eli-coach-platform/domain/client-resources";
import type { UnitPreferenceClients } from "@eli-coach-platform/domain/unit-preference";
import type { ProductEmail } from "@eli-coach-platform/infrastructure/email/server";
import type {
  PaymentCardHandler,
  PaymentCompletionHandler,
  PaymentRefundHandler,
  PaymentSubscriptionChangeHandler,
} from "@eli-coach-platform/infrastructure/payments/server";

import { ClientJourneyController } from "~/features/coaching-sales/api/client/client-journey-controller.server";
import { SubscriptionController } from "~/features/coaching-sales/api/client/subscription-controller.server";
import { CoachClientsController } from "~/features/coaching-sales/api/coach/coach-clients-controller.server";
import { CoachSalesController } from "~/features/coaching-sales/api/coach/coach-sales-controller.server";
import { PaymentLinksController } from "~/features/coaching-sales/api/coach/payment-links-controller.server";
import { CoachingPaymentCardHandler } from "~/features/coaching-sales/api/payments/coaching-payment-card-handler.server";
import { CoachingPurchaseCompletionHandler } from "~/features/coaching-sales/api/payments/coaching-purchase-completion-handler.server";
import { CoachingSubscriptionEventHandler } from "~/features/coaching-sales/api/payments/coaching-subscription-event-handler.server";
import { CheckoutsController } from "~/features/coaching-sales/api/public/checkouts-controller.server";
import { InvitationsController } from "~/features/coaching-sales/api/public/invitations-controller.server";
import { PostgresClientJourneys } from "~/features/coaching-sales/data/client-journeys/client-journeys-repository.server";
import {
  writeReviewStamps,
  type ReviewStampWriter,
} from "~/features/coaching-sales/data/client-journeys/review-stamps.server";
import { PostgresClientIdentities } from "~/features/coaching-sales/data/clients/client-identities-reader.server";
import { PostgresClientRoster } from "~/features/coaching-sales/data/clients/client-roster-reader.server";
import { PostgresOnboardingClients } from "~/features/coaching-sales/data/clients/onboarding-clients-reader.server";
import { RandomClientInvitationIdGenerator } from "~/features/coaching-sales/data/invitations/client-invitation-ids.server";
import { PostgresInvitedClients } from "~/features/coaching-sales/data/invitations/invited-clients-repository.server";
import { PostgresClientInvitations } from "~/features/coaching-sales/data/invitations/invitations-repository.server";
import {
  LinkTokenSha256,
  RandomLinkTokenGenerator,
} from "~/features/coaching-sales/data/link-tokens/link-token.server";
import { PostgresPaymentLinks } from "~/features/coaching-sales/data/payment-links/payment-links-repository.server";
import { PostgresCoachingPurchases } from "~/features/coaching-sales/data/purchases/purchases-repository.server";
import { PostgresPaymentCards } from "~/features/coaching-sales/data/payment-cards/payment-cards-repository.server";
import { PostgresCoachingSubscriptions } from "~/features/coaching-sales/data/subscriptions/subscriptions-repository.server";
import {
  createCoachingSalesNotifications,
  createRefundNotifications,
} from "~/features/coaching-sales/email/create-coaching-sales-notifications.server";
import { EmailClientInvitationNotifications } from "~/features/coaching-sales/email/email-client-invitation-notifications.server";

export type CoachingSalesFeature = {
  checkouts: CheckoutsController;
  clientJourney: ClientJourneyController;
  coachClients: CoachClientsController;
  coachSales: CoachSalesController;
  invitations: InvitationsController;
  paymentLinks: PaymentLinksController;
  readClientPortalStanding: ReadClientPortalStandingUseCase;
  subscription: SubscriptionController;
};

type CoachingSalesComposition = {
  feature: CoachingSalesFeature;
  handles: {
    checkInClients: CheckInClients;
    clientIdentities: ClientIdentities;
    invitationAcceptance: InvitationAcceptance;
    measurementClients: MeasurementClients;
    onboardingClients: OnboardingClients;
    onboardingReviewStamps: OnboardingReviewStamps;
    onboardingSubmissionStamps: OnboardingSubmissionStamps;
    paymentCardHandler: PaymentCardHandler;
    paymentCompletionHandler: PaymentCompletionHandler;
    refundHandler: PaymentRefundHandler;
    resourceClients: ResourceClients;
    reviewStampWriter: ReviewStampWriter;
    subscriptionChangeHandler: PaymentSubscriptionChangeHandler;
    unitPreferenceClients: UnitPreferenceClients;
  };
};

export type CoachingSalesFeatureHandles = {
  appBasePath: string;
  assessmentCallReader: AssessmentCallReader;
  clock: Clock;
  coachEmail: string;
  contactEmail: string;
  database: DatabaseClient;
  featureFlags: FeatureFlagReader;
  identityInvitations: IdentityInvitations;
  incidents: CoachingSalesIncidents &
    CoachingSubscriptionIncidents &
    ClientInvitationIncidents &
    ClientRosterIncidents;
  paymentCheckout: PaymentCheckout;
  paymentCustomerCards: PaymentCustomerCards;
  paymentSubscriptions: PaymentSubscriptions;
  pricingEligibility: PricingEligibility;
  productEmail: ProductEmail;
  publicAppUrl: string;
};

export function composeCoachingSalesFeature(
  handles: CoachingSalesFeatureHandles,
): CoachingSalesComposition {
  const { clock, database } = handles;
  const paymentLinks = new PostgresPaymentLinks({ clock, database });
  const purchases = new PostgresCoachingPurchases({ clock, database });
  const subscriptions = new PostgresCoachingSubscriptions({ clock, database });
  const paymentCards = new PostgresPaymentCards({ clock, database });
  const clientIdentities = new PostgresClientIdentities(database);
  const invitations = new PostgresClientInvitations(database);
  const journeys = new PostgresClientJourneys(database);
  const onboardingClients = new PostgresOnboardingClients(database);
  const tokenGenerator = new RandomLinkTokenGenerator();
  const tokenHasher = new LinkTokenSha256();
  const emailOptions = {
    appBasePath: handles.appBasePath,
    clock,
    contactEmail: handles.contactEmail,
    publicAppUrl: handles.publicAppUrl,
  };
  const salesWindow = new CoachingSalesWindow({
    featureFlags: handles.featureFlags,
    incidents: handles.incidents,
  });
  const paymentLinkPorts = {
    calls: handles.assessmentCallReader,
    callSalesStates: purchases,
    clock,
    paymentLinks,
    pricingEligibility: handles.pricingEligibility,
    salesWindow,
  };

  const invitationPorts = {
    clients: new PostgresInvitedClients(database),
    clock,
    identity: handles.identityInvitations,
    incidents: handles.incidents,
    invitations,
    notifications: new EmailClientInvitationNotifications(
      handles.productEmail,
      emailOptions,
    ),
    tokenGenerator,
  };

  const invitationUseCases = {
    acceptInvitation: new AcceptInvitationUseCase({
      clock,
      identity: handles.identityInvitations,
      invitations,
    }),
    admitPaidClient: new AdmitPaidClientUseCase({
      ...invitationPorts,
      invitationIds: new RandomClientInvitationIdGenerator(),
    }),
    readClientInvitation: new ReadClientInvitationUseCase({
      clock,
      invitations,
    }),
    resendInvitation: new ResendInvitationUseCase(invitationPorts),
    resolveInvitation: new ResolveInvitationUseCase({
      clock,
      invitations,
      tokenHasher,
    }),
  };

  const clientJourneyUseCases = {
    markWelcomeSeen: new MarkWelcomeSeenUseCase({ clock, journeys }),
    readClientJourney: new ReadClientJourneyUseCase({ journeys }),
    readClientPortalStanding: new ReadClientPortalStandingUseCase({
      clock,
      journeys,
      subscriptions,
    }),
    readProgramStatus: new ReadProgramStatusUseCase({
      clock,
      journeys,
      subscriptions,
    }),
  };

  const subscriptionPorts = {
    clock,
    incidents: handles.incidents,
    paymentSubscriptions: handles.paymentSubscriptions,
    subscriptions,
  };
  const subscriptionUseCases = {
    cancelSubscription: new CancelSubscriptionUseCase({
      ...subscriptionPorts,
      clients: clientIdentities,
      notifications: createRefundNotifications(handles.productEmail, {
        appBasePath: handles.appBasePath,
        clock,
        coachEmail: handles.coachEmail,
        publicAppUrl: handles.publicAppUrl,
      }),
    }),
    openPaymentMethodSession: new OpenPaymentMethodSessionUseCase(
      subscriptionPorts,
    ),
    mirrorPaymentCard: new MirrorPaymentCardUseCase({
      cards: paymentCards,
      incidents: handles.incidents,
      subscriptions,
    }),
    readClientSubscription: new ReadClientSubscriptionUseCase({
      cards: paymentCards,
      clock,
      subscriptions,
    }),
    reconcileSubscriptionEvent: new ReconcileSubscriptionEventUseCase({
      incidents: handles.incidents,
      subscriptions,
    }),
    refreshPaymentCard: new RefreshPaymentCardUseCase({
      cards: paymentCards,
      customerCards: handles.paymentCustomerCards,
      incidents: handles.incidents,
    }),
    startProgramNow: new StartProgramNowUseCase({
      clock,
      incidents: handles.incidents,
      subscriptions,
    }),
  };

  const roster = new PostgresClientRoster(database);
  const rosterUseCases = {
    listClients: new ListClientsUseCase({
      clock,
      incidents: handles.incidents,
      roster,
    }),
    readClientRecord: new ReadClientRecordUseCase({
      calls: handles.assessmentCallReader,
      clock,
      roster,
    }),
  };

  const portalClientOf = async (authSubjectId: string) => {
    const standing =
      await clientJourneyUseCases.readClientPortalStanding.execute(
        authSubjectId,
      );

    return standing
      ? { clientId: standing.journey.clientId, portal: standing.portal }
      : null;
  };

  const resourceClients: ResourceClients = {
    exists: (clientId) => onboardingClients.exists(clientId),
    findByAuthSubjectId: async (authSubjectId) => {
      const client = await portalClientOf(authSubjectId);

      return client
        ? {
            clientId: client.clientId,
            portal: client.portal === "reachable" ? "reachable" : "unreachable",
          }
        : null;
    },
  };

  const checkInClients: CheckInClients = {
    findByAuthSubjectId: portalClientOf,
    findById: async (clientId) => {
      const entry = await roster.findById(clientId);
      const call = entry
        ? await handles.assessmentCallReader.findById(
            entry.booking.assessmentCallId,
          )
        : null;

      if (!entry || !call) {
        return null;
      }

      const coachingEnded =
        entry.subscription !== null &&
        !CoachingSubscription.reconstitute(
          entry.subscription,
        ).hasPortalAccessAt(clock.now());

      return {
        clientId: entry.journey.clientId,
        portal: ClientJourney.portalReachOf({
          step: ClientJourney.from(entry.journey).step(),
          coaching: coachingEnded ? "ended" : "active",
        }),
        bookingTimeZone: call.visitorTimeZone,
      };
    },
    identitiesOf: async (clientIds) =>
      (await clientIdentities.findByClientIds(clientIds)).map(
        ({ clientId, firstName, lastName, email }) => ({
          clientId,
          firstName,
          lastName,
          email,
        }),
      ),
  };

  const paidClientAdmission: PaidClientAdmission = {
    admit: (input) =>
      invitationUseCases.admitPaidClient.execute(input).then(() => undefined),
  };

  const useCases = {
    openBundlePage: new OpenBundlePageUseCase({ salesWindow }),
    readCallSalesStates: new ReadCallSalesStatesUseCase({
      callSalesStates: purchases,
    }),
    readPricingTiers: new ReadPricingTiersUseCase({
      pricingEligibility: handles.pricingEligibility,
    }),
    readCheckoutConfirmation: new ReadCheckoutConfirmationUseCase({
      paymentCheckout: handles.paymentCheckout,
      salesWindow,
    }),
    recordCheckoutCompleted: new RecordCheckoutCompletedUseCase({
      admission: paidClientAdmission,
      calls: handles.assessmentCallReader,
      clock,
      incidents: handles.incidents,
      paymentCheckout: handles.paymentCheckout,
      paymentSubscriptions: handles.paymentSubscriptions,
      purchases,
    }),
    resolvePaymentLink: new ResolvePaymentLinkUseCase({
      ...paymentLinkPorts,
      tokenHasher,
    }),
    sendPaymentLink: new SendPaymentLinkUseCase({
      ...paymentLinkPorts,
      incidents: handles.incidents,
      notifications: createCoachingSalesNotifications(
        handles.productEmail,
        emailOptions,
      ),
      tokenGenerator,
    }),
    startCheckout: new StartCheckoutUseCase({
      ...paymentLinkPorts,
      checkoutSessions: paymentLinks,
      paymentCheckout: handles.paymentCheckout,
      tokenHasher,
    }),
  };

  const subscriptionChangeHandler = new CoachingSubscriptionEventHandler({
    reconcileSubscriptionEvent: subscriptionUseCases.reconcileSubscriptionEvent,
  });

  return {
    feature: {
      checkouts: new CheckoutsController({
        appBasePath: handles.appBasePath,
        clock,
        openBundlePage: useCases.openBundlePage,
        publicAppUrl: handles.publicAppUrl,
        readCheckoutConfirmation: useCases.readCheckoutConfirmation,
        resolvePaymentLink: useCases.resolvePaymentLink,
        startCheckout: useCases.startCheckout,
      }),
      clientJourney: new ClientJourneyController(clientJourneyUseCases),
      coachClients: new CoachClientsController({
        ...rosterUseCases,
        readClientInvitation: invitationUseCases.readClientInvitation,
        resendInvitation: invitationUseCases.resendInvitation,
      }),
      coachSales: new CoachSalesController({
        readCallSalesStates: useCases.readCallSalesStates,
        readPricingTiers: useCases.readPricingTiers,
      }),
      invitations: new InvitationsController({
        resolveInvitation: invitationUseCases.resolveInvitation,
      }),
      paymentLinks: new PaymentLinksController({
        sendPaymentLink: useCases.sendPaymentLink,
      }),
      readClientPortalStanding: clientJourneyUseCases.readClientPortalStanding,
      subscription: new SubscriptionController({
        appBasePath: handles.appBasePath,
        cancelSubscription: subscriptionUseCases.cancelSubscription,
        openPaymentMethodSession: subscriptionUseCases.openPaymentMethodSession,
        publicAppUrl: handles.publicAppUrl,
        readClientSubscription: subscriptionUseCases.readClientSubscription,
        startProgramNow: subscriptionUseCases.startProgramNow,
      }),
    },
    handles: {
      checkInClients,
      clientIdentities,
      invitationAcceptance: {
        accept: (input) => invitationUseCases.acceptInvitation.execute(input),
      },
      measurementClients: onboardingClients,
      onboardingClients,
      onboardingReviewStamps: journeys,
      onboardingSubmissionStamps: journeys,
      paymentCardHandler: new CoachingPaymentCardHandler({
        mirrorPaymentCard: subscriptionUseCases.mirrorPaymentCard,
      }),
      paymentCompletionHandler: new CoachingPurchaseCompletionHandler({
        recordCheckoutCompleted: useCases.recordCheckoutCompleted,
        refreshPaymentCard: subscriptionUseCases.refreshPaymentCard,
      }),
      refundHandler: subscriptionChangeHandler,
      resourceClients,
      reviewStampWriter: writeReviewStamps,
      subscriptionChangeHandler,
      unitPreferenceClients: onboardingClients,
    },
  };
}
