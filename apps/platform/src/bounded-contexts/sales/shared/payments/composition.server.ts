import type { DatabaseClient } from "~/shared/database";
import { createUnitOfWork } from "~/shared/database/index.server";
import type { LoggerPort } from "~/shared/logging/logger-port.server";
import type { PaymentsFeature } from "~/bounded-contexts/sales/shared/payments/adapters/inbound/http/context.server";
import type { PaymentCardHandlerPort } from "~/bounded-contexts/sales/shared/payments/adapters/inbound/http/payment-card-handler-port.server";
import type { PaymentCompletionHandlerPort } from "~/bounded-contexts/sales/shared/payments/adapters/inbound/http/payment-completion-handler-port.server";
import type { PaymentRefundHandlerPort } from "~/bounded-contexts/sales/shared/payments/adapters/inbound/http/payment-refund-handler-port.server";
import type { PaymentSubscriptionChangeHandlerPort } from "~/bounded-contexts/sales/shared/payments/adapters/inbound/http/payment-subscription-change-handler-port.server";
import { StripeWebhookController } from "~/bounded-contexts/sales/shared/payments/adapters/inbound/http/stripe-webhook-controller.server";
import { PaymentWebhookIncidentsAdapter } from "~/bounded-contexts/sales/shared/payments/adapters/outbound/logging/payment-webhook-incidents-adapter.server";
import type { PaymentEventsPort } from "~/bounded-contexts/sales/shared/payments/adapters/outbound/payment-events-port.server";
import { createPaymentProviderAdapter } from "~/bounded-contexts/sales/shared/payments/adapters/outbound/create-payment-provider-adapter.server";
import type { PaymentProvider } from "~/bounded-contexts/sales/shared/payments/adapters/outbound/payment-provider.server";
import type { PaymentsConfig } from "~/bounded-contexts/sales/shared/payments/config.server";

type PaymentsHandles = {
  paymentEventsPort: PaymentEventsPort;
  paymentProvider: PaymentProvider;
  webhookSigningSecret: string | undefined;
};

type PaymentHandlers = {
  paymentCompletionHandlers: readonly PaymentCompletionHandlerPort[];
  paymentSubscriptionChangeHandlers: readonly PaymentSubscriptionChangeHandlerPort[];
  paymentRefundHandlerPort: PaymentRefundHandlerPort;
  paymentCardHandlerPort: PaymentCardHandlerPort;
};

type PaymentsFeatureHandles = PaymentsHandles &
  PaymentHandlers & {
    database: DatabaseClient;
    loggerPort: LoggerPort;
  };

export function composePayments(config: PaymentsConfig): PaymentsHandles {
  const paymentProvider = createPaymentProviderAdapter(config);

  return {
    paymentEventsPort: paymentProvider.paymentEventsPort,
    paymentProvider,
    webhookSigningSecret: config.STRIPE_WEBHOOK_SIGNING_SECRET,
  };
}

export function composePaymentsFeature(
  handles: PaymentsFeatureHandles,
): PaymentsFeature {
  return {
    stripeWebhookController: new StripeWebhookController({
      paymentCardHandlerPort: handles.paymentCardHandlerPort,
      completionHandlersByPurpose: byPurpose(handles.paymentCompletionHandlers),
      paymentWebhookIncidentsPort: new PaymentWebhookIncidentsAdapter(
        handles.loggerPort,
      ),
      paymentEventsPort: handles.paymentEventsPort,
      paymentRefundHandlerPort: handles.paymentRefundHandlerPort,
      signingSecret: handles.webhookSigningSecret,
      subscriptionChangeHandlersByPurpose: byPurpose(
        handles.paymentSubscriptionChangeHandlers,
      ),
      unitOfWork: createUnitOfWork(handles.database),
    }),
  };
}

function byPurpose<Handler extends { readonly purpose: string }>(
  handlers: readonly Handler[],
): ReadonlyMap<string, Handler> {
  return new Map(handlers.map((handler) => [handler.purpose, handler]));
}
