import { redirect } from "react-router";
import { describe, expect, it, vi } from "vitest";

import type { ExerciseLibraryFeature } from "~/features/exercise-library/server/exercise-library-composition.server";
import { exerciseLibraryContext } from "~/features/exercise-library/server/guards/exercise-library-context.server";
import { COACH_TRAINING_PATH } from "~/features/exercise-library/public/paths";
import {
  contextEntry,
  createRequestArgs,
} from "~/server/test-support/request-args";

import { loader } from "./exercise-editor-page";

const EXERCISE_ID = "1a2b3c4d-5e6f-4a7b-8c9d-0e1f2a3b4c5d";
const NEW_EDITOR = { exercise: null, otherNames: ["Hip thrust"] };
const SAVED_EDITOR = { exercise: { id: EXERCISE_ID }, otherNames: [] };

function editorArgs(params: Record<string, string>) {
  const loadNew = vi.fn().mockResolvedValue(NEW_EDITOR);
  const load = vi.fn().mockResolvedValue(SAVED_EDITOR);
  const feature = {
    exerciseLibrary: { load, loadNew },
  } as unknown as ExerciseLibraryFeature;
  const args = createRequestArgs({
    contexts: [contextEntry(exerciseLibraryContext, feature)],
    params,
  });

  return { args, load, loadNew };
}

describe("exercise editor page loader", () => {
  it("opens a blank exercise with every name in the library when no exercise is named", async () => {
    // arrange
    const { args, load, loadNew } = editorArgs({});

    // act
    const editor = await loader(args);

    // assert
    expect(editor).toBe(NEW_EDITOR);
    expect(loadNew).toHaveBeenCalledWith(args);
    expect(load).not.toHaveBeenCalled();
  });

  it("opens the named exercise", async () => {
    // arrange
    const { args, load, loadNew } = editorArgs({ exerciseId: EXERCISE_ID });

    // act
    const editor = await loader(args);

    // assert
    expect(editor).toBe(SAVED_EDITOR);
    expect(load).toHaveBeenCalledWith(args, EXERCISE_ID);
    expect(loadNew).not.toHaveBeenCalled();
  });

  it("returns to the library when the named exercise is archived", async () => {
    // arrange
    const { args, load } = editorArgs({ exerciseId: EXERCISE_ID });
    load.mockRejectedValueOnce(redirect(COACH_TRAINING_PATH));

    // act
    const thrown = await loader(args).catch((error: unknown) => error);

    // assert
    expect(thrown).toBeInstanceOf(Response);
    expect((thrown as Response).headers.get("Location")).toBe(
      COACH_TRAINING_PATH,
    );
    expect(load).toHaveBeenCalledWith(args, EXERCISE_ID);
  });
});
