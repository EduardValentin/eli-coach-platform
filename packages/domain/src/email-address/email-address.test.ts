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

describe("EmailAddress#hasSubaddress", () => {
  it.each([
    ["person+tag@example.com", true],
    ["person@example.com", false],
    ["person@sub+domain.example.com", false],
  ])("answers whether %s carries a plus tag", (raw, expected) => {
    // arrange
    const email = EmailAddress.normalize(raw);

    // act
    const hasSubaddress = email.hasSubaddress();

    // assert
    expect(hasSubaddress).toBe(expected);
  });
});

describe("EmailAddress#isAcceptedBy", () => {
  it.each([
    ["person+tag@example.com", "allowed", true],
    ["person@example.com", "allowed", true],
    ["person+tag@example.com", "refused", false],
    ["person@example.com", "refused", true],
  ] as const)(
    "accepts %s under the %s subaddress policy: %s",
    (raw, policy, expected) => {
      // arrange
      const email = EmailAddress.normalize(raw);

      // act
      const accepted = email.isAcceptedBy(policy);

      // assert
      expect(accepted).toBe(expected);
    },
  );
});
