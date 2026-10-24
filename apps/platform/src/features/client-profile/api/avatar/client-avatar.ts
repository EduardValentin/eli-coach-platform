import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";

import {
  handleHttpErrorResponse,
  throwMethodNotAllowedResponse,
} from "@eli-coach-platform/infrastructure/http/server";
import { clientProfileContext } from "~/features/client-profile/server/guards/client-profile-context.server";

export async function action(_args: ActionFunctionArgs) {
  return handleHttpErrorResponse(() => {
    throwMethodNotAllowedResponse({ allowedMethods: ["GET"] });
  });
}

export async function loader(args: LoaderFunctionArgs) {
  return handleHttpErrorResponse(() =>
    args.context
      .get(clientProfileContext)
      .avatars.open(args, args.params.clientId),
  );
}
