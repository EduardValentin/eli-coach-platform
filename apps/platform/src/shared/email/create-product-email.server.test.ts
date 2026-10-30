import type { ProductEmailConfig } from "~/shared/email/product-email-config";
import { describe, expect, it } from "vitest";

import { createProductEmail } from "./create-product-email.server";
import { InMemoryProductEmailAdapter } from "./in-memory-product-email-adapter.server";
import { ResendProductEmailAdapter } from "./resend-product-email-adapter.server";

function createConfig(
  overrides: Partial<ProductEmailConfig> = {},
): ProductEmailConfig {
  return {
    PRODUCT_EMAIL_FROM_ADDRESS: "contact@evoa.fit",
    PRODUCT_EMAIL_FROM_NAME: "Evoa",
    PRODUCT_EMAIL_PROVIDER: "memory",
    PRODUCT_EMAIL_REPLY_TO: "contact@evoa.fit",
    ...overrides,
  };
}

describe("createProductEmail", () => {
  it("returns an in-memory double for the memory provider", () => {
    // arrange
    const config = createConfig({ PRODUCT_EMAIL_PROVIDER: "memory" });

    // act
    const productEmail = createProductEmail(config);

    // assert
    expect(productEmail).toBeInstanceOf(InMemoryProductEmailAdapter);
  });

  it("returns the Resend adapter for the resend provider", () => {
    // arrange
    const config = createConfig({
      PRODUCT_EMAIL_PROVIDER: "resend",
      RESEND_API_KEY: "re_123",
    });

    // act
    const productEmail = createProductEmail(config);

    // assert
    expect(productEmail).toBeInstanceOf(ResendProductEmailAdapter);
    expect(productEmail.provider).toBe("resend");
  });
});
