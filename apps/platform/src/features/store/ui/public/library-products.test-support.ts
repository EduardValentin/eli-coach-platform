import type { StoreProduct } from "~/features/store/contracts/store";

// The Library's tests — the view's here, the page's on the surface — describe
// the same owned product, so they share one builder rather than drifting apart
// copy by copy. It lives beside the view because the shape it builds is the
// store's, and a surface-side copy would be unreachable from this feature.
export function createOwnedProduct(
  overrides?: Partial<StoreProduct>,
): StoreProduct {
  return {
    cardSummary: "A practical cycle-aware guide.",
    cover: {
      alt: "Hormone Harmony guide cover",
      url: "/api/store/covers/hormone-harmony.webp",
    },
    creatorName: "Eli",
    detailDescription: "Phase-by-phase nutrition guidance.",
    goals: [{ displayOrder: 3, label: "Wellness", slug: "wellness" }],
    includedItems: ["Phase-by-phase guidance"],
    slug: "hormone-harmony",
    title: "Hormone Harmony",
    types: [{ displayOrder: 3, label: "E-Books", slug: "e-books" }],
    ...overrides,
  };
}
