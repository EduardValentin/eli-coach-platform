import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";

import {
  handleHttpErrorResponse,
  throwMethodNotAllowedResponse,
} from "@eli-coach-platform/infrastructure/http/server";
import {
  assessmentCallsContext,
  assessmentCallsFeatureFlagEvaluationContext,
} from "~/features/assessment-calls/server/guards/assessment-calls-context.server";

export async function action({ context, request }: ActionFunctionArgs) {
  return handleHttpErrorResponse(() => {
    if (request.method !== "POST") {
      throwMethodNotAllowedResponse({ allowedMethods: ["POST"] });
    }

    return context
      .get(assessmentCallsContext)
      .assessmentCalls.book(
        request,
        context.get(assessmentCallsFeatureFlagEvaluationContext),
      );
  });
}

export async function loader(_args: LoaderFunctionArgs) {
  return handleHttpErrorResponse(() => {
    throwMethodNotAllowedResponse({ allowedMethods: ["POST"] });
  });
}
