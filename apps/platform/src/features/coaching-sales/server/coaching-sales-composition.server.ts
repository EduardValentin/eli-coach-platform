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

import {
  PaymentLinkTokenSha256,
  RandomPaymentLinkTokenGenerator,
} from "~/features/coaching-sales/data/payment-links/payment-link-token.server";
import { PostgresPaymentLinks } from "~/features/coaching-sales/data/payment-links/payment-links-repository.server";
import { CoachSalesController } from "~/features/coaching-sales/api/coach/coach-sales-controller.server";
import { PaymentLinksController } from "~/features/coaching-sales/api/coach/payment-links-controller.server";
import { PostgresCoachingPurchases } from "~/features/coaching-sales/data/purchases/purchases-repository.server";
import { createCoachingSalesNotifications } from "~/features/coaching-sales/email/create-coaching-sales-notifications.server";

export type CoachingSalesFeature = {
  coachSales: CoachSalesController;
  paymentEvents: PaymentEvents;
  paymentLinks: PaymentLinksController;
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

  const useCases = {
    readCallSalesStates: new ReadCallSalesStatesUseCase({
      callSalesStates: purchases,
    }),
    readCheckoutConfirmation: new ReadCheckoutConfirmationUseCase({
      paymentCheckout: handles.paymentCheckout,
      salesWindow,
    }),
    recordCheckoutCompleted: new RecordCheckoutCompletedUseCase({
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
      notifications: createCoachingSalesNotifications(handles.productEmail, {
        appBasePath: handles.appBasePath,
        clock,
        contactEmail: handles.contactEmail,
        publicAppUrl: handles.publicAppUrl,
      }),
      tokenGenerator: new RandomPaymentLinkTokenGenerator(),
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
      coachSales: new CoachSalesController({
        readCallSalesStates: useCases.readCallSalesStates,
      }),
      paymentEvents: handles.paymentEvents,
      paymentLinks: new PaymentLinksController({
        sendPaymentLink: useCases.sendPaymentLink,
      }),
      useCases,
      webhookSigningSecret: handles.webhookSigningSecret,
    },
    handles: {},
  };
}
