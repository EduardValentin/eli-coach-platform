import { describe, expect, it, vi } from "vitest";

import type { DatabaseClient } from "@eli-coach-platform/db";

import { PostgresStoreRecipientOwnershipRepository } from "./recipient-ownership-repository.server";

const ACCOUNT_ID = "3f1d6b0e-2c5a-4a9f-8f2e-6d0b7c1a4e93";

function buildRepository(
  claimedRows: readonly { id: number }[],
): PostgresStoreRecipientOwnershipRepository {
  return new PostgresStoreRecipientOwnershipRepository({
    execute: vi.fn().mockResolvedValue({ rows: claimedRows }),
  } as unknown as DatabaseClient);
}

describe("PostgresStoreRecipientOwnershipRepository", () => {
  it("counts the recipients the claim actually took", async () => {
    // arrange
    const repository = buildRepository([{ id: 4 }, { id: 9 }]);

    // act
    const claimed = await repository.claimUnclaimedRecipients({
      accountId: ACCOUNT_ID,
      deliveryLimitKeys: ["woman@example.com", "second@example.com"],
    });

    // assert
    expect(claimed).toBe(2);
  });

  it("reports no claim when every matching recipient already belongs to an account", async () => {
    // arrange
    const repository = buildRepository([]);

    // act
    const claimed = await repository.claimUnclaimedRecipients({
      accountId: ACCOUNT_ID,
      deliveryLimitKeys: ["woman@example.com"],
    });

    // assert
    expect(claimed).toBe(0);
  });
});
