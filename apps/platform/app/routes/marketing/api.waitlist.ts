import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";

import { createMethodNotAllowedResponse } from "~/server/http.server";
import { getPlatformContainer } from "~/server/container.server";

export async function action({ request }: ActionFunctionArgs) {
  if (request.method !== "POST") {
    return createMethodNotAllowedResponse({
      allowedMethods: ["GET", "POST"],
    });
  }

  return getPlatformContainer().waitlistController.join(request);
}

export async function loader(_args: LoaderFunctionArgs) {
  return getPlatformContainer().waitlistController.getSnapshot();
}
