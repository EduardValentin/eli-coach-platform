import { describe, expect, it, vi } from "vitest";

import { ResendProductEmailSender } from "./resend-product-email-sender.server";

describe("ResendProductEmailSender", () => {
  it("sends transactional email through Resend with configured sender and reply routing", async () => {
    const send = vi.fn().mockResolvedValue({ data: { id: "email_123" }, error: null });
    const sender = new ResendProductEmailSender({
      client: { emails: { send } },
      fromAddress: "hello@test.elipersonaltrainer.com",
      fromName: "Eli Personal Trainer",
      replyTo: "support@test.elipersonaltrainer.com",
    });

    await sender.sendEmail({
      html: "<p>You are on the waitlist.</p>",
      subject: "You're on the Eli waitlist",
      text: "You are on the waitlist.",
      to: "eli@example.com",
    });

    expect(send).toHaveBeenCalledWith({
      from: "Eli Personal Trainer <hello@test.elipersonaltrainer.com>",
      html: "<p>You are on the waitlist.</p>",
      replyTo: "support@test.elipersonaltrainer.com",
      subject: "You're on the Eli waitlist",
      text: "You are on the waitlist.",
      to: "eli@example.com",
    });
  });

  it("throws sanitized failures without raw recipient addresses", async () => {
    const send = vi.fn().mockResolvedValue({
      data: null,
      error: { message: "Could not send to eli@example.com" },
    });
    const sender = new ResendProductEmailSender({
      client: { emails: { send } },
      fromAddress: "hello@test.elipersonaltrainer.com",
      fromName: "Eli Personal Trainer",
      replyTo: "support@test.elipersonaltrainer.com",
    });

    await expect(
      sender.sendEmail({
        html: "<p>You are on the waitlist.</p>",
        subject: "You're on the Eli waitlist",
        text: "You are on the waitlist.",
        to: "eli@example.com",
      }),
    ).rejects.toThrow("Resend product email send failed.");

    await expect(
      sender.sendEmail({
        html: "<p>You are on the waitlist.</p>",
        subject: "You're on the Eli waitlist",
        text: "You are on the waitlist.",
        to: "eli@example.com",
      }),
    ).rejects.not.toThrow("eli@example.com");
  });
});
