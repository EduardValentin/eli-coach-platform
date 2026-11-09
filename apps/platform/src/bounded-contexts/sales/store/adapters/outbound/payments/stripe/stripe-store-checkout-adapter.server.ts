import {
  STORE_ORDER_PURPOSE,
  type OpenCheckoutCommand,
  type OpenedCheckout,
  type StoreCheckoutPort,
} from "~/bounded-contexts/sales/store/domain/order";
import Stripe from "stripe";
import { z } from "zod";

import { PAYMENT_PURPOSE_METADATA_KEY } from "~/bounded-contexts/sales/shared/payments/adapters/outbound/payment-purpose.server";

const CHECKOUT_SESSION_ID_SHAPE = /^cs_(test|live)_[A-Za-z0-9]+$/;
const RESOURCE_MISSING_CODE = "resource_missing";

type StripeStoreCheckoutClient = {
  checkout: {
    sessions: {
      create(
        params: Stripe.Checkout.SessionCreateParams,
        options: Stripe.RequestOptions,
      ): Promise<{ id: string; url: string | null }>;
      retrieve(id: string): Promise<unknown>;
    };
  };
};

const paidStoreSessionSchema = z.object({
  status: z.literal("complete"),
  payment_status: z.literal("paid"),
  metadata: z.object({
    [PAYMENT_PURPOSE_METADATA_KEY]: z.literal(STORE_ORDER_PURPOSE),
  }),
});

export class StripeStoreCheckoutAdapter implements StoreCheckoutPort {
  constructor(private readonly client: StripeStoreCheckoutClient) {}

  async open(command: OpenCheckoutCommand): Promise<OpenedCheckout> {
    const session = await this.client.checkout.sessions.create(
      this.sessionRequest(command),
      { idempotencyKey: `store-order:${command.orderId}:checkout` },
    );

    if (!session.url) {
      throw new Error(
        `Checkout session ${session.id} has no hosted page to redirect to.`,
      );
    }

    return { sessionId: session.id, url: session.url };
  }

  async isPaid(sessionId: string): Promise<boolean> {
    if (!CHECKOUT_SESSION_ID_SHAPE.test(sessionId)) {
      return false;
    }

    try {
      return paidStoreSessionSchema.safeParse(
        await this.client.checkout.sessions.retrieve(sessionId),
      ).success;
    } catch (error) {
      if (this.isMissingResource(error)) {
        return false;
      }

      throw error;
    }
  }

  private sessionRequest(
    command: OpenCheckoutCommand,
  ): Stripe.Checkout.SessionCreateParams {
    const metadata = {
      [PAYMENT_PURPOSE_METADATA_KEY]: STORE_ORDER_PURPOSE,
      orderId: command.orderId,
    };

    return {
      mode: "payment",
      customer_email: command.email,
      payment_method_types: ["card"],
      line_items: command.lines.map((line) => ({
        quantity: 1,
        price_data: {
          currency: command.currency.toLowerCase(),
          unit_amount: line.amountMinorUnits,
          product_data: { name: line.title },
        },
      })),
      metadata,
      payment_intent_data: { metadata },
      success_url: command.successUrl,
      cancel_url: command.cancelUrl,
    };
  }

  private isMissingResource(error: unknown): boolean {
    return (
      error instanceof Stripe.errors.StripeInvalidRequestError &&
      error.code === RESOURCE_MISSING_CODE
    );
  }
}
