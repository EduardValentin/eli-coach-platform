import type { LoaderFunctionArgs } from "react-router";

import { handleHttpErrorResponse } from "@eli-coach-platform/infrastructure/http/server";
import { getPlatformContainer } from "~/server/container.server";

export async function loader(args: LoaderFunctionArgs) {
  return handleHttpErrorResponse(() =>
    getPlatformContainer().accountController.getCurrentAccount(args),
  );
}
