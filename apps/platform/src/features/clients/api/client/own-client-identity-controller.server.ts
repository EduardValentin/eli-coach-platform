import type { UpdateOwnClientIdentityUseCase } from "@eli-coach-platform/domain/client";
import type { ActionFunctionArgs } from "react-router";

import { requireApiAccount } from "~/features/accounts/server/guards/require-account.server";
import {
  enteredIdentityOf,
  identityBodyOf,
  identityUpdatedResponse,
  unreadableIdentityResponse,
} from "~/features/clients/api/client-identity-transport.server";
import { ownClientIdentityRequestSchema } from "~/features/clients/public/client-identity";

type OwnClientIdentityControllerOptions = {
  updateOwnClientIdentity: UpdateOwnClientIdentityUseCase;
};

export class OwnClientIdentityController {
  constructor(private readonly options: OwnClientIdentityControllerOptions) {}

  async save(args: ActionFunctionArgs): Promise<Response> {
    const client = requireApiAccount(args, { role: "CLIENT" });
    const request = ownClientIdentityRequestSchema.safeParse(
      await identityBodyOf(args.request),
    );

    if (!request.success) {
      return unreadableIdentityResponse();
    }

    return identityUpdatedResponse(
      await this.options.updateOwnClientIdentity.execute({
        authSubjectId: client.authSubjectId,
        identity: enteredIdentityOf(request.data),
      }),
    );
  }
}
