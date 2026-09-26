import type { DatabaseClient } from "@eli-coach-platform/db";
import type { PricingEligibility } from "@eli-coach-platform/domain/coaching-bundle";
import {
  ReadCheckoutConfirmationUseCase,
  RecordCheckoutCompletedUseCase,
  StartCheckoutUseCase,
  type PaymentCheckout,
} from "@eli-coach-platform/domain/coaching-subscription";
import type { FeatureFlagReader } from "@eli-coach-platform/domain/feature-flag";
import {
  CoachingSalesWindow,
  ReadCallSalesStatesUseCase,
  ResolvePaymentLinkUseCase,
  SendPaymentLinkUseCase,
  type AssessmentCallReader,
  type CoachingSalesIncidents,
} from "@eli-coach-platform/domain/payment-link";
import type { Clock } from "@eli-coach-platform/domain/shared";
import type { ProductEmail } from "@eli-coach-platform/infrastructure/email/server";
import type { PaymentEvents } from "@eli-coach-platform/infrastructure/payments/server";

import { CheckoutsController } from "~/features/coaching-sales/api/public/checkouts-controller.server";
import { StripeWebhookController } from "~/features/coaching-sales/api/webhooks/stripe-webhook-controller.server";
import {
  PaymentLinkTokenSha256,
  RandomPaymentLinkTokenGenerator,
} from "~/features/coaching-sales/data/payment-links/payment-link-token.server";
import { PostgresPaymentLinks } from "~/features/coaching-sales/data/payment-links/payment-links-repository.server";
import { PostgresCoachingPurchases } from "~/features/coaching-sales/data/purchases/purchases-repository.server";
import { createCoachingSalesNotifications } from "~/features/coaching-sales/email/create-coaching-sales-notifications.server";

export type CoachingSalesFeature = {
  checkouts: CheckoutsController;
  paymentEvents: PaymentEvents;
  stripeWebhooks: StripeWebhookController;
  useCases: {
    readCallSalesStates: ReadCallSalesStatesUseCase;
    readCheckoutConfirmation: ReadCheckoutConfirmationUseCase;
    recordCheckoutCompleted: RecordCheckoutCompletedUseCase;
    resolvePaymentLink: ResolvePaymentLinkUseCase;
    sendPaymentLink: SendPaymentLinkUseCase;
    startCheckout: StartCheckoutUseCase;
  };
  webhookSigningSecret: string | undefined;
};

type CoachingSalesComposition = {
  feature: CoachingSalesFeature;
  handles: Record<string, never>;
};

export type CoachingSalesFeatureHandles = {
  appBasePath: string;
  assessmentCallReader: AssessmentCallReader;
  clock: Clock;
  contactEmail: string;
  database: DatabaseClient;
  featureFlags: FeatureFlagReader;
  incidents: CoachingSalesIncidents;
  paymentCheckout: PaymentCheckout;
  paymentEvents: PaymentEvents;
  pricingEligibility: PricingEligibility;
  productEmail: ProductEmail;
  publicAppUrl: string;
  webhookSigningSecret: string | undefined;
};

export function composeCoachingSalesFeature(
  handles: CoachingSalesFeatureHandles,
): CoachingSalesComposition {
  const { clock, database } = handles;
  const paymentLinks = new PostgresPaymentLinks({ clock, database });
  const purchases = new PostgresCoachingPurchases({ clock, database });
  const tokenHasher = new PaymentLinkTokenSha256();
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

  const readCheckoutConfirmation = new ReadCheckoutConfirmationUseCase({
    paymentCheckout: handles.paymentCheckout,
    salesWindow,
  });
  const recordCheckoutCompleted = new RecordCheckoutCompletedUseCase({
    calls: handles.assessmentCallReader,
    clock,
    incidents: handles.incidents,
    purchases,
  });
  const resolvePaymentLink = new ResolvePaymentLinkUseCase({
    ...paymentLinkPorts,
    tokenHasher,
  });
  const startCheckout = new StartCheckoutUseCase({
    ...paymentLinkPorts,
    checkoutSessions: paymentLinks,
    paymentCheckout: handles.paymentCheckout,
    tokenHasher,
  });

  return {
    feature: {
      checkouts: new CheckoutsController({
        appBasePath: handles.appBasePath,
        clock,
        publicAppUrl: handles.publicAppUrl,
        readCheckoutConfirmation,
        resolvePaymentLink,
        startCheckout,
      }),
      paymentEvents: handles.paymentEvents,
      stripeWebhooks: new StripeWebhookController({
        paymentEvents: handles.paymentEvents,
        recordCheckoutCompleted,
        signingSecret: handles.webhookSigningSecret,
      }),
      useCases: {
        readCallSalesStates: new ReadCallSalesStatesUseCase({
          callSalesStates: purchases,
        }),
        readCheckoutConfirmation,
        recordCheckoutCompleted,
        resolvePaymentLink,
        sendPaymentLink: new SendPaymentLinkUseCase({
          ...paymentLinkPorts,
          incidents: handles.incidents,
          notifications: createCoachingSalesNotifications(
            handles.productEmail,
            {
              appBasePath: handles.appBasePath,
              clock,
              contactEmail: handles.contactEmail,
              publicAppUrl: handles.publicAppUrl,
            },
          ),
          tokenGenerator: new RandomPaymentLinkTokenGenerator(),
        }),
        startCheckout,
      },
      webhookSigningSecret: handles.webhookSigningSecret,
    },
    handles: {},
  };
}
