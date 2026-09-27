import { describe, expect, it } from "vitest";

import { presentPaidConfirmation } from "./checkout-confirmation";

const PAID_AT = new Date("2026-09-26T21:25:00.000Z");
const WAITING_STARTS_ON = new Date("2026-10-10T21:25:00.000Z");

describe("presentPaidConfirmation", () => {
  it("words the paid bundle in whole euros with its renewal", () => {
    // arrange
    const checkout = {
      status: "paid" as const,
      bundleId: "3-months" as const,
      tier: "reduced" as const,
      amountCents: 37500,
      startChoice: "waiting" as const,
      paidAt: PAID_AT,
      email: "ana@example.com",
      waitingStartsOn: WAITING_STARTS_ON,
    };

    // act
    const confirmation = presentPaidConfirmation(checkout);

    // assert
    expect(confirmation).toEqual({
      state: "paid",
      amount: "€375",
      bundleTitle: "3 Months",
      email: "ana@example.com",
      renewalLabel: "Every 3 months",
      startChoice: "waiting",
      waitingStartsOn: "2026-10-10T21:25:00.000Z",
    });
  });

  it("words a one-month bundle as renewing every month", () => {
    // arrange
    const checkout = {
      status: "paid" as const,
      bundleId: "1-month" as const,
      tier: "regular" as const,
      amountCents: 15900,
      startChoice: "immediate" as const,
      paidAt: PAID_AT,
      email: "bea@example.com",
      waitingStartsOn: WAITING_STARTS_ON,
    };

    // act
    const confirmation = presentPaidConfirmation(checkout);

    // assert
    expect(confirmation).toMatchObject({
      amount: "€159",
      bundleTitle: "1 Month",
      renewalLabel: "Every month",
    });
  });
});
