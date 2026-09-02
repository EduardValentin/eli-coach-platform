import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";

import {
  handleHttpErrorResponse,
  throwMethodNotAllowedResponse,
} from "~/server/http.server";
import { getPlatformContainer } from "~/server/container.server";

const ALLOWED_METHODS = ["GET", "HEAD", "PATCH"];

export async function action(args: ActionFunctionArgs) {
  return handleHttpErrorResponse(() => {
    if (args.request.method !== "PATCH") {
      throwMethodNotAllowedResponse({ allowedMethods: ALLOWED_METHODS });
    }

    return getPlatformContainer().exerciseLibraryController.updateExercise(
      args,
      args.params.exerciseId,
    );
  });
}

export async function loader(args: LoaderFunctionArgs) {
  return handleHttpErrorResponse(() => {
    if (args.request.method !== "GET" && args.request.method !== "HEAD") {
      throwMethodNotAllowedResponse({ allowedMethods: ALLOWED_METHODS });
    }

    return getPlatformContainer().exerciseLibraryController.getExercise(
      args,
      args.params.exerciseId,
    );
  });
}
