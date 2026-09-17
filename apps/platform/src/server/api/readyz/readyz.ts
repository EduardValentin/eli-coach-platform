import { handleHttpErrorResponse } from "@eli-coach-platform/infrastructure/http/server";
import type { LoaderFunctionArgs } from "react-router";

import { platformContext } from "~/server/guards/platform-context.server";

export function loader({ context }: LoaderFunctionArgs) {
  return handleHttpErrorResponse(() =>
    context.get(platformContext).readyz.getStatus(),
  );
}
