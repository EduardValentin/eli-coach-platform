import { describe, expect, it, vi } from "vitest";

import {
  ProductEmailDeliveryUnconfirmedError,
  ProductEmailRejectedError,
} from "./product-email-sender.server";
import { ResendProductEmailSender } from "./resend-product-email-sender.server";

describe("ResendProductEmailSender", () => {
  it("sends transactional email through Resend with configured sender and reply routing", async () => {
    // arrange
    const send = vi.fn().mockResolvedValue({ data: { id: "email_123" }, error: null });
    const sender = new ResendProductEmailSender({
      client: { emails: { send } },
      fromAddress: "hello@test.evoa.fit",
      fromName: "Evoa",
      replyTo: "support@test.evoa.fit",
    });

    // act
    const result = await sender.sendEmail({
      html: "<p>You are on the waitlist.</p>",
      idempotencyKey: "waitlist-signup-31",
      subject: "You're on the Eli waitlist",
      text: "You are on the waitlist.",
      to: "eli@example.com",
    });

    // assert
    expect(send).toHaveBeenCalledWith(
      {
        from: "Evoa <hello@test.evoa.fit>",
        html: "<p>You are on the waitlist.</p>",
        replyTo: "support@test.evoa.fit",
        subject: "You're on the Eli waitlist",
        text: "You are on the waitlist.",
        to: "eli@example.com",
      },
      { idempotencyKey: "waitlist-signup-31" },
    );
    expect(result).toEqual({ providerMessageId: "email_123" });
  });

  it("throws sanitized failures without raw recipient addresses", async () => {
    // arrange
    const send = vi.fn().mockResolvedValue({
      data: null,
      error: {
        message: "Could not send to eli@example.com",
        name: "validation_error",
        statusCode: 400,
      },
    });
    const sender = new ResendProductEmailSender({
      client: { emails: { send } },
      fromAddress: "hello@test.evoa.fit",
      fromName: "Evoa",
      replyTo: "support@test.evoa.fit",
    });

    // act
    const failedSend = sender.sendEmail({
      html: "<p>You are on the waitlist.</p>",
      subject: "You're on the Eli waitlist",
      text: "You are on the waitlist.",
      to: "eli@example.com",
    });
    const failedSendWithoutRecipientDetails = sender.sendEmail({
      html: "<p>You are on the waitlist.</p>",
      subject: "You're on the Eli waitlist",
      text: "You are on the waitlist.",
      to: "eli@example.com",
    });

    // assert
    await expect(failedSend).rejects.toThrow(
      "Product email provider rejected the request.",
    );
    await expect(failedSendWithoutRecipientDetails).rejects.not.toThrow("eli@example.com");
  });

  it.each([
    {
      error: {
        message: "Unable to fetch data.",
        name: "application_error",
        statusCode: null,
      },
      scenario: "transport failure",
    },
    {
      error: {
        message: "Too many requests.",
        name: "rate_limit_exceeded",
        statusCode: 429,
      },
      scenario: "rate limit",
    },
    {
      error: {
        message: "Internal server error.",
        name: "internal_server_error",
        statusCode: 503,
      },
      scenario: "provider server failure",
    },
    {
      error: {
        message: "Another request with this key is still running.",
        name: "concurrent_idempotent_requests",
        statusCode: 409,
      },
      scenario: "concurrent idempotent request",
    },
  ])("keeps a $scenario retryable", async ({ error }) => {
    // arrange
    const send = vi.fn().mockResolvedValue({ data: null, error });
    const sender = new ResendProductEmailSender({
      client: { emails: { send } },
      fromAddress: "hello@test.evoa.fit",
      fromName: "Evoa",
      replyTo: "support@test.evoa.fit",
    });

    // act
    const failedSend = sender.sendEmail({
      html: "<p>You are on the waitlist.</p>",
      idempotencyKey: "waitlist-signup-31",
      subject: "You're on the Eli waitlist",
      text: "You are on the waitlist.",
      to: "eli@example.com",
    });

    // assert
    await expect(failedSend).rejects.toBeInstanceOf(
      ProductEmailDeliveryUnconfirmedError,
    );
  });

  it.each([
    {
      error: {
        message: "Same key used with a different payload.",
        name: "invalid_idempotent_request",
        statusCode: 409,
      },
      scenario: "changed idempotent payload",
    },
    {
      error: {
        message: "API key is invalid.",
        name: "invalid_api_key",
        statusCode: 403,
      },
      scenario: "provider authentication failure",
    },
    {
      error: {
        message: "Sender domain is not verified.",
        name: "validation_error",
        statusCode: 403,
      },
      scenario: "sender configuration failure",
    },
  ])("rejects a $scenario outright rather than inviting a retry", async ({ error }) => {
    // arrange
    const send = vi.fn().mockResolvedValue({ data: null, error });
    const sender = new ResendProductEmailSender({
      client: { emails: { send } },
      fromAddress: "hello@test.evoa.fit",
      fromName: "Evoa",
      replyTo: "support@test.evoa.fit",
    });

    // act
    const failedSend = sender.sendEmail({
      html: "<p>You are on the waitlist.</p>",
      subject: "You're on the Eli waitlist",
      text: "You are on the waitlist.",
      to: "eli@example.com",
    });

    // assert
    await expect(failedSend).rejects.toBeInstanceOf(ProductEmailRejectedError);
  });
});
