import { InMemoryProductEmailAdapter } from "~/shared/email/index.server";
import { describe, expect, it } from "vitest";

import { createProductDeliveryAdapter } from "./create-product-delivery-adapter.server";
import { EmailProductDeliveryAdapter } from "./email-product-delivery-adapter.server";

describe("createProductDelivery", () => {
  it("returns the email product delivery", () => {
    // arrange
    const productEmail = new InMemoryProductEmailAdapter();

    // act
    const delivery = createProductDeliveryAdapter(productEmail, {
      appBasePath: "/",
      contactEmail: "contact@evoa.fit",
      publicAppUrl: "https://eli.example",
    });

    // assert
    expect(delivery).toBeInstanceOf(EmailProductDeliveryAdapter);
  });

  it("delivers through the injected product email port", async () => {
    // arrange
    const productEmail = new InMemoryProductEmailAdapter();
    const delivery = createProductDeliveryAdapter(productEmail, {
      appBasePath: "/",
      contactEmail: "contact@evoa.fit",
      publicAppUrl: "https://eli.example",
    });

    // act
    const result = await delivery.deliver({
      email: "woman@example.com",
      idempotencyKey: "store-acquisition-unit-test",
      rawToken: "opaque-token",
      resources: [{ title: "Hormone Harmony", typeLabels: ["E-Books"] }],
      requestedAt: new Date("2026-07-30T12:00:00.000Z"),
      requestId: 31,
    });

    // assert
    expect(productEmail.sent).toHaveLength(1);
    expect(result).toEqual({
      kind: "delivered",
      provider: "memory",
      providerMessageId: "memory-1",
    });
  });
});
