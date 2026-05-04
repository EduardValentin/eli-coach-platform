import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import {
  handleHttpErrorResponse,
  throwMethodNotAllowedResponse,
} from "~/server/http.server";
import { getPlatformContainer } from "~/server/container.server";

const featureFlagController = getPlatformContainer().featureFlagController;

export async function action(_args: ActionFunctionArgs) {
  return handleHttpErrorResponse(() => {
    throwMethodNotAllowedResponse({
      allowedMethods: ["GET"],
    });
  });
}

export async function loader(_args: LoaderFunctionArgs) {
  return handleHttpErrorResponse(() => featureFlagController.getSnapshot());
}
