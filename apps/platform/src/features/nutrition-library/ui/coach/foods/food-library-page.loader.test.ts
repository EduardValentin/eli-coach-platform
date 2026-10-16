import { describe, expect, it, vi } from "vitest";

import type { NutritionLibraryFeature } from "~/features/nutrition-library/server/nutrition-library-composition.server";
import { nutritionLibraryContext } from "~/features/nutrition-library/server/guards/nutrition-library-context.server";
import {
  contextEntry,
  createRequestArgs,
} from "~/server/test-support/request-args";

import { loader } from "./food-library-page";

const LIBRARY = { foods: [], tags: [] };

describe("food library page loader", () => {
  it("lists the coach's food library", async () => {
    // arrange
    const list = vi.fn().mockResolvedValue(LIBRARY);
    const feature = {
      foodLibrary: { list },
    } as unknown as NutritionLibraryFeature;
    const args = createRequestArgs({
      contexts: [contextEntry(nutritionLibraryContext, feature)],
      request: new Request("http://localhost/coach/nutrition"),
    });

    // act
    const library = await loader(args);

    // assert
    expect(library).toBe(LIBRARY);
    expect(list).toHaveBeenCalledWith(args);
  });
});
