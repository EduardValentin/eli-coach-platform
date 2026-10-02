import { randomUUID } from "node:crypto";
import { setTimeout as delay } from "node:timers/promises";

import {
  signStripeWebhook,
  type StripeWebhookEvent,
} from "@eli-coach-platform/test-support/stripe-webhook-signature";
import type Stripe from "stripe";

import {
  createStripeTestClient,
  requireStripeTestEnvironment,
} from "./stripe-environment";

export type StripeEventType =
  | "checkout.session.completed"
  | "customer.subscription.updated"
  | "customer.subscription.deleted"
  | "charge.refunded"
  | "invoice.paid"
  | "invoice.payment_failed";

export type StripeEventQuery = {
  type: StripeEventType;
  objectId: string;
  causedBy?: string;
};

export type StripeEventDelivery = StripeEventQuery & { baseURL: string };

export type RecordedStripeEvent = {
  id: string;
  type: string;
  request: { id: string | null } | null;
  data: { object: unknown; previous_attributes?: unknown };
};

type CheckoutCompletedDelivery = { baseURL: string; sessionId: string };

type RenewalFailureDelivery = { baseURL: string; subscriptionId: string };

type FailingSubscription = Pick<
  Stripe.Subscription,
  "id" | "customer" | "currency" | "metadata"
>;

const STRIPE_WEBHOOKS_PATH = "/api/stripe/webhooks";
const RECORDED_EVENTS_PAGE = 100;
const EVENT_LOOKUP_ATTEMPTS = 30;
const EVENT_LOOKUP_INTERVAL_MS = 1_000;

export async function deliverStripeEvent(
  delivery: StripeEventDelivery,
): Promise<Response> {
  const event = await waitForRecordedEvent(delivery);

  return postSignedEvent(delivery.baseURL, {
    id: event.id,
    type: event.type,
    data: {
      object: event.data.object,
      previous_attributes: recordOrUndefined(event.data.previous_attributes),
    },
  });
}

export async function deliverCheckoutCompleted(
  delivery: CheckoutCompletedDelivery,
): Promise<Response> {
  return deliverStripeEvent({
    baseURL: delivery.baseURL,
    type: "checkout.session.completed",
    objectId: delivery.sessionId,
  });
}

export async function deliverSimulatedRenewalFailure(
  delivery: RenewalFailureDelivery,
): Promise<Response[]> {
  const subscription = await createStripeTestClient().subscriptions.retrieve(
    delivery.subscriptionId,
  );
  const responses: Response[] = [];

  for (const event of simulatedRenewalFailureEvents(
    subscription,
    randomUUID(),
  )) {
    responses.push(await postSignedEvent(delivery.baseURL, event));
  }

  return responses;
}

export function simulatedRenewalFailureEvents(
  subscription: FailingSubscription,
  reference: string,
): StripeWebhookEvent[] {
  return [
    {
      id: `evt_e2e_${reference}_payment_failed`,
      type: "invoice.payment_failed",
      data: {
        object: {
          id: `in_e2e_${reference}`,
          object: "invoice",
          customer: referencedId(subscription.customer),
          currency: subscription.currency,
          billing_reason: "subscription_cycle",
          status: "open",
          attempt_count: 1,
          parent: {
            type: "subscription_details",
            subscription_details: {
              subscription: subscription.id,
              metadata: subscription.metadata,
            },
          },
        },
      },
    },
    {
      id: `evt_e2e_${reference}_past_due`,
      type: "customer.subscription.updated",
      data: {
        object: { ...subscription, status: "past_due" },
        previous_attributes: { status: "active" },
      },
    },
  ];
}

export function selectRecordedEvent(
  events: readonly RecordedStripeEvent[],
  query: StripeEventQuery,
): RecordedStripeEvent | null {
  const matching = events.filter(
    (event) =>
      event.type === query.type &&
      objectIdOf(event.data.object) === query.objectId &&
      (query.causedBy === undefined || event.request?.id === query.causedBy),
  );

  if (matching.length > 1) {
    throw new Error(
      `Stripe recorded ${matching.length} ${query.type} events for ` +
        `${query.objectId}; name the request that caused the one to deliver.`,
    );
  }

  return matching[0] ?? null;
}

async function waitForRecordedEvent(
  query: StripeEventQuery,
): Promise<RecordedStripeEvent> {
  const stripe = createStripeTestClient();

  for (let attempt = 1; attempt <= EVENT_LOOKUP_ATTEMPTS; attempt += 1) {
    const recorded = await stripe.events.list({
      type: query.type,
      limit: RECORDED_EVENTS_PAGE,
    });
    const event = selectRecordedEvent(recorded.data, query);

    if (event) {
      return event;
    }

    await delay(EVENT_LOOKUP_INTERVAL_MS);
  }

  throw new Error(
    `Stripe recorded no ${query.type} event for ${query.objectId} after ` +
      `${EVENT_LOOKUP_ATTEMPTS} lookups.`,
  );
}

async function postSignedEvent(
  baseURL: string,
  event: StripeWebhookEvent,
): Promise<Response> {
  const signed = signStripeWebhook({
    event,
    signedAt: new Date(),
    signingSecret: requireStripeTestEnvironment().webhookSigningSecret,
  });

  return fetch(new URL(STRIPE_WEBHOOKS_PATH, baseURL), {
    body: signed.body,
    headers: {
      "Content-Type": "application/json",
      "stripe-signature": signed.signature,
    },
    method: "POST",
  });
}

function objectIdOf(object: unknown): string | null {
  if (typeof object !== "object" || object === null || !("id" in object)) {
    return null;
  }

  return typeof object.id === "string" ? object.id : null;
}

function referencedId(reference: string | { id: string }): string {
  return typeof reference === "string" ? reference : reference.id;
}

function recordOrUndefined(
  value: unknown,
): Record<string, unknown> | undefined {
  return typeof value === "object" && value !== null
    ? (value as Record<string, unknown>)
    : undefined;
}
