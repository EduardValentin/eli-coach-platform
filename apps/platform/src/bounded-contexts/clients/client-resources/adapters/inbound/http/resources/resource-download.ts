import type { LoaderFunctionArgs } from "react-router";

import { handleHttpErrorResponse } from "~/shared/http/index.server";
import { clientResourcesContext } from "~/bounded-contexts/clients/client-resources/adapters/inbound/http/context.server";

export async function loader(args: LoaderFunctionArgs) {
  return handleHttpErrorResponse(() =>
    args.context
      .get(clientResourcesContext)
      .clientResourcesController.download(args, args.params.resourceId),
  );
}
