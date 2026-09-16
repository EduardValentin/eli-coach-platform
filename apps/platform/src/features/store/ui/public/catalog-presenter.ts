import type { StoreProduct } from "~/features/store/contracts/store";

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
  filteredProducts: readonly StoreProduct[];
  matchCountText: string;
  offersFilters: boolean;
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
    filteredProducts,
    matchCountText: describeMatchCount(filteredProducts.length),
    offersFilters: offersAnyFilter(dimensions),
    selection,
  };
}

function describeMatchCount(matchCount: number): string {
  if (matchCount === 0) {
    return "No resources match your filters.";
  }

  if (matchCount === 1) {
    return "1 resource matches your filters.";
  }

  return `${matchCount} resources match your filters.`;
}
