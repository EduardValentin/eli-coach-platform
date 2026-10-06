import {
  findCoachingBundle,
  PRICE_TIERS,
} from "@eli-coach-platform/domain/coaching-bundle";
import {
  COACHING_SUBSCRIPTION_PURPOSE,
  START_CHOICES,
  type CheckoutCompletion,
  type CreateCheckoutSessionCommand,
  type PaymentCheckout,
} from "@eli-coach-platform/domain/coaching-subscription";
import Stripe from "stripe";
import { z } from "zod";

import { PAYMENT_PURPOSE_METADATA_KEY } from "../payment-completion-handler.server";
import { readPaidCheckoutSession } from "../payment-event-reader.server";
import type { PaidCheckoutSession } from "../payment-event-types.server";

const CHECKOUT_SESSION_ID_SHAPE = /^cs_(test|live)_[A-Za-z0-9]+$/;

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

const COMPLETION_EXPANSION = { expand: ["subscription", "invoice.payments"] };

const expandedSubscriptionSchema = z.object({
  subscription: z.object({ created: z.number().int().positive() }),
});

const closedSessionSchema = z.object({
  status: z.enum(["expired", "complete"]),
});

const coachingCheckoutMetadataSchema = z
  .object({
    [PAYMENT_PURPOSE_METADATA_KEY]: z.literal(COACHING_SUBSCRIPTION_PURPOSE),
    assessmentCallId: z.uuid(),
    bundleId: z.string(),
    months: z.string(),
    tier: z.enum(PRICE_TIERS),
    startChoice: z.enum(START_CHOICES),
  })
  .transform((metadata, context) => {
    const bundle = findCoachingBundle(metadata.bundleId);

    if (!bundle || String(bundle.months) !== metadata.months) {
      context.addIssue({ code: "custom", message: "Unknown coaching bundle." });
      return z.NEVER;
    }

    return {
      assessmentCallId: metadata.assessmentCallId,
      bundleId: bundle.id,
      tier: metadata.tier,
      startChoice: metadata.startChoice,
    };
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
      StripePaymentCheckout.checkoutSessionRequest(command),
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
    if (!CHECKOUT_SESSION_ID_SHAPE.test(id)) {
      return null;
    }

    try {
      return StripePaymentCheckout.readCoachingCompletion(
        await this.client.checkout.sessions.retrieve(id, COMPLETION_EXPANSION),
      );
    } catch (error) {
      if (StripePaymentCheckout.isMissingResource(error)) {
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

  private static readCoachingCompletion(
    session: unknown,
  ): CheckoutCompletion | null {
    const expanded = expandedSubscriptionSchema.safeParse(session);

    if (!expanded.success) {
      return null;
    }

    const paid = readPaidCheckoutSession(
      session,
      expanded.data.subscription.created,
    );

    return paid ? StripePaymentCheckout.toCheckoutCompletion(paid) : null;
  }

  private static toCheckoutCompletion(
    session: PaidCheckoutSession,
  ): CheckoutCompletion | null {
    const { customerId, subscriptionId } = session;
    const metadata = coachingCheckoutMetadataSchema.safeParse(session.metadata);

    if (!metadata.success || !customerId || !subscriptionId) {
      return null;
    }

    return {
      checkoutSessionId: session.id,
      paymentCustomerId: customerId,
      paymentSubscriptionId: subscriptionId,
      paymentIntentId: session.paymentIntentId,
      amountCents: session.amountCents,
      currency: session.currency,
      customerEmail: session.customerEmail,
      paidAt: session.paidAt,
      ...metadata.data,
    };
  }

  private static isMissingResource(error: unknown): boolean {
    return (
      error instanceof Stripe.errors.StripeInvalidRequestError &&
      error.code === RESOURCE_MISSING_CODE
    );
  }

  private static checkoutSessionRequest(
    command: CreateCheckoutSessionCommand,
  ): Stripe.Checkout.SessionCreateParams {
    const metadata = StripePaymentCheckout.coachingCheckoutMetadata(command);

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

  private static coachingCheckoutMetadata(
    command: CreateCheckoutSessionCommand,
  ): Record<string, string> {
    return {
      [PAYMENT_PURPOSE_METADATA_KEY]: command.metadata.purpose,
      assessmentCallId: command.metadata.assessmentCallId,
      bundleId: command.metadata.bundleId,
      months: String(command.bundle.months),
      tier: command.metadata.tier,
      startChoice: command.metadata.startChoice,
    };
  }
}
