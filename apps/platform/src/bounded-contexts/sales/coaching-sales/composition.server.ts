import type { DatabaseClient } from "~/shared/database";
import { createUnitOfWork } from "~/shared/database/index.server";
import type { EndedCallsFacade } from "~/bounded-contexts/scheduling/public/ended-calls-facade";
import type { AdmissionsFacade } from "~/bounded-contexts/clients/public/admissions-facade";
import type { ClientLookupFacade } from "~/bounded-contexts/clients/public/client-lookup-facade";
import type { ClientProfileFacade } from "~/bounded-contexts/clients/public/client-profile-facade";
import type { CoachingPeriodsFacade } from "~/bounded-contexts/clients/public/coaching-periods-facade";
import { ReadPricingTiersUseCase } from "~/bounded-contexts/sales/coaching-sales/domain/coaching-bundle";
import type { PricingEligibilitySourceFacade } from "~/bounded-contexts/sales/waitlist/public/pricing-eligibility-source-facade";
import {
  CancelSubscriptionUseCase,
  FinishCheckoutPurchaseUseCase,
  MirrorPaymentCardUseCase,
  OpenPaymentMethodSessionUseCase,
  ReadCheckoutConfirmationUseCase,
  ReadClientSubscriptionUseCase,
  ReadProgramStatusUseCase,
  ReadSubscriptionSummaryUseCase,
  ReadCheckoutPurchaseUseCase,
  ReconcileSubscriptionEventUseCase,
  RecordCheckoutPurchaseUseCase,
  RefreshPaymentCardUseCase,
  SignedInSubscriptions,
  StartCheckoutUseCase,
  StartProgramNowUseCase,
  type PaymentCheckoutPort,
  type PaymentCustomerCardsPort,
  type PaymentSubscriptionsPort,
} from "~/bounded-contexts/sales/coaching-sales/domain/coaching-subscription";
import type { FeatureFlagsFacade } from "~/bounded-contexts/operations/public/feature-flags-facade";
import {
  CoachingSalesWindow,
  OpenBundlePageUseCase,
  ReadCallSalesStatesUseCase,
  ResolvePaymentLinkUseCase,
  SendPaymentLinkUseCase,
  type PaymentLinkTokenGeneratorPort,
  type PaymentLinkTokenHasherPort,
} from "~/bounded-contexts/sales/coaching-sales/domain/payment-link";
import type { ClockPort } from "~/bounded-contexts/sales/coaching-sales/domain/clock-port";
import type { EmailAcceptancePort } from "~/bounded-contexts/sales/coaching-sales/domain/email-acceptance-port";
import type { ProductEmailPort } from "~/shared/email/index.server";
import type { PaymentEventsPort } from "~/bounded-contexts/sales/coaching-sales/adapters/outbound/payments/payment-events-port.server";

import { SubscriptionController } from "~/bounded-contexts/sales/coaching-sales/adapters/inbound/http/client/subscription-controller.server";
import { CoachSalesController } from "~/bounded-contexts/sales/coaching-sales/adapters/inbound/http/coach/coach-sales-controller.server";
import { PaymentLinksController } from "~/bounded-contexts/sales/coaching-sales/adapters/inbound/http/coach/payment-links-controller.server";
import { CoachingPaymentCardHandler } from "~/bounded-contexts/sales/coaching-sales/adapters/inbound/http/payments/coaching-payment-card-handler.server";
import { CoachingPurchaseCompletionHandler } from "~/bounded-contexts/sales/coaching-sales/adapters/inbound/http/payments/coaching-purchase-completion-handler.server";
import { CoachingSubscriptionEventHandler } from "~/bounded-contexts/sales/coaching-sales/adapters/inbound/http/payments/coaching-subscription-event-handler.server";
import { CheckoutsController } from "~/bounded-contexts/sales/coaching-sales/adapters/inbound/http/public-site/checkouts-controller.server";
import { StripeWebhookController } from "~/bounded-contexts/sales/coaching-sales/adapters/inbound/http/stripe-webhooks/stripe-webhook-controller.server";
import { ClientsClientLookupAdapter } from "~/bounded-contexts/sales/coaching-sales/adapters/outbound/clients/clients-client-lookup-adapter.server";
import { ClientsCoachingEndHandlerAdapter } from "~/bounded-contexts/sales/coaching-sales/adapters/outbound/clients/clients-coaching-end-handler-adapter.server";
import { ClientsCoachingPeriodHandlerAdapter } from "~/bounded-contexts/sales/coaching-sales/adapters/outbound/clients/clients-coaching-period-handler-adapter.server";
import { ClientsCoachingStandingWriterAdapter } from "~/bounded-contexts/sales/coaching-sales/adapters/outbound/clients/clients-coaching-standing-writer-adapter.server";
import { ClientsPaidClientAdmissionAdapter } from "~/bounded-contexts/sales/coaching-sales/adapters/outbound/clients/clients-paid-client-admission-adapter.server";
import { PostgresPaymentEventLedgerRepository } from "~/bounded-contexts/sales/coaching-sales/adapters/outbound/persistence/payment-events/postgres-payment-event-ledger-repository.server";
import { PostgresPaymentCardsRepository } from "~/bounded-contexts/sales/coaching-sales/adapters/outbound/persistence/payment-cards/postgres-payment-cards-repository.server";
import { PostgresPaymentLinksRepository } from "~/bounded-contexts/sales/coaching-sales/adapters/outbound/persistence/payment-links/postgres-payment-links-repository.server";
import { RandomPaymentLinkIdsAdapter } from "~/bounded-contexts/sales/coaching-sales/adapters/outbound/persistence/payment-links/random-payment-link-ids-adapter.server";
import { PostgresCoachingPurchasesRepository } from "~/bounded-contexts/sales/coaching-sales/adapters/outbound/persistence/purchases/postgres-coaching-purchases-repository.server";
import { RandomCoachingSubscriptionIdsAdapter } from "~/bounded-contexts/sales/coaching-sales/adapters/outbound/persistence/subscriptions/random-coaching-subscription-ids-adapter.server";
import { PostgresCoachingSubscriptionsRepository } from "~/bounded-contexts/sales/coaching-sales/adapters/outbound/persistence/subscriptions/postgres-coaching-subscriptions-repository.server";
import { createCoachingSalesNotificationsAdapter } from "~/bounded-contexts/sales/coaching-sales/adapters/outbound/email/create-coaching-sales-notifications-adapter.server";
import { createRefundNotificationsAdapter } from "./adapters/outbound/email/create-refund-notifications-adapter.server";
import type { CoachingSalesFeature } from "~/bounded-contexts/sales/coaching-sales/adapters/inbound/http/context.server";
import type { LoggerPort } from "~/shared/logging/logger-port.server";
import { CoachingSalesIncidentsAdapter } from "~/bounded-contexts/sales/coaching-sales/adapters/outbound/logging/coaching-sales-incidents-adapter.server";
import { SchedulingEndedCallsAdapter } from "~/bounded-contexts/sales/coaching-sales/adapters/outbound/scheduling/scheduling-ended-calls-adapter.server";
import { OperationsWaitlistModeAdapter } from "~/bounded-contexts/sales/coaching-sales/adapters/outbound/operations/operations-waitlist-mode-adapter.server";
import { WaitlistPricingEligibilityAdapter } from "~/bounded-contexts/sales/coaching-sales/adapters/outbound/waitlist/waitlist-pricing-eligibility-adapter.server";
import { PaymentsAdapter } from "~/bounded-contexts/sales/coaching-sales/adapters/outbound/payments/payments-adapter.server";
import type { PaymentsConfig } from "~/bounded-contexts/sales/coaching-sales/config.server";

type CoachingSalesComposition = {
  feature: CoachingSalesFeature;
};

export type CoachingSalesFeatureHandles = {
  admissions: AdmissionsFacade;
  appBasePath: string;
  endedCalls: EndedCallsFacade;
  clientLookup: ClientLookupFacade;
  clientProfile: ClientProfileFacade;
  clock: ClockPort;
  coachEmail: string;
  coachingPeriods: CoachingPeriodsFacade;
  contactEmail: string;
  database: DatabaseClient;
  emailAcceptance: EmailAcceptancePort;
  featureFlags: FeatureFlagsFacade;
  logger: LoggerPort;
  linkTokens: {
    generator: PaymentLinkTokenGeneratorPort;
    hasher: PaymentLinkTokenHasherPort;
  };
  paymentCheckout: PaymentCheckoutPort;
  paymentCustomerCards: PaymentCustomerCardsPort;
  paymentEvents: PaymentEventsPort;
  paymentSubscriptions: PaymentSubscriptionsPort;
  pricingEligibility: PricingEligibilitySourceFacade;
  productEmail: ProductEmailPort;
  publicAppUrl: string;
  webhookSigningSecret: string | undefined;
};

export type PaymentHandles = Pick<
  CoachingSalesFeatureHandles,
  | "paymentCheckout"
  | "paymentCustomerCards"
  | "paymentEvents"
  | "paymentSubscriptions"
  | "webhookSigningSecret"
>;

export function composeCoachingSalesFeature(
  handles: CoachingSalesFeatureHandles,
): CoachingSalesComposition {
  const incidents = new CoachingSalesIncidentsAdapter(handles.logger);
  const { clock, database } = handles;
  const unitOfWork = createUnitOfWork(database);
  const clients = new ClientsClientLookupAdapter(handles.clientLookup);
  const admission = new ClientsPaidClientAdmissionAdapter(
    handles.admissions,
    handles.clientProfile,
  );
  const paymentLinks = new PostgresPaymentLinksRepository({ clock, database });
  const purchases = new PostgresCoachingPurchasesRepository({
    clock,
    database,
  });
  const subscriptions = new PostgresCoachingSubscriptionsRepository({
    clock,
    database,
    standings: new ClientsCoachingStandingWriterAdapter(handles.admissions),
  });
  const paymentCards = new PostgresPaymentCardsRepository({ clock, database });
  const { generator: tokenGenerator, hasher: tokenHasher } = handles.linkTokens;
  const salesWindow = new CoachingSalesWindow({
    incidents,
    waitlistMode: new OperationsWaitlistModeAdapter(handles.featureFlags),
  });
  const calls = new SchedulingEndedCallsAdapter(handles.endedCalls);
  const pricingEligibility = new WaitlistPricingEligibilityAdapter(
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
    coachingEnds: [
      new ClientsCoachingEndHandlerAdapter(handles.coachingPeriods),
    ],
    coachingPeriods: [
      new ClientsCoachingPeriodHandlerAdapter(handles.coachingPeriods),
    ],
    incidents,
    paymentSubscriptions: handles.paymentSubscriptions,
    subscriptions,
  };
  const subscriptionUseCases = {
    cancelSubscription: new CancelSubscriptionUseCase({
      ...subscriptionPorts,
      clients,
      notifications: createRefundNotificationsAdapter(handles.productEmail, {
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
    finishCheckoutPurchase: new FinishCheckoutPurchaseUseCase({
      admission,
      incidents,
      paymentSubscriptions: handles.paymentSubscriptions,
    }),
    readCheckoutPurchase: new ReadCheckoutPurchaseUseCase({
      calls,
      clock,
      incidents,
      paymentCheckout: handles.paymentCheckout,
      subscriptionIds: new RandomCoachingSubscriptionIdsAdapter(),
    }),
    recordCheckoutPurchase: new RecordCheckoutPurchaseUseCase({
      admission,
      incidents,
      paymentEventLedger: new PostgresPaymentEventLedgerRepository(database),
      purchases,
    }),
    resolvePaymentLink: new ResolvePaymentLinkUseCase({
      ...paymentLinkPorts,
      tokenHasher,
    }),
    sendPaymentLink: new SendPaymentLinkUseCase({
      ...paymentLinkPorts,
      ids: new RandomPaymentLinkIdsAdapter(),
      incidents,
      notifications: createCoachingSalesNotificationsAdapter(
        handles.productEmail,
        {
          appBasePath: handles.appBasePath,
          clock,
          contactEmail: handles.contactEmail,
          publicAppUrl: handles.publicAppUrl,
        },
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
  const paymentCompletionHandler = new CoachingPurchaseCompletionHandler({
    finishCheckoutPurchase: useCases.finishCheckoutPurchase,
    readCheckoutPurchase: useCases.readCheckoutPurchase,
    recordCheckoutPurchase: useCases.recordCheckoutPurchase,
    refreshPaymentCard: subscriptionUseCases.refreshPaymentCard,
    unitOfWork,
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

export function composePayments(config: PaymentsConfig): PaymentHandles {
  const payments = new PaymentsAdapter(config);

  return {
    paymentCheckout: payments.checkout,
    paymentCustomerCards: payments.customerCards,
    paymentEvents: payments.events,
    paymentSubscriptions: payments.subscriptions,
    webhookSigningSecret: config.STRIPE_WEBHOOK_SIGNING_SECRET,
  };
}
