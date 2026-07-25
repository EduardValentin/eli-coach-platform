import type { WaitlistRepository } from "@eli-coach-platform/domain";
import { describe, expect, it, vi } from "vitest";
import type { DatabaseClient } from "../database-client";
import { PostgresWaitlistRepository } from "./postgres-waitlist-repository";

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

describe("PostgresWaitlistRepository registration retries", () => {
  it("retries a serialization failure in a fresh transaction", async () => {
    // arrange
    const transaction = vi
      .fn()
      .mockRejectedValueOnce(createDatabaseError("40001"))
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
    const transaction = vi
      .fn()
      .mockRejectedValueOnce(createDatabaseError("23505"))
      .mockResolvedValueOnce({
        pricing: "regular",
        status: "already_registered",
      });
    const repository = new PostgresWaitlistRepository(
      createDatabaseWithTransaction(transaction),
    );

    // act
    const result =
      await repository.registerRegularPricingSignup(regularPricingSignup);

    // assert
    expect(result).toEqual({
      pricing: "regular",
      status: "already_registered",
    });
    expect(transaction).toHaveBeenCalledTimes(2);
  });

  it("stops after the maximum serialization failure attempts", async () => {
    // arrange
    const serializationError = createDatabaseError("40001");
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
    const uniqueViolation = createDatabaseError("23505");
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

  it("does not retry a non-retryable database error", async () => {
    // arrange
    const foreignKeyViolation = createDatabaseError("23503");
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

function createDatabaseError(code: string): Error & { code: string } {
  return Object.assign(new Error(`Database error ${code}`), { code });
}
