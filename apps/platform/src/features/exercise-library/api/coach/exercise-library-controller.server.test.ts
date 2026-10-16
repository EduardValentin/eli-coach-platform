import type { AccountSnapshot } from "@eli-coach-platform/domain/account";
import {
  Exercise,
  type CreateExerciseResult,
  type CreateExerciseUseCase,
  type EditExerciseResult,
  type EditExerciseUseCase,
  type ExerciseSnapshot,
  type FindExerciseResult,
  type FindExerciseUseCase,
  type ListExercisesUseCase,
  type OpenExerciseVideoResult,
  type OpenExerciseVideoUseCase,
  type StageExerciseVideoUseCase,
  type StagedExerciseVideo,
} from "@eli-coach-platform/domain/exercise";
import { describe, expect, it, vi } from "vitest";

import type { AccountsFeature } from "~/features/accounts/server/accounts-composition.server";
import { accountsContext } from "~/features/accounts/server/guards/accounts-context.server";
import {
  sessionContext,
  type ResolvedSession,
} from "~/features/accounts/server/guards/session-context.server";
import {
  contextEntry,
  createRequestArgs,
} from "~/server/test-support/request-args";

import { ExerciseLibraryController } from "./exercise-library-controller.server";

const EXERCISE_ID = "1a2b3c4d-5e6f-4a7b-8c9d-0e1f2a3b4c5d";
const VIDEO_ID = "3c4d5e6f-7a8b-4c9d-8e0f-1a2b3c4d5e6f";
const AT = new Date("2026-10-14T09:00:00.000Z");

const COACH: AccountSnapshot = {
  authSubjectId: "user_eli",
  id: "c0000000-0000-4000-8000-000000000001",
  role: "COACH",
};

const CLIENT_SESSION: ResolvedSession = {
  account: { authSubjectId: "user_ana", id: "acct_ana", role: "CLIENT" },
  kind: "authenticated",
};

const ANONYMOUS_SESSION: ResolvedSession = { kind: "anonymous" };

const HIP_THRUST: ExerciseSnapshot = {
  id: EXERCISE_ID,
  ownerAccountId: COACH.id,
  name: "Hip thrust",
  type: "resistance",
  unit: "reps",
  perSide: false,
  primaryMuscles: ["Glutes"],
  secondaryMuscles: ["Hamstrings"],
  equipment: ["Barbell", "Bench"],
  difficulty: "Beginner",
  tags: ["Hypertrophy"],
  cues: "Chin tucked.",
  video: { videoId: VIDEO_ID, format: "mp4", sizeBytes: 2_048 },
  archivedAt: null,
  createdAt: AT,
  updatedAt: AT,
};

const HIP_THRUST_VIEW = {
  id: EXERCISE_ID,
  name: "Hip thrust",
  type: "resistance",
  unit: "reps",
  perSide: false,
  primaryMuscles: ["Glutes"],
  secondaryMuscles: ["Hamstrings"],
  equipment: ["Barbell", "Bench"],
  difficulty: "Beginner",
  tags: ["Hypertrophy"],
  cues: "Chin tucked.",
  video: {
    path: `/api/exercises/${EXERCISE_ID}/video/${VIDEO_ID}`,
    format: "mp4",
  },
};

const { id: _id, video: _video, ...HIP_THRUST_DRAFT } = HIP_THRUST_VIEW;

const HIP_THRUST_REQUEST = { ...HIP_THRUST_DRAFT, video: "keep" };

const STAGED: StagedExerciseVideo = {
  stagingId: "staging-1",
  sizeBytes: 3,
  leadingBytes: new Uint8Array([1, 2, 3]),
};

const VIDEO_BYTES = new Uint8Array([1, 2, 3]);

const OPENED: OpenExerciseVideoResult = {
  status: "opened",
  mediaType: "video/mp4",
  bytes: (async function* () {
    yield new Uint8Array([2, 3]);
  })(),
  sizeBytes: 2_048,
  served: { start: 1, end: 2 },
};

function createController() {
  const listExercises = {
    execute: vi.fn(async () => ({
      status: "listed" as const,
      exercises: [Exercise.reconstitute(HIP_THRUST)],
    })),
  };
  const findExercise = {
    execute: vi.fn(async (): Promise<FindExerciseResult> => ({
      status: "found",
      exercise: Exercise.reconstitute(HIP_THRUST),
      otherNames: ["Back squat"],
    })),
  };
  const createExercise = {
    execute: vi.fn(async (): Promise<CreateExerciseResult> => ({
      status: "created",
      exercise: Exercise.reconstitute(HIP_THRUST),
    })),
  };
  const editExercise = {
    execute: vi.fn(async (): Promise<EditExerciseResult> => ({
      status: "edited",
      exercise: Exercise.reconstitute(HIP_THRUST),
    })),
  };
  const received: Uint8Array[] = [];
  const stageExerciseVideo = {
    execute: vi.fn(async (bytes: AsyncIterable<Uint8Array>) => {
      for await (const chunk of bytes) {
        received.push(chunk);
      }

      return STAGED;
    }),
    discard: vi.fn(async () => undefined),
  };
  const openExerciseVideo = {
    execute: vi.fn(async (): Promise<OpenExerciseVideoResult> => OPENED),
  };
  const controller = new ExerciseLibraryController({
    listExercises: listExercises as unknown as ListExercisesUseCase,
    findExercise: findExercise as unknown as FindExerciseUseCase,
    createExercise: createExercise as unknown as CreateExerciseUseCase,
    editExercise: editExercise as unknown as EditExerciseUseCase,
    stageExerciseVideo:
      stageExerciseVideo as unknown as StageExerciseVideoUseCase,
    openExerciseVideo: openExerciseVideo as unknown as OpenExerciseVideoUseCase,
  });

  return {
    controller,
    listExercises,
    findExercise,
    createExercise,
    editExercise,
    stageExerciseVideo,
    openExerciseVideo,
    received: () => Buffer.concat(received),
  };
}

function argsFor(
  options: { session?: ResolvedSession; request?: Request } = {},
) {
  const accounts = {
    portal: {
      appBasePath: "/app",
      publicAppUrl: "https://evoa.fit",
      signInUrl: "https://accounts.evoa.fit/sign-in",
    },
  } as unknown as AccountsFeature;

  return createRequestArgs({
    contexts: [
      contextEntry(accountsContext, accounts),
      contextEntry(
        sessionContext,
        options.session ?? { account: COACH, kind: "authenticated" },
      ),
    ],
    request: options.request,
  });
}

function multipartRequest(
  method: "POST" | "PUT",
  parts: { exercise?: unknown; video?: Uint8Array<ArrayBuffer> },
): Request {
  const form = new FormData();

  if (parts.exercise !== undefined) {
    form.set(
      "exercise",
      typeof parts.exercise === "string"
        ? parts.exercise
        : JSON.stringify(parts.exercise),
    );
  }

  if (parts.video) {
    form.set(
      "video",
      new File([parts.video], "squat.mp4", { type: "video/mp4" }),
    );
  }

  return new Request("https://evoa.fit/api/coach/exercises", {
    body: form,
    method,
  });
}

async function withMediaTypeSpelled(
  request: Request,
  spelling: string,
): Promise<Request> {
  const contentType = request.headers.get("Content-Type") ?? "";

  return new Request(request.url, {
    body: await request.arrayBuffer(),
    headers: {
      "Content-Type": contentType.replace("multipart/form-data", spelling),
    },
    method: request.method,
  });
}

function videoRequest(range?: string): Request {
  return new Request(
    `https://evoa.fit/api/exercises/${EXERCISE_ID}/video/${VIDEO_ID}`,
    { headers: range ? { Range: range } : {} },
  );
}

function jsonRequest(method: "POST" | "PUT", body: unknown): Request {
  return new Request("https://evoa.fit/api/coach/exercises", {
    body: typeof body === "string" ? body : JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
    method,
  });
}

async function captureThrown(thunk: () => unknown): Promise<unknown> {
  try {
    await thunk();
    return undefined;
  } catch (thrown) {
    return thrown;
  }
}

describe("ExerciseLibraryController#list", () => {
  it("presents every exercise the signed-in coach's library lists", async () => {
    // arrange
    const { controller, listExercises } = createController();

    // act
    const library = await controller.list(argsFor());

    // assert
    expect(library).toEqual({ exercises: [HIP_THRUST_VIEW] });
    expect(listExercises.execute).toHaveBeenCalledWith(COACH.id);
  });

  it("refuses a signed-in client", async () => {
    // arrange
    const { controller } = createController();

    // act
    const thrown = await captureThrown(() =>
      controller.list(argsFor({ session: CLIENT_SESSION })),
    );

    // assert
    expect((thrown as Response).status).toBe(403);
  });
});

describe("ExerciseLibraryController#loadNew", () => {
  it("opens a blank exercise with the names of every exercise in the signed-in coach's library", async () => {
    // arrange
    const { controller, listExercises } = createController();

    // act
    const editor = await controller.loadNew(argsFor());

    // assert
    expect(editor).toEqual({ exercise: null, otherNames: ["Hip thrust"] });
    expect(listExercises.execute).toHaveBeenCalledWith(COACH.id);
  });

  it("refuses a signed-in client", async () => {
    // arrange
    const { controller } = createController();

    // act
    const thrown = await captureThrown(() =>
      controller.loadNew(argsFor({ session: CLIENT_SESSION })),
    );

    // assert
    expect((thrown as Response).status).toBe(403);
  });
});

describe("ExerciseLibraryController#load", () => {
  it("presents the signed-in coach's exercise with the names of her other exercises", async () => {
    // arrange
    const { controller, findExercise } = createController();

    // act
    const editor = await controller.load(argsFor(), EXERCISE_ID);

    // assert
    expect(editor).toEqual({
      exercise: HIP_THRUST_VIEW,
      otherNames: ["Back squat"],
    });
    expect(findExercise.execute).toHaveBeenCalledWith({
      ownerAccountId: COACH.id,
      exerciseId: EXERCISE_ID,
    });
  });

  it.each([
    ["an unknown exercise", EXERCISE_ID],
    ["an id that is not a uuid", "not-an-exercise"],
  ])("sends the coach back to the library for %s", async (_case, id) => {
    // arrange
    const { controller, findExercise } = createController();
    findExercise.execute.mockResolvedValueOnce({ status: "not-found" });

    // act
    const thrown = await captureThrown(() => controller.load(argsFor(), id));

    // assert
    expect((thrown as Response).status).toBe(302);
    expect((thrown as Response).headers.get("Location")).toBe(
      "/coach/training",
    );
  });

  it("sends the coach back to the library for an archived exercise", async () => {
    // arrange
    const { controller, findExercise } = createController();
    findExercise.execute.mockResolvedValueOnce({ status: "archived" });

    // act
    const thrown = await captureThrown(() =>
      controller.load(argsFor(), EXERCISE_ID),
    );

    // assert
    expect((thrown as Response).status).toBe(302);
    expect((thrown as Response).headers.get("Location")).toBe(
      "/coach/training",
    );
  });
});

describe("ExerciseLibraryController#create", () => {
  it("creates the exercise for the signed-in coach and names the library as the next page", async () => {
    // arrange
    const { controller, createExercise } = createController();

    // act
    const response = await controller.create(
      argsFor({ request: jsonRequest("POST", HIP_THRUST_REQUEST) }),
    );

    // assert
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ redirectTo: "/coach/training" });
    expect(createExercise.execute).toHaveBeenCalledWith({
      ownerAccountId: COACH.id,
      draft: HIP_THRUST_DRAFT,
      video: { kind: "keep" },
    });
  });

  it("stages the video of a multipart save and creates the exercise with it attached", async () => {
    // arrange
    const { controller, createExercise, stageExerciseVideo, received } =
      createController();
    const request = multipartRequest("POST", {
      exercise: { ...HIP_THRUST_DRAFT, video: "attach" },
      video: VIDEO_BYTES,
    });

    // act
    const response = await controller.create(argsFor({ request }));

    // assert
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ redirectTo: "/coach/training" });
    expect(received()).toEqual(Buffer.from(VIDEO_BYTES));
    expect(createExercise.execute).toHaveBeenCalledWith({
      ownerAccountId: COACH.id,
      draft: HIP_THRUST_DRAFT,
      video: { kind: "attach", staged: STAGED },
    });
    expect(stageExerciseVideo.discard).not.toHaveBeenCalled();
  });

  it("reads a multipart save whose media type comes in capitals and padded before its parameters", async () => {
    // arrange
    const { controller, createExercise, received } = createController();
    const request = await withMediaTypeSpelled(
      multipartRequest("POST", {
        exercise: { ...HIP_THRUST_DRAFT, video: "attach" },
        video: VIDEO_BYTES,
      }),
      "Multipart/Form-Data ",
    );

    // act
    const response = await controller.create(argsFor({ request }));

    // assert
    expect(response.status).toBe(200);
    expect(received()).toEqual(Buffer.from(VIDEO_BYTES));
    expect(createExercise.execute).toHaveBeenCalledWith({
      ownerAccountId: COACH.id,
      draft: HIP_THRUST_DRAFT,
      video: { kind: "attach", staged: STAGED },
    });
  });

  it("answers 422 naming the video when the save refuses its content", async () => {
    // arrange
    const { controller, createExercise } = createController();
    createExercise.execute.mockResolvedValueOnce({
      status: "invalid",
      problems: { video: "unsupported" },
    });
    const request = multipartRequest("POST", {
      exercise: { ...HIP_THRUST_DRAFT, video: "attach" },
      video: VIDEO_BYTES,
    });

    // act
    const response = await controller.create(argsFor({ request }));

    // assert
    expect(response.status).toBe(422);
    expect(await response.json()).toEqual({
      problems: { video: "unsupported" },
    });
  });

  it.each([
    ["an exercise part that is not JSON", "{"],
    [
      "an exercise part missing a field",
      { ...HIP_THRUST_DRAFT, cues: undefined, video: "attach" },
    ],
    ["a file sent beside a kept video", { ...HIP_THRUST_DRAFT, video: "keep" }],
  ])(
    "discards the staged video and answers 400 to %s",
    async (_case, exercise) => {
      // arrange
      const { controller, createExercise, stageExerciseVideo } =
        createController();
      const request = multipartRequest("POST", {
        exercise,
        video: VIDEO_BYTES,
      });

      // act
      const response = await controller.create(argsFor({ request }));

      // assert
      expect(response.status).toBe(400);
      expect(stageExerciseVideo.discard).toHaveBeenCalledWith(STAGED);
      expect(createExercise.execute).not.toHaveBeenCalled();
    },
  );

  it("answers 400 to an attached video with no file", async () => {
    // arrange
    const { controller, createExercise } = createController();
    const request = multipartRequest("POST", {
      exercise: { ...HIP_THRUST_DRAFT, video: "attach" },
    });

    // act
    const response = await controller.create(argsFor({ request }));

    // assert
    expect(response.status).toBe(400);
    expect(createExercise.execute).not.toHaveBeenCalled();
  });

  it("answers 400 to a JSON save that claims an attached video", async () => {
    // arrange
    const { controller, createExercise } = createController();

    // act
    const response = await controller.create(
      argsFor({
        request: jsonRequest("POST", {
          ...HIP_THRUST_DRAFT,
          video: "attach",
        }),
      }),
    );

    // assert
    expect(response.status).toBe(400);
    expect(createExercise.execute).not.toHaveBeenCalled();
  });

  it("answers 413 naming the video, without staging it, to a body declared over the upload cap", async () => {
    // arrange
    const { controller, createExercise, stageExerciseVideo } =
      createController();
    const request = new Request("https://evoa.fit/api/coach/exercises", {
      body: "--x--",
      headers: {
        "Content-Length": String(60 * 1024 * 1024),
        "Content-Type": "multipart/form-data; boundary=x",
      },
      method: "POST",
    });

    // act
    const response = await controller.create(argsFor({ request }));

    // assert
    expect(response.status).toBe(413);
    expect(await response.json()).toEqual({
      problems: { video: "too-large" },
    });
    expect(stageExerciseVideo.execute).not.toHaveBeenCalled();
    expect(createExercise.execute).not.toHaveBeenCalled();
  });

  it("answers 422 with the problems of a draft that breaks a rule", async () => {
    // arrange
    const { controller, createExercise } = createController();
    createExercise.execute.mockResolvedValueOnce({
      status: "invalid",
      problems: { name: "taken", cues: "too-long" },
    });

    // act
    const response = await controller.create(
      argsFor({ request: jsonRequest("POST", HIP_THRUST_REQUEST) }),
    );

    // assert
    expect(response.status).toBe(422);
    expect(await response.json()).toEqual({
      problems: { name: "taken", cues: "too-long" },
    });
  });

  it.each([
    ["a body that is not JSON", "{"],
    ["a body missing a field", { ...HIP_THRUST_REQUEST, cues: undefined }],
    ["a muscle that is not text", { ...HIP_THRUST_REQUEST, tags: [3] }],
  ])("answers 400 to %s without creating", async (_case, body) => {
    // arrange
    const { controller, createExercise } = createController();

    // act
    const response = await controller.create(
      argsFor({ request: jsonRequest("POST", body) }),
    );

    // assert
    expect(response.status).toBe(400);
    expect(createExercise.execute).not.toHaveBeenCalled();
  });

  it("answers 500 when the creation failed", async () => {
    // arrange
    const { controller, createExercise } = createController();
    createExercise.execute.mockResolvedValueOnce({ status: "failed" });

    // act
    const response = await controller.create(
      argsFor({ request: jsonRequest("POST", HIP_THRUST_REQUEST) }),
    );

    // assert
    expect(response.status).toBe(500);
  });

  it.each([
    ["a signed-in client", CLIENT_SESSION, 403],
    ["a signed-out visitor", ANONYMOUS_SESSION, 401],
  ])("refuses %s", async (_case, session, status) => {
    // arrange
    const { controller, createExercise } = createController();

    // act
    const thrown = await captureThrown(() =>
      controller.create(
        argsFor({ session, request: jsonRequest("POST", HIP_THRUST_REQUEST) }),
      ),
    );

    // assert
    expect((thrown as Response).status).toBe(status);
    expect(createExercise.execute).not.toHaveBeenCalled();
  });
});

describe("ExerciseLibraryController#edit", () => {
  it("edits the signed-in coach's exercise and names the library as the next page", async () => {
    // arrange
    const { controller, editExercise } = createController();

    // act
    const response = await controller.edit(
      argsFor({ request: jsonRequest("PUT", HIP_THRUST_REQUEST) }),
      EXERCISE_ID,
    );

    // assert
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ redirectTo: "/coach/training" });
    expect(editExercise.execute).toHaveBeenCalledWith({
      ownerAccountId: COACH.id,
      exerciseId: EXERCISE_ID,
      draft: HIP_THRUST_DRAFT,
      video: { kind: "keep" },
    });
  });

  it("passes a removed video on to the edit", async () => {
    // arrange
    const { controller, editExercise } = createController();

    // act
    await controller.edit(
      argsFor({
        request: jsonRequest("PUT", { ...HIP_THRUST_DRAFT, video: "remove" }),
      }),
      EXERCISE_ID,
    );

    // assert
    expect(editExercise.execute).toHaveBeenCalledWith({
      ownerAccountId: COACH.id,
      exerciseId: EXERCISE_ID,
      draft: HIP_THRUST_DRAFT,
      video: { kind: "remove" },
    });
  });

  it("stages the video of a multipart save and edits the exercise with it attached", async () => {
    // arrange
    const { controller, editExercise } = createController();
    const request = multipartRequest("PUT", {
      exercise: { ...HIP_THRUST_DRAFT, video: "attach" },
      video: VIDEO_BYTES,
    });

    // act
    const response = await controller.edit(argsFor({ request }), EXERCISE_ID);

    // assert
    expect(response.status).toBe(200);
    expect(editExercise.execute).toHaveBeenCalledWith({
      ownerAccountId: COACH.id,
      exerciseId: EXERCISE_ID,
      draft: HIP_THRUST_DRAFT,
      video: { kind: "attach", staged: STAGED },
    });
  });

  it("answers 404 to a multipart save for an id that is not a uuid without staging its video", async () => {
    // arrange
    const { controller, stageExerciseVideo } = createController();
    const request = multipartRequest("PUT", {
      exercise: { ...HIP_THRUST_DRAFT, video: "attach" },
      video: VIDEO_BYTES,
    });

    // act
    const response = await controller.edit(
      argsFor({ request }),
      "not-an-exercise",
    );

    // assert
    expect(response.status).toBe(404);
    expect(stageExerciseVideo.execute).not.toHaveBeenCalled();
  });

  it("answers 422 with the problems of a draft that breaks a rule", async () => {
    // arrange
    const { controller, editExercise } = createController();
    editExercise.execute.mockResolvedValueOnce({
      status: "invalid",
      problems: { primaryMuscles: "missing" },
    });

    // act
    const response = await controller.edit(
      argsFor({ request: jsonRequest("PUT", HIP_THRUST_REQUEST) }),
      EXERCISE_ID,
    );

    // assert
    expect(response.status).toBe(422);
    expect(await response.json()).toEqual({
      problems: { primaryMuscles: "missing" },
    });
  });

  it("answers 404 for an unknown exercise", async () => {
    // arrange
    const { controller, editExercise } = createController();
    editExercise.execute.mockResolvedValueOnce({ status: "not-found" });

    // act
    const response = await controller.edit(
      argsFor({ request: jsonRequest("PUT", HIP_THRUST_REQUEST) }),
      EXERCISE_ID,
    );

    // assert
    expect(response.status).toBe(404);
  });

  it("answers 409 for an archived exercise", async () => {
    // arrange
    const { controller, editExercise } = createController();
    editExercise.execute.mockResolvedValueOnce({ status: "archived" });

    // act
    const response = await controller.edit(
      argsFor({ request: jsonRequest("PUT", HIP_THRUST_REQUEST) }),
      EXERCISE_ID,
    );

    // assert
    expect(response.status).toBe(409);
  });

  it("answers 404 for an id that is not a uuid without editing", async () => {
    // arrange
    const { controller, editExercise } = createController();

    // act
    const response = await controller.edit(
      argsFor({ request: jsonRequest("PUT", HIP_THRUST_REQUEST) }),
      "not-an-exercise",
    );

    // assert
    expect(response.status).toBe(404);
    expect(editExercise.execute).not.toHaveBeenCalled();
  });

  it("answers 400 to a malformed body without editing", async () => {
    // arrange
    const { controller, editExercise } = createController();

    // act
    const response = await controller.edit(
      argsFor({ request: jsonRequest("PUT", { name: "Hip thrust" }) }),
      EXERCISE_ID,
    );

    // assert
    expect(response.status).toBe(400);
    expect(editExercise.execute).not.toHaveBeenCalled();
  });

  it("answers 500 when the edit failed", async () => {
    // arrange
    const { controller, editExercise } = createController();
    editExercise.execute.mockResolvedValueOnce({ status: "failed" });

    // act
    const response = await controller.edit(
      argsFor({ request: jsonRequest("PUT", HIP_THRUST_REQUEST) }),
      EXERCISE_ID,
    );

    // assert
    expect(response.status).toBe(500);
  });

  it.each([
    ["a signed-in client", CLIENT_SESSION, 403],
    ["a signed-out visitor", ANONYMOUS_SESSION, 401],
  ])("refuses %s", async (_case, session, status) => {
    // arrange
    const { controller, editExercise } = createController();

    // act
    const thrown = await captureThrown(() =>
      controller.edit(
        argsFor({ session, request: jsonRequest("PUT", HIP_THRUST_REQUEST) }),
        EXERCISE_ID,
      ),
    );

    // assert
    expect((thrown as Response).status).toBe(status);
    expect(editExercise.execute).not.toHaveBeenCalled();
  });
});

describe("ExerciseLibraryController#openVideo", () => {
  it("plays the requested range of the video to the coach", async () => {
    // arrange
    const { controller, openExerciseVideo } = createController();

    // act
    const response = await controller.openVideo(
      argsFor({ request: videoRequest("bytes=1-2") }),
      { exerciseId: EXERCISE_ID, videoId: VIDEO_ID },
    );

    // assert
    expect(response.status).toBe(206);
    expect(response.headers.get("Content-Range")).toBe("bytes 1-2/2048");
    expect(response.headers.get("Content-Type")).toBe("video/mp4");
    expect(new Uint8Array(await response.arrayBuffer())).toEqual(
      new Uint8Array([2, 3]),
    );
    expect(openExerciseVideo.execute).toHaveBeenCalledWith({
      viewer: { kind: "coach", accountId: COACH.id },
      exerciseId: EXERCISE_ID,
      videoId: VIDEO_ID,
      requested: { kind: "from", start: 1, end: 2 },
    });
  });

  it("asks for the whole video when no range is requested", async () => {
    // arrange
    const { controller, openExerciseVideo } = createController();

    // act
    await controller.openVideo(argsFor({ request: videoRequest() }), {
      exerciseId: EXERCISE_ID,
      videoId: VIDEO_ID,
    });

    // assert
    expect(openExerciseVideo.execute).toHaveBeenCalledWith(
      expect.objectContaining({ requested: null }),
    );
  });

  it.each<[string, ResolvedSession, unknown]>([
    [
      "a signed-in client",
      CLIENT_SESSION,
      { kind: "client", authSubjectId: "user_ana" },
    ],
    ["a signed-out visitor", ANONYMOUS_SESSION, { kind: "visitor" }],
  ])(
    "asks the access rule on behalf of %s and answers 404 when it refuses",
    async (_case, session, viewer) => {
      // arrange
      const { controller, openExerciseVideo } = createController();
      openExerciseVideo.execute.mockResolvedValueOnce({ status: "not-found" });

      // act
      const response = await controller.openVideo(
        argsFor({ session, request: videoRequest() }),
        { exerciseId: EXERCISE_ID, videoId: VIDEO_ID },
      );

      // assert
      expect(response.status).toBe(404);
      expect(openExerciseVideo.execute).toHaveBeenCalledWith(
        expect.objectContaining({ viewer }),
      );
    },
  );

  it.each([
    ["an exercise id", { exerciseId: "not-an-id", videoId: VIDEO_ID }],
    ["a video id", { exerciseId: EXERCISE_ID, videoId: "not-an-id" }],
  ])(
    "answers 404 to %s that is not a uuid without opening anything",
    async (_case, ids) => {
      // arrange
      const { controller, openExerciseVideo } = createController();

      // act
      const response = await controller.openVideo(
        argsFor({ request: videoRequest() }),
        ids,
      );

      // assert
      expect(response.status).toBe(404);
      expect(openExerciseVideo.execute).not.toHaveBeenCalled();
    },
  );

  it("answers 416 with the video's size to a range beyond it", async () => {
    // arrange
    const { controller, openExerciseVideo } = createController();
    openExerciseVideo.execute.mockResolvedValueOnce({
      status: "unsatisfiable",
      sizeBytes: 2_048,
    });

    // act
    const response = await controller.openVideo(
      argsFor({ request: videoRequest("bytes=9000-") }),
      { exerciseId: EXERCISE_ID, videoId: VIDEO_ID },
    );

    // assert
    expect(response.status).toBe(416);
    expect(response.headers.get("Content-Range")).toBe("bytes */2048");
  });
});
