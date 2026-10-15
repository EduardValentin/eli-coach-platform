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
const AT = new Date("2026-10-14T09:00:00.000Z");

const COACH: AccountSnapshot = {
  authSubjectId: "user_eli",
  id: "acct_eli",
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
};

const { id: _id, ...HIP_THRUST_REQUEST } = HIP_THRUST_VIEW;

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
  const controller = new ExerciseLibraryController({
    listExercises: listExercises as unknown as ListExercisesUseCase,
    findExercise: findExercise as unknown as FindExerciseUseCase,
    createExercise: createExercise as unknown as CreateExerciseUseCase,
    editExercise: editExercise as unknown as EditExerciseUseCase,
  });

  return {
    controller,
    listExercises,
    findExercise,
    createExercise,
    editExercise,
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
      draft: HIP_THRUST_REQUEST,
    });
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
      draft: HIP_THRUST_REQUEST,
    });
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
