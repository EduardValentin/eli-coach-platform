import { describe, expect, it, vi } from "vitest";

import { WaitlistConfirmationEmailSender } from "./waitlist-confirmation-email-sender.server";

describe("WaitlistConfirmationEmailSender", () => {
  it("sends neutral waitlist confirmation copy through the product email path", async () => {
    const productEmailSender = {
      sendEmail: vi.fn().mockResolvedValue(undefined),
    };
    const sender = new WaitlistConfirmationEmailSender(productEmailSender);

    await sender.sendConfirmation({ email: "eli@example.com" });

    expect(productEmailSender.sendEmail).toHaveBeenCalledWith({
      html: expect.stringContaining("You're on the Eli waitlist"),
      subject: "You're on the Eli waitlist",
      text: expect.stringContaining("You're on the Eli waitlist"),
      to: "eli@example.com",
    });
  });
});
