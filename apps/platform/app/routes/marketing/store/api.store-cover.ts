import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";

import {
  handleHttpErrorResponse,
  throwMethodNotAllowedResponse,
} from "~/server/http.server";
import { getPlatformContainer } from "~/server/container.server";

export async function action(_args: ActionFunctionArgs) {
  return handleHttpErrorResponse(() => {
    throwMethodNotAllowedResponse({ allowedMethods: ["GET", "HEAD"] });
  });
}

export async function loader({ params, request }: LoaderFunctionArgs) {
  return handleHttpErrorResponse(() => {
    if (request.method !== "GET" && request.method !== "HEAD") {
      throwMethodNotAllowedResponse({ allowedMethods: ["GET", "HEAD"] });
    }

    if (!params.assetKey) {
      return new Response("Not Found", { status: 404 });
    }

    return getPlatformContainer().storeCoverAssetController.getCover(
      params.assetKey,
    );
  });
}
