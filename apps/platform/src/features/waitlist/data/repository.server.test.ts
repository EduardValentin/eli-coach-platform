import type { WaitlistRepository } from "@eli-coach-platform/domain";
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
} satisfies Parameters<WaitlistRepository["registerRegularPricingSignup"]>[0];
const reducedPricingSignup = {
  ...regularPricingSignup,
  cap: 10,
} satisfies Parameters<WaitlistRepository["registerReducedPricingSignup"]>[0];
const waitlistEntryIdentityConstraint =
  "waitlist_entries_email_offer_unique";

describe("PostgresWaitlistRepository availability observation", () => {
  it("returns the reduced pricing count before the availability cutoff", async () => {
    // arrange
    const repository = new PostgresWaitlistRepository(createDatabaseWithCount(4));

    // act
    const entryCount = await repository.countReducedPricingSignupsCreatedBefore({
      campaignSlug: "all-bundles-launch-1",
      createdBefore: new Date("2026-07-26T10:00:00.000Z"),
    });

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
      .mockResolvedValueOnce({ rows: [{ entryCount: 0 }] })
      .mockResolvedValueOnce({ rows: [] });
    const transaction = vi.fn((registration) => registration({ execute }));
    const repository = new PostgresWaitlistRepository(
      createDatabaseWithTransaction(transaction),
    );

    // act
    const result = await repository.registerReducedPricingSignup(reducedPricingSignup);

    // assert
    expect(result).toEqual({ status: "registered" });
  });

  it("returns status-only when a reduced pricing signup already exists", async () => {
    // arrange
    const execute = vi
      .fn()
      .mockResolvedValueOnce({ rows: [{ id: 42 }] })
      .mockResolvedValueOnce({ rows: [] });
    const transaction = vi.fn((registration) => registration({ execute }));
    const repository = new PostgresWaitlistRepository(
      createDatabaseWithTransaction(transaction),
    );

    // act
    const result = await repository.registerReducedPricingSignup(reducedPricingSignup);

    // assert
    expect(result).toEqual({ status: "already_registered" });
  });

  it("returns status-only when a regular pricing signup already exists", async () => {
    // arrange
    const execute = vi
      .fn()
      .mockResolvedValueOnce({ rows: [{ id: 42 }] })
      .mockResolvedValueOnce({ rows: [] });
    const transaction = vi.fn((registration) => registration({ execute }));
    const repository = new PostgresWaitlistRepository(
      createDatabaseWithTransaction(transaction),
    );

    // act
    const result = await repository.registerRegularPricingSignup(regularPricingSignup);

    // assert
    expect(result).toEqual({ status: "already_registered" });
  });

  it("retries a serialization failure in a fresh transaction", async () => {
    // arrange
    const transaction = vi
      .fn()
      .mockRejectedValueOnce(createDatabaseError({ code: "40001" }))
      .mockResolvedValueOnce({ status: "registered" });
    const repository = new PostgresWaitlistRepository(
      createDatabaseWithTransaction(transaction),
    );

    // act
    const result =
      await repository.registerRegularPricingSignup(regularPricingSignup);

    // assert
    expect(result).toEqual({ status: "registered" });
    expect(transaction).toHaveBeenCalledTimes(2);
  });

  it("retries a same-key unique race in a fresh transaction", async () => {
    // arrange
    const uniqueViolation = createDatabaseError({
      code: "23505",
      constraint: waitlistEntryIdentityConstraint,
    });
    const wrappedUniqueViolation = createDatabaseError({
      constraint: "wrapper_constraint",
      cause: uniqueViolation,
    });
    const transaction = vi
      .fn()
      .mockRejectedValueOnce(wrappedUniqueViolation)
      .mockResolvedValueOnce({
        status: "already_registered",
      });
    const repository = new PostgresWaitlistRepository(
      createDatabaseWithTransaction(transaction),
    );

    // act
    const result =
      await repository.registerRegularPricingSignup(regularPricingSignup);

    // assert
    expect(result).toEqual({ status: "already_registered" });
    expect(transaction).toHaveBeenCalledTimes(2);
  });

  it("stops after the maximum serialization failure attempts", async () => {
    // arrange
    const serializationError = createDatabaseError({ code: "40001" });
    const transaction = vi.fn().mockRejectedValue(serializationError);
    const repository = new PostgresWaitlistRepository(
      createDatabaseWithTransaction(transaction),
    );

    // act
    const result =
      repository.registerRegularPricingSignup(regularPricingSignup);

    // assert
    await expect(result).rejects.toBe(serializationError);
    expect(transaction).toHaveBeenCalledTimes(3);
  });

  it("stops after the maximum same-key unique race attempts", async () => {
    // arrange
    const uniqueViolation = createDatabaseError({
      code: "23505",
      constraint: waitlistEntryIdentityConstraint,
    });
    const transaction = vi.fn().mockRejectedValue(uniqueViolation);
    const repository = new PostgresWaitlistRepository(
      createDatabaseWithTransaction(transaction),
    );

    // act
    const result =
      repository.registerRegularPricingSignup(regularPricingSignup);

    // assert
    await expect(result).rejects.toBe(uniqueViolation);
    expect(transaction).toHaveBeenCalledTimes(3);
  });

  it("does not retry an unrelated unique violation", async () => {
    // arrange
    const unrelatedUniqueViolation = createDatabaseError({
      code: "23505",
      constraint: "waitlist_entries_pkey",
    });
    const transaction = vi.fn().mockRejectedValue(unrelatedUniqueViolation);
    const repository = new PostgresWaitlistRepository(
      createDatabaseWithTransaction(transaction),
    );

    // act
    const result =
      repository.registerRegularPricingSignup(regularPricingSignup);

    // assert
    await expect(result).rejects.toBe(unrelatedUniqueViolation);
    expect(transaction).toHaveBeenCalledTimes(1);
  });

  it("does not retry a nested unrelated unique violation", async () => {
    // arrange
    const unrelatedUniqueViolation = createDatabaseError({
      code: "23505",
      constraint: "waitlist_entries_pkey",
    });
    const wrappedUniqueViolation = createDatabaseError({
      cause: unrelatedUniqueViolation,
    });
    const transaction = vi.fn().mockRejectedValue(wrappedUniqueViolation);
    const repository = new PostgresWaitlistRepository(
      createDatabaseWithTransaction(transaction),
    );

    // act
    const result =
      repository.registerRegularPricingSignup(regularPricingSignup);

    // assert
    await expect(result).rejects.toBe(wrappedUniqueViolation);
    expect(transaction).toHaveBeenCalledTimes(1);
  });

  it("does not combine a unique code and constraint from different errors", async () => {
    // arrange
    const splitConstraint = createDatabaseError({
      constraint: waitlistEntryIdentityConstraint,
    });
    const splitUniqueViolation = createDatabaseError({
      code: "23505",
      cause: splitConstraint,
    });
    const transaction = vi.fn().mockRejectedValue(splitUniqueViolation);
    const repository = new PostgresWaitlistRepository(
      createDatabaseWithTransaction(transaction),
    );

    // act
    const result =
      repository.registerRegularPricingSignup(regularPricingSignup);

    // assert
    await expect(result).rejects.toBe(splitUniqueViolation);
    expect(transaction).toHaveBeenCalledTimes(1);
  });

  it("does not retry a non-retryable database error", async () => {
    // arrange
    const foreignKeyViolation = createDatabaseError({ code: "23503" });
    const transaction = vi.fn().mockRejectedValue(foreignKeyViolation);
    const repository = new PostgresWaitlistRepository(
      createDatabaseWithTransaction(transaction),
    );

    // act
    const result =
      repository.registerRegularPricingSignup(regularPricingSignup);

    // assert
    await expect(result).rejects.toBe(foreignKeyViolation);
    expect(transaction).toHaveBeenCalledTimes(1);
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

function createDatabaseError(options: {
  code?: string;
  constraint?: string;
  cause?: unknown;
}): Error & { code?: string; constraint?: string; cause?: unknown } {
  return Object.assign(
    new Error(`Database error ${options.code ?? "wrapper"}`),
    options,
  );
}
