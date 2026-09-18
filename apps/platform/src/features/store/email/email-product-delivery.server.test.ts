import { describe, expect, it, vi } from "vitest";

import type { ProductEmail } from "@eli-coach-platform/infrastructure/email/server";

import { EmailProductDelivery } from "./email-product-delivery.server";

describe("EmailProductDelivery", () => {
  it("sends a single download action with a provider idempotency key", async () => {
    // arrange
    const productEmail = {
      provider: "resend",
      send: vi.fn().mockResolvedValue({
        kind: "sent",
        providerMessageId: "email_123",
      }),
    } satisfies ProductEmail;
    const delivery = new EmailProductDelivery(productEmail, {
      appBasePath: "/",
      contactEmail: "contact@evoa.fit",
      publicAppUrl: "https://eli.example",
    });
    const providerIdempotencyKey = delivery.createProviderIdempotencyKey(
      "d744ad8e-632c-4dfe-ac70-033bd3221522",
    );

    // act
    const result = await delivery.deliver({
      email: "woman@example.com",
      idempotencyKey: providerIdempotencyKey,
      rawToken: "opaque-token",
      resources: [
        {
          title: "Hormone Harmony",
          typeLabels: ["E-Books"],
        },
      ],
      requestedAt: new Date("2026-07-30T12:00:00.000Z"),
      requestId: 31,
    });

    // assert
    expect(productEmail.send).toHaveBeenCalledWith(
      expect.objectContaining({
        idempotencyKey: providerIdempotencyKey,
        to: "woman@example.com",
        html: expect.stringContaining(
          "https://eli.example/store/download#opaque-token",
        ),
      }),
    );
    expect(result).toEqual({
      kind: "delivered",
      provider: "resend",
      providerMessageId: "email_123",
    });
  });

  it("reproduces the complete provider command for a technical replay", async () => {
    // arrange
    const productEmail = {
      provider: "resend",
      send: vi.fn().mockResolvedValue({
        kind: "sent",
        providerMessageId: "email_123",
      }),
    } satisfies ProductEmail;
    const delivery = new EmailProductDelivery(productEmail, {
      appBasePath: "/eli",
      contactEmail: "contact@evoa.fit",
      publicAppUrl: "https://eli.example",
    });
    const command = {
      email: "woman@example.com",
      idempotencyKey: "store-acquisition-d744ad8e-632c-4dfe-ac70-033bd3221522",
      resources: [
        {
          title: "Nutrition Foundations",
          typeLabels: ["Nutrition Plans"],
        },
        {
          title: "Hormone Harmony",
          typeLabels: ["E-Books"],
        },
      ],
      rawToken: "opaque-token",
      requestedAt: new Date("2026-12-31T23:59:59.000Z"),
      requestId: 31,
    };

    // act
    await delivery.deliver(command);
    await delivery.deliver(command);

    // assert
    const [firstCommand, replayCommand] = productEmail.send.mock.calls.map(
      ([sentCommand]) => sentCommand,
    );
    expect(replayCommand).toEqual(firstCommand);
    expect(firstCommand).toMatchObject({
      html: expect.stringContaining("Nutrition Foundations"),
      idempotencyKey: "store-acquisition-d744ad8e-632c-4dfe-ac70-033bd3221522",
      text: expect.stringContaining(
        "- Nutrition Foundations — Nutrition Plans",
      ),
    });
    expect(firstCommand.html).toContain("© 2026");
  });

  it.each([
    {
      delivery: { kind: "rejected", reason: "validation_error" },
      scenario: "a definitive provider rejection",
    },
    {
      delivery: { kind: "unconfirmed" },
      scenario: "an unconfirmed provider outcome",
    },
  ])("carries $scenario through unchanged", async ({ delivery }) => {
    // arrange
    const productEmail = {
      provider: "resend",
      send: vi.fn().mockResolvedValue(delivery),
    } satisfies ProductEmail;
    const productDelivery = new EmailProductDelivery(productEmail, {
      appBasePath: "/",
      contactEmail: "contact@evoa.fit",
      publicAppUrl: "https://eli.example",
    });

    // act
    const result = await productDelivery.deliver({
      email: "woman@example.com",
      idempotencyKey: "store-acquisition-d744ad8e-632c-4dfe-ac70-033bd3221522",
      rawToken: "opaque-token",
      resources: [
        {
          title: "Hormone Harmony",
          typeLabels: ["E-Books"],
        },
      ],
      requestedAt: new Date("2026-07-30T12:00:00.000Z"),
      requestId: 31,
    });

    // assert
    expect(result).toEqual(delivery);
  });

  it("preserves transport failures as ambiguous delivery failures", async () => {
    // arrange
    const transportFailure = new Error("connection reset");
    const productEmail = {
      provider: "resend",
      send: vi.fn().mockRejectedValue(transportFailure),
    } satisfies ProductEmail;
    const delivery = new EmailProductDelivery(productEmail, {
      appBasePath: "/",
      contactEmail: "contact@evoa.fit",
      publicAppUrl: "https://eli.example",
    });

    // act
    const failedDelivery = delivery.deliver({
      email: "woman@example.com",
      idempotencyKey: "store-acquisition-d744ad8e-632c-4dfe-ac70-033bd3221522",
      rawToken: "opaque-token",
      resources: [
        {
          title: "Hormone Harmony",
          typeLabels: ["E-Books"],
        },
      ],
      requestedAt: new Date("2026-07-30T12:00:00.000Z"),
      requestId: 31,
    });

    // assert
    await expect(failedDelivery).rejects.toBe(transportFailure);
  });
});
