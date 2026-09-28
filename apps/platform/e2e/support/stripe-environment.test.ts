import { afterEach, describe, expect, it, vi } from "vitest";

import { readStripeTestEnvironment } from "./stripe-environment";

describe("readStripeTestEnvironment", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("reports a placeholder secret key as a problem", () => {
    // arrange
    vi.stubEnv("STRIPE_SECRET_KEY", "replace-me");
    vi.stubEnv("STRIPE_WEBHOOK_SIGNING_SECRET", "whsec_e2e");

    // act
    const reading = readStripeTestEnvironment();

    // assert
    expect(reading).toEqual({
      problem: expect.stringContaining("STRIPE_SECRET_KEY"),
    });
  });

  it("reports a placeholder webhook signing secret as a problem", () => {
    // arrange
    vi.stubEnv("STRIPE_SECRET_KEY", "sk_test_e2e");
    vi.stubEnv("STRIPE_WEBHOOK_SIGNING_SECRET", "replace-me");

    // act
    const reading = readStripeTestEnvironment();

    // assert
    expect(reading).toEqual({
      problem: expect.stringContaining("STRIPE_WEBHOOK_SIGNING_SECRET"),
    });
  });

  it("reads test-mode keys as a ready environment", () => {
    // arrange
    vi.stubEnv("STRIPE_SECRET_KEY", "rk_test_e2e");
    vi.stubEnv("STRIPE_WEBHOOK_SIGNING_SECRET", "whsec_e2e");

    // act
    const reading = readStripeTestEnvironment();

    // assert
    expect(reading).toEqual({
      environment: {
        secretKey: "rk_test_e2e",
        webhookSigningSecret: "whsec_e2e",
      },
    });
  });
});
