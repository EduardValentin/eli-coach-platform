import { describe, expect, it } from "vitest";

import type { CoachingEndedFacade } from "~/bounded-contexts/sales/public/coaching-ended-facade";

import { SalesCoachingEndedAdapter } from "./sales-coaching-ended-adapter.server";

function coachingEndedFacadeOver(coachingEnded: boolean) {
  const asked: string[] = [];
  const coachingEndedFacade: CoachingEndedFacade = {
    coachingEndedOf: async (clientId) => {
      asked.push(clientId);

      return { clientId, coachingEnded };
    },
  };

  return { coachingEndedFacade, asked };
}

describe("SalesCoachingEndedAdapter.hasEnded", () => {
  it.each([true, false])(
    "answers as the sales facade does when her coaching has ended is %s, asking it for the client it was given",
    async (coachingEnded) => {
      // arrange
      const { coachingEndedFacade, asked } =
        coachingEndedFacadeOver(coachingEnded);
      const salesCoachingEndedAdapter = new SalesCoachingEndedAdapter(
        coachingEndedFacade,
      );

      // act
      const hasEnded = await salesCoachingEndedAdapter.hasEnded("client-1");

      // assert
      expect(hasEnded).toBe(coachingEnded);
      expect(asked).toEqual(["client-1"]);
    },
  );
});
