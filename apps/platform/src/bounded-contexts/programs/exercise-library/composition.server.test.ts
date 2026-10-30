import type { DatabaseClient } from "~/shared/database";
import { describe, expect, it, vi } from "vitest";
import type { SessionAccount } from "~/bounded-contexts/access/public/session";

import { createRequestArgs } from "~/composition-root/test-support/request-args";

import { composeExerciseLibraryFeature } from "./composition.server";

const COACH: SessionAccount = {
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
    const listing = feature.exerciseLibraryController.list(coachArgs());

    // assert
    await expect(listing).rejects.toThrow("database down");
  });

  it("reports a creation that could not reach the exercises table to the logger it is handed", async () => {
    // arrange
    const handles = createHandles();
    const feature = composeExerciseLibraryFeature(handles);

    // act
    const response = await feature.exerciseLibraryController.create(
      coachArgs(jsonRequest("POST")),
    );

    // assert
    expect(response.status).toBe(500);
    expect(handles.loggerPort.error).toHaveBeenCalledWith(
      "Exercise could not be created.",
      { errorCategory: "exercise_creation_failure", errorClass: "Error" },
    );
  });

  it("reports an edit that could not reach the exercises table to the logger it is handed", async () => {
    // arrange
    const handles = createHandles();
    const feature = composeExerciseLibraryFeature(handles);

    // act
    const response = await feature.exerciseLibraryController.edit(
      coachArgs(jsonRequest("PUT")),
      EXERCISE_ID,
    );

    // assert
    expect(response.status).toBe(500);
    expect(handles.loggerPort.error).toHaveBeenCalledWith(
      "Exercise edit could not be written.",
      {
        errorCategory: "exercise_edit_failure",
        errorClass: "Error",
        exerciseId: EXERCISE_ID,
      },
    );
  });
});

describe("composeExerciseLibraryFeature with exercise videos", () => {
  it("stages an uploaded video in the store it is handed and discards it when the creation cannot reach the table", async () => {
    // arrange
    const handles = createHandles();
    const feature = composeExerciseLibraryFeature(handles);

    // act
    const response = await feature.exerciseLibraryController.create(
      coachArgs(multipartRequest()),
    );

    // assert
    expect(response.status).toBe(500);
    expect(handles.exerciseVideoStorePort.receive).toHaveBeenCalledOnce();
    expect(handles.exerciseVideoStorePort.discard).toHaveBeenCalledWith(
      "staging-1",
    );
  });

  it("reads the exercise from the exercises table before opening its video", async () => {
    // arrange
    const handles = createHandles();
    const feature = composeExerciseLibraryFeature(handles);

    // act
    const opening = feature.exerciseLibraryController.openVideo(coachArgs(), {
      exerciseId: EXERCISE_ID,
      videoId: VIDEO_ID,
    });

    // assert
    await expect(opening).rejects.toThrow("database down");
    expect(handles.exerciseVideoStorePort.open).not.toHaveBeenCalled();
  });
});

function createHandles() {
  return {
    clockPort: { now: () => new Date("2026-10-14T09:00:00.000Z") },
    database: createUnreachableDatabase(),
    loggerPort: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
    exerciseVideoFormatDetectorPort: { detect: vi.fn(async () => "mp4") },
    exerciseVideoStorePort: {
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
  const portal = {
    appBasePath: "/",
    publicAppUrl: "https://evoa.fit",
    signInUrl: "https://accounts.evoa.fit/sign-in",
  };

  return createRequestArgs({
    portal,
    session: { account: COACH, kind: "authenticated" },
    request,
  });
}
