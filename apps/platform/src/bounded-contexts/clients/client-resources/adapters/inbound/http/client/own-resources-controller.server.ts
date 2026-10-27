import type {
  CountUnopenedResourcesUseCase,
  ListOwnResourcesUseCase,
  MarkResourceOpenedUseCase,
  ResourceRequester,
} from "~/bounded-contexts/clients/client-resources/domain/client-resources";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { z } from "zod";

import {
  presentResourceListing,
  type ClientResourceListing,
} from "~/bounded-contexts/clients/client-resources/public/client-resources";
import { resourceBrowseInputOf } from "~/bounded-contexts/clients/client-resources/public/resource-browse";
import {
  accessContext,
  type SessionAccount,
} from "~/bounded-contexts/access/public/session";

type OwnResourcesControllerOptions = {
  listOwnResources: ListOwnResourcesUseCase;
  countUnopenedResources: CountUnopenedResourcesUseCase;
  markResourceOpened: MarkResourceOpenedUseCase;
};

const UNAVAILABLE_LISTING: ClientResourceListing = { status: "unavailable" };

// A bodiless answer leaves React Router's fetch unread, and Chrome then cancels it.
const OPENED_ANSWER = { status: "opened" };

const resourceIdSchema = z.uuid();

export class OwnResourcesController {
  constructor(private readonly options: OwnResourcesControllerOptions) {}

  async load(args: LoaderFunctionArgs): Promise<ClientResourceListing> {
    const client = args.context
      .get(accessContext)
      .requirePortalAccess("CLIENT");
    const listing = await this.options.listOwnResources.execute({
      requester: requesterOf(client),
      browse: resourceBrowseInputOf(args.url.searchParams),
    });

    if (listing.status === "not-found") {
      throw notFoundResponse();
    }

    if (listing.status === "unavailable") {
      return UNAVAILABLE_LISTING;
    }

    return presentResourceListing(listing);
  }

  async countUnopened(args: LoaderFunctionArgs): Promise<number> {
    const session = args.context.get(accessContext).session;

    if (session.kind === "anonymous") {
      return 0;
    }

    return this.options.countUnopenedResources.execute(
      requesterOf(session.account),
    );
  }

  async markOpened(
    args: ActionFunctionArgs,
    resourceId: string | undefined,
  ): Promise<Response> {
    const client = args.context
      .get(accessContext)
      .requireAccount({ role: "CLIENT" });
    const id = resourceIdSchema.safeParse(resourceId);

    if (!id.success) {
      return notFoundResponse();
    }

    const result = await this.options.markResourceOpened.execute({
      requester: requesterOf(client),
      resourceId: id.data,
    });

    switch (result.status) {
      case "opened":
        return Response.json(OPENED_ANSWER);
      case "not-found":
        return notFoundResponse();
      case "failed":
        return new Response("Internal Server Error", { status: 500 });
    }
  }
}

function requesterOf(account: SessionAccount): ResourceRequester {
  return { role: account.role, authSubjectId: account.authSubjectId };
}

function notFoundResponse(): Response {
  return new Response("Not Found", { status: 404 });
}
