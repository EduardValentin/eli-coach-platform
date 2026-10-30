import type { UpdateOwnClientIdentityUseCase } from "~/bounded-contexts/clients/clients/domain/client";
import type { ActionFunctionArgs } from "react-router";

import {
  enteredIdentityOf,
  identityBodyOf,
  identityUpdatedResponse,
  unreadableIdentityResponse,
} from "~/bounded-contexts/clients/clients/adapters/inbound/http/client-identity-transport.server";
import { ownClientIdentityRequestSchema } from "~/bounded-contexts/clients/clients/public/client-identity";
import { accessContext } from "~/bounded-contexts/access/public/session";

type OwnClientIdentityControllerOptions = {
  updateOwnClientIdentityUseCase: UpdateOwnClientIdentityUseCase;
};

export class OwnClientIdentityController {
  constructor(private readonly options: OwnClientIdentityControllerOptions) {}

  async save(args: ActionFunctionArgs): Promise<Response> {
    const client = args.context
      .get(accessContext)
      .requireAccount({ role: "CLIENT" });
    const request = ownClientIdentityRequestSchema.safeParse(
      await identityBodyOf(args.request),
    );

    if (!request.success) {
      return unreadableIdentityResponse();
    }

    return identityUpdatedResponse(
      await this.options.updateOwnClientIdentityUseCase.execute({
        authSubjectId: client.authSubjectId,
        identity: enteredIdentityOf(request.data),
      }),
    );
  }
}
