import {
  handleHttpErrorResponse,
  throwMethodNotAllowedResponse,
} from "~/shared/http/index.server";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";

import { featureFlagsContext } from "~/bounded-contexts/operations/feature-flags/adapters/inbound/http/context.server";

export async function action(_args: ActionFunctionArgs) {
  return handleHttpErrorResponse(() => {
    throwMethodNotAllowedResponse({
      allowedMethods: ["GET"],
    });
  });
}

export async function loader({ context }: LoaderFunctionArgs) {
  return handleHttpErrorResponse(() =>
    context.get(featureFlagsContext).featureFlags.getSnapshot(),
  );
}
