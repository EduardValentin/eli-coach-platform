import type { UpdateClientIdentityAsCoachUseCase } from "~/bounded-contexts/clients/clients/domain/client";
import type { ActionFunctionArgs } from "react-router";
import { z } from "zod";

import {
  enteredIdentityOf,
  identityBodyOf,
  identityUpdatedResponse,
  unreadableIdentityResponse,
} from "~/bounded-contexts/clients/clients/adapters/inbound/http/client-identity-transport.server";
import { coachClientIdentityRequestSchema } from "~/bounded-contexts/clients/clients/public/client-identity";
import { accessContext } from "~/bounded-contexts/access/public/session";

type CoachClientIdentityControllerOptions = {
  updateClientIdentityAsCoachUseCase: UpdateClientIdentityAsCoachUseCase;
};

const clientIdSchema = z.uuid();

export class CoachClientIdentityController {
  constructor(private readonly options: CoachClientIdentityControllerOptions) {}

  async save(
    args: ActionFunctionArgs,
    clientId: string | undefined,
  ): Promise<Response> {
    args.context.get(accessContext).requireAccount({ role: "COACH" });
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
      await this.options.updateClientIdentityAsCoachUseCase.execute({
        clientId: target.data,
        identity: {
          ...enteredIdentityOf(request.data),
          gender: request.data.gender,
        },
      }),
    );
  }
}
