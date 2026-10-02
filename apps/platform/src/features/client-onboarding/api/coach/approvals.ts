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

export async function action(args: ActionFunctionArgs) {
  return handleHttpErrorResponse(() => {
    if (args.request.method !== "POST") {
      throwMethodNotAllowedResponse({ allowedMethods: ["POST"] });
    }

    return args.context
      .get(clientOnboardingContext)
      .coachReview.approveAnswers(args);
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
