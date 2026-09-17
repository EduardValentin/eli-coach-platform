import { describe, expect, it } from "vitest";

import { EmailAddress } from "./email-address";

describe("EmailAddress.normalize", () => {
  it("lowercases and trims", () => {
    // arrange
    const raw = "  Person@Example.COM ";

    // act
    const email = EmailAddress.normalize(raw);

    // assert
    expect(email.value).toBe("person@example.com");
  });
});

describe("EmailAddress#deliveryLimitKey", () => {
  it.each([
    ["person+tag@example.com", "person@example.com"],
    ["person@example.com", "person@example.com"],
    ["woman+one+two@example.com", "woman@example.com"],
    ["woman@sub.example.com", "woman@sub.example.com"],
    ["no-at-sign", "no-at-sign"],
    // A local part that is only a tag folds to a bare domain key. Such an
    // address collides with others of the same shape, which is acceptable
    // because no provider issues a mailbox without a base name.
    ["+guides@example.com", "@example.com"],
  ])("strips the plus tag from %s", (raw, expected) => {
    // arrange
    const email = EmailAddress.normalize(raw);

    // act
    const key = email.deliveryLimitKey;

    // assert
    expect(key).toBe(expected);
  });
});
