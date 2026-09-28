import {
  signStripeWebhook,
  type StripeWebhookEvent,
} from "@eli-coach-platform/test-support/stripe-webhook-signature";

import { loadIntegrationTestEnvironment } from "./runtime-environment";

const ANOTHER_ACCOUNTS_SIGNING_SECRET = "whsec_another_stripe_account_secret";

export type StripeWebhookOptions = {
  event: StripeWebhookEvent;
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

function signedWebhookRequest(
  options: StripeWebhookOptions,
  signingSecret: string,
): Request {
  const signed = signStripeWebhook({
    event: options.event,
    signedAt: options.signedAt,
    signingSecret,
  });

  return new Request(options.url, {
    body: signed.body,
    headers: {
      "Content-Type": "application/json",
      "stripe-signature": signed.signature,
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
