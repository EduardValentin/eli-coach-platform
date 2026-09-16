export type PinnedProductSelection = {
  productId: number;
  slug: string;
  pinnedVersionId: number;
};

export type LockedProductState = {
  productId: number;
  slug: string;
  lifecycleStatus: "archived" | "draft" | "published";
  currentVersionId: number | null;
};

export type PurchasabilityDecision =
  | { status: "purchasable" }
  | { status: "unavailable"; purchasableSlugs: readonly string[] };

export function evaluatePurchasability(
  selections: readonly PinnedProductSelection[],
  lockedProducts: readonly LockedProductState[],
): PurchasabilityDecision {
  const lockedBySlug = new Map(
    lockedProducts.map((product) => [product.slug, product]),
  );
  const purchasableSlugs = selections
    .map((selection) => selection.slug)
    .filter((slug) => {
      const locked = lockedBySlug.get(slug);

      return (
        locked?.lifecycleStatus === "published" && locked.currentVersionId !== null
      );
    });
  const everyPinnedVersionIsCurrent = selections.every((selection) => {
    const locked = lockedBySlug.get(selection.slug);

    return (
      locked?.productId === selection.productId &&
      locked.lifecycleStatus === "published" &&
      locked.currentVersionId === selection.pinnedVersionId
    );
  });

  return everyPinnedVersionIsCurrent
    ? { status: "purchasable" }
    : { status: "unavailable", purchasableSlugs };
}
