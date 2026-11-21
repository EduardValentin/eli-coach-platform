import type { DatabaseClient } from "~/shared/database";
import { describe, expect, it, vi } from "vitest";
import type { SessionAccount } from "~/bounded-contexts/access/public/session";
import type { ClientCoachingDto } from "~/bounded-contexts/clients/public/client-coaching-facade";

import { createRequestArgs } from "~/composition-root/test-support/request-args";

import { composeTrainingProgramsFeature } from "./composition.server";

const COACH: SessionAccount = {
  authSubjectId: "user_coach",
  id: "acct_coach",
  role: "COACH",
};

const CLIENT_ID = "7c6c5a52-8f4f-4e5a-a2b7-5c3f6a9c1d22";

const ANA: ClientCoachingDto = {
  clientId: CLIENT_ID,
  firstName: "Ana",
  lastName: "Popescu",
  gender: "female",
  answersApproved: true,
  coachingEnded: false,
  coachingFacts: {
    primaryGoal: "Build muscle",
    level: "beginner",
    trainingDays: 3,
    sessionMinutes: 60,
    equipment: ["Dumbbells"],
  },
  equipmentOptions: [
    { equipment: "Dumbbells", exclusive: false },
    { equipment: "Bodyweight only", exclusive: true },
  ],
  primaryGoalOptions: ["Build muscle"],
};

const SETUP = {
  goal: "Build muscle",
  level: "beginner",
  trainingDays: 3,
  sessionMinutes: 60,
  language: "en",
  dailySteps: 6000,
  splitShape: "full-body",
  equipment: ["Bodyweight only"],
};

describe("composeTrainingProgramsFeature", () => {
  it("reads the card from the client's coaching and the programs table", async () => {
    // arrange
    const handles = createHandles();
    const feature = composeTrainingProgramsFeature(handles);

    // act
    const card = await feature.coachProgramController.loadCard(
      coachArgs(),
      CLIENT_ID,
    );

    // assert
    expect(card).toEqual({ state: "ready-to-build", gender: "female" });
    expect(handles.clientCoachingFacade.coachingOf).toHaveBeenCalledWith(
      CLIENT_ID,
    );
  });

  it("reads the setup with the choices the client's coaching offers", async () => {
    // arrange
    const feature = composeTrainingProgramsFeature(createHandles());

    // act
    const setup = await feature.coachProgramController.loadSetup(
      coachArgs(),
      CLIENT_ID,
    );

    // assert
    expect(setup).toMatchObject({
      state: "ready",
      choices: {
        goals: [{ value: "Build muscle", label: "Muscle gain" }],
        equipment: [
          { value: "Dumbbells", exclusive: false },
          { value: "Bodyweight only", exclusive: true },
        ],
      },
    });
  });

  it("reports a start that could not reach the programs table to the logger it is handed, and saves no equipment", async () => {
    // arrange
    const handles = createHandles();
    const feature = composeTrainingProgramsFeature(handles);

    // act
    const outcome = await feature.coachProgramController.create(
      coachArgs(
        new Request(`https://evoa.fit/coach/clients/${CLIENT_ID}/program/new`, {
          body: JSON.stringify(SETUP),
          headers: { "Content-Type": "application/json" },
          method: "POST",
        }),
      ),
      CLIENT_ID,
    );

    // assert
    expect(outcome).toEqual({ status: "failed" });
    expect(
      handles.cardioExercisesFacade.listCardioExercises,
    ).toHaveBeenCalledWith(COACH.id);
    expect(handles.loggerPort.error).toHaveBeenCalledOnce();
    expect(handles.loggerPort.error).toHaveBeenCalledWith(
      "Program could not be started; nothing was saved.",
      {
        clientId: CLIENT_ID,
        errorCategory: "program_start_failure",
        errorClass: "Error",
      },
    );
    expect(handles.clientCoachingFacade.saveEquipment).not.toHaveBeenCalled();
  });
});

function createHandles() {
  return {
    cardioExercisesFacade: {
      listCardioExercises: vi.fn().mockResolvedValue([]),
    },
    clientCoachingFacade: {
      coachingOf: vi.fn().mockResolvedValue(ANA),
      saveEquipment: vi.fn().mockResolvedValue({ status: "saved" }),
    },
    clockPort: { now: () => new Date("2026-11-20T09:00:00.000Z") },
    database: createDatabaseWithoutProgramsThatRefusesWrites(),
    loggerPort: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
  };
}

function createDatabaseWithoutProgramsThatRefusesWrites(): DatabaseClient {
  const noRows = {
    from: () => ({ where: () => ({ limit: async () => [] }) }),
  };
  const transaction = {
    select: () => noRows,
    insert: () => {
      throw new Error("database down");
    },
    transaction: (work: (executor: unknown) => Promise<unknown>) =>
      work(transaction),
  };

  return {
    select: () => noRows,
    transaction: transaction.transaction,
  } as unknown as DatabaseClient;
}

function coachArgs(
  request = new Request(`https://evoa.fit/coach/clients/${CLIENT_ID}`),
) {
  return createRequestArgs({
    portal: {
      appBasePath: "/",
      publicAppUrl: "https://evoa.fit",
      signInUrl: "https://accounts.evoa.fit/sign-in",
    },
    session: { account: COACH, kind: "authenticated" },
    request,
  });
}
