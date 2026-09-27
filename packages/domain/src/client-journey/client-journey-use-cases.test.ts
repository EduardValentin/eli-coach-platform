import { describe, expect, it, vi } from "vitest";

import { ClientJourney } from "./client-journey";
import type { ClientJourneys } from "./client-journeys";
import { MarkWelcomeSeenUseCase } from "./mark-welcome-seen-use-case";
import { ReadClientJourneyUseCase } from "./read-client-journey-use-case";

const NOW = new Date("2026-09-27T10:00:00.000Z");

function journey(welcomeSeenAt: Date | null): ClientJourney {
  return ClientJourney.from({
    clientId: "client-1",
    firstName: "Ana",
    gender: "female",
    welcomeSeenAt,
  });
}

function createJourneys(found: ClientJourney | null) {
  return {
    findByAuthSubjectId: vi.fn().mockResolvedValue(found),
    recordWelcomeSeen: vi.fn().mockResolvedValue(undefined),
  } satisfies ClientJourneys;
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
