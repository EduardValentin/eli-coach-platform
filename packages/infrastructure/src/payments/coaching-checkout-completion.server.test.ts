import type { CreateCheckoutSessionCommand } from "@eli-coach-platform/domain/coaching-subscription";
import { describe, expect, it } from "vitest";

import type { PaidCheckoutSession } from "./checkout-session-completion.server";
import {
  coachingCheckoutMetadata,
  toCheckoutCompletion,
} from "./coaching-checkout-completion.server";

const ASSESSMENT_CALL_ID = "5d7f0a52-7a55-4c38-9d8e-3f4d8c3b8f10";
const paidAt = new Date("2026-09-21T15:13:20.000Z");

function paidSession(
  overrides: Partial<PaidCheckoutSession> = {},
): PaidCheckoutSession {
  return {
    id: "cs_test_paid",
    customerId: "cus_test",
    subscriptionId: "sub_test",
    paymentIntentId: null,
    amountCents: 44700,
    currency: "eur",
    customerEmail: "sofia@example.com",
    paidAt,
    metadata: {
      purpose: "coaching-subscription",
      assessmentCallId: ASSESSMENT_CALL_ID,
      bundleId: "3-months",
      months: "3",
      tier: "regular",
      startChoice: "waiting",
    },
    ...overrides,
  };
}

function sessionWithMetadata(
  metadata: Record<string, string | undefined>,
): PaidCheckoutSession {
  const merged = { ...paidSession().metadata, ...metadata };

  return paidSession({
    metadata: Object.fromEntries(
      Object.entries(merged).filter(
        (entry): entry is [string, string] => entry[1] !== undefined,
      ),
    ),
  });
}

describe("toCheckoutCompletion", () => {
  it("reads a paid coaching subscription session into a checkout completion", () => {
    // arrange
    const session = paidSession();

    // act
    const completion = toCheckoutCompletion(session);

    // assert
    expect(completion).toEqual({
      checkoutSessionId: "cs_test_paid",
      paymentCustomerId: "cus_test",
      paymentSubscriptionId: "sub_test",
      amountCents: 44700,
      currency: "eur",
      customerEmail: "sofia@example.com",
      paidAt,
      assessmentCallId: ASSESSMENT_CALL_ID,
      bundleId: "3-months",
      tier: "regular",
      startChoice: "waiting",
    });
  });

  it("reads nothing from a paid session without a subscription", () => {
    // arrange
    const session = paidSession({ subscriptionId: null });

    // act
    const completion = toCheckoutCompletion(session);

    // assert
    expect(completion).toBeNull();
  });

  it.each([
    ["another purpose", { purpose: "store-order" }],
    ["no purpose", { purpose: undefined }],
    [
      "an assessment call id that is not a uuid",
      { assessmentCallId: "call-1" },
    ],
    ["no assessment call", { assessmentCallId: undefined }],
    ["an unknown coaching bundle", { bundleId: "12-months" }],
    ["months that differ from the bundle", { months: "6" }],
    ["no months", { months: undefined }],
    ["an unknown price tier", { tier: "discounted" }],
    ["an unknown start choice", { startChoice: "later" }],
  ])("reads nothing from metadata naming %s", (_description, metadata) => {
    // arrange
    const session = sessionWithMetadata(metadata);

    // act
    const completion = toCheckoutCompletion(session);

    // assert
    expect(completion).toBeNull();
  });
});

describe("coachingCheckoutMetadata", () => {
  it("writes the metadata the completion reads back", () => {
    // arrange
    const command: CreateCheckoutSessionCommand = {
      customerId: "cus_test",
      bundle: {
        id: "6-months",
        title: "6 Months",
        months: 6,
        amountCents: 71400,
      },
      currency: "eur",
      metadata: {
        purpose: "coaching-subscription",
        assessmentCallId: ASSESSMENT_CALL_ID,
        bundleId: "6-months",
        tier: "reduced",
        startChoice: "immediate",
      },
      successUrl: "https://evoa.fit/checkout/complete",
      cancelUrl: "https://evoa.fit/select-bundle",
    };

    // act
    const metadata = coachingCheckoutMetadata(command);

    // assert
    expect(metadata).toEqual({
      purpose: "coaching-subscription",
      assessmentCallId: ASSESSMENT_CALL_ID,
      bundleId: "6-months",
      months: "6",
      tier: "reduced",
      startChoice: "immediate",
    });
    expect(toCheckoutCompletion(paidSession({ metadata }))).toMatchObject({
      assessmentCallId: ASSESSMENT_CALL_ID,
      bundleId: "6-months",
      tier: "reduced",
      startChoice: "immediate",
    });
  });
});
