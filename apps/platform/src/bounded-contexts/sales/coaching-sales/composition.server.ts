import type { DatabaseClient } from "~/shared/database";
import { createUnitOfWork } from "~/shared/database/index.server";
import type { EndedCallsFacade } from "~/bounded-contexts/scheduling/public/ended-calls";
import type {
  ClientIdentities,
  ClientIds,
  ClientReach,
} from "~/bounded-contexts/clients/clients/domain/client";
import type { ClientJourneys } from "~/bounded-contexts/clients/clients/domain/client-journey";
import {
  ReadPricingTiersUseCase,
  type PricingEligibility,
} from "~/bounded-contexts/sales/coaching-sales/domain/coaching-bundle";
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
  type PaidClientAdmission,
  type PaymentCheckout,
  type PaymentCustomerCards,
  type PaymentSubscriptions,
} from "~/bounded-contexts/sales/coaching-sales/domain/coaching-subscription";
import type { FeatureFlagReader } from "~/bounded-contexts/operations/feature-flags/domain/feature-flag";
import {
  CoachingSalesWindow,
  OpenBundlePageUseCase,
  ReadCallSalesStatesUseCase,
  ResolvePaymentLinkUseCase,
  SendPaymentLinkUseCase,
  type PaymentLinkTokenGenerator,
  type PaymentLinkTokenHasher,
} from "~/bounded-contexts/sales/coaching-sales/domain/payment-link";
import type { Clock } from "~/bounded-contexts/sales/coaching-sales/domain/clock";
import type { EmailAcceptance } from "~/bounded-contexts/sales/coaching-sales/domain/email-acceptance";
import type { ProductEmail } from "~/shared/email/index.server";
import type { PaymentEvents } from "~/bounded-contexts/sales/coaching-sales/adapters/outbound/payments/payment-events.server";

import { SubscriptionController } from "~/bounded-contexts/sales/coaching-sales/adapters/inbound/http/client/subscription-controller.server";
import { CoachSalesController } from "~/bounded-contexts/sales/coaching-sales/adapters/inbound/http/coach/coach-sales-controller.server";
import { PaymentLinksController } from "~/bounded-contexts/sales/coaching-sales/adapters/inbound/http/coach/payment-links-controller.server";
import { CoachingPaymentCardHandler } from "~/bounded-contexts/sales/coaching-sales/adapters/inbound/http/payments/coaching-payment-card-handler.server";
import { CoachingPurchaseCompletionHandler } from "~/bounded-contexts/sales/coaching-sales/adapters/inbound/http/payments/coaching-purchase-completion-handler.server";
import { CoachingSubscriptionEventHandler } from "~/bounded-contexts/sales/coaching-sales/adapters/inbound/http/payments/coaching-subscription-event-handler.server";
import { CheckoutsController } from "~/bounded-contexts/sales/coaching-sales/adapters/inbound/http/public/checkouts-controller.server";
import { StripeWebhookController } from "~/bounded-contexts/sales/coaching-sales/adapters/inbound/http/stripe-webhooks/stripe-webhook-controller.server";
import type {
  ClientProfileOpener,
  ClientWriter,
  CoachingStandingWriter,
} from "~/bounded-contexts/sales/coaching-sales/adapters/outbound/persistence/client-writers.server";
import { PostgresPaymentCards } from "~/bounded-contexts/sales/coaching-sales/adapters/outbound/persistence/payment-cards/payment-cards-repository.server";
import { PostgresPaymentLinks } from "~/bounded-contexts/sales/coaching-sales/adapters/outbound/persistence/payment-links/payment-links-repository.server";
import { RandomPaymentLinkIds } from "~/bounded-contexts/sales/coaching-sales/adapters/outbound/persistence/payment-links/random-payment-link-ids.server";
import { PostgresCoachingPurchases } from "~/bounded-contexts/sales/coaching-sales/adapters/outbound/persistence/purchases/purchases-repository.server";
import { RandomCoachingSubscriptionIds } from "~/bounded-contexts/sales/coaching-sales/adapters/outbound/persistence/subscriptions/random-coaching-subscription-ids.server";
import { PostgresCoachingSubscriptions } from "~/bounded-contexts/sales/coaching-sales/adapters/outbound/persistence/subscriptions/subscriptions-repository.server";
import {
  createCoachingSalesNotifications,
  createRefundNotifications,
} from "~/bounded-contexts/sales/coaching-sales/adapters/outbound/email/create-coaching-sales-notifications.server";
import type { CoachingSalesFeature } from "~/bounded-contexts/sales/coaching-sales/adapters/inbound/http/context.server";
import type { Logger } from "~/shared/logging/console-logger.server";
import { createCoachingSalesIncidents } from "~/bounded-contexts/sales/coaching-sales/adapters/outbound/logging/coaching-sales-incidents.server";
import { SchedulingEndedCalls } from "~/bounded-contexts/sales/coaching-sales/adapters/outbound/scheduling/ended-calls.server";

type CoachingSalesComposition = {
  feature: CoachingSalesFeature;
};

export type CoachingSalesFeatureHandles = {
  appBasePath: string;
  endedCalls: EndedCallsFacade;
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
  emailAcceptance: EmailAcceptance;
  featureFlags: FeatureFlagReader;
  logger: Logger;
  linkTokens: {
    generator: PaymentLinkTokenGenerator;
    hasher: PaymentLinkTokenHasher;
  };
  openClientProfile: ClientProfileOpener;
  paidClientAdmission: PaidClientAdmission;
  paymentCheckout: PaymentCheckout;
  paymentCustomerCards: PaymentCustomerCards;
  paymentEvents: PaymentEvents;
  paymentSubscriptions: PaymentSubscriptions;
  pricingEligibility: PricingEligibility;
  productEmail: ProductEmail;
  publicAppUrl: string;
  webhookSigningSecret: string | undefined;
  writeClient: ClientWriter;
  writeCoachingStanding: CoachingStandingWriter;
};

export function composeCoachingSalesFeature(
  handles: CoachingSalesFeatureHandles,
): CoachingSalesComposition {
  const incidents = createCoachingSalesIncidents(handles.logger);
  const { clock, database } = handles;
  const unitOfWork = createUnitOfWork(database);
  const paymentLinks = new PostgresPaymentLinks({ clock, database });
  const purchases = new PostgresCoachingPurchases({
    clock,
    database,
    openClientProfile: handles.openClientProfile,
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
    incidents,
  });
  const calls = new SchedulingEndedCalls(handles.endedCalls);
  const paymentLinkPorts = {
    calls,
    callSalesStates: purchases,
    clock,
    emailAcceptance: handles.emailAcceptance,
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
    incidents,
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
      incidents,
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
      incidents,
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
      calls,
      clientIds: handles.clientIds,
      clock,
      incidents,
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
      incidents,
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
  const paymentCompletionHandler = new CoachingPurchaseCompletionHandler({
    recordCheckoutCompleted: useCases.recordCheckoutCompleted,
    refreshPaymentCard: subscriptionUseCases.refreshPaymentCard,
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
        unitOfWork,
      }),
      coachSales: new CoachSalesController({
        emailAcceptance: handles.emailAcceptance,
        readCallSalesStates: useCases.readCallSalesStates,
        readPricingTiers: useCases.readPricingTiers,
        readSubscriptionSummary: useCases.readSubscriptionSummary,
      }),
      paymentLinks: new PaymentLinksController({
        sendPaymentLink: useCases.sendPaymentLink,
        unitOfWork,
      }),
      stripeWebhooks: new StripeWebhookController({
        cardHandler: new CoachingPaymentCardHandler({
          mirrorPaymentCard: subscriptionUseCases.mirrorPaymentCard,
        }),
        completionHandlersByPurpose: byPurpose(paymentCompletionHandler),
        incidents,
        paymentEvents: handles.paymentEvents,
        refundHandler: subscriptionChangeHandler,
        signingSecret: handles.webhookSigningSecret,
        subscriptionChangeHandlersByPurpose: byPurpose(
          subscriptionChangeHandler,
        ),
        unitOfWork,
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
  };
}

function byPurpose<Handler extends { readonly purpose: string }>(
  handler: Handler,
): ReadonlyMap<string, Handler> {
  return new Map([[handler.purpose, handler]]);
}
