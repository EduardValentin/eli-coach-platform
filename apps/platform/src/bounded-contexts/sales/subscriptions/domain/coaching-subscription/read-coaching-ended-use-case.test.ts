import { describe, expect, it } from "vitest";

import type { CoachingStatus } from "./coaching-standing";
import {
  CoachingSubscription,
  type CoachingSubscriptionSnapshot,
} from "./coaching-subscription";
import type { CoachingSubscriptionsPort } from "./coaching-subscriptions-port";
import { ReadCoachingEndedUseCase } from "./read-coaching-ended-use-case";

const NOW = new Date("2026-11-21T12:00:00.000Z");
const BEFORE_NOW = new Date("2026-11-21T11:59:59.000Z");
const AFTER_NOW = new Date("2026-11-21T12:00:01.000Z");

function subscriptionOf(
  overrides: Partial<CoachingSubscriptionSnapshot> = {},
): CoachingSubscription {
  return CoachingSubscription.reconstitute({
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
    paidAt: new Date("2026-09-26T10:00:00.000Z"),
    paidThrough: new Date("2026-12-26T10:00:00.000Z"),
    startChoice: "immediate",
    programStartsAt: new Date("2026-09-26T10:00:00.000Z"),
    status: "active",
    cancelledAt: null,
    accessEndsAt: null,
    paymentProblemSince: null,
    refund: null,
    ...overrides,
  });
}

function readCoachingEndedUseCaseOver(
  subscription: CoachingSubscription | null,
) {
  const coachingSubscriptionsPort: Pick<
    CoachingSubscriptionsPort,
    "findCurrentForClient"
  > = {
    findCurrentForClient: async (clientId) =>
      subscription?.clientId === clientId ? subscription : null,
  };

  return new ReadCoachingEndedUseCase({
    clockPort: { now: () => NOW },
    coachingSubscriptionsPort,
  });
}

describe("ReadCoachingEndedUseCase", () => {
  it("answers ended for a subscription that has ended", async () => {
    // arrange
    const readCoachingEndedUseCase = readCoachingEndedUseCaseOver(
      subscriptionOf({ status: "ended", accessEndsAt: AFTER_NOW }),
    );

    // act
    const coachingEnded = await readCoachingEndedUseCase.execute("client-1");

    // assert
    expect(coachingEnded).toBe(true);
  });

  it("answers ended for a cancelled subscription once the period she paid for is over", async () => {
    // arrange
    const readCoachingEndedUseCase = readCoachingEndedUseCaseOver(
      subscriptionOf({ status: "cancelled", accessEndsAt: BEFORE_NOW }),
    );

    // act
    const coachingEnded = await readCoachingEndedUseCase.execute("client-1");

    // assert
    expect(coachingEnded).toBe(true);
  });

  it("answers not ended for a cancelled subscription whose paid period still gives her access", async () => {
    // arrange
    const readCoachingEndedUseCase = readCoachingEndedUseCaseOver(
      subscriptionOf({ status: "cancelled", accessEndsAt: AFTER_NOW }),
    );

    // act
    const coachingEnded = await readCoachingEndedUseCase.execute("client-1");

    // assert
    expect(coachingEnded).toBe(false);
  });

  it.each<CoachingStatus>(["not-started", "active"])(
    "answers not ended for a %s subscription",
    async (status) => {
      // arrange
      const readCoachingEndedUseCase = readCoachingEndedUseCaseOver(
        subscriptionOf({ status }),
      );

      // act
      const coachingEnded = await readCoachingEndedUseCase.execute("client-1");

      // assert
      expect(coachingEnded).toBe(false);
    },
  );

  it("answers not ended for a client with no coaching subscription, as her standing does before she has bought one", async () => {
    // arrange
    const readCoachingEndedUseCase = readCoachingEndedUseCaseOver(null);

    // act
    const coachingEnded = await readCoachingEndedUseCase.execute("client-1");

    // assert
    expect(coachingEnded).toBe(false);
  });
});
