import type {
  ActionFunctionArgs,
  ClientActionFunctionArgs,
  LoaderFunctionArgs,
} from "react-router";

import { fetcherOutcomeOf } from "@eli-coach-platform/infrastructure/http";
import {
  handleHttpErrorResponse,
  throwMethodNotAllowedResponse,
} from "@eli-coach-platform/infrastructure/http/server";
import { clientProfileContext } from "~/features/client-profile/server/guards/client-profile-context.server";

const ALLOWED_METHODS = ["POST", "DELETE"];

export async function action(args: ActionFunctionArgs) {
  return handleHttpErrorResponse(() => {
    const { avatars } = args.context.get(clientProfileContext);

    switch (args.request.method) {
      case "POST":
        return avatars.uploadAsCoach(args, args.params.clientId);
      case "DELETE":
        return avatars.removeAsCoach(args, args.params.clientId);
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

export function clientAction({ serverAction }: ClientActionFunctionArgs) {
  return fetcherOutcomeOf(serverAction);
}
