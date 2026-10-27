import type { LoaderFunctionArgs } from "react-router";

import { handleHttpErrorResponse } from "~/shared/http/index.server";
import { clientResourcesContext } from "~/bounded-contexts/clients/client-resources/server/guards/client-resources-context.server";

export async function loader(args: LoaderFunctionArgs) {
  return handleHttpErrorResponse(() =>
    args.context
      .get(clientResourcesContext)
      .clientResources.download(args, args.params.resourceId),
  );
}
