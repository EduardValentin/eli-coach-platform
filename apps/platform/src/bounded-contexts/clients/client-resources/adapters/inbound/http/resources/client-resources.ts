import type {
  ActionFunctionArgs,
  ClientActionFunctionArgs,
  LoaderFunctionArgs,
} from "react-router";

import { uploadOutcomeOf } from "~/shared/http";
import {
  handleHttpErrorResponse,
  throwMethodNotAllowedResponse,
} from "~/shared/http/index.server";
import { resourceUploadProgress } from "~/bounded-contexts/clients/client-resources/public/resource-upload-progress";
import { clientResourcesContext } from "~/bounded-contexts/clients/client-resources/adapters/inbound/http/context.server";

export async function action(args: ActionFunctionArgs) {
  return handleHttpErrorResponse(() => {
    if (args.request.method !== "POST") {
      throwMethodNotAllowedResponse({ allowedMethods: ["POST"] });
    }

    return args.context
      .get(clientResourcesContext)
      .clientResourcesController.add(args, args.params.clientId);
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
