import { describe, expect, it, vi } from "vitest";

import type { ExerciseLibraryFeature } from "~/bounded-contexts/programs/exercise-library/server/exercise-library-composition.server";
import { exerciseLibraryContext } from "~/bounded-contexts/programs/exercise-library/server/guards/exercise-library-context.server";
import {
  contextEntry,
  createRequestArgs,
} from "~/server/test-support/request-args";

import { loader } from "./exercise-library-page";

const LIBRARY = { exercises: [] };

describe("exercise library page loader", () => {
  it("lists the coach's exercise library", async () => {
    // arrange
    const list = vi.fn().mockResolvedValue(LIBRARY);
    const feature = {
      exerciseLibrary: { list },
    } as unknown as ExerciseLibraryFeature;
    const args = createRequestArgs({
      contexts: [contextEntry(exerciseLibraryContext, feature)],
      request: new Request("http://localhost/coach/training"),
    });

    // act
    const library = await loader(args);

    // assert
    expect(library).toBe(LIBRARY);
    expect(list).toHaveBeenCalledWith(args);
  });
});
