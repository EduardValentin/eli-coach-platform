import type { DatabaseClient } from "~/shared/database";
import { createUnitOfWork } from "~/shared/database/index.server";
import type { EndedCallsFacade } from "~/bounded-contexts/scheduling/public/ended-calls";
import type { AdmissionsFacade } from "~/bounded-contexts/clients/public/admissions";
import type { ClientLookupFacade } from "~/bounded-contexts/clients/public/client-lookup";
import type { ClientProfileFacade } from "~/bounded-contexts/clients/public/client-profile";
import type { CoachingPeriodsFacade } from "~/bounded-contexts/clients/public/coaching-periods";
import { ReadPricingTiersUseCase } from "~/bounded-contexts/sales/coaching-sales/domain/coaching-bundle";
import type { PricingEligibilitySource } from "~/bounded-contexts/sales/waitlist/public/pricing-eligibility";
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
  type PaymentCheckout,
  type PaymentCustomerCards,
  type PaymentSubscriptions,
} from "~/bounded-contexts/sales/coaching-sales/domain/coaching-subscription";
import type { FeatureFlagsFacade } from "~/bounded-contexts/operations/public/feature-flags";
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
import { ClientsClientLookup } from "~/bounded-contexts/sales/coaching-sales/adapters/outbound/clients/client-lookup.server";
import { ClientsCoachingEndHandler } from "~/bounded-contexts/sales/coaching-sales/adapters/outbound/clients/coaching-end-handler.server";
import { ClientsCoachingPeriodHandler } from "~/bounded-contexts/sales/coaching-sales/adapters/outbound/clients/coaching-period-handler.server";
import { ClientsCoachingStandingWriter } from "~/bounded-contexts/sales/coaching-sales/adapters/outbound/clients/coaching-standing-writer.server";
import { ClientsPaidClientAdmission } from "~/bounded-contexts/sales/coaching-sales/adapters/outbound/clients/paid-client-admission.server";
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
import { OperationsWaitlistMode } from "~/bounded-contexts/sales/coaching-sales/adapters/outbound/operations/waitlist-mode.server";
import { WaitlistPricingEligibility } from "~/bounded-contexts/sales/coaching-sales/adapters/outbound/waitlist/pricing-eligibility.server";

type CoachingSalesComposition = {
  feature: CoachingSalesFeature;
};

export type CoachingSalesFeatureHandles = {
  admissions: AdmissionsFacade;
  appBasePath: string;
  endedCalls: EndedCallsFacade;
  clientLookup: ClientLookupFacade;
  clientProfile: ClientProfileFacade;
  clock: Clock;
  coachEmail: string;
  coachingPeriods: CoachingPeriodsFacade;
  contactEmail: string;
  database: DatabaseClient;
  emailAcceptance: EmailAcceptance;
  featureFlags: FeatureFlagsFacade;
  logger: Logger;
  linkTokens: {
    generator: PaymentLinkTokenGenerator;
    hasher: PaymentLinkTokenHasher;
  };
  paymentCheckout: PaymentCheckout;
  paymentCustomerCards: PaymentCustomerCards;
  paymentEvents: PaymentEvents;
  paymentSubscriptions: PaymentSubscriptions;
  pricingEligibility: PricingEligibilitySource;
  productEmail: ProductEmail;
  publicAppUrl: string;
  webhookSigningSecret: string | undefined;
};

export function composeCoachingSalesFeature(
  handles: CoachingSalesFeatureHandles,
): CoachingSalesComposition {
  const incidents = createCoachingSalesIncidents(handles.logger);
  const { clock, database } = handles;
  const unitOfWork = createUnitOfWork(database);
  const clients = new ClientsClientLookup(handles.clientLookup);
  const admission = new ClientsPaidClientAdmission(
    handles.admissions,
    handles.clientProfile,
  );
  const paymentLinks = new PostgresPaymentLinks({ clock, database });
  const purchases = new PostgresCoachingPurchases({
    admission,
    clock,
    database,
  });
  const subscriptions = new PostgresCoachingSubscriptions({
    clock,
    database,
    standings: new ClientsCoachingStandingWriter(handles.admissions),
  });
  const paymentCards = new PostgresPaymentCards({ clock, database });
  const { generator: tokenGenerator, hasher: tokenHasher } = handles.linkTokens;
  const salesWindow = new CoachingSalesWindow({
    incidents,
    waitlistMode: new OperationsWaitlistMode(handles.featureFlags),
  });
  const calls = new SchedulingEndedCalls(handles.endedCalls);
  const pricingEligibility = new WaitlistPricingEligibility(
    handles.pricingEligibility,
  );
  const paymentLinkPorts = {
    calls,
    callSalesStates: purchases,
    clock,
    emailAcceptance: handles.emailAcceptance,
    paymentLinks,
    pricingEligibility,
    salesWindow,
  };

  const signedInSubscriptions = new SignedInSubscriptions({
    clients,
    subscriptions,
  });
  const subscriptionPorts = {
    clock,
    coachingEnds: [new ClientsCoachingEndHandler(handles.coachingPeriods)],
    coachingPeriods: [
      new ClientsCoachingPeriodHandler(handles.coachingPeriods),
    ],
    incidents,
    paymentSubscriptions: handles.paymentSubscriptions,
    subscriptions,
  };
  const subscriptionUseCases = {
    cancelSubscription: new CancelSubscriptionUseCase({
      ...subscriptionPorts,
      clients,
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
      journeys: clients,
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
    readPricingTiers: new ReadPricingTiersUseCase({ pricingEligibility }),
    readCheckoutConfirmation: new ReadCheckoutConfirmationUseCase({
      paymentCheckout: handles.paymentCheckout,
      salesWindow,
    }),
    readSubscriptionSummary: new ReadSubscriptionSummaryUseCase({
      clock,
      subscriptions,
    }),
    recordCheckoutCompleted: new RecordCheckoutCompletedUseCase({
      admission,
      calls,
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
