import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";

import {
  handleHttpErrorResponse,
  throwMethodNotAllowedResponse,
} from "@eli-coach-platform/infrastructure/http/server";
import { clientOnboardingContext } from "~/features/client-onboarding/server/guards/client-onboarding-context.server";
import { requireOpenClientPortal } from "~/features/coaching-sales/server/guards/require-client-portal-standing.server";

export async function action(args: ActionFunctionArgs) {
  return handleHttpErrorResponse(async () => {
    if (args.request.method !== "PUT") {
      throwMethodNotAllowedResponse({ allowedMethods: ["PUT"] });
    }

    await requireOpenClientPortal(args);

    return args.context.get(clientOnboardingContext).controller.saveDraft(args);
  });
}

export async function loader(_args: LoaderFunctionArgs) {
  return handleHttpErrorResponse(() => {
    throwMethodNotAllowedResponse({ allowedMethods: ["PUT"] });
  });
}
