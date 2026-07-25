import { describe, expect, it, vi } from "vitest";

import { WaitlistConfirmationEmailSender } from "./waitlist-confirmation-email-sender.server";

describe("WaitlistConfirmationEmailSender", () => {
  it("sends the signup confirmation template for reduced-price waitlist entries", async () => {
    // arrange
    const productEmailSender = {
      sendEmail: vi.fn().mockResolvedValue(undefined),
    };
    const sender = new WaitlistConfirmationEmailSender(productEmailSender, {
      contactEmail: "contact@elipersonaltrainer.com",
      privacyEmail: "privacy@evoa.fit",
    });

    // act
    await sender.sendConfirmation({
      email: "eli@example.com",
      offer: {
        plan: "all-bundles",
        campaignSlug: "all-bundles-launch-1",
      },
      pricing: "reduced",
    });

    // assert
    expect(productEmailSender.sendEmail).toHaveBeenCalledWith({
      html: expect.stringContaining("You&#x27;re in."),
      subject: "You're on the Eli waitlist",
      text: expect.stringContaining("reduced pricing on every plan, reserved only for early signups"),
      to: "eli@example.com",
    });
    expect(productEmailSender.sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        html: expect.stringContaining("WHAT YOU CAN EXPECT"),
      }),
    );
    const sentEmail = productEmailSender.sendEmail.mock.calls[0]?.[0];
    expect(sentEmail?.html).not.toContain("fonts.googleapis.com");
    expect(sentEmail?.html).not.toContain('rel="stylesheet"');
    expect(sentEmail?.html).not.toContain("No spam");
    expect(sentEmail?.html).not.toContain("and that&#x27;s it");
    expect(sentEmail?.html).toContain(
      "We&#x27;ll send only the waitlist and marketing topics you agreed to when you joined.",
    );
    expect(sentEmail?.html).toContain(
      "mailto:privacy@evoa.fit?subject=Unsubscribe%20from%20Eli%20waitlist%20emails",
    );
    expect(sentEmail?.html).toContain("mailto:contact@elipersonaltrainer.com");
    expect(sentEmail?.text).not.toContain("No spam");
    expect(sentEmail?.text).not.toContain("and that's it");
    expect(sentEmail?.text).toContain(
      "We'll send only the waitlist and marketing topics you agreed to when you joined.",
    );
    expect(sentEmail?.text).toContain(
      "Unsubscribe: mailto:privacy@evoa.fit?subject=Unsubscribe%20from%20Eli%20waitlist%20emails",
    );
    expect(sentEmail?.text).toContain(
      "Questions? Reply to this email or write to contact@elipersonaltrainer.com.",
    );
  });

  it("includes the all-plan waitlist offer in the confirmation template", async () => {
    // arrange
    const productEmailSender = {
      sendEmail: vi.fn().mockResolvedValue(undefined),
    };
    const sender = new WaitlistConfirmationEmailSender(productEmailSender, {
      contactEmail: "contact@elipersonaltrainer.com",
      privacyEmail: "privacy@evoa.fit",
    });

    // act
    await sender.sendConfirmation({
      email: "eli@example.com",
      offer: {
        plan: "all-bundles",
        campaignSlug: "all-bundles-launch-1",
      },
      pricing: "reduced",
    });

    // assert
    expect(productEmailSender.sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        html: expect.stringContaining("Every coaching plan"),
        text: expect.stringContaining("Plan: Every coaching plan"),
      }),
    );
  });

  it("sends the notify confirmation template for regular full-round entries", async () => {
    // arrange
    const productEmailSender = {
      sendEmail: vi.fn().mockResolvedValue(undefined),
    };
    const sender = new WaitlistConfirmationEmailSender(productEmailSender, {
      contactEmail: "contact@elipersonaltrainer.com",
      privacyEmail: "privacy@evoa.fit",
    });

    // act
    await sender.sendConfirmation({
      email: "eli@example.com",
      offer: {
        plan: "all-bundles",
        campaignSlug: "all-bundles-launch-1",
      },
      pricing: "regular",
    });

    // assert
    expect(productEmailSender.sendEmail).toHaveBeenCalledWith({
      html: expect.stringContaining("You&#x27;re first in line."),
      subject: "You're on the Eli waitlist",
      text: expect.stringContaining("This round filled up quicker than expected"),
      to: "eli@example.com",
    });
    const sentEmail = productEmailSender.sendEmail.mock.calls[0]?.[0];
    expect(sentEmail?.html).not.toContain("Just one email");
    expect(sentEmail?.html).toContain(
      "We&#x27;ll send only the waitlist and marketing topics you agreed to when you joined.",
    );
    expect(sentEmail?.text).not.toContain("Just one email");
    expect(sentEmail?.text).toContain(
      "We'll send only the waitlist and marketing topics you agreed to when you joined.",
    );
  });
});
