import type { UpdateClientIdentityAsCoachUseCase } from "@eli-coach-platform/domain/client";
import type { ActionFunctionArgs } from "react-router";
import { z } from "zod";

import { requireApiAccount } from "~/features/accounts/server/guards/require-account.server";
import {
  enteredIdentityOf,
  identityBodyOf,
  identityUpdatedResponse,
  unreadableIdentityResponse,
} from "~/features/clients/api/client-identity-transport.server";
import { coachClientIdentityRequestSchema } from "~/features/clients/public/client-identity";

type CoachClientIdentityControllerOptions = {
  updateClientIdentityAsCoach: UpdateClientIdentityAsCoachUseCase;
};

const clientIdSchema = z.uuid();

export class CoachClientIdentityController {
  constructor(private readonly options: CoachClientIdentityControllerOptions) {}

  async save(
    args: ActionFunctionArgs,
    clientId: string | undefined,
  ): Promise<Response> {
    requireApiAccount(args, { role: "COACH" });
    const target = clientIdSchema.safeParse(clientId);

    if (!target.success) {
      return new Response("Not Found", { status: 404 });
    }

    const request = coachClientIdentityRequestSchema.safeParse(
      await identityBodyOf(args.request),
    );

    if (!request.success) {
      return unreadableIdentityResponse();
    }

    return identityUpdatedResponse(
      await this.options.updateClientIdentityAsCoach.execute({
        clientId: target.data,
        identity: {
          ...enteredIdentityOf(request.data),
          gender: request.data.gender,
        },
      }),
    );
  }
}
