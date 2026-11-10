import type Stripe from "stripe";

import { createStripeTestClient } from "./stripe-environment";
import type { StripeRefund } from "./stripe-subscriptions";

export async function refundPartOfStoreOrderInStripe(
  sessionId: string,
  amountCents: number,
): Promise<StripeRefund> {
  const stripe = createStripeTestClient();
  const refund = await stripe.refunds.create({
    payment_intent: await paymentIntentOf(stripe, sessionId),
    amount: amountCents,
  });

  return refundedChargeOf(refund);
}

export async function refundRestOfStoreOrderInStripe(
  sessionId: string,
): Promise<StripeRefund> {
  const stripe = createStripeTestClient();
  const refund = await stripe.refunds.create({
    payment_intent: await paymentIntentOf(stripe, sessionId),
  });

  return refundedChargeOf(refund);
}

async function paymentIntentOf(
  stripe: Stripe,
  sessionId: string,
): Promise<string> {
  const session = await stripe.checkout.sessions.retrieve(sessionId);

  if (!session.payment_intent) {
    throw new Error(`Checkout Session ${sessionId} carries no payment.`);
  }

  return typeof session.payment_intent === "string"
    ? session.payment_intent
    : session.payment_intent.id;
}

function refundedChargeOf(
  refund: Stripe.Response<Stripe.Refund>,
): StripeRefund {
  if (!refund.charge) {
    throw new Error(`Refund ${refund.id} names no charge.`);
  }

  return {
    chargeId:
      typeof refund.charge === "string" ? refund.charge : refund.charge.id,
    requestId: refund.lastResponse.requestId,
  };
}
