import { describe, expect, it } from "vitest";

import {
  storeAcquisitionRequestSchema,
  storeAcquisitionResponseSchema,
  storeCatalogResponseSchema,
  storeDownloadRequestSchema,
} from "./store-contracts";

describe("Store contracts", () => {
  it("parses a published free catalog response", () => {
    // arrange
    const response = {
      success: true,
      products: [
        {
          slug: "hormone-harmony",
          title: "Hormone Harmony",
          creatorName: "Evoa Fitness",
          cardSummary: "A practical cycle-aware guide.",
          detailDescription:
            "Learn how energy and recovery change across the cycle.",
          includedItems: ["Phase-by-phase guidance"],
          cover: {
            url: "/api/store/covers/covers%2Fhormone-harmony.webp",
            alt: "Hormone Harmony guide cover",
          },
          types: [
            {
              slug: "e-books",
              label: "E-Books",
              displayOrder: 3,
            },
          ],
          goals: [
            {
              slug: "wellness",
              label: "Wellness",
              displayOrder: 3,
            },
          ],
        },
      ],
    };

    // act
    const result = storeCatalogResponseSchema.parse(response);

    // assert
    expect(result).toEqual(response);
  });

  it("normalizes a form acquisition request while keeping consent separate", () => {
    // arrange
    const request = {
      email: "woman@example.com",
      idempotencyKey: "d744ad8e-632c-4dfe-ac70-033bd3221522",
      marketingConsent: "false",
      productSlugs: '["hormone-harmony","nutrition-guide"]',
      termsAccepted: "true",
    };

    // act
    const result = storeAcquisitionRequestSchema.parse(request);

    // assert
    expect(result).toEqual({
      email: "woman@example.com",
      idempotencyKey: request.idempotencyKey,
      marketingConsent: false,
      productSlugs: ["hormone-harmony", "nutrition-guide"],
      termsAccepted: true,
    });
  });

  it("rejects acquisition without current Terms acceptance", () => {
    // arrange
    const request = {
      email: "woman@example.com",
      idempotencyKey: "d744ad8e-632c-4dfe-ac70-033bd3221522",
      marketingConsent: "false",
      productSlugs: '["hormone-harmony"]',
      termsAccepted: "false",
    };

    // act
    const result = storeAcquisitionRequestSchema.safeParse(request);

    // assert
    expect(result.success).toBe(false);
    if (result.success) {
      throw new Error("Expected Terms validation to fail.");
    }
    expect(result.error.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          message: "Accept the Terms & Conditions to continue.",
          path: ["termsAccepted"],
        }),
      ]),
    );
  });

  it("parses the privacy-preserving acquisition response union", () => {
    // arrange
    const response = {
      success: false,
      error: {
        code: "unavailable_products",
        message: "Review your updated cart and try again.",
        availableProductSlugs: ["hormone-harmony"],
      },
    };

    // act
    const result = storeAcquisitionResponseSchema.parse(response);

    // assert
    expect(result).toEqual(response);
  });

  it("requires a non-empty download token", () => {
    // arrange
    // act
    const empty = storeDownloadRequestSchema.safeParse({ token: "" });
    const present = storeDownloadRequestSchema.safeParse({
      token: "raw-download-token",
    });

    // assert
    expect(empty.success).toBe(false);
    expect(present.success).toBe(true);
  });
});
