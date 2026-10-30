import { createContext, type RouterContext } from "react-router";

import type { SubscriptionController } from "~/bounded-contexts/sales/coaching-sales/adapters/inbound/http/client/subscription-controller.server";
import type { CoachSalesController } from "~/bounded-contexts/sales/coaching-sales/adapters/inbound/http/coach/coach-sales-controller.server";
import type { PaymentLinksController } from "~/bounded-contexts/sales/coaching-sales/adapters/inbound/http/coach/payment-links-controller.server";
import type { CheckoutsController } from "~/bounded-contexts/sales/coaching-sales/adapters/inbound/http/public-site/checkouts-controller.server";
import type { StripeWebhookController } from "~/bounded-contexts/sales/coaching-sales/adapters/inbound/http/stripe-webhooks/stripe-webhook-controller.server";

export type CoachingSalesFeature = {
  checkouts: CheckoutsController;
  coachSales: CoachSalesController;
  paymentLinks: PaymentLinksController;
  stripeWebhooks: StripeWebhookController;
  subscription: SubscriptionController;
};

export const coachingSalesContext: RouterContext<CoachingSalesFeature> =
  createContext<CoachingSalesFeature>();
