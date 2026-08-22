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
    } catch {
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
