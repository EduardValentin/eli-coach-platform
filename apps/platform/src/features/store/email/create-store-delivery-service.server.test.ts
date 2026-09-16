import { InMemoryProductEmail } from "@eli-coach-platform/infrastructure/email/server";
import { describe, expect, it } from "vitest";

import { createStoreDeliveryService } from "./create-store-delivery-service.server";
import { EmailStoreDeliveryService } from "./email-store-delivery-service.server";

describe("createStoreDeliveryService", () => {
  it("returns the email store delivery service", () => {
    // arrange
    const productEmail = new InMemoryProductEmail();

    // act
    const service = createStoreDeliveryService(productEmail, {
      appBasePath: "/",
      contactEmail: "contact@evoa.fit",
      publicAppUrl: "https://eli.example",
    });

    // assert
    expect(service).toBeInstanceOf(EmailStoreDeliveryService);
  });

  it("delivers through the injected product email port", async () => {
    // arrange
    const productEmail = new InMemoryProductEmail();
    const service = createStoreDeliveryService(productEmail, {
      appBasePath: "/",
      contactEmail: "contact@evoa.fit",
      publicAppUrl: "https://eli.example",
    });

    // act
    const result = await service.deliver({
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
