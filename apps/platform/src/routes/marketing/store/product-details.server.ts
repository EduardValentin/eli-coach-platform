import type { LoaderFunctionArgs } from "react-router";

import { getPlatformContainer } from "~/server/container.server";
import { storeProductSchema } from "~/features/store/contracts/store";

export async function loader({ params }: LoaderFunctionArgs) {
  if (!params.slug) {
    throw new Response("Not Found", { status: 404 });
  }

  const response =
    await getPlatformContainer().storeCatalogController.getPublishedProductBySlug(
      params.slug,
    );

  if (!response.ok) {
    throw response;
  }

  return storeProductSchema.parse(await response.json());
}
