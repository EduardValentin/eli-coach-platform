import { verifyWebhook } from "@clerk/backend/webhooks";

import type {
  IdentityWebhook,
  IdentityWebhookVerifier,
} from "./identity-contract.server";

type ClerkWebhookVerifierOptions = {
  signingSecret: string;
};

export class ClerkWebhookVerifier implements IdentityWebhookVerifier {
  private readonly signingSecret: string;

  constructor(options: ClerkWebhookVerifierOptions) {
    this.signingSecret = options.signingSecret;
  }

  /**
   * Signature checking is local — Standard Webhooks over the signing secret — so
   * this reaches no network and a forged body cannot be made to verify.
   */
  async verify(request: Request): Promise<IdentityWebhook> {
    let event;

    try {
      event = await verifyWebhook(request, { signingSecret: this.signingSecret });
    } catch (error) {
      reportUnusableSigningSecret(error);

      return { status: "unverified" };
    }

    if (event.type !== "user.deleted") {
      return { status: "ignored" };
    }

    // Clerk types the deleted object's id as optional; without it there is
    // nothing to act on, and treating that as ignorable beats guessing.
    return event.data.id
      ? { status: "identity-deleted", subjectId: event.data.id }
      : { status: "ignored" };
  }
}

/**
 * A refused delivery is ordinarily a forgery, and saying so on every one would
 * hand an attacker a log-volume lever. A secret the library cannot decode fails
 * the same way but is a configuration fault: without this it answers Clerk 400
 * forever, no deletion is ever honoured, and nothing says why.
 *
 * Neither the secret nor the payload is logged.
 */
function reportUnusableSigningSecret(error: unknown): void {
  const message = error instanceof Error ? error.message : "";

  if (!message.includes("Base64")) {
    return;
  }

  console.error("Clerk webhook signing secret cannot be decoded.", {
    errorCategory: "clerk_webhook_secret_unusable",
  });
}
