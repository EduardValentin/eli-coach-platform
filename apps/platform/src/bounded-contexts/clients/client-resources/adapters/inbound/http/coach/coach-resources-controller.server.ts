import type { ListClientResourcesUseCase } from "~/bounded-contexts/clients/client-resources/domain/client-resources";
import type { LoaderFunctionArgs } from "react-router";
import { z } from "zod";

import {
  presentResourceListing,
  type CoachResourceListing,
} from "~/bounded-contexts/clients/client-resources/public/client-resources";
import { resourceBrowseInputOf } from "~/bounded-contexts/clients/client-resources/public/resource-browse";
import { accessContext } from "~/bounded-contexts/access/public/session";

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
    const coach = args.context.get(accessContext).requirePortalAccess("COACH");
    const target = clientIdSchema.safeParse(clientId);

    if (!target.success) {
      throw notFoundResponse();
    }

    const listing = await this.options.listClientResources.execute({
      requester: { role: coach.role, authSubjectId: coach.authSubjectId },
      clientId: target.data,
      browse: resourceBrowseInputOf(args.url.searchParams),
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
