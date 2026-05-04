import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";

import { createMethodNotAllowedResponse } from "~/server/http.server";
import { getPlatformContainer } from "~/server/container.server";

const getWaitlistController = () => getPlatformContainer().waitlistController;

export async function action({ request }: ActionFunctionArgs) {
  if (request.method !== "POST") {
    return createMethodNotAllowedResponse({
      allowedMethods: ["GET", "POST"],
    });
  }

  const waitlistController = getWaitlistController();

  return waitlistController.join(request);
}

export async function loader({ request }: LoaderFunctionArgs) {
  if (request.method !== "GET" && request.method !== "HEAD") {
    return createMethodNotAllowedResponse({
      allowedMethods: ["GET", "POST"],
    });
  }

  const waitlistController = getWaitlistController();

  return waitlistController.getSnapshot();
}
