import { describe, expect, it } from "vitest";

import {
  bundlePageSchema,
  checkoutChoiceSchema,
  checkoutConfirmationSchema,
  PAYMENT_LINK_MESSAGES,
  paymentLinkTokenSchema,
  salesStatesSchema,
  sendPaymentLinkRequestSchema,
} from "./coaching-sales";

const CALL_ID = "4f1f3a3e-6b0a-4f45-9a3c-1c3b2f0a5d11";

describe("salesStatesSchema", () => {
  it("accepts the three sales states keyed by call", () => {
    // arrange
    const states = {
      [CALL_ID]: "payment-link-sent",
      "0b8d2f7e-2f55-4d3e-9d7c-7d7a3f1c2b10": "paid",
      "7c6c5a52-8f4f-4e5a-a2b7-5c3f6a9c1d22": "held",
    };

    // act
    const parsed = salesStatesSchema.safeParse(states);

    // assert
    expect(parsed.success).toBe(true);
  });

  it("refuses a state outside the sales vocabulary", () => {
    // arrange
    const states = { [CALL_ID]: "invited" };

    // act
    const parsed = salesStatesSchema.safeParse(states);

    // assert
    expect(parsed.success).toBe(false);
  });
});

describe("sendPaymentLinkRequestSchema", () => {
  it("accepts an assessment call id", () => {
    // arrange
    const request = { assessmentCallId: CALL_ID };

    // act
    const parsed = sendPaymentLinkRequestSchema.safeParse(request);

    // assert
    expect(parsed.success).toBe(true);
  });

  it("refuses an id that is not a uuid", () => {
    // arrange
    const request = { assessmentCallId: "call-1" };

    // act
    const parsed = sendPaymentLinkRequestSchema.safeParse(request);

    // assert
    expect(parsed.success).toBe(false);
  });
});

describe("PAYMENT_LINK_MESSAGES", () => {
  it("names the address the payment link went to", () => {
    // arrange
    const email = "ana@example.com";

    // act
    const message = PAYMENT_LINK_MESSAGES.sent(email);

    // assert
    expect(message).toBe("Payment link sent to ana@example.com.");
  });
});

describe("bundlePageSchema", () => {
  it("accepts the call-first state with the cards its disabled selector shows", () => {
    // arrange
    const page = { state: "call-first", cards: [] };

    // act
    const parsed = bundlePageSchema.safeParse(page);

    // assert
    expect(parsed.success).toBe(true);
  });

  it("drops anything beyond the call-first fields", () => {
    // arrange
    const page = { state: "call-first", cards: [], tier: "reduced" };

    // act
    const parsed = bundlePageSchema.parse(page);

    // assert
    expect(parsed).toEqual({ state: "call-first", cards: [] });
  });

  it("refuses a valid page whose waiting start is not a calendar day", () => {
    // arrange
    const page = {
      state: "valid",
      tier: "regular",
      cards: [],
      waitingStartsOn: "2026-10-10T00:00:00.000Z",
    };

    // act
    const parsed = bundlePageSchema.safeParse(page);

    // assert
    expect(parsed.success).toBe(false);
  });
});

describe("checkoutConfirmationSchema", () => {
  it("accepts a paid confirmation with its readings", () => {
    // arrange
    const confirmation = {
      state: "paid",
      amount: "€447",
      bundleTitle: "3 Months",
      email: "ana@example.com",
      renewalLabel: "Every 3 months",
      startChoice: "waiting",
      waitingStartsOn: "2026-10-10",
    };

    // act
    const parsed = checkoutConfirmationSchema.safeParse(confirmation);

    // assert
    expect(parsed.success).toBe(true);
  });

  it("refuses an unknown start choice", () => {
    // arrange
    const confirmation = {
      state: "paid",
      amount: "€447",
      bundleTitle: "3 Months",
      email: "ana@example.com",
      renewalLabel: "Every 3 months",
      startChoice: "later",
      waitingStartsOn: "2026-10-10",
    };

    // act
    const parsed = checkoutConfirmationSchema.safeParse(confirmation);

    // assert
    expect(parsed.success).toBe(false);
  });
});

describe("paymentLinkTokenSchema", () => {
  it("reads a missing token as an empty one", () => {
    // arrange
    const token = null;

    // act
    const parsed = paymentLinkTokenSchema.parse(token);

    // assert
    expect(parsed).toBe("");
  });

  it("reads an oversized token as an empty one", () => {
    // arrange
    const token = "a".repeat(257);

    // act
    const parsed = paymentLinkTokenSchema.parse(token);

    // assert
    expect(parsed).toBe("");
  });
});

describe("checkoutChoiceSchema", () => {
  it("accepts a known bundle with a start choice", () => {
    // arrange
    const choice = { bundleId: "6-months", startChoice: "waiting" };

    // act
    const parsed = checkoutChoiceSchema.safeParse(choice);

    // assert
    expect(parsed.success).toBe(true);
  });

  it("refuses a checkout without a start choice", () => {
    // arrange
    const choice = { bundleId: "6-months", startChoice: null };

    // act
    const parsed = checkoutChoiceSchema.safeParse(choice);

    // assert
    expect(parsed.success).toBe(false);
  });
});
