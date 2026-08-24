import { redirect, type LoaderFunctionArgs } from "react-router";

import { getPlatformContainer } from "~/server/container.server";
import {
  storeCatalogResponseSchema,
  type StoreProduct,
} from "~/features/store/contracts/store";

import {
  canonicalizeFilterSearchParams,
  collectFilterDimensions,
  resolveFilterSelection,
} from "./catalog-filters";

export type StoreCatalogLoaderData = {
  products: readonly StoreProduct[];
};

export async function loader({
  url,
}: LoaderFunctionArgs): Promise<StoreCatalogLoaderData> {
  const response =
    await getPlatformContainer().storeCatalogController.getPublishedCatalog();

  if (!response.ok) {
    throw response;
  }

  const catalog = storeCatalogResponseSchema.parse(await response.json());

  if (!catalog.success) {
    throw new Response(catalog.error.message, { status: 503 });
  }

  throwWhenFiltersAreNotCanonical(catalog.products, url);

  return { products: catalog.products };
}

// A filter the catalog cannot honour — unknown, retired, or belonging to a
// dimension too uniform to offer — leaves the address bar before anything
// renders, so a shared or reloaded URL always states the state it produces.
function throwWhenFiltersAreNotCanonical(
  products: readonly StoreProduct[],
  url: URL,
): void {
  const dimensions = collectFilterDimensions(products);
  const selection = resolveFilterSelection(dimensions, url.searchParams);
  const canonicalSearchParams = canonicalizeFilterSearchParams(
    url.searchParams,
    selection,
  );

  if (!canonicalSearchParams) {
    return;
  }

  const canonicalSearch = canonicalSearchParams.toString();

  throw redirect(
    canonicalSearch ? `${url.pathname}?${canonicalSearch}` : url.pathname,
  );
}
