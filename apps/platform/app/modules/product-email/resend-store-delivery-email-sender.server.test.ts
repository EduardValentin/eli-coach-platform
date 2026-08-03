import { describe, expect, it, vi } from "vitest";

import { StoreDeliveryRejectedError } from "@eli-coach-platform/domain";

import { ProductEmailRejectedError } from "./product-email-sender.server";
import { ResendStoreDeliveryEmailSender } from "./resend-store-delivery-email-sender.server";

describe("ResendStoreDeliveryEmailSender", () => {
  it("sends a single download action with a provider idempotency key", async () => {
    // arrange
    const productEmailSender = {
      sendEmail: vi.fn().mockResolvedValue({
        providerMessageId: "email_123",
      }),
    };
    const sender = new ResendStoreDeliveryEmailSender(productEmailSender, {
      appBasePath: "/",
      contactEmail: "contact@evoa.fit",
      publicAppUrl: "https://eli.example",
    });
    const providerIdempotencyKey = sender.createProviderIdempotencyKey(
      "d744ad8e-632c-4dfe-ac70-033bd3221522",
    );

    // act
    const result = await sender.sendDelivery({
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
    expect(productEmailSender.sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        idempotencyKey: providerIdempotencyKey,
        to: "woman@example.com",
        html: expect.stringContaining(
          "https://eli.example/store/download#opaque-token",
        ),
      }),
    );
    expect(result).toEqual({
      provider: "resend",
      providerMessageId: "email_123",
    });
  });

  it("reproduces the complete provider command for a technical replay", async () => {
    // arrange
    const productEmailSender = {
      sendEmail: vi.fn().mockResolvedValue({
        providerMessageId: "email_123",
      }),
    };
    const sender = new ResendStoreDeliveryEmailSender(productEmailSender, {
      appBasePath: "/eli",
      contactEmail: "contact@evoa.fit",
      publicAppUrl: "https://eli.example",
    });
    const command = {
      email: "woman@example.com",
      idempotencyKey:
        "store-acquisition-d744ad8e-632c-4dfe-ac70-033bd3221522",
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
    await sender.sendDelivery(command);
    await sender.sendDelivery(command);

    // assert
    const [firstCommand, replayCommand] =
      productEmailSender.sendEmail.mock.calls.map(([sentCommand]) =>
        sentCommand,
      );
    expect(replayCommand).toEqual(firstCommand);
    expect(firstCommand).toMatchObject({
      html: expect.stringContaining(
        "Nutrition Foundations",
      ),
      idempotencyKey:
        "store-acquisition-d744ad8e-632c-4dfe-ac70-033bd3221522",
      text: expect.stringContaining(
        "- Nutrition Foundations — Nutrition Plans",
      ),
    });
    expect(firstCommand.html).toContain("© 2026");
  });

  it("maps provider rejections to a definitive delivery rejection", async () => {
    // arrange
    const productEmailSender = {
      sendEmail: vi.fn().mockRejectedValue(new ProductEmailRejectedError()),
    };
    const sender = new ResendStoreDeliveryEmailSender(productEmailSender, {
      appBasePath: "/",
      contactEmail: "contact@evoa.fit",
      publicAppUrl: "https://eli.example",
    });

    // act
    const failedDelivery = sender.sendDelivery({
      email: "woman@example.com",
      idempotencyKey:
        "store-acquisition-d744ad8e-632c-4dfe-ac70-033bd3221522",
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
    await expect(failedDelivery).rejects.toBeInstanceOf(
      StoreDeliveryRejectedError,
    );
  });

  it("preserves transport failures as ambiguous delivery failures", async () => {
    // arrange
    const transportFailure = new Error("connection reset");
    const productEmailSender = {
      sendEmail: vi.fn().mockRejectedValue(transportFailure),
    };
    const sender = new ResendStoreDeliveryEmailSender(productEmailSender, {
      appBasePath: "/",
      contactEmail: "contact@evoa.fit",
      publicAppUrl: "https://eli.example",
    });

    // act
    const failedDelivery = sender.sendDelivery({
      email: "woman@example.com",
      idempotencyKey:
        "store-acquisition-d744ad8e-632c-4dfe-ac70-033bd3221522",
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
