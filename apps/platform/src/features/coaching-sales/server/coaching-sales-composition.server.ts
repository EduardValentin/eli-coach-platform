import type { DatabaseClient } from "@eli-coach-platform/db";
import type { AssessmentCallReader } from "@eli-coach-platform/domain/assessment-call";
import type {
  ClientIdentities,
  ClientIds,
  ClientReach,
} from "@eli-coach-platform/domain/client";
import type { ClientJourneys } from "@eli-coach-platform/domain/client-journey";
import {
  ReadPricingTiersUseCase,
  type PricingEligibility,
} from "@eli-coach-platform/domain/coaching-bundle";
import {
  CancelSubscriptionUseCase,
  MirrorPaymentCardUseCase,
  OpenPaymentMethodSessionUseCase,
  ReadCheckoutConfirmationUseCase,
  ReadClientSubscriptionUseCase,
  ReadProgramStatusUseCase,
  ReadSubscriptionSummaryUseCase,
  ReconcileSubscriptionEventUseCase,
  RecordCheckoutCompletedUseCase,
  RefreshPaymentCardUseCase,
  SignedInSubscriptions,
  StartCheckoutUseCase,
  StartProgramNowUseCase,
  type CoachingEndHandler,
  type CoachingPeriodHandler,
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
  type CoachingSalesIncidents,
  type PaymentLinkTokenGenerator,
  type PaymentLinkTokenHasher,
} from "@eli-coach-platform/domain/payment-link";
import type { Clock } from "@eli-coach-platform/domain/shared";
import type { ProductEmail } from "@eli-coach-platform/infrastructure/email/server";
import type {
  PaymentCardHandler,
  PaymentCompletionHandler,
  PaymentRefundHandler,
  PaymentSubscriptionChangeHandler,
} from "@eli-coach-platform/infrastructure/payments/server";

import { SubscriptionController } from "~/features/coaching-sales/api/client/subscription-controller.server";
import { CoachSalesController } from "~/features/coaching-sales/api/coach/coach-sales-controller.server";
import { PaymentLinksController } from "~/features/coaching-sales/api/coach/payment-links-controller.server";
import { CoachingPaymentCardHandler } from "~/features/coaching-sales/api/payments/coaching-payment-card-handler.server";
import { CoachingPurchaseCompletionHandler } from "~/features/coaching-sales/api/payments/coaching-purchase-completion-handler.server";
import { CoachingSubscriptionEventHandler } from "~/features/coaching-sales/api/payments/coaching-subscription-event-handler.server";
import { CheckoutsController } from "~/features/coaching-sales/api/public/checkouts-controller.server";
import type {
  ClientWriter,
  CoachingStandingWriter,
} from "~/features/coaching-sales/data/client-writers.server";
import { PostgresPaymentCards } from "~/features/coaching-sales/data/payment-cards/payment-cards-repository.server";
import { PostgresPaymentLinks } from "~/features/coaching-sales/data/payment-links/payment-links-repository.server";
import { RandomPaymentLinkIds } from "~/features/coaching-sales/data/payment-links/random-payment-link-ids.server";
import { PostgresCoachingPurchases } from "~/features/coaching-sales/data/purchases/purchases-repository.server";
import { RandomCoachingSubscriptionIds } from "~/features/coaching-sales/data/subscriptions/random-coaching-subscription-ids.server";
import { PostgresCoachingSubscriptions } from "~/features/coaching-sales/data/subscriptions/subscriptions-repository.server";
import {
  createCoachingSalesNotifications,
  createRefundNotifications,
} from "~/features/coaching-sales/email/create-coaching-sales-notifications.server";

export type CoachingSalesFeature = {
  checkouts: CheckoutsController;
  coachSales: CoachSalesController;
  paymentLinks: PaymentLinksController;
  subscription: SubscriptionController;
};

type CoachingSalesComposition = {
  feature: CoachingSalesFeature;
  handles: {
    paymentCardHandler: PaymentCardHandler;
    paymentCompletionHandler: PaymentCompletionHandler;
    refundHandler: PaymentRefundHandler;
    subscriptionChangeHandler: PaymentSubscriptionChangeHandler;
  };
};

export type CoachingSalesFeatureHandles = {
  appBasePath: string;
  assessmentCallReader: AssessmentCallReader;
  clientIdentities: ClientIdentities;
  clientIds: ClientIds;
  clientJourneys: Pick<ClientJourneys, "findByAuthSubjectId">;
  clientReach: Pick<ClientReach, "findByAuthSubjectId">;
  clock: Clock;
  coachEmail: string;
  coachingEnds: readonly CoachingEndHandler[];
  coachingPeriods: readonly CoachingPeriodHandler[];
  contactEmail: string;
  database: DatabaseClient;
  featureFlags: FeatureFlagReader;
  incidents: CoachingSalesIncidents & CoachingSubscriptionIncidents;
  linkTokens: {
    generator: PaymentLinkTokenGenerator;
    hasher: PaymentLinkTokenHasher;
  };
  paidClientAdmission: PaidClientAdmission;
  paymentCheckout: PaymentCheckout;
  paymentCustomerCards: PaymentCustomerCards;
  paymentSubscriptions: PaymentSubscriptions;
  pricingEligibility: PricingEligibility;
  productEmail: ProductEmail;
  publicAppUrl: string;
  writeClient: ClientWriter;
  writeCoachingStanding: CoachingStandingWriter;
};

export function composeCoachingSalesFeature(
  handles: CoachingSalesFeatureHandles,
): CoachingSalesComposition {
  const { clock, database } = handles;
  const paymentLinks = new PostgresPaymentLinks({ clock, database });
  const purchases = new PostgresCoachingPurchases({
    clock,
    database,
    writeClient: handles.writeClient,
    writeCoachingStanding: handles.writeCoachingStanding,
  });
  const subscriptions = new PostgresCoachingSubscriptions({
    clock,
    database,
    writeCoachingStanding: handles.writeCoachingStanding,
  });
  const paymentCards = new PostgresPaymentCards({ clock, database });
  const { generator: tokenGenerator, hasher: tokenHasher } = handles.linkTokens;
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

  const signedInSubscriptions = new SignedInSubscriptions({
    clientReach: handles.clientReach,
    subscriptions,
  });
  const subscriptionPorts = {
    clock,
    coachingEnds: handles.coachingEnds,
    coachingPeriods: handles.coachingPeriods,
    incidents: handles.incidents,
    paymentSubscriptions: handles.paymentSubscriptions,
    subscriptions,
  };
  const subscriptionUseCases = {
    cancelSubscription: new CancelSubscriptionUseCase({
      ...subscriptionPorts,
      clients: handles.clientIdentities,
      notifications: createRefundNotifications(handles.productEmail, {
        appBasePath: handles.appBasePath,
        clock,
        coachEmail: handles.coachEmail,
        publicAppUrl: handles.publicAppUrl,
      }),
      signedInSubscriptions,
    }),
    openPaymentMethodSession: new OpenPaymentMethodSessionUseCase({
      ...subscriptionPorts,
      signedInSubscriptions,
    }),
    mirrorPaymentCard: new MirrorPaymentCardUseCase({
      cards: paymentCards,
      incidents: handles.incidents,
      subscriptions,
    }),
    readClientSubscription: new ReadClientSubscriptionUseCase({
      cards: paymentCards,
      clock,
      signedInSubscriptions,
    }),
    readProgramStatus: new ReadProgramStatusUseCase({
      clock,
      journeys: handles.clientJourneys,
      subscriptions,
    }),
    reconcileSubscriptionEvent: new ReconcileSubscriptionEventUseCase(
      subscriptionPorts,
    ),
    refreshPaymentCard: new RefreshPaymentCardUseCase({
      cards: paymentCards,
      customerCards: handles.paymentCustomerCards,
      incidents: handles.incidents,
    }),
    startProgramNow: new StartProgramNowUseCase({
      ...subscriptionPorts,
      signedInSubscriptions,
    }),
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
    readSubscriptionSummary: new ReadSubscriptionSummaryUseCase({
      clock,
      subscriptions,
    }),
    recordCheckoutCompleted: new RecordCheckoutCompletedUseCase({
      admission: handles.paidClientAdmission,
      calls: handles.assessmentCallReader,
      clientIds: handles.clientIds,
      clock,
      incidents: handles.incidents,
      paymentCheckout: handles.paymentCheckout,
      paymentSubscriptions: handles.paymentSubscriptions,
      purchases,
      subscriptionIds: new RandomCoachingSubscriptionIds(),
    }),
    resolvePaymentLink: new ResolvePaymentLinkUseCase({
      ...paymentLinkPorts,
      tokenHasher,
    }),
    sendPaymentLink: new SendPaymentLinkUseCase({
      ...paymentLinkPorts,
      ids: new RandomPaymentLinkIds(),
      incidents: handles.incidents,
      notifications: createCoachingSalesNotifications(handles.productEmail, {
        appBasePath: handles.appBasePath,
        clock,
        contactEmail: handles.contactEmail,
        publicAppUrl: handles.publicAppUrl,
      }),
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
      coachSales: new CoachSalesController({
        readCallSalesStates: useCases.readCallSalesStates,
        readPricingTiers: useCases.readPricingTiers,
        readSubscriptionSummary: useCases.readSubscriptionSummary,
      }),
      paymentLinks: new PaymentLinksController({
        sendPaymentLink: useCases.sendPaymentLink,
      }),
      subscription: new SubscriptionController({
        appBasePath: handles.appBasePath,
        cancelSubscription: subscriptionUseCases.cancelSubscription,
        openPaymentMethodSession: subscriptionUseCases.openPaymentMethodSession,
        publicAppUrl: handles.publicAppUrl,
        readClientSubscription: subscriptionUseCases.readClientSubscription,
        readProgramStatus: subscriptionUseCases.readProgramStatus,
        startProgramNow: subscriptionUseCases.startProgramNow,
      }),
    },
    handles: {
      paymentCardHandler: new CoachingPaymentCardHandler({
        mirrorPaymentCard: subscriptionUseCases.mirrorPaymentCard,
      }),
      paymentCompletionHandler: new CoachingPurchaseCompletionHandler({
        recordCheckoutCompleted: useCases.recordCheckoutCompleted,
        refreshPaymentCard: subscriptionUseCases.refreshPaymentCard,
      }),
      refundHandler: subscriptionChangeHandler,
      subscriptionChangeHandler,
    },
  };
}
