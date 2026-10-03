import type {
  ActionFunctionArgs,
  ClientActionFunctionArgs,
} from "react-router";

import { fetcherOutcomeOf } from "@eli-coach-platform/infrastructure/http";
import {
  handleHttpErrorResponse,
  throwMethodNotAllowedResponse,
} from "@eli-coach-platform/infrastructure/http/server";
import { waitlistContext } from "~/features/waitlist/server/guards/waitlist-context.server";

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
