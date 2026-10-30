import { describe, expect, it, vi } from "vitest";

import type { CoachingPeriodHandlerPort } from "./coaching-period-handler-port";
import { CoachingPeriodPropagation } from "./coaching-period-propagation";
import { CoachingSubscription } from "./coaching-subscription";

const PAID_AT = new Date("2026-10-02T10:00:00.000Z");
const STARTED_AT = new Date("2026-10-08T10:00:00.000Z");
const RENEWED_THROUGH = new Date("2027-04-02T10:00:00.000Z");

const SUBSCRIPTION = CoachingSubscription.reconstitute({
  id: "subscription-1",
  clientId: "client-1",
  bundleId: "3-months",
  months: 3,
  tier: "regular",
  amountCents: 44700,
  currency: "eur",
  paymentCustomerId: "cus_1",
  paymentSubscriptionId: "sub_1",
  checkoutSessionId: "cs_1",
  paidAt: PAID_AT,
  paidThrough: RENEWED_THROUGH,
  startChoice: "immediate",
  programStartsAt: STARTED_AT,
  status: "not-started",
  cancelledAt: null,
  accessEndsAt: null,
  paymentProblemSince: null,
  refund: null,
});

function createHandler() {
  return {
    paidThroughExtended: vi.fn().mockResolvedValue(undefined),
    programStarted: vi.fn().mockResolvedValue(undefined),
  } satisfies CoachingPeriodHandlerPort;
}

function createPropagation(handlers: CoachingPeriodHandlerPort[]) {
  const incidents = { coachingPeriodNotPropagated: vi.fn() };

  return {
    incidents,
    propagation: new CoachingPeriodPropagation({
      coachingPeriods: handlers,
      incidents,
    }),
  };
}

describe("CoachingPeriodPropagation", () => {
  it("tells every handler the client's new paid-through date", async () => {
    // arrange
    const handlers = [createHandler(), createHandler()];
    const { propagation } = createPropagation(handlers);

    // act
    await propagation.propagatePaidThrough(SUBSCRIPTION);

    // assert
    for (const handler of handlers) {
      expect(handler.paidThroughExtended).toHaveBeenCalledWith({
        clientId: "client-1",
        paidThrough: RENEWED_THROUGH,
      });
    }
  });

  it("tells every handler when the client's program started", async () => {
    // arrange
    const handler = createHandler();
    const { propagation } = createPropagation([handler]);

    // act
    await propagation.propagateProgramStart(SUBSCRIPTION);

    // assert
    expect(handler.programStarted).toHaveBeenCalledWith({
      clientId: "client-1",
      startsAt: STARTED_AT,
    });
  });

  it("reports a failing handler without skipping the next or failing the caller", async () => {
    // arrange
    const failure = new Error("check-ins down");
    const failing = createHandler();
    failing.paidThroughExtended.mockRejectedValue(failure);
    const listening = createHandler();
    const { incidents, propagation } = createPropagation([failing, listening]);

    // act
    await propagation.propagatePaidThrough(SUBSCRIPTION);

    // assert
    expect(listening.paidThroughExtended).toHaveBeenCalled();
    expect(incidents.coachingPeriodNotPropagated).toHaveBeenCalledTimes(1);
    expect(incidents.coachingPeriodNotPropagated).toHaveBeenCalledWith({
      subscriptionId: "subscription-1",
      clientId: "client-1",
      error: failure,
    });
  });
});
