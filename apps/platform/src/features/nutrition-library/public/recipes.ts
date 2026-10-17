import {
  RecipeMacros,
  type Food,
  type NutritionTag,
  type PickableFoods,
  type Recipe,
  type RecipeDraftInput,
  type RecipeIcon,
  type RecipeMacrosSnapshot,
  type RecipeSaveProblems,
  type RecipeSnapshot,
} from "@eli-coach-platform/domain/nutrition";
import { z } from "zod";

import {
  presentFood,
  presentTag,
  type FoodView,
  type NutritionTagView,
} from "~/features/nutrition-library/public/foods";
import { recipePhotoPath } from "~/features/nutrition-library/public/paths";

type RecipePhotoView = { path: string };

type RecipeView = Omit<
  RecipeSnapshot,
  "ownerAccountId" | "photo" | "archivedAt" | "createdAt" | "updatedAt"
> & { photo: RecipePhotoView | null };

export type RecipeCardView = {
  id: string;
  name: string;
  icon: RecipeIcon | null;
  photo: RecipePhotoView | null;
  totalMinutes: number;
  macros: RecipeMacrosSnapshot;
  tagIds: string[];
};

export type RecipeLibraryView = {
  recipes: RecipeCardView[];
};

export type RecipeBuilderView = {
  recipe: RecipeView | null;
  offeredFoods: FoodView[];
  placedFoods: FoodView[];
  otherNames: string[];
  tags: NutritionTagView[];
};

type RecipeBuilderParts = {
  recipe: Recipe | null;
  pickableFoods: PickableFoods;
  otherNames: string[];
  tags: readonly NutritionTag[];
};

export const recipeRequestSchema = z.object({
  name: z.string(),
  ingredients: z.array(
    z.object({ foodId: z.string(), grams: z.number(), method: z.string() }),
  ),
  prepMinutes: z.number(),
  cookMinutes: z.number(),
  instructions: z.string(),
  icon: z.string().nullable(),
  tagIds: z.array(z.string()),
  photo: z.enum(["keep", "remove", "attach"]).default("keep"),
}) satisfies z.ZodType<RecipeDraftInput>;

export const RECIPE_FORM_FIELDS = {
  recipe: "recipe",
  photo: "photo",
} as const;

export type RecipeRequest = z.input<typeof recipeRequestSchema>;

export const recipeSavedAnswerSchema = z.object({
  redirectTo: z.string().regex(/^\/(?!\/)/),
});

const outOfRange = z.enum(["out-of-range"]).optional();

const recipeProblemsSchema = z.object({
  name: z.enum(["missing", "too-long", "taken"]).optional(),
  ingredients: z
    .array(
      z.object({
        position: z.number().int().nonnegative(),
        problem: z.enum([
          "grams-out-of-range",
          "unknown-food",
          "unknown-method",
        ]),
      }),
    )
    .optional(),
  prepMinutes: outOfRange,
  cookMinutes: outOfRange,
  instructions: z.enum(["too-long"]).optional(),
  icon: z.enum(["unknown"]).optional(),
  tagIds: z.enum(["unknown"]).optional(),
  photo: z.enum(["unsupported", "too-large"]).optional(),
}) satisfies z.ZodType<RecipeSaveProblems>;

export type RecipeProblems = z.infer<typeof recipeProblemsSchema>;

export const recipeProblemsAnswerSchema = z.object({
  problems: recipeProblemsSchema,
});

function presentRecipe(recipe: Recipe): RecipeView {
  const {
    ownerAccountId: _ownerAccountId,
    photo: _photo,
    archivedAt: _archivedAt,
    createdAt: _createdAt,
    updatedAt: _updatedAt,
    ...view
  } = recipe.toSnapshot();

  return { ...view, photo: presentRecipePhoto(recipe) };
}

function presentRecipePhoto(recipe: Recipe): RecipePhotoView | null {
  const { photo } = recipe;

  return photo && { path: recipePhotoPath(recipe.id, photo.photoId) };
}

export function presentRecipeCard(
  recipe: Recipe,
  foods: readonly Food[],
): RecipeCardView {
  const {
    id,
    name,
    icon,
    ingredients,
    prepMinutes,
    cookMinutes,
    mealRoleIds,
    tagIds,
  } = recipe.toSnapshot();

  return {
    id,
    name,
    icon,
    photo: presentRecipePhoto(recipe),
    totalMinutes: prepMinutes + cookMinutes,
    macros: RecipeMacros.of(
      ingredients,
      foods.map((food) => food.toSnapshot()),
    ).toSnapshot(),
    tagIds: [...mealRoleIds, ...tagIds],
  };
}

export function presentRecipeBuilder({
  recipe,
  pickableFoods,
  otherNames,
  tags,
}: RecipeBuilderParts): RecipeBuilderView {
  const { offered, placedOnly } = pickableFoods.toSnapshot();

  return {
    recipe: recipe ? presentRecipe(recipe) : null,
    offeredFoods: offered.map(presentFood),
    placedFoods: placedOnly.map(presentFood),
    otherNames,
    tags: tags.map(presentTag),
  };
}
