import type { DatabaseClient } from "@eli-coach-platform/db";
import { describe, expect, it, vi } from "vitest";
import { PostgresWaitlistRepository } from "./repository.server";

describe("PostgresWaitlistRepository availability observation", () => {
  it("returns the reduced pricing count before the availability cutoff", async () => {
    // arrange
    const repository = new PostgresWaitlistRepository(
      createDatabaseWithCount(4),
    );

    // act
    const entryCount = await repository.countReducedPricingSignupsCreatedBefore(
      {
        campaignSlug: "all-bundles-launch-1",
        createdBefore: new Date("2026-07-26T10:00:00.000Z"),
      },
    );

    // assert
    expect(entryCount).toBe(4);
  });
});

function createDatabaseWithCount(entryCount: number): DatabaseClient {
  const where = vi.fn().mockResolvedValue([{ entryCount }]);
  const from = vi.fn().mockReturnValue({ where });
  const select = vi.fn().mockReturnValue({ from });

  return { select } as unknown as DatabaseClient;
}
