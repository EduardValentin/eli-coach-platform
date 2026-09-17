import { InMemoryProductEmail } from "@eli-coach-platform/infrastructure/email/server";
import { describe, expect, it } from "vitest";

import { createProductDelivery } from "./create-product-delivery.server";
import { EmailProductDelivery } from "./email-product-delivery.server";

describe("createProductDelivery", () => {
  it("returns the email product delivery", () => {
    // arrange
    const productEmail = new InMemoryProductEmail();

    // act
    const delivery = createProductDelivery(productEmail, {
      appBasePath: "/",
      contactEmail: "contact@evoa.fit",
      publicAppUrl: "https://eli.example",
    });

    // assert
    expect(delivery).toBeInstanceOf(EmailProductDelivery);
  });

  it("delivers through the injected product email port", async () => {
    // arrange
    const productEmail = new InMemoryProductEmail();
    const delivery = createProductDelivery(productEmail, {
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
