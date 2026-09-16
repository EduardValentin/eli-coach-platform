import { verifyWebhook } from "@clerk/react-router/webhooks";

import type { AccountDeletionService } from "@eli-coach-platform/domain/accounts";

import { createBadRequestResponse } from "@eli-coach-platform/infrastructure/http/server";

export class AccountWebhookController {
  constructor(
    private readonly options: {
      deletion: AccountDeletionService;
      signingSecret: string | undefined;
    },
  ) {}

  async handleClerkEvent(request: Request): Promise<Response> {
    if (!this.options.signingSecret) {
      return new Response(null, { status: 503 });
    }

    const event = await this.verify(request, this.options.signingSecret);

    if (event === null) {
      return createBadRequestResponse(
        "Unable to verify Clerk webhook signature.",
      );
    }

    if (event.type !== "user.deleted") {
      return new Response(null, { status: 200 });
    }

    const authSubjectId = event.data.id;

    if (!authSubjectId) {
      return createBadRequestResponse(
        "Malformed user.deleted webhook payload: missing Clerk user id.",
      );
    }

    await this.options.deletion.markDeleted(authSubjectId);

    return new Response(null, { status: 200 });
  }

  private async verify(
    request: Request,
    signingSecret: string,
  ): Promise<Awaited<ReturnType<typeof verifyWebhook>> | null> {
    try {
      return await verifyWebhook(request, { signingSecret });
    } catch {
      return null;
    }
  }
}
