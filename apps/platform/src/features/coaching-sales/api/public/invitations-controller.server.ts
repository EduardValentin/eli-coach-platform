import type { ResolveInvitationUseCase } from "@eli-coach-platform/domain/client-invitation";
import { createBadRequestResponse } from "@eli-coach-platform/infrastructure/http/server";
import type { ActionFunctionArgs } from "react-router";

import {
  invitationResolutionRequestSchema,
  invitationResolutionSchema,
} from "~/features/coaching-sales/contracts/client-journey";

import { readJsonRequestBody } from "./read-json-request-body.server";

type InvitationsControllerOptions = {
  resolveInvitation: ResolveInvitationUseCase;
};

const INVITATION_REQUEST_MAX_BYTES = 1024;
const UNCACHED_HEADERS = { "Cache-Control": "no-store" };

export class InvitationsController {
  constructor(private readonly options: InvitationsControllerOptions) {}

  async resolve({ request }: ActionFunctionArgs): Promise<Response> {
    const submission = invitationResolutionRequestSchema.safeParse(
      await readJsonRequestBody(request, {
        maxBytes: INVITATION_REQUEST_MAX_BYTES,
      }),
    );

    if (!submission.success) {
      return createBadRequestResponse("The invitation could not be read.");
    }

    const resolution = await this.options.resolveInvitation.execute({
      rawToken: submission.data.token,
    });

    return Response.json(invitationResolutionSchema.parse(resolution), {
      headers: UNCACHED_HEADERS,
    });
  }
}
