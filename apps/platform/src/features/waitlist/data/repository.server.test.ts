import type { DatabaseClient } from "@eli-coach-platform/db";
import { describe, expect, it, vi } from "vitest";
import { PostgresWaitlistRepository } from "./repository.server";

type TierEmail = Parameters<PostgresWaitlistRepository["tierForEmail"]>[0];

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

describe("PostgresWaitlistRepository pricing eligibility", () => {
  it("prices an email holding a reduced allocation in any campaign at the reduced tier", async () => {
    // arrange
    const database = createDatabaseWithReducedAllocations([{ id: 7 }]);
    const repository = new PostgresWaitlistRepository(database.client);

    // act
    const tier = await repository.tierForEmail(emailOf("ana@example.com"));

    // assert
    expect(tier).toBe("reduced");
    expect(database.limit).toHaveBeenCalledWith(1);
  });

  it("prices an email without a reduced allocation at the regular tier", async () => {
    // arrange
    const database = createDatabaseWithReducedAllocations([]);
    const repository = new PostgresWaitlistRepository(database.client);

    // act
    const tier = await repository.tierForEmail(emailOf("ana@example.com"));

    // assert
    expect(tier).toBe("regular");
  });
});

function emailOf(value: string): TierEmail {
  return { value } as TierEmail;
}

function createDatabaseWithReducedAllocations(rows: readonly unknown[]) {
  const limit = vi.fn().mockResolvedValue(rows);
  const where = vi.fn().mockReturnValue({ limit });
  const from = vi.fn().mockReturnValue({ where });
  const select = vi.fn().mockReturnValue({ from });

  return { client: { select } as unknown as DatabaseClient, limit };
}

function createDatabaseWithCount(entryCount: number): DatabaseClient {
  const where = vi.fn().mockResolvedValue([{ entryCount }]);
  const from = vi.fn().mockReturnValue({ where });
  const select = vi.fn().mockReturnValue({ from });

  return { select } as unknown as DatabaseClient;
}
