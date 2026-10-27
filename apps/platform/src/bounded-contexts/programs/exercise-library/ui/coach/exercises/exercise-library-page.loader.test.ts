import { describe, expect, it, vi } from "vitest";

import {
  type ExerciseLibraryFeature,
  exerciseLibraryContext,
} from "~/bounded-contexts/programs/exercise-library/adapters/inbound/http/context.server";
import {
  contextEntry,
  createRequestArgs,
} from "~/composition-root/test-support/request-args";

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
