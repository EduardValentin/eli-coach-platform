import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";

import {
  handleHttpErrorResponse,
  throwMethodNotAllowedResponse,
} from "@eli-coach-platform/infrastructure/http/server";
import {
  assessmentCallsContext,
  assessmentCallsFeatureFlagEvaluationContext,
} from "~/features/assessment-calls/server/guards/assessment-calls-context.server";

export async function action(_args: ActionFunctionArgs) {
  return handleHttpErrorResponse(() => {
    throwMethodNotAllowedResponse({ allowedMethods: ["GET", "HEAD"] });
  });
}

export async function loader({ context, request }: LoaderFunctionArgs) {
  return handleHttpErrorResponse(() => {
    if (request.method !== "GET" && request.method !== "HEAD") {
      throwMethodNotAllowedResponse({ allowedMethods: ["GET", "HEAD"] });
    }

    return context
      .get(assessmentCallsContext)
      .assessmentCalls.listSlots(
        context.get(assessmentCallsFeatureFlagEvaluationContext),
      );
  });
}
