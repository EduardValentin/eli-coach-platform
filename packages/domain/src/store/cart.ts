export function reconcileCart(
  productSlugs: readonly string[],
  availableProductSlugs: readonly string[],
): readonly string[] {
  const availableProducts = new Set(availableProductSlugs);
  const reconciledSlugs = productSlugs.filter((slug) =>
    availableProducts.has(slug),
  );

  return reconciledSlugs.length === productSlugs.length
    ? productSlugs
    : reconciledSlugs;
}
