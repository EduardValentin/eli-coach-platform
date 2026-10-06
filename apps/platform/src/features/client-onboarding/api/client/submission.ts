import type {
  ActionFunctionArgs,
  ClientActionFunctionArgs,
  LoaderFunctionArgs,
} from "react-router";

import { fetcherOutcomeOf } from "@eli-coach-platform/infrastructure/http";
import {
  handleHttpErrorResponse,
  throwMethodNotAllowedResponse,
} from "@eli-coach-platform/infrastructure/http/server";
import { clientOnboardingContext } from "~/features/client-onboarding/server/guards/client-onboarding-context.server";
import { requireOpenClientPortal } from "~/features/coaching-sales/server/guards/require-client-portal-standing.server";

export async function action(args: ActionFunctionArgs) {
  return handleHttpErrorResponse(async () => {
    if (args.request.method !== "POST") {
      throwMethodNotAllowedResponse({ allowedMethods: ["POST"] });
    }

    await requireOpenClientPortal(args);

    return args.context.get(clientOnboardingContext).controller.submit(args);
  });
}

export async function loader(_args: LoaderFunctionArgs) {
  return handleHttpErrorResponse(() => {
    throwMethodNotAllowedResponse({ allowedMethods: ["POST"] });
  });
}

export function clientAction({ serverAction }: ClientActionFunctionArgs) {
  return fetcherOutcomeOf(serverAction);
}
