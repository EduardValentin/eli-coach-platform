import type { LoaderFunctionArgs } from "react-router";

import { handleHttpErrorResponse } from "@eli-coach-platform/infrastructure/http/server";
import { clientResourcesContext } from "~/features/client-resources/server/guards/client-resources-context.server";

export async function loader(args: LoaderFunctionArgs) {
  return handleHttpErrorResponse(() =>
    args.context
      .get(clientResourcesContext)
      .clientResources.openThumbnail(args, args.params.resourceId),
  );
}
