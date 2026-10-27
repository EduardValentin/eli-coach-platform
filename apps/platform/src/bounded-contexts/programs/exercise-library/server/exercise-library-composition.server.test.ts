import type { DatabaseClient } from "~/shared/database";
import type { AccountSnapshot } from "@eli-coach-platform/domain/account";
import { describe, expect, it, vi } from "vitest";

import type { AccountsFeature } from "~/bounded-contexts/access/accounts/server/accounts-composition.server";
import { accountsContext } from "~/bounded-contexts/access/accounts/server/guards/accounts-context.server";
import { sessionContext } from "~/bounded-contexts/access/accounts/server/guards/session-context.server";
import {
  contextEntry,
  createRequestArgs,
} from "~/composition-root/test-support/request-args";

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
  video: "keep",
};

const VIDEO_ID = "3c4d5e6f-7a8b-4c9d-8e0f-1a2b3c4d5e6f";

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

describe("composeExerciseLibraryFeature with exercise videos", () => {
  it("stages an uploaded video in the store it is handed and discards it when the creation cannot reach the table", async () => {
    // arrange
    const handles = createHandles();
    const feature = composeExerciseLibraryFeature(handles);

    // act
    const response = await feature.exerciseLibrary.create(
      coachArgs(multipartRequest()),
    );

    // assert
    expect(response.status).toBe(500);
    expect(handles.videoStore.receive).toHaveBeenCalledOnce();
    expect(handles.videoStore.discard).toHaveBeenCalledWith("staging-1");
  });

  it("reads the exercise from the exercises table before opening its video", async () => {
    // arrange
    const handles = createHandles();
    const feature = composeExerciseLibraryFeature(handles);

    // act
    const opening = feature.exerciseLibrary.openVideo(coachArgs(), {
      exerciseId: EXERCISE_ID,
      videoId: VIDEO_ID,
    });

    // assert
    await expect(opening).rejects.toThrow("database down");
    expect(handles.videoStore.open).not.toHaveBeenCalled();
  });
});

function createHandles() {
  return {
    clock: { now: () => new Date("2026-10-14T09:00:00.000Z") },
    database: createUnreachableDatabase(),
    incidents: {
      exerciseCreationFailed: vi.fn(),
      exerciseEditFailed: vi.fn(),
      exerciseRestoreFailed: vi.fn(),
      videoCleanupFailed: vi.fn(),
    },
    videoFormats: { detect: vi.fn(async () => "mp4") },
    videoStore: {
      receive: vi.fn(async (bytes: AsyncIterable<Uint8Array>) => {
        for await (const _chunk of bytes) {
          continue;
        }

        return {
          stagingId: "staging-1",
          sizeBytes: 3,
          leadingBytes: new Uint8Array([1, 2, 3]),
        };
      }),
      keep: vi.fn(),
      discard: vi.fn(async () => undefined),
      remove: vi.fn(),
      open: vi.fn(),
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

function multipartRequest(): Request {
  const form = new FormData();
  form.set("exercise", JSON.stringify({ ...SQUAT_REQUEST, video: "attach" }));
  form.set(
    "video",
    new File([new Uint8Array([1, 2, 3])], "squat.mp4", { type: "video/mp4" }),
  );

  return new Request("https://evoa.fit/api/coach/exercises", {
    body: form,
    method: "POST",
  });
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
