import type { AccountDeletionService } from "@eli-coach-platform/domain";
import type { IdentityWebhookVerifier } from "@eli-coach-platform/infrastructure/identity/server";

import { readBoundedRequest } from "~/server/http.server";

/**
 * Bounds what an anonymous caller can make the server buffer, and then HMAC,
 * before the signature is checked.
 */
const MAXIMUM_WEBHOOK_BODY_BYTES = 64 * 1024;

type IdentityWebhookControllerOptions = {
  deletionService: AccountDeletionService;
  verifier: IdentityWebhookVerifier;
};

export class IdentityWebhookController {
  private readonly deletionService: AccountDeletionService;
  private readonly verifier: IdentityWebhookVerifier;

  constructor(options: IdentityWebhookControllerOptions) {
    this.deletionService = options.deletionService;
    this.verifier = options.verifier;
  }

  async receive(request: Request): Promise<Response> {
    const bounded = await readBoundedRequest(request, {
      maxBytes: MAXIMUM_WEBHOOK_BODY_BYTES,
    });

    if (bounded.status === "too_large") {
      return new Response(null, { status: 413 });
    }

    const webhook = await this.verifier.verify(bounded.request);

    if (webhook.status === "unverified") {
      return new Response(null, { status: 400 });
    }

    if (webhook.status === "identity-deleted") {
      await this.deletionService.forgetIdentity(webhook.subjectId);
    }

    return new Response(null, { status: 204 });
  }
}
