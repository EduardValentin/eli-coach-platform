import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";

import {
  handleHttpErrorResponse,
  throwMethodNotAllowedResponse,
} from "~/server/http.server";
import { getPlatformContainer } from "~/server/container.server";

const ALLOWED_METHODS = ["GET", "HEAD", "POST"];

export async function action(args: ActionFunctionArgs) {
  return handleHttpErrorResponse(() => {
    if (args.request.method !== "POST") {
      throwMethodNotAllowedResponse({ allowedMethods: ALLOWED_METHODS });
    }

    return getPlatformContainer().exerciseLibraryController.createExercise(args);
  });
}

export async function loader(args: LoaderFunctionArgs) {
  return handleHttpErrorResponse(() => {
    if (args.request.method !== "GET" && args.request.method !== "HEAD") {
      throwMethodNotAllowedResponse({ allowedMethods: ALLOWED_METHODS });
    }

    return getPlatformContainer().exerciseLibraryController.listExercises(args);
  });
}
