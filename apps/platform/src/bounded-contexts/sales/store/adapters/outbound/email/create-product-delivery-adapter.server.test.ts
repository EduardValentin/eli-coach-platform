import { InMemoryProductEmailAdapter } from "~/shared/email/index.server";
import { describe, expect, it } from "vitest";

import { createProductDeliveryAdapter } from "./create-product-delivery-adapter.server";
import { EmailProductDeliveryAdapter } from "./email-product-delivery-adapter.server";

describe("createProductDeliveryAdapter", () => {
  it("returns the email product delivery", () => {
    // arrange
    const inMemoryProductEmailAdapter = new InMemoryProductEmailAdapter();

    // act
    const productDeliveryPort = createProductDeliveryAdapter(
      inMemoryProductEmailAdapter,
      {
        appBasePath: "/",
        contactEmail: "contact@evoa.fit",
        publicAppUrl: "https://eli.example",
      },
    );

    // assert
    expect(productDeliveryPort).toBeInstanceOf(EmailProductDeliveryAdapter);
  });

  it("delivers through the injected product email port", async () => {
    // arrange
    const inMemoryProductEmailAdapter = new InMemoryProductEmailAdapter();
    const productDeliveryPort = createProductDeliveryAdapter(
      inMemoryProductEmailAdapter,
      {
        appBasePath: "/",
        contactEmail: "contact@evoa.fit",
        publicAppUrl: "https://eli.example",
      },
    );

    // act
    const result = await productDeliveryPort.deliver({
      email: "woman@example.com",
      idempotencyKey: "store-acquisition-unit-test",
      rawToken: "opaque-token",
      resources: [{ title: "Hormone Harmony", typeLabels: ["E-Books"] }],
      requestedAt: new Date("2026-07-30T12:00:00.000Z"),
      requestId: 31,
    });

    // assert
    expect(inMemoryProductEmailAdapter.sent).toHaveLength(1);
    expect(result).toEqual({
      kind: "delivered",
      provider: "memory",
      providerMessageId: "memory-1",
    });
  });
});
