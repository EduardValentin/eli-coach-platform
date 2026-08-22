import type { AccountDeletionService } from "@eli-coach-platform/domain";
import type { IdentityWebhookVerifier } from "@eli-coach-platform/infrastructure/identity/server";

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
   * delivery trustworthy — nothing is read out of the body before it verifies.
   *
   * An accepted delivery answers `204` whether or not an account matched: Clerk
   * retries anything it does not see accepted, and an identity that never
   * signed in here is not a failure to report.
   */
  async receive(request: Request): Promise<Response> {
    const webhook = await this.verifier.verify(request);

    if (webhook.status === "unverified") {
      return new Response(null, { status: 400 });
    }

    if (webhook.status === "identity-deleted") {
      await this.deletionService.forgetIdentity(webhook.subjectId);
    }

    return new Response(null, { status: 204 });
  }
}
