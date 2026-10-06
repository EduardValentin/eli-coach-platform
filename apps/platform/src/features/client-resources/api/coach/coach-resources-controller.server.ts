import type {
  ClientResourceIncidents,
  ListClientResourcesResult,
  ListClientResourcesUseCase,
} from "@eli-coach-platform/domain/client-resources";
import type { LoaderFunctionArgs } from "react-router";
import { z } from "zod";

import { requirePortalAccess } from "~/features/accounts/server/guards/require-portal-access.server";
import {
  clientResourceListSchema,
  presentClientResource,
  type ClientResourceListing,
} from "~/features/client-resources/contracts/client-resources";

type CoachResourcesControllerOptions = {
  listClientResources: ListClientResourcesUseCase;
  incidents: ClientResourceIncidents;
};

const FAILED_LISTING: ClientResourceListing = { status: "failed" };

const clientIdSchema = z.uuid();

export class CoachResourcesController {
  constructor(private readonly options: CoachResourcesControllerOptions) {}

  async load(
    args: LoaderFunctionArgs,
    clientId: string,
  ): Promise<ClientResourceListing> {
    const coach = requirePortalAccess(args, { role: "COACH" });
    const target = clientIdSchema.safeParse(clientId);

    if (!target.success) {
      throw notFoundResponse();
    }

    let listing: ListClientResourcesResult;
    try {
      listing = await this.options.listClientResources.execute({
        requester: { role: coach.role, authSubjectId: coach.authSubjectId },
        clientId: target.data,
      });
    } catch (error) {
      this.options.incidents.resourceListingFailed({
        clientId: target.data,
        error,
      });
      return FAILED_LISTING;
    }

    if (listing.status === "not-found") {
      throw notFoundResponse();
    }

    return {
      status: "ready",
      resources: clientResourceListSchema.parse(
        listing.resources.map(presentClientResource),
      ),
    };
  }
}

function notFoundResponse(): Response {
  return new Response("Not Found", { status: 404 });
}
