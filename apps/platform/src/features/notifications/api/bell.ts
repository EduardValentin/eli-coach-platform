import type {
  ActionFunctionArgs,
  ClientLoaderFunctionArgs,
  LoaderFunctionArgs,
} from "react-router";

import { fetcherOutcomeOf } from "@eli-coach-platform/infrastructure/http";
import {
  handleHttpErrorResponse,
  throwMethodNotAllowedResponse,
} from "@eli-coach-platform/infrastructure/http/server";
import { notificationsContext } from "~/features/notifications/server/guards/notifications-context.server";

export async function action(_args: ActionFunctionArgs) {
  return handleHttpErrorResponse(() => {
    throwMethodNotAllowedResponse({ allowedMethods: ["GET", "HEAD"] });
  });
}

export async function loader(args: LoaderFunctionArgs) {
  return handleHttpErrorResponse(() =>
    args.context.get(notificationsContext).notificationBell.bell(args),
  );
}

export function clientLoader({ serverLoader }: ClientLoaderFunctionArgs) {
  return fetcherOutcomeOf(serverLoader);
}

export function shouldRevalidate() {
  return false;
}
