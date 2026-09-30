import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";

import {
  handleHttpErrorResponse,
  throwMethodNotAllowedResponse,
} from "@eli-coach-platform/infrastructure/http/server";
import { clientProfileContext } from "~/features/client-profile/server/guards/client-profile-context.server";

export async function action(args: ActionFunctionArgs) {
  return handleHttpErrorResponse(() => {
    if (args.request.method !== "DELETE") {
      throwMethodNotAllowedResponse({ allowedMethods: ["GET", "DELETE"] });
    }

    return args.context
      .get(clientProfileContext)
      .progressPhotos.remove(args, args.params.photoId);
  });
}

export async function loader(args: LoaderFunctionArgs) {
  return handleHttpErrorResponse(() =>
    args.context
      .get(clientProfileContext)
      .progressPhotos.open(args, args.params.photoId),
  );
}
