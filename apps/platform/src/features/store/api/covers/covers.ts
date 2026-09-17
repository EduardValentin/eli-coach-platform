import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";

import {
  handleHttpErrorResponse,
  throwMethodNotAllowedResponse,
} from "@eli-coach-platform/infrastructure/http/server";
import { storeContext } from "~/features/store/server/guards/store-context.server";

export async function action(_args: ActionFunctionArgs) {
  return handleHttpErrorResponse(() => {
    throwMethodNotAllowedResponse({ allowedMethods: ["GET", "HEAD"] });
  });
}

export async function loader({ context, params, request }: LoaderFunctionArgs) {
  return handleHttpErrorResponse(() => {
    if (request.method !== "GET" && request.method !== "HEAD") {
      throwMethodNotAllowedResponse({ allowedMethods: ["GET", "HEAD"] });
    }

    if (!params.assetKey) {
      return new Response("Not Found", { status: 404 });
    }

    return context.get(storeContext).covers.getCover(params.assetKey);
  });
}
