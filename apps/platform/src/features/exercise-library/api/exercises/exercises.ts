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
import { exerciseVideoUploadProgress } from "~/features/exercise-library/public/exercise-video-upload-progress";
import { exerciseLibraryContext } from "~/features/exercise-library/server/guards/exercise-library-context.server";

const ALLOWED_METHODS = ["POST"];

export async function action(args: ActionFunctionArgs) {
  return handleHttpErrorResponse(() => {
    if (args.request.method !== "POST") {
      throwMethodNotAllowedResponse({ allowedMethods: ALLOWED_METHODS });
    }

    return args.context
      .get(exerciseLibraryContext)
      .exerciseLibrary.create(args);
  });
}

export async function loader(_args: LoaderFunctionArgs) {
  return handleHttpErrorResponse(() => {
    throwMethodNotAllowedResponse({ allowedMethods: ALLOWED_METHODS });
  });
}

export function clientAction({ request }: ClientActionFunctionArgs) {
  return uploadOutcomeOf(request, exerciseVideoUploadProgress);
}
