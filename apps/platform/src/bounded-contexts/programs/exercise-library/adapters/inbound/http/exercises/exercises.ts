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
import { exerciseVideoUploadProgress } from "~/bounded-contexts/programs/exercise-library/public/exercise-video-upload-progress";
import { exerciseLibraryContext } from "~/bounded-contexts/programs/exercise-library/adapters/inbound/http/context.server";

const ALLOWED_METHODS = ["POST"];

export async function action(args: ActionFunctionArgs) {
  return handleHttpErrorResponse(() => {
    if (args.request.method !== "POST") {
      throwMethodNotAllowedResponse({ allowedMethods: ALLOWED_METHODS });
    }

    return args.context
      .get(exerciseLibraryContext)
      .exerciseLibraryController.create(args);
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
