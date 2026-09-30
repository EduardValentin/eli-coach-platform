import { describe, expect, it, vi } from "vitest";

import { ClientJourney, type ClientJourneySnapshot } from "./client-journey";
import type { ClientJourneys } from "./client-journeys";
import type { ClientSubscriptionStarts } from "./client-subscription-starts";
import { MarkWelcomeSeenUseCase } from "./mark-welcome-seen-use-case";
import { ReadClientJourneyUseCase } from "./read-client-journey-use-case";
import { ReadProgramStatusUseCase } from "./read-program-status-use-case";

const NOW = new Date("2026-09-27T10:00:00.000Z");
const WELCOME_SEEN_AT = new Date("2026-09-27T09:00:00.000Z");
const SUBMITTED_AT = new Date("2026-09-28T10:00:00.000Z");
const PURCHASED_AT = new Date("2026-09-26T10:00:00.000Z");

const OPENED_AT = new Date("2026-09-28T11:00:00.000Z");
const ASKED_AT = new Date("2026-09-28T12:00:00.000Z");

const NO_REVIEW_STAMPS = {
  reviewOpenedAt: null,
  detailsRequestedAt: null,
  detailsAnsweredAt: null,
  answersApprovedAt: null,
};

function journey(
  welcomeSeenAt: Date | null,
  onboardingSubmittedAt: Date | null = null,
  reviewStamps: Partial<ClientJourneySnapshot> = {},
): ClientJourney {
  return ClientJourney.from({
    clientId: "client-1",
    firstName: "Ana",
    gender: "female",
    lastName: "Popescu",
    welcomeSeenAt,
    onboardingSubmittedAt,
    ...NO_REVIEW_STAMPS,
    ...reviewStamps,
  });
}

function createJourneys(found: ClientJourney | null) {
  return {
    findByAuthSubjectId: vi.fn().mockResolvedValue(found),
    recordWelcomeSeen: vi.fn().mockResolvedValue(undefined),
    recordOnboardingSubmitted: vi.fn().mockResolvedValue(undefined),
  } satisfies ClientJourneys;
}

function createSubscriptionStarts(
  found: Awaited<ReturnType<ClientSubscriptionStarts["findOpenForClient"]>>,
) {
  return {
    findOpenForClient: vi.fn().mockResolvedValue(found),
  } satisfies ClientSubscriptionStarts;
}

describe("ReadClientJourneyUseCase", () => {
  it.each([
    ["the journey of a bound client", journey(null)],
    ["nothing for a subject bound to no client", null],
  ])("answers %s", async (_label, found) => {
    // arrange
    const journeys = createJourneys(found);
    const useCase = new ReadClientJourneyUseCase({ journeys });

    // act
    const result = await useCase.execute("user_ana");

    // assert
    expect(result).toBe(found);
    expect(journeys.findByAuthSubjectId).toHaveBeenCalledWith("user_ana");
  });
});

describe("MarkWelcomeSeenUseCase", () => {
  it("records welcome as seen now for a client on the welcome step", async () => {
    // arrange
    const journeys = createJourneys(journey(null));
    const useCase = new MarkWelcomeSeenUseCase({
      clock: { now: () => NOW },
      journeys,
    });

    // act
    const result = await useCase.execute("user_ana");

    // assert
    expect(result).toEqual({ status: "welcome-seen" });
    expect(journeys.recordWelcomeSeen).toHaveBeenCalledWith({
      clientId: "client-1",
      at: NOW,
    });
  });

  it("keeps the first moment she saw welcome", async () => {
    // arrange
    const journeys = createJourneys(
      journey(new Date("2026-09-26T10:00:00.000Z")),
    );
    const useCase = new MarkWelcomeSeenUseCase({
      clock: { now: () => NOW },
      journeys,
    });

    // act
    const result = await useCase.execute("user_ana");

    // assert
    expect(result).toEqual({ status: "welcome-seen" });
    expect(journeys.recordWelcomeSeen).not.toHaveBeenCalled();
  });

  it("answers not-on-journey for a subject bound to no client", async () => {
    // arrange
    const journeys = createJourneys(null);
    const useCase = new MarkWelcomeSeenUseCase({
      clock: { now: () => NOW },
      journeys,
    });

    // act
    const result = await useCase.execute("user_coach");

    // assert
    expect(result).toEqual({ status: "not-on-journey" });
    expect(journeys.recordWelcomeSeen).not.toHaveBeenCalled();
  });
});

describe("ReadProgramStatusUseCase", () => {
  it("answers her submission with no later start when she started immediately", async () => {
    // arrange
    const subscriptionStarts = createSubscriptionStarts({
      startChoice: "immediate",
      purchasedAt: PURCHASED_AT,
    });
    const useCase = new ReadProgramStatusUseCase({
      journeys: createJourneys(journey(WELCOME_SEEN_AT, SUBMITTED_AT)),
      subscriptionStarts,
    });

    // act
    const status = await useCase.execute("user_ana");

    // assert
    expect(status).toEqual({
      kind: "submitted",
      submittedAt: SUBMITTED_AT,
      workStartsOn: null,
    });
    expect(subscriptionStarts.findOpenForClient).toHaveBeenCalledWith(
      "client-1",
    );
  });

  it("answers her submission with the day the work starts when she waits out the withdrawal window", async () => {
    // arrange
    const useCase = new ReadProgramStatusUseCase({
      journeys: createJourneys(journey(WELCOME_SEEN_AT, SUBMITTED_AT)),
      subscriptionStarts: createSubscriptionStarts({
        startChoice: "waiting",
        purchasedAt: PURCHASED_AT,
      }),
    });

    // act
    const status = await useCase.execute("user_ana");

    // assert
    expect(status).toEqual({
      kind: "submitted",
      submittedAt: SUBMITTED_AT,
      workStartsOn: new Date("2026-10-10T10:00:00.000Z"),
    });
  });

  it("answers her submission with no start day when she holds no open subscription", async () => {
    // arrange
    const useCase = new ReadProgramStatusUseCase({
      journeys: createJourneys(journey(WELCOME_SEEN_AT, SUBMITTED_AT)),
      subscriptionStarts: createSubscriptionStarts(null),
    });

    // act
    const status = await useCase.execute("user_ana");

    // assert
    expect(status).toEqual({
      kind: "submitted",
      submittedAt: SUBMITTED_AT,
      workStartsOn: null,
    });
  });

  it.each([
    ["in-review", { reviewOpenedAt: OPENED_AT }],
    [
      "needs-details",
      { reviewOpenedAt: OPENED_AT, detailsRequestedAt: ASKED_AT },
    ],
    ["approved", { reviewOpenedAt: OPENED_AT, answersApprovedAt: NOW }],
  ] as const)(
    "answers %s once the coach's review reaches it",
    async (expected, reviewStamps) => {
      // arrange
      const useCase = new ReadProgramStatusUseCase({
        journeys: createJourneys(
          journey(WELCOME_SEEN_AT, SUBMITTED_AT, reviewStamps),
        ),
        subscriptionStarts: createSubscriptionStarts(null),
      });

      // act
      const status = await useCase.execute("user_ana");

      // assert
      expect(status).toEqual({
        kind: expected,
        submittedAt: SUBMITTED_AT,
        workStartsOn: null,
      });
    },
  );

  it.each([
    ["a client who has not sent her onboarding", journey(WELCOME_SEEN_AT)],
    ["a subject bound to no client", null],
  ])("answers no status for %s", async (_label, found) => {
    // arrange
    const subscriptionStarts = createSubscriptionStarts({
      startChoice: "waiting",
      purchasedAt: PURCHASED_AT,
    });
    const useCase = new ReadProgramStatusUseCase({
      journeys: createJourneys(found),
      subscriptionStarts,
    });

    // act
    const status = await useCase.execute("user_ana");

    // assert
    expect(status).toBeNull();
    expect(subscriptionStarts.findOpenForClient).not.toHaveBeenCalled();
  });
});
