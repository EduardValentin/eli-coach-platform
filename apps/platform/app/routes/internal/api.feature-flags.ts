import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { createMethodNotAllowedResponse } from "~/server/http.server";
import { getPlatformContainer } from "~/server/container.server";

export async function action(_args: ActionFunctionArgs) {
  return createMethodNotAllowedResponse({
    allowedMethods: ["GET"],
  });
}

export async function loader(_args: LoaderFunctionArgs) {
  return getPlatformContainer().featureFlagController.getSnapshot();
}
