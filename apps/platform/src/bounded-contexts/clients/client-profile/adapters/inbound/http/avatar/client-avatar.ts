import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";

import {
  handleHttpErrorResponse,
  throwMethodNotAllowedResponse,
} from "~/shared/http/index.server";
import { clientProfileContext } from "~/bounded-contexts/clients/client-profile/adapters/inbound/http/context.server";

export async function action(_args: ActionFunctionArgs) {
  return handleHttpErrorResponse(() => {
    throwMethodNotAllowedResponse({ allowedMethods: ["GET"] });
  });
}

export async function loader(args: LoaderFunctionArgs) {
  return handleHttpErrorResponse(() =>
    args.context
      .get(clientProfileContext)
      .clientAvatarController.open(args, args.params.clientId),
  );
}
