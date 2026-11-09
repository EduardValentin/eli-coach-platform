import { describe, expect, it } from "vitest";

import { createEmailAcceptance } from "~/shared/submission-checks/email-address";

import { StoreRecipientEmail } from "./store-recipient-email";

const emailAcceptance = createEmailAcceptance("allowed");

describe("StoreRecipientEmail", () => {
  it("normalizes the address she typed", () => {
    // arrange
    const typed = "  Woman+Guides@Example.com ";

    // act
    const recipientEmail = StoreRecipientEmail.normalized(
      typed,
      emailAcceptance,
    );

    // assert
    expect(recipientEmail.toSnapshot()).toEqual({
      address: "woman+guides@example.com",
    });
  });

  it.each([
    ["person+tag@example.com", "person@example.com"],
    ["person@example.com", "person@example.com"],
    ["woman+one+two@example.com", "woman@example.com"],
    ["woman@sub.example.com", "woman@sub.example.com"],
    ["no-at-sign", "no-at-sign"],
    ["+guides@example.com", "@example.com"],
  ])("folds %s onto the delivery limit key %s", (address, expected) => {
    // arrange
    const recipientEmail = StoreRecipientEmail.reconstitute({ address });

    // act
    const key = recipientEmail.deliveryLimitKey();

    // assert
    expect(key).toBe(expected);
  });
});
