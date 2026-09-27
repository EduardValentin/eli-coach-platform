import { createHmac } from "node:crypto";

import { loadIntegrationTestEnvironment } from "./runtime-environment";
import { toUnixSeconds } from "./wire-mock/expectations/stripe-api";

const ANOTHER_ACCOUNTS_SIGNING_SECRET = "whsec_another_stripe_account_secret";

export type StripeWebhookOptions = {
  event: { data: { object: unknown }; id: string; type: string };
  /**
   * The server refuses a signature older than five minutes by its own clock,
   * so a case holding that clock signs at the instant it holds.
   */
  signedAt: Date;
  url: string;
};

const { runtimeEnvironment } = loadIntegrationTestEnvironment();

export function stripeWebhook(options: StripeWebhookOptions): Request {
  return signedWebhookRequest(options, configuredSigningSecret());
}

/** The same delivery, signed by an account this deployment does not trust. */
export function stripeWebhookFromAnotherAccount(
  options: StripeWebhookOptions,
): Request {
  return signedWebhookRequest(options, ANOTHER_ACCOUNTS_SIGNING_SECRET);
}

/**
 * A Stripe webhook as Stripe delivers one: the header carries
 * `t=<unix seconds>,v1=<hex HMAC-SHA256 of "<t>.<body>">` keyed by the whole
 * `whsec_` secret. The scheme is restated here rather than signed through the
 * SDK, so the application's own Stripe adapter is the only verifier.
 */
function signedWebhookRequest(
  options: StripeWebhookOptions,
  signingSecret: string,
): Request {
  const timestamp = toUnixSeconds(options.signedAt);
  const body = JSON.stringify({
    ...options.event,
    created: timestamp,
    livemode: false,
    object: "event",
  });
  const signature = createHmac("sha256", signingSecret)
    .update(`${timestamp}.${body}`)
    .digest("hex");

  return new Request(options.url, {
    body,
    headers: {
      "Content-Type": "application/json",
      "stripe-signature": `t=${timestamp},v1=${signature}`,
    },
    method: "POST",
  });
}

function configuredSigningSecret(): string {
  const secret = runtimeEnvironment.STRIPE_WEBHOOK_SIGNING_SECRET;

  if (!secret) {
    throw new Error(
      "STRIPE_WEBHOOK_SIGNING_SECRET is missing from the integration environment.",
    );
  }

  return secret;
}
