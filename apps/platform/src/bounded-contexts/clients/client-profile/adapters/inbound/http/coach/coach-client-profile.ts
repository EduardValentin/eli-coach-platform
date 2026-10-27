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
    if (args.request.method !== "PUT") {
      throwMethodNotAllowedResponse({ allowedMethods: ["PUT"] });
    }

    return args.context
      .get(clientProfileContext)
      .coachProfile.save(args, args.params.clientId);
  });
}

export async function loader(_args: LoaderFunctionArgs) {
  return handleHttpErrorResponse(() => {
    throwMethodNotAllowedResponse({ allowedMethods: ["PUT"] });
  });
}

export function clientAction({ serverAction }: ClientActionFunctionArgs) {
  return fetcherOutcomeOf(serverAction);
}
