import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";

import {
  handleHttpErrorResponse,
  throwMethodNotAllowedResponse,
} from "~/server/http.server";
import { getPlatformContainer } from "~/server/container.server";

export async function action({ request }: ActionFunctionArgs) {
  return handleHttpErrorResponse(() => {
    if (request.method !== "POST") {
      throwMethodNotAllowedResponse({
        allowedMethods: ["GET", "POST"],
      });
    }

    return getPlatformContainer().waitlistController.join(request);
  });
}

export async function loader({ request }: LoaderFunctionArgs) {
  return handleHttpErrorResponse(() => {
    if (request.method !== "GET" && request.method !== "HEAD") {
      throwMethodNotAllowedResponse({
        allowedMethods: ["GET", "POST"],
      });
    }

    return getPlatformContainer().waitlistController.getSnapshot();
  });
}
