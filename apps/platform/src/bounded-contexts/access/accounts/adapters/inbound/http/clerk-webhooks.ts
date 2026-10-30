import type { ActionFunctionArgs } from "react-router";

import {
  handleHttpErrorResponse,
  throwMethodNotAllowedResponse,
} from "~/shared/http/index.server";
import { accountsContext } from "~/bounded-contexts/access/accounts/adapters/inbound/http/context.server";

export async function action({ context, request }: ActionFunctionArgs) {
  return handleHttpErrorResponse(() => {
    if (request.method !== "POST") {
      throwMethodNotAllowedResponse({ allowedMethods: ["POST"] });
    }

    return context
      .get(accountsContext)
      .accountWebhookController.handleClerkEvent(request);
  });
}
