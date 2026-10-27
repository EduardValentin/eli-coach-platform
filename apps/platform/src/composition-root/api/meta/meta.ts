import { handleHttpErrorResponse } from "~/shared/http/index.server";
import type { LoaderFunctionArgs } from "react-router";

import { platformContext } from "~/composition-root/guards/platform-context.server";

export function loader({ context }: LoaderFunctionArgs) {
  return handleHttpErrorResponse(() =>
    context.get(platformContext).metadata.getMetadata(),
  );
}
