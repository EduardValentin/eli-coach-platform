import type { SQL } from "drizzle-orm";
import { PgDialect } from "drizzle-orm/pg-core";
import { describe, expect, it, vi } from "vitest";

import type { DatabaseClient } from "~/shared/database";

import { PostgresDownloadGrantRepository } from "./postgres-download-grant-repository.server";

describe("PostgresDownloadGrantRepository", () => {
  it("groups every pinned product version with its type labels and assets in grant order", async () => {
    // arrange
    const execute = vi.fn().mockResolvedValue({
      rows: [
        {
          grantId: 19,
          grantStatus: "active",
          expiresAt: "2026-08-06T12:00:00.000Z",
          productSlug: "hormone-harmony",
          productTitle: "Hormone Harmony",
          productTypeLabels: ["E-Books", "Nutrition Plans"],
          productVersionId: 11,
          assetKey: "products/hormone-harmony.pdf",
          customerFilename: "hormone-harmony.pdf",
          mimeType: "application/pdf",
          sizeBytes: 128,
          sha256: "a".repeat(64),
        },
      ],
    });
    const postgresDownloadGrantRepository = new PostgresDownloadGrantRepository(
      {
        execute,
      } as unknown as DatabaseClient,
    );

    // act
    const grant = await postgresDownloadGrantRepository.findByTokenSha256(
      "b".repeat(64),
    );

    // assert
    expect(grant).toEqual({
      id: 19,
      status: "active",
      expiresAt: new Date("2026-08-06T12:00:00.000Z"),
      items: [
        {
          productSlug: "hormone-harmony",
          productTitle: "Hormone Harmony",
          productTypeLabels: ["E-Books", "Nutrition Plans"],
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

  it("revokes the order's active grant and leaves every other grant alone", async () => {
    // arrange
    const execute = vi.fn().mockResolvedValue({ rows: [] });
    const postgresDownloadGrantRepository = new PostgresDownloadGrantRepository(
      {
        execute,
      } as unknown as DatabaseClient,
    );

    // act
    await postgresDownloadGrantRepository.revokeForOrder("order-1");

    // assert
    const [[statement]] = execute.mock.calls as [[SQL]];
    const query = new PgDialect().sqlToQuery(statement);
    expect(query.sql.replace(/\s+/g, " ").trim()).toBe(
      "update app.download_grants set status = 'revoked' where order_id = $1 and status = 'active'",
    );
    expect(query.params).toEqual(["order-1"]);
  });
});
