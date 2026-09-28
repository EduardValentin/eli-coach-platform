import { signStripeWebhook } from "@eli-coach-platform/test-support/stripe-webhook-signature";

import {
  createStripeTestClient,
  requireStripeTestEnvironment,
} from "./stripe-environment";

const STRIPE_WEBHOOKS_PATH = "/api/stripe/webhooks";
const CHECKOUT_COMPLETED = "checkout.session.completed";

type CheckoutCompletedDelivery = {
  baseURL: string;
  eventId: string;
  sessionId: string;
};

export async function deliverCheckoutCompleted(
  delivery: CheckoutCompletedDelivery,
): Promise<Response> {
  const session = await createStripeTestClient().checkout.sessions.retrieve(
    delivery.sessionId,
  );
  const signed = signStripeWebhook({
    event: {
      data: { object: session },
      id: delivery.eventId,
      type: CHECKOUT_COMPLETED,
    },
    signedAt: new Date(),
    signingSecret: requireStripeTestEnvironment().webhookSigningSecret,
  });

  return fetch(new URL(STRIPE_WEBHOOKS_PATH, delivery.baseURL), {
    body: signed.body,
    headers: {
      "Content-Type": "application/json",
      "stripe-signature": signed.signature,
    },
    method: "POST",
  });
}
