import type { FilterChipTone } from "@eli-coach-platform/ui";
import type { StoreProduct } from "~/features/store/contracts/store";

type StoreTaxonomyValue = StoreProduct["types"][number];

type StoreFilterDimensionDescriptor = {
  label: string;
  param: string;
  tone: FilterChipTone;
  valuesOf: (product: StoreProduct) => readonly StoreTaxonomyValue[];
};

// The dimensions the catalog can be filtered by, described once. A new one is
// an entry here rather than a parameter name, a row, a match rule and a reset
// spread across three modules.
export const STORE_FILTER_DIMENSIONS = [
  {
    label: "Type",
    param: "type",
    tone: "brand",
    valuesOf: (product) => product.types,
  },
  {
    label: "Goal",
    param: "goal",
    tone: "brand-secondary",
    valuesOf: (product) => product.goals,
  },
] as const satisfies readonly StoreFilterDimensionDescriptor[];

export type StoreFilterParam = (typeof STORE_FILTER_DIMENSIONS)[number]["param"];

export type StoreCatalogFilterDimension = {
  descriptor: (typeof STORE_FILTER_DIMENSIONS)[number];
  values: readonly StoreTaxonomyValue[];
};

export type StoreCatalogFilterSelection = Readonly<
  Record<StoreFilterParam, string | null>
>;

// A dimension worth offering needs something to choose between: one value
// assigned across the whole catalog filters nothing out.
const MINIMUM_OFFERED_VALUES = 2;

export function collectFilterDimensions(
  products: readonly StoreProduct[],
): readonly StoreCatalogFilterDimension[] {
  return STORE_FILTER_DIMENSIONS.map((descriptor) => ({
    descriptor,
    values: collectDimension(products.flatMap(descriptor.valuesOf)),
  }));
}

export function offersAnyFilter(
  dimensions: readonly StoreCatalogFilterDimension[],
): boolean {
  return dimensions.some((dimension) => dimension.values.length > 0);
}

export function resolveFilterSelection(
  dimensions: readonly StoreCatalogFilterDimension[],
  searchParams: URLSearchParams,
): StoreCatalogFilterSelection {
  return Object.fromEntries(
    dimensions.map((dimension) => [
      dimension.descriptor.param,
      resolveValue(dimension.values, searchParams, dimension.descriptor.param),
    ]),
  ) as StoreCatalogFilterSelection;
}

export function canonicalizeFilterSearchParams(
  searchParams: URLSearchParams,
  selection: StoreCatalogFilterSelection,
): URLSearchParams | null {
  const canonical = new URLSearchParams();
  const resolvedValues = new Map<string, string | null>(
    STORE_FILTER_DIMENSIONS.map(({ param }) => [param, selection[param]]),
  );

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
  return products.filter((product) =>
    STORE_FILTER_DIMENSIONS.every((descriptor) =>
      carriesValue(descriptor.valuesOf(product), selection[descriptor.param]),
    ),
  );
}

export function removeFilterParams(params: URLSearchParams): void {
  for (const { param } of STORE_FILTER_DIMENSIONS) {
    params.delete(param);
  }
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

  removeFilterParams(searchParams);

  return searchParams.toString();
}
