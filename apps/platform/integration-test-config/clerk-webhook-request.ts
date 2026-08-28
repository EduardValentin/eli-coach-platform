import { createHmac } from "node:crypto";

import { loadIntegrationTestEnvironment } from "./runtime-environment";

/**
 * A Clerk webhook as Clerk delivers one. Clerk signs with the Standard
 * Webhooks scheme: HMAC-SHA256 over `<id>.<timestamp>.<body>` keyed by the
 * base64 body of the `whsec_` secret, sent as `v1,<base64 signature>`. The
 * scheme is restated here rather than pulled in as a signing dependency —
 * it is six lines, and the application still verifies through its own real
 * `verifyWebhook` adapter, which is what the assertion is about.
 */
const SIGNING_SECRET_PREFIX = "whsec_";
const ANOTHER_INSTANCES_SIGNING_SECRET = "whsec_YW5vdGhlci1jbGVyay1pbnN0YW5jZQ==";

export type ClerkWebhookOptions = {
  event: { data: Record<string, unknown>; type: string };
  url: string;
};

const { runtimeEnvironment } = loadIntegrationTestEnvironment();

export function clerkWebhook(options: ClerkWebhookOptions): Request {
  return deliver(options, configuredSigningSecret());
}

/** The same delivery, signed by an instance this deployment does not trust. */
export function clerkWebhookFromAnotherInstance(
  options: ClerkWebhookOptions,
): Request {
  return deliver(options, ANOTHER_INSTANCES_SIGNING_SECRET);
}

function deliver(options: ClerkWebhookOptions, signingSecret: string): Request {
  const body = JSON.stringify({ ...options.event, object: "event" });
  const deliveryId = `msg_${options.event.type.replace(/\W/g, "")}`;
  const timestamp = Math.floor(Date.now() / 1000);
  const signature = createHmac(
    "sha256",
    Buffer.from(signingSecret.slice(SIGNING_SECRET_PREFIX.length), "base64"),
  )
    .update(`${deliveryId}.${timestamp}.${body}`)
    .digest("base64");

  return new Request(options.url, {
    body,
    headers: {
      "Content-Type": "application/json",
      "svix-id": deliveryId,
      "svix-signature": `v1,${signature}`,
      "svix-timestamp": String(timestamp),
    },
    method: "POST",
  });
}

function configuredSigningSecret(): string {
  const secret = runtimeEnvironment.CLERK_WEBHOOK_SIGNING_SECRET;

  if (!secret) {
    throw new Error(
      "CLERK_WEBHOOK_SIGNING_SECRET is missing from the integration environment.",
    );
  }

  return secret;
}
