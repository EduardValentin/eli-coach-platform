import { RouterContextProvider, type ActionFunctionArgs } from "react-router";
import { describe, expect, it, vi } from "vitest";

import type { Exercise, ExerciseLibraryService } from "@eli-coach-platform/domain";
import { accountContext } from "~/features/accounts/server/account-context.server";

import {
  ExerciseLibraryController,
  MAX_EXERCISE_UPLOAD_BYTES,
} from "./exercise-library-controller.server";

/** An `ftyp` box (isom, mp42) followed by an empty `mdat` box. */
const MP4 = new Uint8Array([
  0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70, 0x69, 0x73, 0x6f, 0x6d,
  0x00, 0x00, 0x02, 0x00, 0x69, 0x73, 0x6f, 0x6d, 0x6d, 0x70, 0x34, 0x32,
  0x00, 0x00, 0x00, 0x08, 0x6d, 0x64, 0x61, 0x74,
]);
const exercise: Exercise = {
  id: "7c1a0e2c-0e4b-4a4e-9d2b-1f2e3d4c5b6a",
  name: "Hip Thrust",
  description: "",
  difficulty: "Intermediate",
  equipment: ["Barbell", "Bench"],
  primaryMuscles: ["Glutes"],
  secondaryMuscles: ["Hamstrings"],
  tags: ["Strength"],
  video: {
    assetKey: "exercise-videos/abc.mp4",
    mimeType: "video/mp4",
    sizeBytes: 32,
    sha256: "a".repeat(64),
  },
  createdAt: new Date("2026-09-02T00:00:00Z"),
  updatedAt: new Date("2026-09-02T00:00:00Z"),
};
const draft = {
  name: "Hip Thrust",
  description: "",
  difficulty: "Intermediate",
  equipment: ["Barbell", "Bench"],
  primaryMuscles: ["Glutes"],
  secondaryMuscles: ["Hamstrings"],
  tags: ["Strength"],
};

function argsFor(
  request: Request,
  role: "COACH" | "USER" | null,
): ActionFunctionArgs {
  const context = new RouterContextProvider();

  context.set(
    accountContext,
    role
      ? {
          kind: "authenticated",
          account: { id: "acct", authSubjectId: "user_1", role, deletedAt: null },
        }
      : { kind: "anonymous" },
  );

  return { context, params: {}, request } as unknown as ActionFunctionArgs;
}

function multipart(
  metadata: unknown,
  video?: { bytes: Uint8Array<ArrayBuffer>; name: string },
): Request {
  const formData = new FormData();

  formData.set("metadata", JSON.stringify(metadata));

  if (video) {
    formData.set(
      "video",
      new File([video.bytes], video.name, { type: "video/mp4" }),
    );
  }

  return new Request("https://eli.example/api/exercises", {
    body: formData,
    method: "POST",
  });
}

function createController(service: Partial<ExerciseLibraryService>) {
  return new ExerciseLibraryController({
    appBasePath: "/eli-coach-platform",
    service: service as ExerciseLibraryService,
  });
}

describe("ExerciseLibraryController", () => {
  it("lists exercises for the coach with base-path-aware video urls", async () => {
    // arrange
    const controller = createController({
      listExercises: vi
        .fn()
        .mockResolvedValue({ status: "available", exercises: [exercise] }),
    });

    // act
    const response = await controller.listExercises(
      argsFor(new Request("https://eli.example/api/exercises"), "COACH"),
    );

    // assert
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      success: true,
      exercises: [
        {
          id: exercise.id,
          video: {
            url: "/eli-coach-platform/api/exercises/videos/exercise-videos%2Fabc.mp4",
            sizeBytes: 32,
          },
        },
      ],
    });
  });

  it("refuses anonymous and non-coach callers before touching the service", async () => {
    // arrange
    const listExercises = vi.fn();
    const controller = createController({ listExercises });
    const request = new Request("https://eli.example/api/exercises");

    // act
    const anonymous = controller.listExercises(argsFor(request, null));
    const member = controller.listExercises(argsFor(request, "USER"));

    // assert
    await expect(anonymous).rejects.toMatchObject({ status: 401 });
    await expect(member).rejects.toMatchObject({ status: 403 });
    expect(listExercises).not.toHaveBeenCalled();
  });

  it("creates from a multipart payload, handing the video bytes and filename to the service", async () => {
    // arrange
    const createExercise = vi.fn().mockResolvedValue({ status: "saved", exercise });
    const controller = createController({ createExercise });

    // act
    const response = await controller.createExercise(
      argsFor(multipart(draft, { bytes: MP4, name: "thrust.mp4" }), "COACH"),
    );

    // assert
    expect(response.status).toBe(201);
    expect(createExercise).toHaveBeenCalledWith({
      draft,
      video: { kind: "replace", bytes: MP4, filename: "thrust.mp4" },
    });
  });

  it("rejects metadata the contract refuses, naming the field", async () => {
    // arrange
    const createExercise = vi.fn();
    const controller = createController({ createExercise });

    // act
    const response = await controller.createExercise(
      argsFor(multipart({ ...draft, name: " " }), "COACH"),
    );

    // assert
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      success: false,
      error: {
        code: "validation_failed",
        issues: [{ path: ["name"], message: "Exercise name is required" }],
      },
    });
    expect(createExercise).not.toHaveBeenCalled();
  });

  it("maps domain video issues onto the video field", async () => {
    // arrange
    const controller = createController({
      createExercise: vi.fn().mockResolvedValue({
        status: "invalid",
        issues: [{ code: "unsupported_video_content" }],
      }),
    });

    // act
    const response = await controller.createExercise(
      argsFor(multipart(draft, { bytes: new Uint8Array(4), name: "x.mp4" }), "COACH"),
    );

    // assert
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      error: { issues: [{ code: "unsupported_video_content", path: ["video"] }] },
    });
  });

  it("answers 413 to a payload over the upload cap without reading it", async () => {
    // arrange
    const controller = createController({ createExercise: vi.fn() });
    const request = new Request("https://eli.example/api/exercises", {
      body: "x",
      headers: {
        "content-length": String(MAX_EXERCISE_UPLOAD_BYTES + 1),
        "content-type": "multipart/form-data; boundary=b",
      },
      method: "POST",
    });

    // act
    const response = await controller.createExercise(argsFor(request, "COACH"));

    // assert
    expect(response.status).toBe(413);
  });

  it("updates with remove and replace dispositions and reports malformed ids", async () => {
    // arrange
    const updateExercise = vi.fn().mockResolvedValue({ status: "saved", exercise });
    const controller = createController({ updateExercise });

    // act
    await controller.updateExercise(
      argsFor(multipart({ ...draft, video: "remove" }), "COACH"),
      exercise.id,
    );
    await controller.updateExercise(
      argsFor(multipart(draft, { bytes: MP4, name: "n.mp4" }), "COACH"),
      exercise.id,
    );
    const malformed = await controller.updateExercise(
      argsFor(multipart(draft), "COACH"),
      "not-a-uuid",
    );

    // assert
    expect(updateExercise).toHaveBeenNthCalledWith(1, exercise.id, {
      draft,
      video: { kind: "remove" },
    });
    expect(updateExercise).toHaveBeenNthCalledWith(2, exercise.id, {
      draft,
      video: { kind: "replace", bytes: MP4, filename: "n.mp4" },
    });
    expect(malformed.status).toBe(404);
    expect(updateExercise).toHaveBeenCalledTimes(2);
  });
});
