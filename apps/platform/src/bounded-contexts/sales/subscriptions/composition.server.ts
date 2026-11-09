import type { DatabaseClient } from "~/shared/database";
import { createUnitOfWork } from "~/shared/database/index.server";
import type { EndedCallsFacade } from "~/bounded-contexts/scheduling/public/ended-calls-facade";
import type { AdmissionsFacade } from "~/bounded-contexts/clients/public/admissions-facade";
import type { ClientLookupFacade } from "~/bounded-contexts/clients/public/client-lookup-facade";
import type { ClientProfileFacade } from "~/bounded-contexts/clients/public/client-profile-facade";
import type { CoachingPeriodsFacade } from "~/bounded-contexts/clients/public/coaching-periods-facade";
import { ReadPricingTiersUseCase } from "~/bounded-contexts/sales/subscriptions/domain/coaching-bundle";
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
} from "~/bounded-contexts/sales/subscriptions/domain/coaching-subscription";
import type { FeatureFlagsFacade } from "~/bounded-contexts/operations/public/feature-flags-facade";
import {
  SubscriptionsWindow,
  OpenBundlePageUseCase,
  ReadCallSalesStatesUseCase,
  ResolvePaymentLinkUseCase,
  SendPaymentLinkUseCase,
  type PaymentLinkTokenGeneratorPort,
  type PaymentLinkTokenHasherPort,
} from "~/bounded-contexts/sales/subscriptions/domain/payment-link";
import type { ClockPort } from "~/bounded-contexts/sales/subscriptions/domain/clock-port";
import type { EmailAcceptancePort } from "~/bounded-contexts/sales/subscriptions/domain/email-acceptance-port";
import type { ProductEmailPort } from "~/shared/email/index.server";

import { SubscriptionController } from "~/bounded-contexts/sales/subscriptions/adapters/inbound/http/client/subscription-controller.server";
import { CoachSalesController } from "~/bounded-contexts/sales/subscriptions/adapters/inbound/http/coach/coach-sales-controller.server";
import { PaymentLinksController } from "~/bounded-contexts/sales/subscriptions/adapters/inbound/http/coach/payment-links-controller.server";
import { CoachingPaymentCardHandler } from "~/bounded-contexts/sales/subscriptions/adapters/inbound/http/payments/coaching-payment-card-handler.server";
import { CoachingPurchaseCompletionHandler } from "~/bounded-contexts/sales/subscriptions/adapters/inbound/http/payments/coaching-purchase-completion-handler.server";
import { CoachingSubscriptionEventHandler } from "~/bounded-contexts/sales/subscriptions/adapters/inbound/http/payments/coaching-subscription-event-handler.server";
import { CheckoutsController } from "~/bounded-contexts/sales/subscriptions/adapters/inbound/http/public-site/checkouts-controller.server";
import { ClientsClientLookupAdapter } from "~/bounded-contexts/sales/subscriptions/adapters/outbound/clients/clients-client-lookup-adapter.server";
import { ClientsCoachingEndHandlerAdapter } from "~/bounded-contexts/sales/subscriptions/adapters/outbound/clients/clients-coaching-end-handler-adapter.server";
import { ClientsCoachingPeriodHandlerAdapter } from "~/bounded-contexts/sales/subscriptions/adapters/outbound/clients/clients-coaching-period-handler-adapter.server";
import { ClientsCoachingStandingWriterAdapter } from "~/bounded-contexts/sales/subscriptions/adapters/outbound/clients/clients-coaching-standing-writer-adapter.server";
import { ClientsPaidClientAdmissionAdapter } from "~/bounded-contexts/sales/subscriptions/adapters/outbound/clients/clients-paid-client-admission-adapter.server";
import { PostgresPaymentEventLedgerRepository } from "~/bounded-contexts/sales/shared/payments/adapters/outbound/persistence/postgres-payment-event-ledger-repository.server";
import { PostgresPaymentCardsRepository } from "~/bounded-contexts/sales/subscriptions/adapters/outbound/persistence/payment-cards/postgres-payment-cards-repository.server";
import { PostgresPaymentLinksRepository } from "~/bounded-contexts/sales/subscriptions/adapters/outbound/persistence/payment-links/postgres-payment-links-repository.server";
import { RandomPaymentLinkIdsAdapter } from "~/bounded-contexts/sales/subscriptions/adapters/outbound/persistence/payment-links/random-payment-link-ids-adapter.server";
import { PostgresCoachingPurchasesRepository } from "~/bounded-contexts/sales/subscriptions/adapters/outbound/persistence/purchases/postgres-coaching-purchases-repository.server";
import { RandomCoachingSubscriptionIdsAdapter } from "~/bounded-contexts/sales/subscriptions/adapters/outbound/persistence/subscriptions/random-coaching-subscription-ids-adapter.server";
import { PostgresCoachingSubscriptionsRepository } from "~/bounded-contexts/sales/subscriptions/adapters/outbound/persistence/subscriptions/postgres-coaching-subscriptions-repository.server";
import { createSubscriptionsNotificationsAdapter } from "~/bounded-contexts/sales/subscriptions/adapters/outbound/email/create-subscriptions-notifications-adapter.server";
import { createRefundNotificationsAdapter } from "./adapters/outbound/email/create-refund-notifications-adapter.server";
import type { SubscriptionsFeature } from "~/bounded-contexts/sales/subscriptions/adapters/inbound/http/context.server";
import type { LoggerPort } from "~/shared/logging/logger-port.server";
import { SubscriptionsIncidentsAdapter } from "~/bounded-contexts/sales/subscriptions/adapters/outbound/logging/subscriptions-incidents-adapter.server";
import { SchedulingEndedCallsAdapter } from "~/bounded-contexts/sales/subscriptions/adapters/outbound/scheduling/scheduling-ended-calls-adapter.server";
import { OperationsWaitlistModeAdapter } from "~/bounded-contexts/sales/subscriptions/adapters/outbound/operations/operations-waitlist-mode-adapter.server";
import { WaitlistPricingEligibilityAdapter } from "~/bounded-contexts/sales/subscriptions/adapters/outbound/waitlist/waitlist-pricing-eligibility-adapter.server";
import { PaymentsAdapter } from "~/bounded-contexts/sales/subscriptions/adapters/outbound/payments/payments-adapter.server";
import type { PaymentsConfig } from "~/bounded-contexts/sales/shared/payments/config.server";
import type { PaymentProvider } from "~/bounded-contexts/sales/shared/payments/adapters/outbound/payment-provider-adapter.server";
import type { PaymentCardHandlerPort } from "~/bounded-contexts/sales/shared/payments/adapters/inbound/http/payment-card-handler-port.server";
import type { PaymentCompletionHandlerPort } from "~/bounded-contexts/sales/shared/payments/adapters/inbound/http/payment-completion-handler-port.server";
import type { PaymentRefundHandlerPort } from "~/bounded-contexts/sales/shared/payments/adapters/inbound/http/payment-refund-handler-port.server";
import type { PaymentSubscriptionChangeHandlerPort } from "~/bounded-contexts/sales/shared/payments/adapters/inbound/http/payment-subscription-change-handler-port.server";

type SubscriptionsComposition = {
  feature: SubscriptionsFeature;
  paymentHandlers: {
    paymentCompletionHandlerPort: PaymentCompletionHandlerPort;
    paymentSubscriptionChangeHandlerPort: PaymentSubscriptionChangeHandlerPort;
    paymentRefundHandlerPort: PaymentRefundHandlerPort;
    paymentCardHandlerPort: PaymentCardHandlerPort;
  };
};

export type SubscriptionsFeatureHandles = {
  admissionsFacade: AdmissionsFacade;
  appBasePath: string;
  endedCallsFacade: EndedCallsFacade;
  clientLookupFacade: ClientLookupFacade;
  clientProfileFacade: ClientProfileFacade;
  clockPort: ClockPort;
  coachEmail: string;
  coachingPeriodsFacade: CoachingPeriodsFacade;
  contactEmail: string;
  database: DatabaseClient;
  emailAcceptancePort: EmailAcceptancePort;
  featureFlagsFacade: FeatureFlagsFacade;
  loggerPort: LoggerPort;
  linkTokens: {
    generator: PaymentLinkTokenGeneratorPort;
    hasher: PaymentLinkTokenHasherPort;
  };
  paymentCheckoutPort: PaymentCheckoutPort;
  paymentCustomerCardsPort: PaymentCustomerCardsPort;
  paymentSubscriptionsPort: PaymentSubscriptionsPort;
  pricingEligibilitySourceFacade: PricingEligibilitySourceFacade;
  productEmailPort: ProductEmailPort;
  publicAppUrl: string;
};

export type SubscriptionPaymentHandles = Pick<
  SubscriptionsFeatureHandles,
  | "paymentCheckoutPort"
  | "paymentCustomerCardsPort"
  | "paymentSubscriptionsPort"
>;

export function composeSubscriptionsFeature(
  handles: SubscriptionsFeatureHandles,
): SubscriptionsComposition {
  const subscriptionsIncidentsAdapter = new SubscriptionsIncidentsAdapter(
    handles.loggerPort,
  );
  const { clockPort, database } = handles;
  const unitOfWork = createUnitOfWork(database);
  const clientsClientLookupAdapter = new ClientsClientLookupAdapter(
    handles.clientLookupFacade,
  );
  const clientsPaidClientAdmissionAdapter =
    new ClientsPaidClientAdmissionAdapter(
      handles.admissionsFacade,
      handles.clientProfileFacade,
    );
  const postgresPaymentLinksRepository = new PostgresPaymentLinksRepository({
    clockPort,
    database,
  });
  const postgresCoachingPurchasesRepository =
    new PostgresCoachingPurchasesRepository({
      clockPort,
      database,
    });
  const postgresCoachingSubscriptionsRepository =
    new PostgresCoachingSubscriptionsRepository({
      clockPort,
      database,
      coachingStandingWriterPort: new ClientsCoachingStandingWriterAdapter(
        handles.admissionsFacade,
      ),
    });
  const postgresPaymentCardsRepository = new PostgresPaymentCardsRepository({
    clockPort,
    database,
  });
  const {
    generator: paymentLinkTokenGeneratorPort,
    hasher: paymentLinkTokenHasherPort,
  } = handles.linkTokens;
  const salesWindow = new SubscriptionsWindow({
    subscriptionsIncidentsPort: subscriptionsIncidentsAdapter,
    waitlistModePort: new OperationsWaitlistModeAdapter(
      handles.featureFlagsFacade,
    ),
  });
  const schedulingEndedCallsAdapter = new SchedulingEndedCallsAdapter(
    handles.endedCallsFacade,
  );
  const waitlistPricingEligibilityAdapter =
    new WaitlistPricingEligibilityAdapter(
      handles.pricingEligibilitySourceFacade,
    );
  const paymentLinkPorts = {
    endedCallsPort: schedulingEndedCallsAdapter,
    callSalesStatesPort: postgresCoachingPurchasesRepository,
    clockPort,
    emailAcceptancePort: handles.emailAcceptancePort,
    paymentLinksPort: postgresPaymentLinksRepository,
    pricingEligibilityPort: waitlistPricingEligibilityAdapter,
    salesWindow,
  };

  const signedInSubscriptions = new SignedInSubscriptions({
    clientLookupPort: clientsClientLookupAdapter,
    coachingSubscriptionsPort: postgresCoachingSubscriptionsRepository,
  });
  const subscriptionPorts = {
    clockPort,
    coachingEnds: [
      new ClientsCoachingEndHandlerAdapter(handles.coachingPeriodsFacade),
    ],
    coachingPeriods: [
      new ClientsCoachingPeriodHandlerAdapter(handles.coachingPeriodsFacade),
    ],
    coachingSubscriptionIncidentsPort: subscriptionsIncidentsAdapter,
    paymentSubscriptionsPort: handles.paymentSubscriptionsPort,
    coachingSubscriptionsPort: postgresCoachingSubscriptionsRepository,
  };
  const subscriptionUseCases = {
    cancelSubscriptionUseCase: new CancelSubscriptionUseCase({
      ...subscriptionPorts,
      clientLookupPort: clientsClientLookupAdapter,
      refundNotificationsPort: createRefundNotificationsAdapter(
        handles.productEmailPort,
        {
          appBasePath: handles.appBasePath,
          clockPort,
          coachEmail: handles.coachEmail,
          publicAppUrl: handles.publicAppUrl,
        },
      ),
      signedInSubscriptions,
    }),
    openPaymentMethodSessionUseCase: new OpenPaymentMethodSessionUseCase({
      ...subscriptionPorts,
      signedInSubscriptions,
    }),
    mirrorPaymentCardUseCase: new MirrorPaymentCardUseCase({
      paymentCardsPort: postgresPaymentCardsRepository,
      coachingSubscriptionIncidentsPort: subscriptionsIncidentsAdapter,
      coachingSubscriptionsPort: postgresCoachingSubscriptionsRepository,
    }),
    readClientSubscriptionUseCase: new ReadClientSubscriptionUseCase({
      paymentCardsPort: postgresPaymentCardsRepository,
      clockPort,
      signedInSubscriptions,
    }),
    readProgramStatusUseCase: new ReadProgramStatusUseCase({
      clockPort,
      clientLookupPort: clientsClientLookupAdapter,
      coachingSubscriptionsPort: postgresCoachingSubscriptionsRepository,
    }),
    reconcileSubscriptionEventUseCase: new ReconcileSubscriptionEventUseCase(
      subscriptionPorts,
    ),
    refreshPaymentCardUseCase: new RefreshPaymentCardUseCase({
      paymentCardsPort: postgresPaymentCardsRepository,
      paymentCustomerCardsPort: handles.paymentCustomerCardsPort,
      coachingSubscriptionIncidentsPort: subscriptionsIncidentsAdapter,
    }),
    startProgramNowUseCase: new StartProgramNowUseCase({
      ...subscriptionPorts,
      signedInSubscriptions,
    }),
  };

  const useCases = {
    openBundlePageUseCase: new OpenBundlePageUseCase({ salesWindow }),
    readCallSalesStatesUseCase: new ReadCallSalesStatesUseCase({
      callSalesStatesPort: postgresCoachingPurchasesRepository,
    }),
    readPricingTiersUseCase: new ReadPricingTiersUseCase({
      pricingEligibilityPort: waitlistPricingEligibilityAdapter,
    }),
    readCheckoutConfirmationUseCase: new ReadCheckoutConfirmationUseCase({
      paymentCheckoutPort: handles.paymentCheckoutPort,
      salesWindow,
    }),
    readSubscriptionSummaryUseCase: new ReadSubscriptionSummaryUseCase({
      clockPort,
      coachingSubscriptionsPort: postgresCoachingSubscriptionsRepository,
    }),
    finishCheckoutPurchaseUseCase: new FinishCheckoutPurchaseUseCase({
      paidClientAdmissionPort: clientsPaidClientAdmissionAdapter,
      coachingSubscriptionIncidentsPort: subscriptionsIncidentsAdapter,
      paymentSubscriptionsPort: handles.paymentSubscriptionsPort,
    }),
    readCheckoutPurchaseUseCase: new ReadCheckoutPurchaseUseCase({
      endedCallsPort: schedulingEndedCallsAdapter,
      clockPort,
      coachingSubscriptionIncidentsPort: subscriptionsIncidentsAdapter,
      paymentCheckoutPort: handles.paymentCheckoutPort,
      coachingSubscriptionIdsPort: new RandomCoachingSubscriptionIdsAdapter(),
    }),
    recordCheckoutPurchaseUseCase: new RecordCheckoutPurchaseUseCase({
      paidClientAdmissionPort: clientsPaidClientAdmissionAdapter,
      coachingSubscriptionIncidentsPort: subscriptionsIncidentsAdapter,
      paymentEventLedgerPort: new PostgresPaymentEventLedgerRepository(
        database,
      ),
      coachingPurchasesPort: postgresCoachingPurchasesRepository,
    }),
    resolvePaymentLinkUseCase: new ResolvePaymentLinkUseCase({
      ...paymentLinkPorts,
      paymentLinkTokenHasherPort,
    }),
    sendPaymentLinkUseCase: new SendPaymentLinkUseCase({
      ...paymentLinkPorts,
      paymentLinkIdsPort: new RandomPaymentLinkIdsAdapter(),
      subscriptionsIncidentsPort: subscriptionsIncidentsAdapter,
      subscriptionsNotificationsPort: createSubscriptionsNotificationsAdapter(
        handles.productEmailPort,
        {
          appBasePath: handles.appBasePath,
          clockPort,
          contactEmail: handles.contactEmail,
          publicAppUrl: handles.publicAppUrl,
        },
      ),
      paymentLinkTokenGeneratorPort,
    }),
    startCheckoutUseCase: new StartCheckoutUseCase({
      ...paymentLinkPorts,
      checkoutSessionsPort: postgresPaymentLinksRepository,
      paymentCheckoutPort: handles.paymentCheckoutPort,
      paymentLinkTokenHasherPort,
    }),
  };

  const coachingSubscriptionEventHandler = new CoachingSubscriptionEventHandler(
    {
      reconcileSubscriptionEventUseCase:
        subscriptionUseCases.reconcileSubscriptionEventUseCase,
    },
  );
  const coachingPurchaseCompletionHandler =
    new CoachingPurchaseCompletionHandler({
      finishCheckoutPurchaseUseCase: useCases.finishCheckoutPurchaseUseCase,
      readCheckoutPurchaseUseCase: useCases.readCheckoutPurchaseUseCase,
      recordCheckoutPurchaseUseCase: useCases.recordCheckoutPurchaseUseCase,
      refreshPaymentCardUseCase: subscriptionUseCases.refreshPaymentCardUseCase,
      unitOfWork,
    });

  return {
    feature: {
      checkoutsController: new CheckoutsController({
        appBasePath: handles.appBasePath,
        clockPort,
        openBundlePageUseCase: useCases.openBundlePageUseCase,
        publicAppUrl: handles.publicAppUrl,
        readCheckoutConfirmationUseCase:
          useCases.readCheckoutConfirmationUseCase,
        resolvePaymentLinkUseCase: useCases.resolvePaymentLinkUseCase,
        startCheckoutUseCase: useCases.startCheckoutUseCase,
        unitOfWork,
      }),
      coachSalesController: new CoachSalesController({
        emailAcceptancePort: handles.emailAcceptancePort,
        readCallSalesStatesUseCase: useCases.readCallSalesStatesUseCase,
        readPricingTiersUseCase: useCases.readPricingTiersUseCase,
        readSubscriptionSummaryUseCase: useCases.readSubscriptionSummaryUseCase,
      }),
      paymentLinksController: new PaymentLinksController({
        sendPaymentLinkUseCase: useCases.sendPaymentLinkUseCase,
        unitOfWork,
      }),
      subscriptionController: new SubscriptionController({
        appBasePath: handles.appBasePath,
        cancelSubscriptionUseCase:
          subscriptionUseCases.cancelSubscriptionUseCase,
        openPaymentMethodSessionUseCase:
          subscriptionUseCases.openPaymentMethodSessionUseCase,
        publicAppUrl: handles.publicAppUrl,
        readClientSubscriptionUseCase:
          subscriptionUseCases.readClientSubscriptionUseCase,
        readProgramStatusUseCase: subscriptionUseCases.readProgramStatusUseCase,
        startProgramNowUseCase: subscriptionUseCases.startProgramNowUseCase,
      }),
    },
    paymentHandlers: {
      paymentCompletionHandlerPort: coachingPurchaseCompletionHandler,
      paymentSubscriptionChangeHandlerPort: coachingSubscriptionEventHandler,
      paymentRefundHandlerPort: coachingSubscriptionEventHandler,
      paymentCardHandlerPort: new CoachingPaymentCardHandler({
        mirrorPaymentCardUseCase: subscriptionUseCases.mirrorPaymentCardUseCase,
      }),
    },
  };
}

export function composeSubscriptionPayments(handles: {
  paymentProvider: PaymentProvider;
  paymentsConfig: PaymentsConfig;
}): SubscriptionPaymentHandles {
  const paymentsAdapter = new PaymentsAdapter({
    paymentProvider: handles.paymentProvider,
    portalConfigurationId:
      handles.paymentsConfig.STRIPE_PORTAL_CONFIGURATION_ID,
  });

  return {
    paymentCheckoutPort: paymentsAdapter.paymentCheckoutPort,
    paymentCustomerCardsPort: paymentsAdapter.paymentCustomerCardsPort,
    paymentSubscriptionsPort: paymentsAdapter.paymentSubscriptionsPort,
  };
}
