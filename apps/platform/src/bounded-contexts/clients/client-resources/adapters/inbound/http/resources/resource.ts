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
import { clientResourcesContext } from "~/bounded-contexts/clients/client-resources/adapters/inbound/http/context.server";

const ALLOWED_METHODS = ["PATCH", "DELETE"];

export async function action(args: ActionFunctionArgs) {
  return handleHttpErrorResponse(() => {
    const { clientResources } = args.context.get(clientResourcesContext);

    switch (args.request.method) {
      case "PATCH":
        return clientResources.changeDetails(args, args.params.resourceId);
      case "DELETE":
        return clientResources.remove(args, args.params.resourceId);
      default:
        throwMethodNotAllowedResponse({ allowedMethods: ALLOWED_METHODS });
    }
  });
}

export async function loader(_args: LoaderFunctionArgs) {
  return handleHttpErrorResponse(() => {
    throwMethodNotAllowedResponse({ allowedMethods: ALLOWED_METHODS });
  });
}

export function clientAction({ serverAction }: ClientActionFunctionArgs) {
  return fetcherOutcomeOf(serverAction);
}
