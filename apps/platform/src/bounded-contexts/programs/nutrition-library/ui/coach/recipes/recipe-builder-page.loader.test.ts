import { redirect } from "react-router";
import { describe, expect, it, vi } from "vitest";

import { COACH_RECIPES_PATH } from "~/bounded-contexts/programs/nutrition-library/public/paths";
import {
  type NutritionLibraryFeature,
  nutritionLibraryContext,
} from "~/bounded-contexts/programs/nutrition-library/adapters/inbound/http/context.server";
import {
  contextEntry,
  createRequestArgs,
} from "~/composition-root/test-support/request-args";

import { loader } from "./recipe-builder-page";

const RECIPE_ID = "4d5e6f7a-8b9c-4d0e-9f1a-2b3c4d5e6f7a";
const UNKNOWN_ID = "9e8d7c6b-5a49-4382-9716-a5b4c3d2e1f0";
const NEW_BUILDER = {
  recipe: null,
  offeredFoods: [],
  placedFoods: [],
  otherNames: ["Porridge"],
  tags: [],
};
const SAVED_BUILDER = { ...NEW_BUILDER, recipe: { id: RECIPE_ID } };

function builderArgs(params: Record<string, string>) {
  const loadNew = vi.fn().mockResolvedValue(NEW_BUILDER);
  const load = vi.fn(async (_args: unknown, recipeId: string) => {
    if (recipeId !== RECIPE_ID) {
      throw redirect(COACH_RECIPES_PATH);
    }

    return SAVED_BUILDER;
  });
  const feature = {
    recipeLibraryController: { load, loadNew },
  } as unknown as NutritionLibraryFeature;
  const args = createRequestArgs({
    contexts: [contextEntry(nutritionLibraryContext, feature)],
    params,
  });

  return { args, load, loadNew };
}

describe("recipe builder page loader", () => {
  it("opens a blank recipe with the foods she may use when no recipe is named", async () => {
    // arrange
    const { args, load, loadNew } = builderArgs({});

    // act
    const builder = await loader(args);

    // assert
    expect(builder).toBe(NEW_BUILDER);
    expect(loadNew).toHaveBeenCalledWith(args);
    expect(load).not.toHaveBeenCalled();
  });

  it("opens the named recipe", async () => {
    // arrange
    const { args, load, loadNew } = builderArgs({ recipeId: RECIPE_ID });

    // act
    const builder = await loader(args);

    // assert
    expect(builder).toBe(SAVED_BUILDER);
    expect(load).toHaveBeenCalledWith(args, RECIPE_ID);
    expect(loadNew).not.toHaveBeenCalled();
  });

  it("returns her to the Recipes tab for a recipe her library does not hold", async () => {
    // arrange
    const { args } = builderArgs({ recipeId: UNKNOWN_ID });

    // act
    const answer = await loader(args).catch((thrown: unknown) => thrown);

    // assert
    expect(answer).toBeInstanceOf(Response);
    expect((answer as Response).status).toBe(302);
    expect((answer as Response).headers.get("Location")).toBe(
      COACH_RECIPES_PATH,
    );
  });
});
