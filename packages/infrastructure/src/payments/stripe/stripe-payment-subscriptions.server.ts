import type { PaymentSubscriptions } from "@eli-coach-platform/domain/coaching-subscription";
import type Stripe from "stripe";

type StripeSubscriptionsClient = {
  subscriptions: {
    update(
      id: string,
      params: Stripe.SubscriptionUpdateParams,
    ): Promise<unknown>;
    cancel(
      id: string,
      params: Stripe.SubscriptionCancelParams,
    ): Promise<unknown>;
  };
  billingPortal: {
    sessions: {
      create(
        params: Stripe.BillingPortal.SessionCreateParams,
      ): Promise<{ url: string }>;
    };
  };
};

const MILLISECONDS_PER_SECOND = 1000;

export class StripePaymentSubscriptions implements PaymentSubscriptions {
  constructor(private readonly client: StripeSubscriptionsClient) {}

  async holdRenewal(paymentSubscriptionId: string): Promise<void> {
    await this.client.subscriptions.update(paymentSubscriptionId, {
      pause_collection: { behavior: "void" },
    });
  }

  async endNow(paymentSubscriptionId: string): Promise<void> {
    await this.client.subscriptions.cancel(paymentSubscriptionId, {
      prorate: false,
      invoice_now: false,
    });
  }

  async endAt(command: {
    paymentSubscriptionId: string;
    at: Date;
  }): Promise<void> {
    await this.client.subscriptions.update(command.paymentSubscriptionId, {
      cancel_at: Math.floor(command.at.getTime() / MILLISECONDS_PER_SECOND),
      proration_behavior: "none",
    });
  }

  async openPaymentMethodSession(command: {
    paymentCustomerId: string;
    returnUrl: string;
  }): Promise<{ url: string }> {
    const session = await this.client.billingPortal.sessions.create({
      customer: command.paymentCustomerId,
      return_url: command.returnUrl,
      flow_data: {
        type: "payment_method_update",
        after_completion: {
          type: "redirect",
          redirect: { return_url: command.returnUrl },
        },
      },
    });

    return { url: session.url };
  }
}
