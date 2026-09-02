import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";

import {
  handleHttpErrorResponse,
  throwMethodNotAllowedResponse,
} from "~/server/http.server";
import { getPlatformContainer } from "~/server/container.server";

const ALLOWED_METHODS = ["GET", "HEAD"];

export async function action(_args: ActionFunctionArgs) {
  return handleHttpErrorResponse(() => {
    throwMethodNotAllowedResponse({ allowedMethods: ALLOWED_METHODS });
  });
}

export async function loader(args: LoaderFunctionArgs) {
  return handleHttpErrorResponse(() => {
    if (args.request.method !== "GET" && args.request.method !== "HEAD") {
      throwMethodNotAllowedResponse({ allowedMethods: ALLOWED_METHODS });
    }

    return getPlatformContainer().exerciseVideoController.getVideo(
      args,
      args.params.assetKey,
    );
  });
}
