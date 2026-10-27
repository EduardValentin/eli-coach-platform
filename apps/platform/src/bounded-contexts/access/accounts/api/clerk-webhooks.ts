import type { ActionFunctionArgs } from "react-router";

import {
  handleHttpErrorResponse,
  throwMethodNotAllowedResponse,
} from "~/shared/http/index.server";
import { accountsContext } from "~/bounded-contexts/access/accounts/server/guards/accounts-context.server";

export async function action({ context, request }: ActionFunctionArgs) {
  return handleHttpErrorResponse(() => {
    if (request.method !== "POST") {
      throwMethodNotAllowedResponse({ allowedMethods: ["POST"] });
    }

    return context.get(accountsContext).webhooks.handleClerkEvent(request);
  });
}
