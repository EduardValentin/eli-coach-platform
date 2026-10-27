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
import { checkInsContext } from "~/bounded-contexts/clients/check-ins/server/guards/check-ins-context.server";

const ALLOWED_METHODS = ["GET", "HEAD"];

export async function action(_args: ActionFunctionArgs) {
  return handleHttpErrorResponse(() => {
    throwMethodNotAllowedResponse({ allowedMethods: ALLOWED_METHODS });
  });
}

export async function loader(args: LoaderFunctionArgs) {
  return handleHttpErrorResponse(() =>
    args.context.get(checkInsContext).coachCheckInSeries.preview(args),
  );
}

export function clientLoader({ serverLoader }: ClientLoaderFunctionArgs) {
  return fetcherOutcomeOf(serverLoader);
}

export function shouldRevalidate() {
  return false;
}
