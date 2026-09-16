import type { ActionFunctionArgs } from "react-router";

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
