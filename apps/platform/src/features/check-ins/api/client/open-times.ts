import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";

import {
  handleHttpErrorResponse,
  throwMethodNotAllowedResponse,
} from "@eli-coach-platform/infrastructure/http/server";
import { checkInsContext } from "~/features/check-ins/server/guards/check-ins-context.server";

const ALLOWED_METHODS = ["GET", "HEAD"];

export async function action(_args: ActionFunctionArgs) {
  return handleHttpErrorResponse(() => {
    throwMethodNotAllowedResponse({ allowedMethods: ALLOWED_METHODS });
  });
}

export async function loader(args: LoaderFunctionArgs) {
  return handleHttpErrorResponse(() =>
    args.context.get(checkInsContext).clientCheckIns.listOpenTimes(args),
  );
}
