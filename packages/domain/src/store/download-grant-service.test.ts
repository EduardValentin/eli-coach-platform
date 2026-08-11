import { describe, expect, it, vi } from "vitest";

import {
  DownloadGrantService,
  type DownloadGrant,
  type DownloadGrantRepository,
} from "./index";

const now = new Date("2026-07-30T12:00:00.000Z");
const activeGrant = {
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
} satisfies DownloadGrant;

function createRepository(grant: DownloadGrant | null): DownloadGrantRepository {
  return {
    findByTokenSha256: vi.fn().mockResolvedValue(grant),
  };
}

describe("DownloadGrantService", () => {
  it("resolves the exact pinned assets without extending a reusable grant", async () => {
    // arrange
    const repository = createRepository(activeGrant);
    const service = new DownloadGrantService({
      clock: { now: () => now },
      repository,
      tokenHasher: { sha256: () => "b".repeat(64) },
    });

    // act
    const firstResult = await service.resolve("raw-token");
    const secondResult = await service.resolve("raw-token");

    // assert
    expect(firstResult).toEqual({ status: "available", grant: activeGrant });
    expect(secondResult).toEqual(firstResult);
    expect(repository.findByTokenSha256).toHaveBeenCalledTimes(2);
  });

  it.each([
    ["missing", null],
    ["revoked", { ...activeGrant, status: "revoked" as const }],
    [
      "expired",
      {
        ...activeGrant,
        expiresAt: new Date("2026-07-30T11:59:59.999Z"),
      },
    ],
  ])("returns the same privacy-safe result for a %s grant", async (_label, grant) => {
    // arrange
    const service = new DownloadGrantService({
      clock: { now: () => now },
      repository: createRepository(grant),
      tokenHasher: { sha256: () => "b".repeat(64) },
    });

    // act
    const result = await service.resolve("raw-token");

    // assert
    expect(result).toEqual({ status: "unavailable" });
  });
});
