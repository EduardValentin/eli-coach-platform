import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";

import {
  handleHttpErrorResponse,
  throwMethodNotAllowedResponse,
} from "~/server/http.server";
import { getPlatformContainer } from "~/server/container.server";

// Registered in routes.ts, so this file cannot carry the `.server` suffix,
// and its controller lives in the sibling `acquisitions-controller.server.ts`.
// The rule, and why merging them breaks the build: ARCHITECTURE.md,
// under "The `.server` suffix".
export async function action({ request }: ActionFunctionArgs) {
  return handleHttpErrorResponse(() => {
    if (request.method !== "POST") {
      throwMethodNotAllowedResponse({ allowedMethods: ["POST"] });
    }

    return getPlatformContainer().storeAcquisitionController.acquire(request);
  });
}

export async function loader(_args: LoaderFunctionArgs) {
  return handleHttpErrorResponse(() => {
    throwMethodNotAllowedResponse({ allowedMethods: ["POST"] });
  });
}
