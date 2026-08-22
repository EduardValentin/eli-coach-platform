import type { AccountDeletionService } from "@eli-coach-platform/domain";
import type { IdentityWebhookVerifier } from "@eli-coach-platform/infrastructure/identity/server";

import { readBoundedRequest } from "~/server/http.server";

/**
 * A `user.deleted` payload is a few hundred bytes. The cap is generous for that
 * and still small enough that an anonymous caller cannot make the server buffer
 * — and then HMAC — an arbitrary amount of data before the signature is checked.
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

  /**
   * The endpoint is public, so the signature is the only thing that makes a
   * delivery trustworthy — nothing is read out of the body before it verifies,
   * and no more of it is read than a real delivery could need.
   *
   * An accepted delivery answers `204` whether or not an account matched: Clerk
   * retries anything it does not see accepted, and an identity that never
   * signed in here is not a failure to report.
   */
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
