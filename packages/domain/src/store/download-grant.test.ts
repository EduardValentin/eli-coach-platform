import { describe, expect, it } from "vitest";

import { isDownloadGrantActive, resolveGrantDelivery } from "./download-grant";
import type { DownloadGrant, ProductAsset } from "./models";

const asset: ProductAsset = {
  assetKey: "products/hormone-harmony.pdf",
  customerFilename: "hormone-harmony.pdf",
  mimeType: "application/pdf",
  sizeBytes: 128,
  sha256: "a".repeat(64),
};

const secondAsset: ProductAsset = {
  assetKey: "products/hormone-harmony-workbook.pdf",
  customerFilename: "hormone-harmony-workbook.pdf",
  mimeType: "application/pdf",
  sizeBytes: 256,
  sha256: "b".repeat(64),
};

function buildGrant(overrides: Partial<DownloadGrant>): DownloadGrant {
  return {
    id: 19,
    status: "active",
    expiresAt: new Date("2026-08-06T12:00:00.000Z"),
    items: [
      {
        productSlug: "hormone-harmony",
        productTitle: "Hormone Harmony",
        productVersionId: 11,
        assets: [asset],
      },
    ],
    ...overrides,
  };
}

const expiry = new Date("2026-08-06T12:00:00.000Z");

describe("isDownloadGrantActive", () => {
  it.each([
    [
      "one second before expiry",
      buildGrant({ expiresAt: expiry }),
      new Date("2026-08-06T11:59:59.000Z"),
      true,
    ],
    ["at expiry", buildGrant({ expiresAt: expiry }), expiry, false],
    [
      "revoked",
      buildGrant({ status: "revoked" }),
      new Date("2026-08-06T11:59:59.000Z"),
      false,
    ],
  ])("%s is %s", (_label, grant, now, expected) => {
    // arrange

    // act
    const isActive = isDownloadGrantActive(grant, now);

    // assert
    expect(isActive).toBe(expected);
  });
});

describe("resolveGrantDelivery", () => {
  it.each([
    ["no items", buildGrant({ items: [] }), { kind: "empty" }],
    [
      "one item with one asset",
      buildGrant({
        items: [
          {
            productSlug: "hormone-harmony",
            productTitle: "Hormone Harmony",
            productVersionId: 11,
            assets: [asset],
          },
        ],
      }),
      { kind: "single", asset },
    ],
    [
      "one item with two assets",
      buildGrant({
        items: [
          {
            productSlug: "hormone-harmony",
            productTitle: "Hormone Harmony",
            productVersionId: 11,
            assets: [asset, secondAsset],
          },
        ],
      }),
      { kind: "bundle", assets: [asset, secondAsset] },
    ],
    [
      "an item with zero assets",
      buildGrant({
        items: [
          {
            productSlug: "hormone-harmony",
            productTitle: "Hormone Harmony",
            productVersionId: 11,
            assets: [],
          },
        ],
      }),
      { kind: "empty" },
    ],
  ])("%s resolves to %o", (_label, grant, expected) => {
    // arrange

    // act
    const delivery = resolveGrantDelivery(grant);

    // assert
    expect(delivery).toEqual(expected);
  });
});
