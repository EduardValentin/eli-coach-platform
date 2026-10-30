import type {
  ActionFunctionArgs,
  ClientActionFunctionArgs,
  LoaderFunctionArgs,
} from "react-router";

import { fetcherOutcomeOf, uploadOutcomeOf } from "~/shared/http";
import {
  handleHttpErrorResponse,
  throwMethodNotAllowedResponse,
} from "~/shared/http/index.server";
import { exerciseVideoUploadProgress } from "~/bounded-contexts/programs/exercise-library/public/exercise-video-upload-progress";
import { exerciseLibraryContext } from "~/bounded-contexts/programs/exercise-library/adapters/inbound/http/context.server";

const ALLOWED_METHODS = ["PUT", "DELETE"];

export async function action(args: ActionFunctionArgs) {
  return handleHttpErrorResponse(() => {
    const { exerciseLibraryController } = args.context.get(
      exerciseLibraryContext,
    );

    switch (args.request.method) {
      case "PUT":
        return exerciseLibraryController.edit(args, args.params.exerciseId);
      case "DELETE":
        return exerciseLibraryController.delete(args, args.params.exerciseId);
      default:
        throwMethodNotAllowedResponse({ allowedMethods: ALLOWED_METHODS });
    }
  });
}

export async function loader(_args: LoaderFunctionArgs) {
  return handleHttpErrorResponse(() => {
    throwMethodNotAllowedResponse({ allowedMethods: ALLOWED_METHODS });
  });
}

export function clientAction({
  request,
  serverAction,
}: ClientActionFunctionArgs) {
  return request.method === "DELETE"
    ? fetcherOutcomeOf(serverAction)
    : uploadOutcomeOf(request, exerciseVideoUploadProgress);
}
