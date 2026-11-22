import { describe, expect, it } from "vitest";

import type { ReadCoachingEndedUseCase } from "~/bounded-contexts/sales/subscriptions/domain/coaching-subscription";
import type { UnitOfWork } from "~/shared/http/unit-of-work";

import { CoachingEndedFacadeAdapter } from "./coaching-ended-facade-adapter.server";

function coachingEndedFacadeAdapterOver(coachingEnded: boolean) {
  const readClientIds: string[] = [];
  let unitsOfWorkOpened = 0;
  const readCoachingEndedUseCase = {
    execute: async (clientId: string) => {
      readClientIds.push(clientId);

      return coachingEnded;
    },
  } as unknown as ReadCoachingEndedUseCase;
  const unitOfWork: UnitOfWork = async (work) => {
    unitsOfWorkOpened += 1;

    return work();
  };

  return {
    coachingEndedFacadeAdapter: new CoachingEndedFacadeAdapter({
      readCoachingEndedUseCase,
      unitOfWork,
    }),
    readClientIds,
    unitsOfWorkOpened: () => unitsOfWorkOpened,
  };
}

describe("CoachingEndedFacadeAdapter", () => {
  it.each([true, false])(
    "answers the client's coaching as ended = %s, naming the client it answers for",
    async (coachingEnded) => {
      // arrange
      const { coachingEndedFacadeAdapter, readClientIds } =
        coachingEndedFacadeAdapterOver(coachingEnded);

      // act
      const dto = await coachingEndedFacadeAdapter.coachingEndedOf("client-1");

      // assert
      expect(dto).toEqual({ clientId: "client-1", coachingEnded });
      expect(readClientIds).toEqual(["client-1"]);
    },
  );

  it("reads inside a unit of work, so it joins the caller's", async () => {
    // arrange
    const { coachingEndedFacadeAdapter, unitsOfWorkOpened } =
      coachingEndedFacadeAdapterOver(false);

    // act
    await coachingEndedFacadeAdapter.coachingEndedOf("client-1");

    // assert
    expect(unitsOfWorkOpened()).toBe(1);
  });
});
