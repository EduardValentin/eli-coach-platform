import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";

import { getPlatformContainer } from "~/server/container.server";
import {
  handleHttpErrorResponse,
  throwMethodNotAllowedResponse,
} from "~/server/http.server";

export async function action({ request }: ActionFunctionArgs) {
  return handleHttpErrorResponse(() =>
    getPlatformContainer().authController.signOut(request),
  );
}

export async function loader(_args: LoaderFunctionArgs) {
  return handleHttpErrorResponse(() => {
    throwMethodNotAllowedResponse({ allowedMethods: ["POST"] });
  });
}
