import type { ListClientResourcesUseCase } from "@eli-coach-platform/domain/client-resources";
import type { LoaderFunctionArgs } from "react-router";
import { z } from "zod";

import { requirePortalAccess } from "~/features/accounts/server/guards/require-portal-access.server";
import {
  presentResourceListing,
  type CoachResourceListing,
} from "~/features/client-resources/public/client-resources";
import { resourceBrowseInputOf } from "~/features/client-resources/public/resource-browse";

type CoachResourcesControllerOptions = {
  listClientResources: ListClientResourcesUseCase;
};

const UNAVAILABLE_LISTING: CoachResourceListing = { status: "unavailable" };

const clientIdSchema = z.uuid();

export class CoachResourcesController {
  constructor(private readonly options: CoachResourcesControllerOptions) {}

  async load(
    args: LoaderFunctionArgs,
    clientId: string,
  ): Promise<CoachResourceListing> {
    const coach = requirePortalAccess(args, { role: "COACH" });
    const target = clientIdSchema.safeParse(clientId);

    if (!target.success) {
      throw notFoundResponse();
    }

    const listing = await this.options.listClientResources.execute({
      requester: { role: coach.role, authSubjectId: coach.authSubjectId },
      clientId: target.data,
      browse: resourceBrowseInputOf(new URL(args.request.url).searchParams),
    });

    if (listing.status === "not-found") {
      throw notFoundResponse();
    }

    if (listing.status === "unavailable") {
      return UNAVAILABLE_LISTING;
    }

    return {
      ...presentResourceListing(listing),
      vocabulary: listing.vocabulary.map(({ tag }) => tag),
    };
  }
}

function notFoundResponse(): Response {
  return new Response("Not Found", { status: 404 });
}
