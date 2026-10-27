import type {
  ActionFunctionArgs,
  ClientActionFunctionArgs,
} from "react-router";

import { fetcherOutcomeOf } from "~/shared/http";
import {
  handleHttpErrorResponse,
  throwMethodNotAllowedResponse,
} from "~/shared/http/index.server";
import { waitlistContext } from "~/bounded-contexts/sales/waitlist/server/guards/waitlist-context.server";

export async function action({ context, request }: ActionFunctionArgs) {
  return handleHttpErrorResponse(() => {
    if (request.method !== "POST") {
      throwMethodNotAllowedResponse({
        allowedMethods: ["POST"],
      });
    }

    return context.get(waitlistContext).waitlist.join(request);
  });
}

export function clientAction({ serverAction }: ClientActionFunctionArgs) {
  return fetcherOutcomeOf(serverAction);
}
