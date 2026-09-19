import { describe, expect, it } from "vitest";

import type {
  EmailAttachment,
  ProductEmailCommand,
} from "./product-email-contract.server";

describe("ProductEmailCommand", () => {
  it("carries attachment bytes alongside the filename and content type", () => {
    // arrange
    const attachment: EmailAttachment = {
      content: new Uint8Array([66, 69, 71, 73, 78]),
      contentType: "text/calendar; charset=utf-8",
      filename: "assessment-call.ics",
    };

    // act
    const command: ProductEmailCommand = {
      attachments: [attachment],
      html: "<p>Your call is booked.</p>",
      subject: "Your assessment call",
      text: "Your call is booked.",
      to: "eli@example.com",
    };

    // assert
    expect(command.attachments).toEqual([attachment]);
  });

  it("carries a per-send reply-to address", () => {
    // arrange
    const replyTo = "sofia@example.com";

    // act
    const command: ProductEmailCommand = {
      html: "<p>New assessment call booked.</p>",
      replyTo,
      subject: "New assessment call booked.",
      text: "New assessment call booked.",
      to: "eli@example.com",
    };

    // assert
    expect(command.replyTo).toBe(replyTo);
  });

  it("leaves attachments absent on a plain send", () => {
    // arrange
    // act
    const command: ProductEmailCommand = {
      html: "<p>Hi</p>",
      subject: "Hi",
      text: "Hi",
      to: "eli@example.com",
    };

    // assert
    expect(command.attachments).toBeUndefined();
  });
});
