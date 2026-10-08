import type {
  ActionFunctionArgs,
  ClientActionFunctionArgs,
  LoaderFunctionArgs,
} from "react-router";

import { uploadOutcomeOf } from "@eli-coach-platform/infrastructure/http";
import {
  handleHttpErrorResponse,
  throwMethodNotAllowedResponse,
} from "@eli-coach-platform/infrastructure/http/server";
import { resourceUploadProgress } from "~/features/client-resources/public/resource-upload-progress";
import { clientResourcesContext } from "~/features/client-resources/server/guards/client-resources-context.server";

export async function action(args: ActionFunctionArgs) {
  return handleHttpErrorResponse(() => {
    if (args.request.method !== "POST") {
      throwMethodNotAllowedResponse({ allowedMethods: ["POST"] });
    }

    return args.context
      .get(clientResourcesContext)
      .clientResources.add(args, args.params.clientId);
  });
}

export async function loader(_args: LoaderFunctionArgs) {
  return handleHttpErrorResponse(() => {
    throwMethodNotAllowedResponse({ allowedMethods: ["POST"] });
  });
}

export function clientAction({ request }: ClientActionFunctionArgs) {
  return uploadOutcomeOf(request, resourceUploadProgress);
}
