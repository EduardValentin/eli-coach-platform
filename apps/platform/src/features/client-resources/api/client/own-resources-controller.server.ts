import type { AccountSnapshot } from "@eli-coach-platform/domain/account";
import type {
  CountUnopenedResourcesUseCase,
  ListOwnResourcesUseCase,
  MarkResourceOpenedUseCase,
  ResourceRequester,
} from "@eli-coach-platform/domain/client-resources";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { z } from "zod";

import { requireApiAccount } from "~/features/accounts/server/guards/require-account.server";
import { requirePortalAccess } from "~/features/accounts/server/guards/require-portal-access.server";
import { sessionContext } from "~/features/accounts/server/guards/session-context.server";
import {
  presentResourceListing,
  type ClientResourceListing,
} from "~/features/client-resources/public/client-resources";
import { resourceBrowseInputOf } from "~/features/client-resources/public/resource-browse";

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
    const client = requirePortalAccess(args, { role: "CLIENT" });
    const listing = await this.options.listOwnResources.execute({
      requester: requesterOf(client),
      browse: resourceBrowseInputOf(new URL(args.request.url).searchParams),
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
    const session = args.context.get(sessionContext);

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
    const client = requireApiAccount(args, { role: "CLIENT" });
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

function requesterOf(account: AccountSnapshot): ResourceRequester {
  return { role: account.role, authSubjectId: account.authSubjectId };
}

function notFoundResponse(): Response {
  return new Response("Not Found", { status: 404 });
}
