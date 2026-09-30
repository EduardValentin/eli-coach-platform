import type { ReadClientProfileUseCase } from "@eli-coach-platform/domain/client-profile";
import type { LoaderFunctionArgs } from "react-router";

import { requirePortalAccess } from "~/features/accounts/server/guards/require-portal-access.server";
import {
  clientProfileSchema,
  type ClientProfileView,
} from "~/features/client-onboarding/contracts/client-profile";
import { clientIdSchema } from "~/features/client-onboarding/contracts/onboarding-review";

type ClientProfileControllerOptions = {
  readClientProfile: ReadClientProfileUseCase;
};

export class ClientProfileController {
  constructor(private readonly options: ClientProfileControllerOptions) {}

  async load(
    args: LoaderFunctionArgs,
    clientId: string,
  ): Promise<ClientProfileView> {
    requirePortalAccess(args, { role: "COACH" });
    const target = clientIdSchema.safeParse(clientId);

    if (!target.success) {
      throw new Response("Not Found", { status: 404 });
    }

    const reading = await this.options.readClientProfile.execute(target.data);

    if (!reading) {
      throw new Response("Not Found", { status: 404 });
    }

    return clientProfileSchema.parse(reading);
  }
}
