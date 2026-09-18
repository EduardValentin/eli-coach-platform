import { describe, expect, it, vi } from "vitest";

import { ResendProductEmail } from "./resend-product-email.server";

describe("ResendProductEmail", () => {
  it("sends transactional email through Resend with configured sender and reply routing", async () => {
    // arrange
    const send = vi
      .fn()
      .mockResolvedValue({ data: { id: "email_123" }, error: null });
    const productEmail = new ResendProductEmail({
      client: { emails: { send } },
      fromAddress: "hello@test.evoa.fit",
      fromName: "Evoa",
      replyTo: "support@test.evoa.fit",
    });

    // act
    const result = await productEmail.send({
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
    expect(result).toEqual({ kind: "sent", providerMessageId: "email_123" });
  });

  it("attaches command attachments to the Resend payload as provider bytes", async () => {
    // arrange
    const send = vi
      .fn()
      .mockResolvedValue({ data: { id: "email_123" }, error: null });
    const productEmail = new ResendProductEmail({
      client: { emails: { send } },
      fromAddress: "hello@test.evoa.fit",
      fromName: "Evoa",
      replyTo: "support@test.evoa.fit",
    });
    const calendarInvite = new Uint8Array([66, 69, 71, 73, 78]);

    // act
    await productEmail.send({
      attachments: [
        {
          content: calendarInvite,
          contentType: "text/calendar; charset=utf-8",
          filename: "assessment-call.ics",
        },
      ],
      html: "<p>Your call is booked.</p>",
      subject: "Your assessment call",
      text: "Your call is booked.",
      to: "eli@example.com",
    });

    // assert
    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({
        attachments: [
          {
            content: Buffer.from(calendarInvite),
            contentType: "text/calendar; charset=utf-8",
            filename: "assessment-call.ics",
          },
        ],
      }),
    );
  });

  it("sends no attachments field when the command carries none", async () => {
    // arrange
    const send = vi
      .fn()
      .mockResolvedValue({ data: { id: "email_123" }, error: null });
    const productEmail = new ResendProductEmail({
      client: { emails: { send } },
      fromAddress: "hello@test.evoa.fit",
      fromName: "Evoa",
      replyTo: "support@test.evoa.fit",
    });

    // act
    await productEmail.send({
      html: "<p>You are on the waitlist.</p>",
      subject: "You're on the Eli waitlist",
      text: "You are on the waitlist.",
      to: "eli@example.com",
    });

    // assert
    const [payload] = send.mock.calls[0];

    expect("attachments" in payload).toBe(false);
  });

  it("reports a rejection reason without raw recipient addresses", async () => {
    // arrange
    const send = vi.fn().mockResolvedValue({
      data: null,
      error: {
        message: "Could not send to eli@example.com",
        name: "validation_error",
        statusCode: 400,
      },
    });
    const productEmail = new ResendProductEmail({
      client: { emails: { send } },
      fromAddress: "hello@test.evoa.fit",
      fromName: "Evoa",
      replyTo: "support@test.evoa.fit",
    });

    // act
    const result = await productEmail.send({
      html: "<p>You are on the waitlist.</p>",
      subject: "You're on the Eli waitlist",
      text: "You are on the waitlist.",
      to: "eli@example.com",
    });

    // assert
    expect(result).toEqual({ kind: "rejected", reason: "validation_error" });
    expect(JSON.stringify(result)).not.toContain("eli@example.com");
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
  ])("leaves a $scenario unconfirmed", async ({ error }) => {
    // arrange
    const send = vi.fn().mockResolvedValue({ data: null, error });
    const productEmail = new ResendProductEmail({
      client: { emails: { send } },
      fromAddress: "hello@test.evoa.fit",
      fromName: "Evoa",
      replyTo: "support@test.evoa.fit",
    });

    // act
    const result = await productEmail.send({
      html: "<p>You are on the waitlist.</p>",
      idempotencyKey: "waitlist-signup-31",
      subject: "You're on the Eli waitlist",
      text: "You are on the waitlist.",
      to: "eli@example.com",
    });

    // assert
    expect(result).toEqual({ kind: "unconfirmed" });
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
  ])(
    "rejects a $scenario outright rather than inviting a retry",
    async ({ error }) => {
      // arrange
      const send = vi.fn().mockResolvedValue({ data: null, error });
      const productEmail = new ResendProductEmail({
        client: { emails: { send } },
        fromAddress: "hello@test.evoa.fit",
        fromName: "Evoa",
        replyTo: "support@test.evoa.fit",
      });

      // act
      const result = await productEmail.send({
        html: "<p>You are on the waitlist.</p>",
        subject: "You're on the Eli waitlist",
        text: "You are on the waitlist.",
        to: "eli@example.com",
      });

      // assert
      expect(result).toEqual({ kind: "rejected", reason: error.name });
    },
  );
});
