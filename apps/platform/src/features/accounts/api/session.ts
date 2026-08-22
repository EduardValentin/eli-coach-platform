import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";

import { getPlatformContainer } from "~/server/container.server";
import {
  handleHttpErrorResponse,
  throwMethodNotAllowedResponse,
} from "~/server/http.server";

export async function action(_args: ActionFunctionArgs) {
  return handleHttpErrorResponse(() => {
    throwMethodNotAllowedResponse({ allowedMethods: ["GET"] });
  });
}

export async function loader({ request }: LoaderFunctionArgs) {
  return handleHttpErrorResponse(() =>
    getPlatformContainer().authController.getSession(request),
  );
}
