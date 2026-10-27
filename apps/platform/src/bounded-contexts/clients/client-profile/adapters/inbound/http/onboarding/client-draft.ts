import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";

import {
  handleHttpErrorResponse,
  throwMethodNotAllowedResponse,
} from "~/shared/http/index.server";
import { clientOnboardingContext } from "~/bounded-contexts/clients/client-profile/adapters/inbound/http/context.server";

export async function action(args: ActionFunctionArgs) {
  return handleHttpErrorResponse(async () => {
    if (args.request.method !== "PUT") {
      throwMethodNotAllowedResponse({ allowedMethods: ["PUT"] });
    }

    return args.context.get(clientOnboardingContext).controller.saveDraft(args);
  });
}

export async function loader(_args: LoaderFunctionArgs) {
  return handleHttpErrorResponse(() => {
    throwMethodNotAllowedResponse({ allowedMethods: ["PUT"] });
  });
}
