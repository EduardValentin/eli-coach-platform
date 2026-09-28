import type { DatabaseClient } from "@eli-coach-platform/db";
import type { InvitationAcceptance } from "@eli-coach-platform/domain/account";
import {
  AcceptInvitationUseCase,
  AdmitPaidClientUseCase,
  ResolveInvitationUseCase,
  type ClientInvitationIncidents,
  type IdentityInvitations,
} from "@eli-coach-platform/domain/client-invitation";
import {
  MarkWelcomeSeenUseCase,
  ReadClientJourneyUseCase,
  ReadProgramStatusUseCase,
} from "@eli-coach-platform/domain/client-journey";
import type {
  OnboardingClients,
  OnboardingSubmissionStamps,
} from "@eli-coach-platform/domain/client-onboarding";
import {
  ReadPricingTiersUseCase,
  type PricingEligibility,
} from "@eli-coach-platform/domain/coaching-bundle";
import {
  ReadCheckoutConfirmationUseCase,
  RecordCheckoutCompletedUseCase,
  StartCheckoutUseCase,
  type PaidClientAdmission,
  type PaymentCheckout,
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
import type { UnitPreferenceClients } from "@eli-coach-platform/domain/unit-preference";
import type { ProductEmail } from "@eli-coach-platform/infrastructure/email/server";
import type { PaymentCompletionHandler } from "@eli-coach-platform/infrastructure/payments/server";

import { ClientJourneyController } from "~/features/coaching-sales/api/client/client-journey-controller.server";
import { CoachSalesController } from "~/features/coaching-sales/api/coach/coach-sales-controller.server";
import { PaymentLinksController } from "~/features/coaching-sales/api/coach/payment-links-controller.server";
import { CoachingPurchaseCompletionHandler } from "~/features/coaching-sales/api/payments/coaching-purchase-completion-handler.server";
import { CheckoutsController } from "~/features/coaching-sales/api/public/checkouts-controller.server";
import { InvitationsController } from "~/features/coaching-sales/api/public/invitations-controller.server";
import { PostgresClientJourneys } from "~/features/coaching-sales/data/client-journeys/client-journeys-repository.server";
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
import { createCoachingSalesNotifications } from "~/features/coaching-sales/email/create-coaching-sales-notifications.server";
import { EmailClientInvitationNotifications } from "~/features/coaching-sales/email/email-client-invitation-notifications.server";

export type CoachingSalesFeature = {
  checkouts: CheckoutsController;
  clientJourney: ClientJourneyController;
  coachSales: CoachSalesController;
  invitations: InvitationsController;
  paymentLinks: PaymentLinksController;
  readClientJourney: ReadClientJourneyUseCase;
};

type CoachingSalesComposition = {
  feature: CoachingSalesFeature;
  handles: {
    invitationAcceptance: InvitationAcceptance;
    onboardingClients: OnboardingClients & UnitPreferenceClients;
    onboardingSubmissionStamps: OnboardingSubmissionStamps;
    paymentCompletionHandler: PaymentCompletionHandler;
  };
};

export type CoachingSalesFeatureHandles = {
  appBasePath: string;
  assessmentCallReader: AssessmentCallReader;
  clock: Clock;
  contactEmail: string;
  database: DatabaseClient;
  featureFlags: FeatureFlagReader;
  identityInvitations: IdentityInvitations;
  incidents: CoachingSalesIncidents & ClientInvitationIncidents;
  paymentCheckout: PaymentCheckout;
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
  const invitations = new PostgresClientInvitations(database);
  const journeys = new PostgresClientJourneys(database);
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

  const invitationUseCases = {
    acceptInvitation: new AcceptInvitationUseCase({
      clock,
      identity: handles.identityInvitations,
      invitations,
    }),
    admitPaidClient: new AdmitPaidClientUseCase({
      clients: new PostgresInvitedClients(database),
      clock,
      identity: handles.identityInvitations,
      incidents: handles.incidents,
      invitationIds: new RandomClientInvitationIdGenerator(),
      invitations,
      notifications: new EmailClientInvitationNotifications(
        handles.productEmail,
        emailOptions,
      ),
      tokenGenerator,
    }),
    resolveInvitation: new ResolveInvitationUseCase({
      clock,
      invitations,
      tokenHasher,
    }),
  };

  const clientJourneyUseCases = {
    markWelcomeSeen: new MarkWelcomeSeenUseCase({ clock, journeys }),
    readClientJourney: new ReadClientJourneyUseCase({ journeys }),
    readProgramStatus: new ReadProgramStatusUseCase({
      journeys,
      subscriptionStarts: purchases,
    }),
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
      readClientJourney: clientJourneyUseCases.readClientJourney,
    },
    handles: {
      invitationAcceptance: {
        accept: (input) => invitationUseCases.acceptInvitation.execute(input),
      },
      onboardingClients: new PostgresOnboardingClients(database),
      onboardingSubmissionStamps: journeys,
      paymentCompletionHandler: new CoachingPurchaseCompletionHandler({
        incidents: handles.incidents,
        recordCheckoutCompleted: useCases.recordCheckoutCompleted,
      }),
    },
  };
}
