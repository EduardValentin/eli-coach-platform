import type { DatabaseClient } from "@eli-coach-platform/db";
import type { AccountSnapshot } from "@eli-coach-platform/domain/account";
import { describe, expect, it, vi } from "vitest";

import type { AccountsFeature } from "~/features/accounts/server/accounts-composition.server";
import { accountsContext } from "~/features/accounts/server/guards/accounts-context.server";
import { sessionContext } from "~/features/accounts/server/guards/session-context.server";
import {
  contextEntry,
  createRequestArgs,
} from "~/server/test-support/request-args";

import { composeExerciseLibraryFeature } from "./exercise-library-composition.server";

const COACH: AccountSnapshot = {
  authSubjectId: "user_coach",
  id: "acct_coach",
  role: "COACH",
};

const EXERCISE_ID = "1a2b3c4d-5e6f-4a7b-8c9d-0e1f2a3b4c5d";

const SQUAT_REQUEST = {
  name: "Back squat",
  type: "resistance",
  unit: "reps",
  perSide: false,
  primaryMuscles: ["Quadriceps"],
  secondaryMuscles: [],
  equipment: ["Barbell"],
  difficulty: "Beginner",
  tags: [],
  cues: "",
};

describe("composeExerciseLibraryFeature", () => {
  it("lists the library from the exercises table", async () => {
    // arrange
    const feature = composeExerciseLibraryFeature(createHandles());

    // act
    const listing = feature.exerciseLibrary.list(coachArgs());

    // assert
    await expect(listing).rejects.toThrow("database down");
  });

  it("reports a creation that could not reach the exercises table to the incidents it is handed", async () => {
    // arrange
    const handles = createHandles();
    const feature = composeExerciseLibraryFeature(handles);

    // act
    const response = await feature.exerciseLibrary.create(
      coachArgs(jsonRequest("POST")),
    );

    // assert
    expect(response.status).toBe(500);
    expect(handles.incidents.exerciseCreationFailed).toHaveBeenCalledWith({
      error: new Error("database down"),
    });
  });

  it("reports an edit that could not reach the exercises table to the incidents it is handed", async () => {
    // arrange
    const handles = createHandles();
    const feature = composeExerciseLibraryFeature(handles);

    // act
    const response = await feature.exerciseLibrary.edit(
      coachArgs(jsonRequest("PUT")),
      EXERCISE_ID,
    );

    // assert
    expect(response.status).toBe(500);
    expect(handles.incidents.exerciseEditFailed).toHaveBeenCalledWith({
      exerciseId: EXERCISE_ID,
      error: new Error("database down"),
    });
  });
});

function createHandles() {
  return {
    clock: { now: () => new Date("2026-10-14T09:00:00.000Z") },
    database: createUnreachableDatabase(),
    incidents: {
      exerciseCreationFailed: vi.fn(),
      exerciseEditFailed: vi.fn(),
    },
  };
}

function createUnreachableDatabase(): DatabaseClient {
  return {
    select: () => {
      throw new Error("database down");
    },
  } as unknown as DatabaseClient;
}

function jsonRequest(method: "POST" | "PUT"): Request {
  return new Request("https://evoa.fit/api/coach/exercises", {
    body: JSON.stringify(SQUAT_REQUEST),
    headers: { "Content-Type": "application/json" },
    method,
  });
}

function coachArgs(request = new Request("https://evoa.fit/coach/training")) {
  const accounts = {
    portal: {
      appBasePath: "/",
      publicAppUrl: "https://evoa.fit",
      signInUrl: "https://accounts.evoa.fit/sign-in",
    },
  } as unknown as AccountsFeature;

  return createRequestArgs({
    contexts: [
      contextEntry(accountsContext, accounts),
      contextEntry(sessionContext, { account: COACH, kind: "authenticated" }),
    ],
    request,
  });
}
