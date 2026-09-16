import { redirect, type LoaderFunctionArgs } from "react-router";

import { storeContext } from "~/features/store/server/guards/store-context.server";
import {
  storeCatalogResponseSchema,
  type StoreProduct,
} from "~/features/store/contracts/store";

import { resolveCanonicalFilterTarget } from "./catalog-filters";

export type StoreCatalogLoaderData = {
  products: readonly StoreProduct[];
};

export async function loader(
  args: LoaderFunctionArgs,
): Promise<StoreCatalogLoaderData> {
  const response = await args.context
    .get(storeContext)
    .catalog.getPublishedCatalog();

  if (!response.ok) {
    throw response;
  }

  const catalog = storeCatalogResponseSchema.parse(await response.json());

  if (!catalog.success) {
    throw new Response(catalog.error.message, { status: 503 });
  }

  const target = resolveCanonicalFilterTarget(catalog.products, args.url);

  if (target) {
    throw redirect(target);
  }

  return { products: catalog.products };
}
