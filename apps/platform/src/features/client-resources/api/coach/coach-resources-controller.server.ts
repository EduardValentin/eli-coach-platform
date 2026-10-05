import type { ListClientResourcesUseCase } from "@eli-coach-platform/domain/client-resources";
import type { LoaderFunctionArgs } from "react-router";
import { z } from "zod";

import { requirePortalAccess } from "~/features/accounts/server/guards/require-portal-access.server";
import {
  clientResourceListSchema,
  presentClientResource,
  type ClientResourceView,
} from "~/features/client-resources/contracts/client-resources";

type CoachResourcesControllerOptions = {
  listClientResources: ListClientResourcesUseCase;
};

const clientIdSchema = z.uuid();

export class CoachResourcesController {
  constructor(private readonly options: CoachResourcesControllerOptions) {}

  async load(
    args: LoaderFunctionArgs,
    clientId: string,
  ): Promise<ClientResourceView[]> {
    const coach = requirePortalAccess(args, { role: "COACH" });
    const target = clientIdSchema.safeParse(clientId);

    if (!target.success) {
      throw notFoundResponse();
    }

    const listing = await this.options.listClientResources.execute({
      requester: { role: coach.role, authSubjectId: coach.authSubjectId },
      clientId: target.data,
    });

    if (listing.status === "not-found") {
      throw notFoundResponse();
    }

    return clientResourceListSchema.parse(
      listing.resources.map(presentClientResource),
    );
  }
}

function notFoundResponse(): Response {
  return new Response("Not Found", { status: 404 });
}
