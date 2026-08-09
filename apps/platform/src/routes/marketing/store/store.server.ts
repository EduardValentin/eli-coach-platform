import {
  storeCatalogResponseSchema,
  type StoreProduct,
} from "@eli-coach-platform/contracts";

import { getPlatformContainer } from "~/server/container.server";

export type StoreCatalogLoaderData = {
  products: readonly StoreProduct[];
};

export async function loader(): Promise<StoreCatalogLoaderData> {
  const response =
    await getPlatformContainer().storeCatalogController.getPublishedCatalog();

  if (!response.ok) {
    throw response;
  }

  const catalog = storeCatalogResponseSchema.parse(await response.json());

  if (!catalog.success) {
    throw new Response(catalog.error.message, { status: 503 });
  }

  return { products: catalog.products };
}
