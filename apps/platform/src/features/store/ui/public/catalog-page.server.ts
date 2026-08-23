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
  request,
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

  throwWhenFiltersAreNotCanonical(catalog.products, request);

  return { products: catalog.products };
}

// A filter the catalog cannot honour — unknown, retired, or belonging to a
// dimension too uniform to offer — leaves the address bar before anything
// renders, so a shared or reloaded URL always states the state it produces.
function throwWhenFiltersAreNotCanonical(
  products: readonly StoreProduct[],
  request: Request,
): void {
  // React Router hands loaders a request it has stripped of its own
  // single-fetch parameters (`_routes`, `index`) and whose path has already
  // lost the `.data` suffix, so nothing framework-owned can reach a redirect a
  // visitor might share.
  const url = new URL(request.url);
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
