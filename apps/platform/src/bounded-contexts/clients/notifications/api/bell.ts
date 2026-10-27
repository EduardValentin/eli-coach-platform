import type {
  ActionFunctionArgs,
  ClientLoaderFunctionArgs,
  LoaderFunctionArgs,
} from "react-router";

import { fetcherOutcomeOf } from "~/shared/http";
import {
  handleHttpErrorResponse,
  throwMethodNotAllowedResponse,
} from "~/shared/http/index.server";
import { notificationsContext } from "~/bounded-contexts/clients/notifications/server/guards/notifications-context.server";

export async function action(_args: ActionFunctionArgs) {
  return handleHttpErrorResponse(() => {
    throwMethodNotAllowedResponse({ allowedMethods: ["GET", "HEAD"] });
  });
}

export async function loader(args: LoaderFunctionArgs) {
  return handleHttpErrorResponse(() =>
    args.context
      .get(notificationsContext)
      .notificationBell.respondWithBell(args),
  );
}

export function clientLoader({ serverLoader }: ClientLoaderFunctionArgs) {
  return fetcherOutcomeOf(serverLoader);
}

export function shouldRevalidate() {
  return false;
}
