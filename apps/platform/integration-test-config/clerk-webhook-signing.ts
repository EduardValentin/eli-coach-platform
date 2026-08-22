import { createHmac } from "node:crypto";

/**
 * Standard Webhooks, which is what Clerk sends: the secret is base64 after the
 * `whsec_` prefix, and the signed payload is `id.timestamp.body`. Signing here
 * rather than stubbing the verifier is what makes the suite prove the real
 * adapter rejects a forgery.
 */
export const SIGNING_SECRET_PREFIX = "whsec_";

export function signedWebhookRequest(options: {
  body: string;
  messageId?: string;
  signingSecret: string;
  url: string;
}): Request {
  const messageId = options.messageId ?? "msg_integration_suite";
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const key = Buffer.from(
    options.signingSecret.slice(SIGNING_SECRET_PREFIX.length),
    "base64",
  );
  const signature = createHmac("sha256", key)
    .update(`${messageId}.${timestamp}.${options.body}`)
    .digest("base64");

  return new Request(options.url, {
    body: options.body,
    headers: {
      "content-type": "application/json",
      "svix-id": messageId,
      "svix-signature": `v1,${signature}`,
      "svix-timestamp": timestamp,
    },
    method: "POST",
  });
}

export function identityDeletedPayload(subjectId: string): string {
  return JSON.stringify({
    data: { deleted: true, id: subjectId, object: "user" },
    object: "event",
    type: "user.deleted",
  });
}
