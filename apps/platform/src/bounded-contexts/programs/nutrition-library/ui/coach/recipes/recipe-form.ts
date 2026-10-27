import {
  MAX_INGREDIENT_GRAMS,
  MAX_INSTRUCTIONS_LENGTH,
  MAX_RECIPE_MINUTES,
  MAX_RECIPE_NAME_LENGTH,
  MIN_INGREDIENT_GRAMS,
  RecipeDraft,
  RecipeMacros,
  type CookingMethod,
  type RecipeDraftProblems,
  type RecipeIcon,
  type RecipeMacrosSnapshot,
} from "@eli-coach-platform/domain/nutrition";
import type { FieldErrors, Resolver } from "react-hook-form";

import type {
  FoodView,
  NutritionTagView,
} from "~/bounded-contexts/programs/nutrition-library/public/foods";
import {
  RECIPE_FORM_FIELDS,
  type RecipeBuilderView,
  type RecipeRequest,
} from "~/bounded-contexts/programs/nutrition-library/public/recipes";

import type { ChosenRecipePhoto } from "./recipe-photo-entry";

type SavedRecipe = NonNullable<RecipeBuilderView["recipe"]>;

type RecipeIngredientValues = {
  foodId: string;
  grams: string;
  method: CookingMethod;
};

export type RecipeFormValues = {
  name: string;
  ingredients: RecipeIngredientValues[];
  prepMinutes: string;
  cookMinutes: string;
  instructions: string;
  icon: RecipeIcon | null;
  tagIds: string[];
};

const RECIPE_SCALAR_FIELDS = [
  "name",
  "prepMinutes",
  "cookMinutes",
  "instructions",
] as const;

type RecipeScalarField = (typeof RECIPE_SCALAR_FIELDS)[number];

export type RecipeFieldProblems = Partial<Record<RecipeScalarField, string>> & {
  grams: Readonly<Record<number, string>>;
};

export type RecipeProblemField =
  RecipeScalarField | `ingredients.${number}.grams`;

type FoodValuesPer100g = Pick<
  FoodView,
  "id" | "kcal" | "protein" | "carb" | "fat"
>;

type RecipeResolverContext = {
  otherNames: () => readonly string[];
  tags: readonly NutritionTagView[];
  pickableFoodIds: readonly string[];
};

export const COOKING_METHOD_LABELS: Readonly<Record<CookingMethod, string>> = {
  raw: "Raw",
  boiled: "Boiled",
  grilled: "Grilled",
  baked: "Baked",
  "pan-fried": "Pan-fried",
  steamed: "Steamed",
};

const NAME_PROBLEM_COPY = {
  missing: "Give the recipe a name",
  "too-long": `Keep the name to ${MAX_RECIPE_NAME_LENGTH} characters`,
  taken: "A recipe with this name already exists",
} as const;

const GRAMS_PROBLEM = `Enter whole grams from ${MIN_INGREDIENT_GRAMS} to ${MAX_INGREDIENT_GRAMS.toLocaleString("en-GB")}`;

const MINUTES_PROBLEM = `Enter whole minutes up to ${MAX_RECIPE_MINUTES.toLocaleString("en-GB")}`;

const INSTRUCTIONS_PROBLEM = `Keep the instructions to ${MAX_INSTRUCTIONS_LENGTH.toLocaleString("en-GB")} characters`;

export function newRecipeFormValues(): RecipeFormValues {
  return {
    name: "",
    ingredients: [],
    prepMinutes: "0",
    cookMinutes: "0",
    instructions: "",
    icon: null,
    tagIds: [],
  };
}

export function recipeFormValuesOf(recipe: SavedRecipe): RecipeFormValues {
  return {
    name: recipe.name,
    ingredients: recipe.ingredients.map(({ foodId, grams, method }) => ({
      foodId,
      grams: String(grams),
      method,
    })),
    prepMinutes: String(recipe.prepMinutes),
    cookMinutes: String(recipe.cookMinutes),
    instructions: recipe.instructions,
    icon: recipe.icon,
    tagIds: [...recipe.mealRoleIds, ...recipe.tagIds],
  };
}

function recipeRequestOf(values: RecipeFormValues): RecipeRequest {
  const amountOf = (entered: string) =>
    entered.trim() === "" ? 0 : Number(entered);

  return {
    name: values.name,
    ingredients: values.ingredients.map(({ foodId, grams, method }) => ({
      foodId,
      grams: amountOf(grams),
      method,
    })),
    prepMinutes: amountOf(values.prepMinutes),
    cookMinutes: amountOf(values.cookMinutes),
    instructions: values.instructions,
    icon: values.icon,
    tagIds: [...values.tagIds],
  };
}

export function recipeSaveBodyOf(
  values: RecipeFormValues,
  photo: ChosenRecipePhoto,
): RecipeRequest | FormData {
  const request: RecipeRequest = {
    ...recipeRequestOf(values),
    photo: photo.kind,
  };

  if (photo.kind !== "attach") return request;

  const formData = new FormData();
  formData.append(RECIPE_FORM_FIELDS.recipe, JSON.stringify(request));
  formData.append(RECIPE_FORM_FIELDS.photo, photo.file);

  return formData;
}

export function recipeMacrosOf(
  ingredients: readonly RecipeIngredientValues[],
  foods: readonly FoodValuesPer100g[],
): RecipeMacrosSnapshot {
  return RecipeMacros.of(
    ingredients.map(({ foodId, grams }) => ({
      foodId,
      grams: Number(grams) || 0,
    })),
    foods,
  ).toSnapshot();
}

export function recipeFieldProblemsOf(
  problems: RecipeDraftProblems,
): RecipeFieldProblems {
  const grams = (problems.ingredients ?? [])
    .filter(({ problem }) => problem === "grams-out-of-range")
    .map(({ position }) => [position, GRAMS_PROBLEM]);

  return {
    ...(problems.name && { name: NAME_PROBLEM_COPY[problems.name] }),
    ...(problems.prepMinutes && { prepMinutes: MINUTES_PROBLEM }),
    ...(problems.cookMinutes && { cookMinutes: MINUTES_PROBLEM }),
    ...(problems.instructions && { instructions: INSTRUCTIONS_PROBLEM }),
    grams: Object.fromEntries(grams),
  };
}

export function refusedFieldsInFocusOrder(
  problems: RecipeFieldProblems,
): [RecipeProblemField, string][] {
  const scalar = (field: RecipeScalarField): [RecipeProblemField, string][] => {
    const problem = problems[field];

    return problem ? [[field, problem]] : [];
  };
  const grams = Object.entries(problems.grams).map(
    ([position, problem]): [RecipeProblemField, string] => [
      `ingredients.${Number(position)}.grams`,
      problem,
    ],
  );

  return [
    ...scalar("name"),
    ...grams,
    ...scalar("prepMinutes"),
    ...scalar("cookMinutes"),
    ...scalar("instructions"),
  ];
}

export function shownRecipeProblemsOf(
  errors: FieldErrors<RecipeFormValues>,
): RecipeFieldProblems {
  const ingredients: readonly (
    FieldErrors<RecipeIngredientValues> | undefined
  )[] = Array.isArray(errors.ingredients) ? errors.ingredients : [];
  const grams = ingredients.flatMap((ingredient, position) => {
    const message = ingredient?.grams?.message;

    return message ? [[position, message]] : [];
  });

  return {
    ...Object.fromEntries(
      RECIPE_SCALAR_FIELDS.map((field) => [field, errors[field]?.message]),
    ),
    grams: Object.fromEntries(grams),
  };
}

export function recipeFormResolver({
  otherNames,
  tags,
  pickableFoodIds,
}: RecipeResolverContext): Resolver<RecipeFormValues> {
  return (values) => {
    const draft = RecipeDraft.from(recipeRequestOf(values), {
      otherNames: otherNames(),
      tags,
      pickableFoodIds,
    });

    if (draft.status === "valid") {
      return { values, errors: {} };
    }

    const problems = recipeFieldProblemsOf(draft.problems);
    const scalarErrors = RECIPE_SCALAR_FIELDS.flatMap((field) => {
      const message = problems[field];

      return message ? [[field, { type: "problem", message }]] : [];
    });
    const ingredientErrors = values.ingredients.map((_, position) => {
      const message = problems.grams[position];

      return message ? { grams: { type: "problem", message } } : undefined;
    });

    return {
      values: {},
      errors: {
        ...Object.fromEntries(scalarErrors),
        ...(Object.keys(problems.grams).length > 0 && {
          ingredients: ingredientErrors,
        }),
      } as FieldErrors<RecipeFormValues>,
    };
  };
}
