import type { ProductEmailConfig } from "~/shared/email/product-email-config";
import { describe, expect, it } from "vitest";

import { createProductEmailAdapter } from "./create-product-email-adapter.server";
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

describe("createProductEmailAdapter", () => {
  it("returns an in-memory double for the memory provider", () => {
    // arrange
    const config = createConfig({ PRODUCT_EMAIL_PROVIDER: "memory" });

    // act
    const productEmailPort = createProductEmailAdapter(config);

    // assert
    expect(productEmailPort).toBeInstanceOf(InMemoryProductEmailAdapter);
  });

  it("returns the Resend adapter for the resend provider", () => {
    // arrange
    const config = createConfig({
      PRODUCT_EMAIL_PROVIDER: "resend",
      RESEND_API_KEY: "re_123",
    });

    // act
    const productEmailPort = createProductEmailAdapter(config);

    // assert
    expect(productEmailPort).toBeInstanceOf(ResendProductEmailAdapter);
    expect(productEmailPort.provider).toBe("resend");
  });
});
