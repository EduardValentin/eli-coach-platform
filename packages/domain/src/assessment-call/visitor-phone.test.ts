import { describe, expect, it } from "vitest";

import { VisitorPhone } from "./visitor-phone";

describe("VisitorPhone.read", () => {
  it.each([
    [
      "spaces, dots, dashes and parentheses",
      "+40",
      "(712) 345.67-8",
      "+40712345678",
    ],
    ["one leading zero", "+40", "0712 345 678", "+40712345678"],
    [
      "only the first of two leading zeros",
      "+40",
      "00712345678",
      "+400712345678",
    ],
    ["four national digits", "+40", "1234", "+401234"],
    [
      "a number filling E.164 exactly",
      "+358",
      "123456789012",
      "+358123456789012",
    ],
  ])("reads %s into E.164", (_label, callingCode, nationalNumber, e164) => {
    // arrange
    const parts = { callingCode, nationalNumber };

    // act
    const reading = VisitorPhone.read(parts);

    // assert
    expect(reading.status === "valid" && reading.phone.toSnapshot()).toEqual({
      e164,
    });
  });

  it("reads no phone from a blank number", () => {
    // arrange
    const parts = { callingCode: "+40", nationalNumber: "   " };

    // act
    const reading = VisitorPhone.read(parts);

    // assert
    expect(reading).toEqual({ status: "empty" });
  });

  it.each([
    ["letters", "+40", "0712 CALL ME"],
    ["fewer than four national digits", "+40", "0123"],
    ["more than fourteen national digits", "+1", "123456789012345"],
    ["more than fifteen digits in all", "+358", "1234567890123"],
    ["a calling code without its plus", "40", "712345678"],
  ])("refuses a number with %s", (_label, callingCode, nationalNumber) => {
    // arrange
    const parts = { callingCode, nationalNumber };

    // act
    const reading = VisitorPhone.read(parts);

    // assert
    expect(reading).toEqual({ status: "invalid" });
  });
});
