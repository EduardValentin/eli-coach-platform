import { describe, expect, it, vi } from "vitest";

import { DownloadGrant } from "./download-grant";
import type { DownloadGrants } from "./download-grants";
import { ResolveDownloadGrantUseCase } from "./resolve-download-grant-use-case";

const now = new Date("2026-07-30T12:00:00.000Z");
const activeGrant = DownloadGrant.reconstitute({
  id: 19,
  status: "active",
  expiresAt: new Date("2026-08-06T12:00:00.000Z"),
  items: [
    {
      productSlug: "hormone-harmony",
      productTitle: "Hormone Harmony",
      productVersionId: 11,
      assets: [
        {
          assetKey: "products/hormone-harmony.pdf",
          customerFilename: "hormone-harmony.pdf",
          mimeType: "application/pdf",
          sizeBytes: 128,
          sha256: "a".repeat(64),
        },
      ],
    },
  ],
});

function createDownloadGrants(grant: DownloadGrant | null): DownloadGrants {
  return {
    findByTokenSha256: vi.fn().mockResolvedValue(grant),
  };
}

describe("ResolveDownloadGrantUseCase", () => {
  it("resolves the exact pinned assets without extending a reusable grant", async () => {
    // arrange
    const downloadGrants = createDownloadGrants(activeGrant);
    const useCase = new ResolveDownloadGrantUseCase({
      clock: { now: () => now },
      downloadGrants,
      tokenHasher: { sha256: () => "b".repeat(64) },
    });

    // act
    const firstResult = await useCase.execute("raw-token");
    const secondResult = await useCase.execute("raw-token");

    // assert
    expect(firstResult).toEqual({
      status: "available",
      delivery: { kind: "single", asset: activeGrant.items[0]!.assets[0] },
      grant: activeGrant,
    });
    expect(secondResult).toEqual(firstResult);
    expect(downloadGrants.findByTokenSha256).toHaveBeenCalledTimes(2);
  });

  it.each([
    ["missing", null],
    [
      "revoked",
      DownloadGrant.reconstitute({
        id: activeGrant.id,
        status: "revoked",
        expiresAt: activeGrant.expiresAt,
        items: activeGrant.items,
      }),
    ],
    [
      "expired",
      DownloadGrant.reconstitute({
        id: activeGrant.id,
        status: activeGrant.status,
        expiresAt: new Date("2026-07-30T11:59:59.999Z"),
        items: activeGrant.items,
      }),
    ],
  ])(
    "returns the same privacy-safe result for a %s grant",
    async (_label, grant) => {
      // arrange
      const useCase = new ResolveDownloadGrantUseCase({
        clock: { now: () => now },
        downloadGrants: createDownloadGrants(grant),
        tokenHasher: { sha256: () => "b".repeat(64) },
      });

      // act
      const result = await useCase.execute("raw-token");

      // assert
      expect(result).toEqual({ status: "unavailable" });
    },
  );

  it("returns an unavailable result for an empty raw token", async () => {
    // arrange
    const downloadGrants = createDownloadGrants(activeGrant);
    const useCase = new ResolveDownloadGrantUseCase({
      clock: { now: () => now },
      downloadGrants,
      tokenHasher: { sha256: () => "b".repeat(64) },
    });

    // act
    const result = await useCase.execute("   ");

    // assert
    expect(result).toEqual({ status: "unavailable" });
    expect(downloadGrants.findByTokenSha256).not.toHaveBeenCalled();
  });
});
