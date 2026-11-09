import { createContext, type RouterContext } from "react-router";

import type { StripeWebhookController } from "~/bounded-contexts/sales/shared/payments/adapters/inbound/http/stripe-webhook-controller.server";

export type PaymentsFeature = {
  stripeWebhookController: StripeWebhookController;
};

export const paymentsContext: RouterContext<PaymentsFeature> =
  createContext<PaymentsFeature>();
