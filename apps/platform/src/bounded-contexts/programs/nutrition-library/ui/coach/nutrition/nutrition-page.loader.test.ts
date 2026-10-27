import { describe, expect, it, vi } from "vitest";

import type { NutritionLibraryFeature } from "~/bounded-contexts/programs/nutrition-library/server/nutrition-library-composition.server";
import { nutritionLibraryContext } from "~/bounded-contexts/programs/nutrition-library/server/guards/nutrition-library-context.server";
import {
  contextEntry,
  createRequestArgs,
} from "~/server/test-support/request-args";

import { loader } from "./nutrition-page";

const TAGS = [{ id: "mt-breakfast", family: "meal-time", label: "Breakfast" }];
const FOODS = [{ id: "food-oats", name: "Oats" }];
const RECIPES = [{ id: "recipe-porridge", name: "Porridge" }];

describe("nutrition page loader", () => {
  it("reads the coach's foods with the tag vocabulary and her recipe cards together", async () => {
    // arrange
    const listFoods = vi.fn().mockResolvedValue({ foods: FOODS, tags: TAGS });
    const listRecipes = vi.fn().mockResolvedValue({ recipes: RECIPES });
    const feature = {
      foodLibrary: { list: listFoods },
      recipeLibrary: { list: listRecipes },
    } as unknown as NutritionLibraryFeature;
    const args = createRequestArgs({
      contexts: [contextEntry(nutritionLibraryContext, feature)],
      request: new Request("http://localhost/coach/nutrition?tab=recipes"),
    });

    // act
    const library = await loader(args);

    // assert
    expect(library).toEqual({ foods: FOODS, tags: TAGS, recipes: RECIPES });
    expect(listFoods).toHaveBeenCalledWith(args);
    expect(listRecipes).toHaveBeenCalledWith(args);
  });
});
