import type { WaitlistEntries } from "@eli-coach-platform/domain/waitlist";
import type { DatabaseClient } from "@eli-coach-platform/db";
import { describe, expect, it, vi } from "vitest";
import { PostgresWaitlistRepository } from "./repository.server";

const regularPricingSignup = {
  consentVersions: {
    privacyPolicyVersion: "privacy-policy-test-v1",
    marketingConsentVersion: "marketing-consent-test-v1",
  },
  normalizedEmail: "eli@example.com",
  offer: {
    campaignSlug: "all-bundles-launch-1",
    plan: "all-bundles",
  },
} satisfies Parameters<WaitlistEntries["registerRegularPricingSignup"]>[0];
const reducedPricingSignup = {
  ...regularPricingSignup,
  cap: 10,
} satisfies Parameters<WaitlistEntries["registerReducedPricingSignup"]>[0];

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

describe("PostgresWaitlistRepository registration", () => {
  it("returns a reduced registration result without capacity metadata", async () => {
    // arrange
    const execute = vi
      .fn()
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ entryCount: 0 }] })
      .mockResolvedValueOnce({ rows: [] });
    const transaction = vi.fn((registration) => registration({ execute }));
    const repository = new PostgresWaitlistRepository(
      createDatabaseWithTransaction(transaction),
    );

    // act
    const result =
      await repository.registerReducedPricingSignup(reducedPricingSignup);

    // assert
    expect(result).toEqual({ status: "registered" });
  });

  it("returns status-only when a reduced pricing signup already exists", async () => {
    // arrange
    const execute = vi
      .fn()
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ id: 42 }] })
      .mockResolvedValueOnce({ rows: [] });
    const transaction = vi.fn((registration) => registration({ execute }));
    const repository = new PostgresWaitlistRepository(
      createDatabaseWithTransaction(transaction),
    );

    // act
    const result =
      await repository.registerReducedPricingSignup(reducedPricingSignup);

    // assert
    expect(result).toEqual({ status: "already_registered" });
  });

  it("returns status-only when a regular pricing signup already exists", async () => {
    // arrange
    const execute = vi
      .fn()
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ id: 42 }] })
      .mockResolvedValueOnce({ rows: [] });
    const transaction = vi.fn((registration) => registration({ execute }));
    const repository = new PostgresWaitlistRepository(
      createDatabaseWithTransaction(transaction),
    );

    // act
    const result =
      await repository.registerRegularPricingSignup(regularPricingSignup);

    // assert
    expect(result).toEqual({ status: "already_registered" });
  });
});

function createDatabaseWithTransaction(
  transaction: ReturnType<typeof vi.fn>,
): DatabaseClient {
  return { transaction } as unknown as DatabaseClient;
}

function createDatabaseWithCount(entryCount: number): DatabaseClient {
  const where = vi.fn().mockResolvedValue([{ entryCount }]);
  const from = vi.fn().mockReturnValue({ where });
  const select = vi.fn().mockReturnValue({ from });

  return { select } as unknown as DatabaseClient;
}
