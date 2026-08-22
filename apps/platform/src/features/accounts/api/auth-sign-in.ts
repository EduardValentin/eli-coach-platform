import type { LoaderFunctionArgs } from "react-router";

import { getPlatformContainer } from "~/server/container.server";
import { handleHttpErrorResponse } from "~/server/http.server";

export async function loader({ request }: LoaderFunctionArgs) {
  return handleHttpErrorResponse(() =>
    getPlatformContainer().authController.startSignIn(request),
  );
}
