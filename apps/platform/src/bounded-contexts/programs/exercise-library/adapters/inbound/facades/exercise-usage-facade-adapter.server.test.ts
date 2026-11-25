import { describe, expect, it } from "vitest";

import type { RecordExerciseUsageUseCase } from "~/bounded-contexts/programs/exercise-library/domain/exercise";
import type { UnitOfWork } from "~/shared/http/unit-of-work";

import { ExerciseUsageFacadeAdapter } from "./exercise-usage-facade-adapter.server";

const COACH_ACCOUNT_ID = "c0000000-0000-4000-8000-000000000001";
const PROGRAM_ID = "a0000000-0000-4000-8000-000000000001";
const HIP_THRUST_ID = "e0000000-0000-4000-8000-000000000001";

type Recording = { status: "recorded" } | { status: "unknown-exercise" };

function exerciseUsageFacadeAdapterAnswering(recording: Recording) {
  const recorded: unknown[] = [];
  let unitsOfWorkOpened = 0;
  const recordExerciseUsageUseCase = {
    execute: async (input: unknown) => {
      recorded.push(input);

      return recording;
    },
  } as unknown as RecordExerciseUsageUseCase;
  const unitOfWork: UnitOfWork = async (work) => {
    unitsOfWorkOpened += 1;

    return work();
  };

  return {
    exerciseUsageFacadeAdapter: new ExerciseUsageFacadeAdapter({
      recordExerciseUsageUseCase,
      unitOfWork,
    }),
    recorded,
    unitsOfWorkOpened: () => unitsOfWorkOpened,
  };
}

describe("ExerciseUsageFacadeAdapter", () => {
  it.each<Recording>([{ status: "recorded" }, { status: "unknown-exercise" }])(
    "records the exercises a program version uses for the coach and answers %o",
    async (recording) => {
      // arrange
      const { exerciseUsageFacadeAdapter, recorded } =
        exerciseUsageFacadeAdapterAnswering(recording);

      // act
      const answer = await exerciseUsageFacadeAdapter.recordVersionUsage({
        coachAccountId: COACH_ACCOUNT_ID,
        programId: PROGRAM_ID,
        versionNumber: 3,
        exerciseIds: [HIP_THRUST_ID],
      });

      // assert
      expect(answer).toEqual(recording);
      expect(recorded).toEqual([
        {
          ownerAccountId: COACH_ACCOUNT_ID,
          programId: PROGRAM_ID,
          versionNumber: 3,
          exerciseIds: [HIP_THRUST_ID],
        },
      ]);
    },
  );

  it("records inside a unit of work, so it joins the caller's", async () => {
    // arrange
    const { exerciseUsageFacadeAdapter, unitsOfWorkOpened } =
      exerciseUsageFacadeAdapterAnswering({ status: "recorded" });

    // act
    await exerciseUsageFacadeAdapter.recordVersionUsage({
      coachAccountId: COACH_ACCOUNT_ID,
      programId: PROGRAM_ID,
      versionNumber: 1,
      exerciseIds: [],
    });

    // assert
    expect(unitsOfWorkOpened()).toBe(1);
  });
});
