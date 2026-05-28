import { describe, expect, it, vi } from "vitest";

import { WaitlistConfirmationEmailSender } from "./waitlist-confirmation-email-sender.server";

describe("WaitlistConfirmationEmailSender", () => {
  it("sends the signup confirmation template for reduced-price waitlist entries", async () => {
    const productEmailSender = {
      sendEmail: vi.fn().mockResolvedValue(undefined),
    };
    const sender = new WaitlistConfirmationEmailSender(productEmailSender, {
      contactEmail: "contact@elipersonaltrainer.com",
    });

    await sender.sendConfirmation({ email: "eli@example.com", pricing: "reduced" });

    expect(productEmailSender.sendEmail).toHaveBeenCalledWith({
      html: expect.stringContaining("You&#x27;re in."),
      subject: "You're on the Eli waitlist",
      text: expect.stringContaining("launch discount reserved only for early signups"),
      to: "eli@example.com",
    });
    expect(productEmailSender.sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        html: expect.stringContaining("WHAT YOU CAN EXPECT"),
      }),
    );
  });

  it("sends the notify confirmation template for regular full-round entries", async () => {
    const productEmailSender = {
      sendEmail: vi.fn().mockResolvedValue(undefined),
    };
    const sender = new WaitlistConfirmationEmailSender(productEmailSender, {
      contactEmail: "contact@elipersonaltrainer.com",
    });

    await sender.sendConfirmation({ email: "eli@example.com", pricing: "regular" });

    expect(productEmailSender.sendEmail).toHaveBeenCalledWith({
      html: expect.stringContaining("You&#x27;re first in line."),
      subject: "You're on the Eli waitlist",
      text: expect.stringContaining("This round filled up quicker than expected"),
      to: "eli@example.com",
    });
  });
});
