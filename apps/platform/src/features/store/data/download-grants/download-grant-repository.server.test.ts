import { describe, expect, it, vi } from "vitest";

import type { DatabaseClient } from "@eli-coach-platform/db";

import { PostgresDownloadGrantRepository } from "./download-grant-repository.server";

describe("PostgresDownloadGrantRepository", () => {
  it("groups every pinned product version and asset in grant order", async () => {
    // arrange
    const execute = vi.fn().mockResolvedValue({
      rows: [
        {
          grantId: 19,
          grantStatus: "active",
          expiresAt: "2026-08-06T12:00:00.000Z",
          productSlug: "hormone-harmony",
          productTitle: "Hormone Harmony",
          productVersionId: 11,
          assetKey: "products/hormone-harmony.pdf",
          customerFilename: "hormone-harmony.pdf",
          mimeType: "application/pdf",
          sizeBytes: 128,
          sha256: "a".repeat(64),
        },
      ],
    });
    const repository = new PostgresDownloadGrantRepository({
      execute,
    } as unknown as DatabaseClient);

    // act
    const grant = await repository.findByTokenSha256("b".repeat(64));

    // assert
    expect(grant).toEqual({
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
  });
});
