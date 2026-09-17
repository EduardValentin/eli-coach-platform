import type { LoaderFunctionArgs } from "react-router";

import { storeContext } from "~/features/store/server/guards/store-context.server";
import { storeProductSchema } from "~/features/store/contracts/store";

export async function loader({ context, params }: LoaderFunctionArgs) {
  if (!params.slug) {
    throw new Response("Not Found", { status: 404 });
  }

  const response = await context
    .get(storeContext)
    .catalog.getPublishedProductBySlug(params.slug);

  if (!response.ok) {
    throw response;
  }

  return storeProductSchema.parse(await response.json());
}
