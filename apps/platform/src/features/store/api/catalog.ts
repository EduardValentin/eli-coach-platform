import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";

import {
  handleHttpErrorResponse,
  throwMethodNotAllowedResponse,
} from "~/server/http.server";
import { getPlatformContainer } from "~/server/container.server";

// Registered in routes.ts, so this file cannot carry the `.server` suffix,
// and its controller lives in the sibling `catalog-controller.server.ts`.
// See the rule and why merging them breaks the build: features/README.md:20-26.
export async function action(_args: ActionFunctionArgs) {
  return handleHttpErrorResponse(() => {
    throwMethodNotAllowedResponse({ allowedMethods: ["GET", "HEAD"] });
  });
}

export async function loader({ request }: LoaderFunctionArgs) {
  return handleHttpErrorResponse(() => {
    if (request.method !== "GET" && request.method !== "HEAD") {
      throwMethodNotAllowedResponse({ allowedMethods: ["GET", "HEAD"] });
    }

    return getPlatformContainer().storeCatalogController.getPublishedCatalog();
  });
}
