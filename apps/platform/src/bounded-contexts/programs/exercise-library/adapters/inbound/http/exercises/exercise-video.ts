import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";

import {
  handleHttpErrorResponse,
  throwMethodNotAllowedResponse,
} from "~/shared/http/index.server";
import { exerciseLibraryContext } from "~/bounded-contexts/programs/exercise-library/adapters/inbound/http/context.server";

const ALLOWED_METHODS = ["GET"];

export async function loader(args: LoaderFunctionArgs) {
  return handleHttpErrorResponse(() =>
    args.context.get(exerciseLibraryContext).exerciseLibrary.openVideo(args, {
      exerciseId: args.params.exerciseId,
      videoId: args.params.videoId,
    }),
  );
}

export async function action(_args: ActionFunctionArgs) {
  return handleHttpErrorResponse(() => {
    throwMethodNotAllowedResponse({ allowedMethods: ALLOWED_METHODS });
  });
}
