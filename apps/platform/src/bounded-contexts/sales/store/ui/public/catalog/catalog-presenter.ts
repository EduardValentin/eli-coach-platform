import type { StoreProduct } from "~/bounded-contexts/sales/store/public/store";

import {
  collectFilterDimensions,
  filterProducts,
  offersAnyFilter,
  resolveFilterSelection,
  type StoreCatalogFilterDimension,
  type StoreCatalogFilterSelection,
} from "./catalog-filters";

export type CatalogPresentation = {
  dimensions: readonly StoreCatalogFilterDimension[];
  freeResources: readonly StoreProduct[];
  matchCountText: string;
  offersFilters: boolean;
  plans: readonly StoreProduct[];
  selection: StoreCatalogFilterSelection;
};

export function presentCatalog(
  products: readonly StoreProduct[],
  searchParams: URLSearchParams,
): CatalogPresentation {
  const dimensions = collectFilterDimensions(products);
  const selection = resolveFilterSelection(dimensions, searchParams);
  const filteredProducts = filterProducts(products, selection);

  return {
    dimensions,
    freeResources: filteredProducts.filter((product) => product.price === null),
    matchCountText: describeMatchCount(filteredProducts.length),
    offersFilters: offersAnyFilter(dimensions),
    plans: filteredProducts.filter((product) => product.price !== null),
    selection,
  };
}

function describeMatchCount(matchCount: number): string {
  if (matchCount === 0) {
    return "No products match your filters.";
  }

  if (matchCount === 1) {
    return "1 product matches your filters.";
  }

  return `${matchCount} products match your filters.`;
}
