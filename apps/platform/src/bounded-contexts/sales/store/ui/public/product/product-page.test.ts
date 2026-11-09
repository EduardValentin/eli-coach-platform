import { describe, expect, it } from "vitest";

import { meta } from "./product-page";

describe("store product details", () => {
  it("describes the published resource in page metadata", () => {
    // arrange
    const product = createProduct();

    // act
    const metadata = meta({ loaderData: product } as Parameters<
      typeof meta
    >[0]);

    // assert
    expect(metadata).toEqual([
      { title: "Hormone Harmony | Free Resources | Evoa" },
      {
        content: "A practical cycle-aware guide.",
        name: "description",
      },
    ]);
  });

  it("files a paid product under the plans in page metadata", () => {
    // arrange
    const product = {
      ...createProduct(),
      price: { eurCents: 3900, usdCents: 4500 },
      title: "30-Day Fat Loss Plan",
    };

    // act
    const metadata = meta({ loaderData: product } as Parameters<
      typeof meta
    >[0]);

    // assert
    expect(metadata).toEqual([
      { title: "30-Day Fat Loss Plan | Plans | Evoa" },
      {
        content: "A practical cycle-aware guide.",
        name: "description",
      },
    ]);
  });
});

function createProduct() {
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
    price: null,
    slug: "hormone-harmony",
    title: "Hormone Harmony",
    types: [{ displayOrder: 3, label: "E-Books", slug: "e-books" }],
  };
}
