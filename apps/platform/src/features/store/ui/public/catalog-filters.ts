import type { StoreProduct } from "~/features/store/contracts/store";

export const STORE_TYPE_FILTER_PARAM = "type";
export const STORE_GOAL_FILTER_PARAM = "goal";

type StoreTaxonomyValue = StoreProduct["types"][number];

export type StoreCatalogFilterDimensions = {
  goals: readonly StoreTaxonomyValue[];
  types: readonly StoreTaxonomyValue[];
};

export type StoreCatalogFilterSelection = {
  goal: string | null;
  type: string | null;
};

// A dimension worth offering needs something to choose between: one value
// assigned across the whole catalog filters nothing out.
const MINIMUM_OFFERED_VALUES = 2;

export function collectFilterDimensions(
  products: readonly StoreProduct[],
): StoreCatalogFilterDimensions {
  return {
    goals: collectDimension(products.flatMap((product) => product.goals)),
    types: collectDimension(products.flatMap((product) => product.types)),
  };
}

export function resolveFilterSelection(
  dimensions: StoreCatalogFilterDimensions,
  searchParams: URLSearchParams,
): StoreCatalogFilterSelection {
  return {
    goal: resolveValue(dimensions.goals, searchParams, STORE_GOAL_FILTER_PARAM),
    type: resolveValue(dimensions.types, searchParams, STORE_TYPE_FILTER_PARAM),
  };
}

export function canonicalizeFilterSearchParams(
  searchParams: URLSearchParams,
  selection: StoreCatalogFilterSelection,
): URLSearchParams | null {
  const canonical = new URLSearchParams();
  const resolvedValues = new Map([
    [STORE_GOAL_FILTER_PARAM, selection.goal],
    [STORE_TYPE_FILTER_PARAM, selection.type],
  ]);

  for (const [name, value] of searchParams) {
    if (!resolvedValues.has(name)) {
      canonical.append(name, value);
      continue;
    }

    // The first occurrence keeps its place in the query string; any repeat of
    // the same filter collapses into it.
    const resolvedValue = resolvedValues.get(name);

    if (resolvedValue) {
      canonical.append(name, resolvedValue);
      resolvedValues.set(name, null);
    }
  }

  return canonical.toString() === searchParams.toString() ? null : canonical;
}

export function filterProducts(
  products: readonly StoreProduct[],
  selection: StoreCatalogFilterSelection,
): readonly StoreProduct[] {
  return products.filter(
    (product) =>
      carriesValue(product.types, selection.type) &&
      carriesValue(product.goals, selection.goal),
  );
}

export function haveOnlyFilterParamsChanged(
  currentUrl: URL,
  nextUrl: URL,
): boolean {
  if (currentUrl.href === nextUrl.href) {
    return false;
  }

  return (
    currentUrl.pathname === nextUrl.pathname &&
    withoutFilterParams(currentUrl) === withoutFilterParams(nextUrl)
  );
}

function collectDimension(
  values: readonly StoreTaxonomyValue[],
): readonly StoreTaxonomyValue[] {
  const valuesBySlug = new Map<string, StoreTaxonomyValue>();

  for (const value of values) {
    valuesBySlug.set(value.slug, value);
  }

  if (valuesBySlug.size < MINIMUM_OFFERED_VALUES) {
    return [];
  }

  return [...valuesBySlug.values()].sort(
    (value, otherValue) => value.displayOrder - otherValue.displayOrder,
  );
}

function resolveValue(
  offeredValues: readonly StoreTaxonomyValue[],
  searchParams: URLSearchParams,
  name: string,
): string | null {
  return (
    searchParams
      .getAll(name)
      .find((value) =>
        offeredValues.some((offeredValue) => offeredValue.slug === value),
      ) ?? null
  );
}

function carriesValue(
  values: readonly StoreTaxonomyValue[],
  selectedSlug: string | null,
): boolean {
  return (
    selectedSlug === null || values.some((value) => value.slug === selectedSlug)
  );
}

function withoutFilterParams(url: URL): string {
  const searchParams = new URLSearchParams(url.search);

  searchParams.delete(STORE_TYPE_FILTER_PARAM);
  searchParams.delete(STORE_GOAL_FILTER_PARAM);

  return searchParams.toString();
}
