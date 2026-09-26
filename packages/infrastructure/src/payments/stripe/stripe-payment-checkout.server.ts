import type {
  CheckoutCompletion,
  CreateCheckoutSessionCommand,
  PaymentCheckout,
} from "@eli-coach-platform/domain/coaching-subscription";
import Stripe from "stripe";
import { z } from "zod";

import {
  fromUnixSeconds,
  readPaidCheckoutSession,
} from "../checkout-session-completion.server";

type StripeCheckoutClient = {
  customers: {
    create(
      params: Stripe.CustomerCreateParams,
      options: Stripe.RequestOptions,
    ): Promise<{ id: string }>;
  };
  checkout: {
    sessions: {
      create(
        params: Stripe.Checkout.SessionCreateParams,
      ): Promise<{ id: string; url: string | null }>;
      expire(id: string): Promise<unknown>;
      retrieve(
        id: string,
        params?: Stripe.Checkout.SessionRetrieveParams,
      ): Promise<unknown>;
    };
  };
};

const RESOURCE_MISSING_CODE = "resource_missing";

const SUBSCRIPTION_EXPANSION = { expand: ["subscription"] };

const expandedSubscriptionSchema = z.object({
  subscription: z.object({ created: z.number().int().positive() }),
});

const closedSessionSchema = z.object({
  status: z.enum(["expired", "complete"]),
});

export class StripePaymentCheckout implements PaymentCheckout {
  constructor(private readonly client: StripeCheckoutClient) {}

  async createCustomer(command: {
    email: string;
    assessmentCallId: string;
  }): Promise<{ id: string }> {
    const customer = await this.client.customers.create(
      {
        email: command.email,
        metadata: { assessmentCallId: command.assessmentCallId },
      },
      {
        idempotencyKey: `assessment-call:${command.assessmentCallId}:customer`,
      },
    );

    return { id: customer.id };
  }

  async createSession(
    command: CreateCheckoutSessionCommand,
  ): Promise<{ id: string; url: string }> {
    const session = await this.client.checkout.sessions.create(
      checkoutSessionRequest(command),
    );

    if (!session.url) {
      throw new Error(
        `Checkout session ${session.id} has no hosted page to redirect to.`,
      );
    }

    return { id: session.id, url: session.url };
  }

  async expireSession(id: string): Promise<void> {
    try {
      await this.client.checkout.sessions.expire(id);
    } catch (error) {
      if (await this.wasAlreadyClosed(error, id)) {
        return;
      }

      throw error;
    }
  }

  async findCompletedSession(id: string): Promise<CheckoutCompletion | null> {
    try {
      return readPaidSessionWithSubscription(
        await this.client.checkout.sessions.retrieve(
          id,
          SUBSCRIPTION_EXPANSION,
        ),
      );
    } catch (error) {
      if (isMissingResource(error)) {
        return null;
      }

      throw error;
    }
  }

  private async wasAlreadyClosed(error: unknown, id: string): Promise<boolean> {
    if (!(error instanceof Stripe.errors.StripeInvalidRequestError)) {
      return false;
    }

    const session = await this.client.checkout.sessions.retrieve(id);

    return closedSessionSchema.safeParse(session).success;
  }
}

function readPaidSessionWithSubscription(
  session: unknown,
): CheckoutCompletion | null {
  const expanded = expandedSubscriptionSchema.safeParse(session);

  if (!expanded.success) {
    return null;
  }

  return readPaidCheckoutSession(
    session,
    fromUnixSeconds(expanded.data.subscription.created),
  );
}

function isMissingResource(error: unknown): boolean {
  return (
    error instanceof Stripe.errors.StripeInvalidRequestError &&
    error.code === RESOURCE_MISSING_CODE
  );
}

function checkoutSessionRequest(
  command: CreateCheckoutSessionCommand,
): Stripe.Checkout.SessionCreateParams {
  const metadata = {
    assessmentCallId: command.metadata.assessmentCallId,
    bundleId: command.metadata.bundleId,
    months: String(command.bundle.months),
    tier: command.metadata.tier,
    startChoice: command.metadata.startChoice,
  };

  return {
    mode: "subscription",
    customer: command.customerId,
    payment_method_types: ["card"],
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: command.currency,
          unit_amount: command.bundle.amountCents,
          product_data: { name: command.bundle.title },
          recurring: {
            interval: "month",
            interval_count: command.bundle.months,
          },
        },
      },
    ],
    metadata,
    subscription_data: { metadata },
    success_url: command.successUrl,
    cancel_url: command.cancelUrl,
  };
}
