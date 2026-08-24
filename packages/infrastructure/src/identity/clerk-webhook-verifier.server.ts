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

    return event.data.id
      ? { status: "identity-deleted", subjectId: event.data.id }
      : { status: "ignored" };
  }
}

/**
 * Refusals are not logged — a forgery would hand an attacker a log-volume lever
 * — but an undecodable secret fails identically while being a configuration
 * fault, and would otherwise answer 400 forever with nothing saying why.
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
