import {
  type ActionFunctionArgs,
  type LoaderFunctionArgs,
} from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createExercise: vi.fn(),
  getExercise: vi.fn(),
  getPlatformContainer: vi.fn(),
  getVideo: vi.fn(),
  listExercises: vi.fn(),
  updateExercise: vi.fn(),
}));

vi.mock("~/server/container.server", () => ({
  getPlatformContainer: mocks.getPlatformContainer,
}));

import * as exerciseRoute from "./exercise";
import * as exerciseVideosRoute from "./exercise-videos";
import * as exercisesRoute from "./exercises";

function routeArgs(method: string, params: Record<string, string> = {}) {
  return {
    params,
    request: new Request("https://eli.example/api/exercises", { method }),
  } as unknown as LoaderFunctionArgs & ActionFunctionArgs;
}

describe("Exercise API routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getPlatformContainer.mockReturnValue({
      exerciseLibraryController: {
        createExercise: mocks.createExercise,
        getExercise: mocks.getExercise,
        listExercises: mocks.listExercises,
        updateExercise: mocks.updateExercise,
      },
      exerciseVideoController: { getVideo: mocks.getVideo },
    });
  });

  it("lists on GET and creates on POST, refusing other methods", async () => {
    // arrange
    const listed = Response.json({ success: true, exercises: [] });
    const created = Response.json({ success: true }, { status: 201 });
    mocks.listExercises.mockResolvedValue(listed);
    mocks.createExercise.mockResolvedValue(created);
    const getArgs = routeArgs("GET");
    const postArgs = routeArgs("POST");

    // act
    const list = await exercisesRoute.loader(getArgs);
    const create = await exercisesRoute.action(postArgs);
    const rejectedLoader = await exercisesRoute.loader(routeArgs("DELETE"));
    const rejectedAction = await exercisesRoute.action(routeArgs("PUT"));

    // assert
    expect(list).toBe(listed);
    expect(mocks.listExercises).toHaveBeenCalledWith(getArgs);
    expect(create).toBe(created);
    expect(mocks.createExercise).toHaveBeenCalledWith(postArgs);
    expect(rejectedLoader.status).toBe(405);
    expect(rejectedAction.status).toBe(405);
    expect(rejectedAction.headers.get("Allow")).toBe("GET, HEAD, POST");
  });

  it("reads on GET and updates on PATCH with the exercise id", async () => {
    // arrange
    const read = Response.json({ success: true });
    const updated = Response.json({ success: true });
    mocks.getExercise.mockResolvedValue(read);
    mocks.updateExercise.mockResolvedValue(updated);
    const getArgs = routeArgs("GET", { exerciseId: "abc" });
    const patchArgs = routeArgs("PATCH", { exerciseId: "abc" });

    // act
    const get = await exerciseRoute.loader(getArgs);
    const patch = await exerciseRoute.action(patchArgs);
    const rejected = await exerciseRoute.action(routeArgs("POST", { exerciseId: "abc" }));

    // assert
    expect(get).toBe(read);
    expect(mocks.getExercise).toHaveBeenCalledWith(getArgs, "abc");
    expect(patch).toBe(updated);
    expect(mocks.updateExercise).toHaveBeenCalledWith(patchArgs, "abc");
    expect(rejected.status).toBe(405);
    expect(rejected.headers.get("Allow")).toBe("GET, HEAD, PATCH");
  });

  it("streams videos on GET and HEAD only", async () => {
    // arrange
    const video = new Response("bytes");
    mocks.getVideo.mockResolvedValue(video);
    const headArgs = routeArgs("HEAD", { assetKey: "exercise-videos/a.mp4" });

    // act
    const streamed = await exerciseVideosRoute.loader(headArgs);
    const rejected = await exerciseVideosRoute.action(routeArgs("POST"));

    // assert
    expect(streamed).toBe(video);
    expect(mocks.getVideo).toHaveBeenCalledWith(headArgs, "exercise-videos/a.mp4");
    expect(rejected.status).toBe(405);
    expect(rejected.headers.get("Allow")).toBe("GET, HEAD");
  });
});
