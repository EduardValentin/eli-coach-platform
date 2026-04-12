import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { createMethodNotAllowedResponse } from "~/server/http.server";
import { getPlatformContainer } from "~/server/container.server";

const featureFlagController = getPlatformContainer().featureFlagController;

export async function action(_args: ActionFunctionArgs) {
  return createMethodNotAllowedResponse({
    allowedMethods: ["GET"],
  });
}

export async function loader(_args: LoaderFunctionArgs) {
  return featureFlagController.getSnapshot();
}
