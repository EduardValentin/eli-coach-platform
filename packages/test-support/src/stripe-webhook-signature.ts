import { createHmac } from "node:crypto";

export type StripeWebhookEvent = {
  data: { object: unknown };
  id: string;
  type: string;
};

export type StripeWebhookSigning = {
  event: StripeWebhookEvent;
  signedAt: Date;
  signingSecret: string;
};

export type SignedStripeWebhook = { body: string; signature: string };

const MILLISECONDS_PER_SECOND = 1000;

/**
 * A Stripe webhook as Stripe delivers one: the header carries
 * `t=<unix seconds>,v1=<hex HMAC-SHA256 of "<t>.<body>">` keyed by the whole
 * `whsec_` secret. The scheme is restated here rather than signed through the
 * SDK, so the application's own Stripe adapter is the only verifier.
 */
export function signStripeWebhook(
  signing: StripeWebhookSigning,
): SignedStripeWebhook {
  const timestamp = Math.floor(
    signing.signedAt.getTime() / MILLISECONDS_PER_SECOND,
  );
  const body = JSON.stringify({
    ...signing.event,
    created: timestamp,
    livemode: false,
    object: "event",
  });
  const digest = createHmac("sha256", signing.signingSecret)
    .update(`${timestamp}.${body}`)
    .digest("hex");

  return { body, signature: `t=${timestamp},v1=${digest}` };
}
