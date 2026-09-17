import { describe, expect, it } from "vitest";

import { PublishedProduct } from "../product";

import { AcquisitionRequest, evaluateDeliveryLimit } from "./acquisition";

const requestedAt = new Date("2026-07-30T12:00:00.000Z");

const command = {
  email: "  WOMAN@Example.com ",
  idempotencyKey: "d744ad8e-632c-4dfe-ac70-033bd3221522",
  marketingConsent: false,
  productSlugs: ["hormone-harmony"],
} as const;

function createProduct(slug: string): PublishedProduct {
  return PublishedProduct.reconstitute({
    id: 7,
    slug,
    displayOrder: 1,
    version: {
      id: 11,
      sequence: 2,
      title: `Title for ${slug}`,
      creatorName: "Evoa Fitness",
      cardSummary: "A practical cycle-aware guide.",
      detailDescription: "Learn how energy and recovery change.",
      includedItems: ["Phase-by-phase guidance"],
      cover: {
        assetKey: `covers/${slug}.webp`,
        alt: "Cover",
        mimeType: "image/webp",
        sizeBytes: 96,
        sha256: "c".repeat(64),
      },
      assets: [],
      types: [{ slug: "e-books", label: "E-Books", displayOrder: 3 }],
      goals: [{ slug: "wellness", label: "Wellness", displayOrder: 3 }],
      publishedAt: new Date("2026-07-30T10:00:00.000Z"),
    },
  });
}

describe("AcquisitionRequest.from", () => {
  it("normalizes the email and keeps one allowance per inbox", () => {
    // arrange
    const raw = { ...command, email: " Woman+Guides@Example.com " };

    // act
    const request = AcquisitionRequest.from(raw, requestedAt);

    // assert
    expect(request.email.value).toBe("woman+guides@example.com");
    expect(request.email.deliveryLimitKey).toBe("woman@example.com");
  });

  it("deduplicates and sorts the requested product slugs", () => {
    // arrange
    const raw = {
      ...command,
      productSlugs: ["nutrition-basics", "hormone-harmony", "nutrition-basics"],
    };

    // act
    const request = AcquisitionRequest.from(raw, requestedAt);

    // assert
    expect(request.productSlugs).toEqual([
      "hormone-harmony",
      "nutrition-basics",
    ]);
  });

  it("derives the cooldown, daily window and grant expiry from the request time", () => {
    // arrange
    const raw = { ...command };

    // act
    const request = AcquisitionRequest.from(raw, requestedAt);

    // assert
    expect(request.windows).toEqual({
      cooldownSince: new Date("2026-07-30T11:59:00.000Z"),
      dailyWindowSince: new Date("2026-07-29T12:00:00.000Z"),
      expiresAt: new Date("2026-08-06T12:00:00.000Z"),
    });
  });

  it("carries the idempotency key, consent and request time unchanged", () => {
    // arrange
    const raw = { ...command, marketingConsent: true };

    // act
    const request = AcquisitionRequest.from(raw, requestedAt);

    // assert
    expect(request.idempotencyKey).toBe(command.idempotencyKey);
    expect(request.marketingConsent).toBe(true);
    expect(request.requestedAt).toBe(requestedAt);
  });
});

describe("AcquisitionRequest.canonicalPayload", () => {
  it("renders the normalized email, consent and sorted slugs as stable JSON", () => {
    // arrange
    const request = AcquisitionRequest.from(
      { ...command, productSlugs: ["nutrition-basics", "hormone-harmony"] },
      requestedAt,
    );

    // act
    const payload = request.canonicalPayload();

    // assert
    expect(payload).toBe(
      JSON.stringify({
        email: "woman@example.com",
        marketingConsent: false,
        productSlugs: ["hormone-harmony", "nutrition-basics"],
      }),
    );
  });
});

describe("AcquisitionRequest.selectProducts", () => {
  it("returns the published products in slug order", () => {
    // arrange
    const request = AcquisitionRequest.from(
      { ...command, productSlugs: ["nutrition-basics", "hormone-harmony"] },
      requestedAt,
    );
    const catalog = [
      createProduct("nutrition-basics"),
      createProduct("hormone-harmony"),
    ];

    // act
    const selection = request.selectProducts(catalog);

    // assert
    expect(selection).toEqual({
      status: "selected",
      products: [catalog[1], catalog[0]],
    });
  });

  it("reports the available subset when any slug is missing from the catalog", () => {
    // arrange
    const request = AcquisitionRequest.from(
      { ...command, productSlugs: ["hormone-harmony", "removed-guide"] },
      requestedAt,
    );

    // act
    const selection = request.selectProducts([
      createProduct("hormone-harmony"),
    ]);

    // assert
    expect(selection).toEqual({
      status: "unavailable_products",
      availableProductSlugs: ["hormone-harmony"],
    });
  });
});

describe("evaluateDeliveryLimit", () => {
  it.each([
    [{ cooldownCount: 1, dailyCount: 1 }, "cooldown"],
    [{ cooldownCount: 0, dailyCount: 10 }, "daily"],
    [{ cooldownCount: 0, dailyCount: 9 }, null],
  ])("decides %o as %s", (usage, expected) => {
    // arrange
    const dailyLimit = 10;

    // act
    const window = evaluateDeliveryLimit(usage, dailyLimit);

    // assert
    expect(window).toBe(expected);
  });
});
