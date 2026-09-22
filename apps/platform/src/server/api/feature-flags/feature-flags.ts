import {
  handleHttpErrorResponse,
  throwMethodNotAllowedResponse,
} from "@eli-coach-platform/infrastructure/http/server";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";

import {
  platformContext,
  platformFeatureFlagEvaluationContext,
} from "~/server/guards/platform-context.server";

export async function action(_args: ActionFunctionArgs) {
  return handleHttpErrorResponse(() => {
    throwMethodNotAllowedResponse({
      allowedMethods: ["GET"],
    });
  });
}

export async function loader({ context }: LoaderFunctionArgs) {
  return handleHttpErrorResponse(() =>
    context
      .get(platformContext)
      .featureFlags.getSnapshot(
        context.get(platformFeatureFlagEvaluationContext),
      ),
  );
}
