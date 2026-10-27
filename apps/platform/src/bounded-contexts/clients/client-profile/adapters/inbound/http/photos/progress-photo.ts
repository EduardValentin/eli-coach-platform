import type {
  ActionFunctionArgs,
  ClientActionFunctionArgs,
  LoaderFunctionArgs,
} from "react-router";

import { fetcherOutcomeOf } from "~/shared/http";
import {
  handleHttpErrorResponse,
  throwMethodNotAllowedResponse,
} from "~/shared/http/index.server";
import { clientProfileContext } from "~/bounded-contexts/clients/client-profile/adapters/inbound/http/context.server";

export async function action(args: ActionFunctionArgs) {
  return handleHttpErrorResponse(() => {
    if (args.request.method !== "DELETE") {
      throwMethodNotAllowedResponse({ allowedMethods: ["GET", "DELETE"] });
    }

    return args.context
      .get(clientProfileContext)
      .progressPhotos.remove(args, args.params.photoId);
  });
}

export async function loader(args: LoaderFunctionArgs) {
  return handleHttpErrorResponse(() =>
    args.context
      .get(clientProfileContext)
      .progressPhotos.open(args, args.params.photoId),
  );
}

export function clientAction({ serverAction }: ClientActionFunctionArgs) {
  return fetcherOutcomeOf(serverAction);
}
