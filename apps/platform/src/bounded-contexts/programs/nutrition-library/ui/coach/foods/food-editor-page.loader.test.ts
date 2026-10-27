import { describe, expect, it, vi } from "vitest";

import type { NutritionLibraryFeature } from "~/bounded-contexts/programs/nutrition-library/server/nutrition-library-composition.server";
import { nutritionLibraryContext } from "~/bounded-contexts/programs/nutrition-library/server/guards/nutrition-library-context.server";
import {
  contextEntry,
  createRequestArgs,
} from "~/composition-root/test-support/request-args";

import { loader } from "./food-editor-page";

const FOOD_ID = "1a2b3c4d-5e6f-4a7b-8c9d-0e1f2a3b4c5d";
const NEW_EDITOR = { food: null, otherNames: ["Oats"], tags: [] };
const SAVED_EDITOR = { food: { id: FOOD_ID }, otherNames: [], tags: [] };

function editorArgs(params: Record<string, string>) {
  const loadNew = vi.fn().mockResolvedValue(NEW_EDITOR);
  const load = vi.fn().mockResolvedValue(SAVED_EDITOR);
  const feature = {
    foodLibrary: { load, loadNew },
  } as unknown as NutritionLibraryFeature;
  const args = createRequestArgs({
    contexts: [contextEntry(nutritionLibraryContext, feature)],
    params,
  });

  return { args, load, loadNew };
}

describe("food editor page loader", () => {
  it("opens a blank food with every name in the library when no food is named", async () => {
    // arrange
    const { args, load, loadNew } = editorArgs({});

    // act
    const editor = await loader(args);

    // assert
    expect(editor).toBe(NEW_EDITOR);
    expect(loadNew).toHaveBeenCalledWith(args);
    expect(load).not.toHaveBeenCalled();
  });

  it("opens the named food", async () => {
    // arrange
    const { args, load, loadNew } = editorArgs({ foodId: FOOD_ID });

    // act
    const editor = await loader(args);

    // assert
    expect(editor).toBe(SAVED_EDITOR);
    expect(load).toHaveBeenCalledWith(args, FOOD_ID);
    expect(loadNew).not.toHaveBeenCalled();
  });
});
