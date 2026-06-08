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
    });

    // act
    await sender.sendConfirmation({
      email: "eli@example.com",
      offer: {
        plan: "all-bundles",
        slug: "all-bundles-launch-1",
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
  });

  it("includes the all-plan waitlist offer in the confirmation template", async () => {
    // arrange
    const productEmailSender = {
      sendEmail: vi.fn().mockResolvedValue(undefined),
    };
    const sender = new WaitlistConfirmationEmailSender(productEmailSender, {
      contactEmail: "contact@elipersonaltrainer.com",
    });

    // act
    await sender.sendConfirmation({
      email: "eli@example.com",
      offer: {
        plan: "all-bundles",
        slug: "all-bundles-launch-1",
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
    });

    // act
    await sender.sendConfirmation({
      email: "eli@example.com",
      offer: {
        plan: "all-bundles",
        slug: "all-bundles-launch-1",
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
  });
});
