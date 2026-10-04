import type { PlatformRig } from "./platform-rig";
import { stripeWebhook } from "./stripe-webhook-request";
import {
  STRIPE_CARD,
  STRIPE_CUSTOMER_ID,
  STRIPE_PAYMENT_METHOD_ID,
  STRIPE_SUBSCRIPTION_ID,
  stripeSubscriptionPath,
} from "./wire-mock/expectations/stripe-api";
import { STRIPE_WEBHOOKS_API } from "./coaching-sales-journey";

export type SubscriptionLifecycleRow = {
  accessEndsAt: Date | null;
  cancelledAt: Date | null;
  paymentProblemSince: Date | null;
  refundDueBy: Date | null;
  refundDueCents: number | null;
  refundReason: string | null;
  refundedAt: Date | null;
  refundedCents: number | null;
  startChoice: string;
  status: string;
};

export type PaymentCardRow = {
  paymentMethodId: string;
  brand: string;
  lastFour: string;
  expiryMonth: number;
  expiryYear: number;
};

export type ProviderEvent = {
  id: string;
  type: string;
  object: unknown;
  previousAttributes?: Record<string, unknown>;
};

const COACHING_PURPOSE = { purpose: "coaching-subscription" };

export class SubscriptionLifecycleJourney {
  constructor(private readonly rig: PlatformRig) {}

  async deliverEvent(event: ProviderEvent): Promise<Response> {
    return this.rig.suite.request(
      stripeWebhook({
        event: {
          data: {
            object: event.object,
            ...(event.previousAttributes
              ? { previous_attributes: event.previousAttributes }
              : {}),
          },
          id: event.id,
          type: event.type,
        },
        signedAt: this.rig.now(),
        url: this.rig.suite.url(STRIPE_WEBHOOKS_API),
      }),
    );
  }

  async subscriptionRow(
    paymentSubscriptionId: string = STRIPE_SUBSCRIPTION_ID,
  ): Promise<SubscriptionLifecycleRow> {
    const [row, ...others] =
      await this.rig.suite.postgres.queryRows<SubscriptionLifecycleRow>({
        sql: `
          select
            status,
            start_choice as "startChoice",
            cancelled_at as "cancelledAt",
            access_ends_at as "accessEndsAt",
            payment_problem_since as "paymentProblemSince",
            refund_reason as "refundReason",
            refund_due_cents as "refundDueCents",
            refund_due_by as "refundDueBy",
            refunded_cents as "refundedCents",
            refunded_at as "refundedAt"
          from app.coaching_subscriptions
          where stripe_subscription_id = $1
        `,
        values: [paymentSubscriptionId],
      });

    if (!row || others.length > 0) {
      throw new Error(
        `Expected exactly one coaching subscription ${paymentSubscriptionId}.`,
      );
    }

    return row;
  }

  async paymentCardRows(
    paymentCustomerId: string = STRIPE_CUSTOMER_ID,
  ): Promise<PaymentCardRow[]> {
    return this.rig.suite.postgres.queryRows<PaymentCardRow>({
      sql: `
        select
          payment_method_id as "paymentMethodId",
          brand,
          last_four as "lastFour",
          expiry_month as "expiryMonth",
          expiry_year as "expiryYear"
        from app.payment_cards
        where stripe_customer_id = $1
      `,
      values: [paymentCustomerId],
    });
  }

  async recordedEventIds(): Promise<string[]> {
    const rows = await this.rig.suite.postgres.queryRows<{ id: string }>({
      sql: "select id from app.payment_events order by received_at, id",
      values: [],
    });

    return rows.map((row) => row.id);
  }

  async providerSubscriptionRequests(
    method: "POST" | "DELETE",
    paymentSubscriptionId: string = STRIPE_SUBSCRIPTION_ID,
  ): Promise<URLSearchParams[]> {
    const requests = await this.rig.suite.wireMock.recordedRequests(
      stripeSubscriptionPath(paymentSubscriptionId),
    );

    return requests
      .filter((request) => request.method === method)
      .map((request) =>
        method === "DELETE"
          ? new URL(request.url, "http://stripe.invalid").searchParams
          : new URLSearchParams(request.body),
      );
  }
}

export function stripeSubscriptionObject(
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    cancel_at: null,
    customer: STRIPE_CUSTOMER_ID,
    ended_at: null,
    id: STRIPE_SUBSCRIPTION_ID,
    metadata: COACHING_PURPOSE,
    object: "subscription",
    status: "active",
    ...overrides,
  };
}

export function stripeInvoiceObject(
  billingReason: string,
  subscriptionId: string = STRIPE_SUBSCRIPTION_ID,
): Record<string, unknown> {
  return {
    billing_reason: billingReason,
    customer: STRIPE_CUSTOMER_ID,
    id: "in_integration",
    object: "invoice",
    parent: {
      subscription_details: {
        metadata: COACHING_PURPOSE,
        subscription: subscriptionId,
      },
      type: "subscription_details",
    },
  };
}

export function stripeRefundedChargeObject(
  refundedCents: number,
): Record<string, unknown> {
  return {
    amount: 44700,
    amount_refunded: refundedCents,
    currency: "eur",
    customer: STRIPE_CUSTOMER_ID,
    id: "ch_integration",
    metadata: {},
    object: "charge",
    refunded: refundedCents >= 44700,
  };
}

export function stripeCardPaymentMethodObject(
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    card: STRIPE_CARD,
    customer: STRIPE_CUSTOMER_ID,
    id: STRIPE_PAYMENT_METHOD_ID,
    object: "payment_method",
    type: "card",
    ...overrides,
  };
}
