import {
  DEFAULT_PORTION_GRAMS,
  FOOD_CATEGORIES,
  FOOD_ICONS,
  FoodDraft,
  MAX_FOOD_NAME_LENGTH,
  MAX_MACRO_PER_100G,
  MAX_PORTION_GRAMS,
  TAG_FAMILIES,
  type FoodCategory,
  type FoodDraftProblems,
  type FoodIcon,
} from "@eli-coach-platform/domain/nutrition";
import type { FieldErrors, Resolver } from "react-hook-form";

import type {
  FoodRequest,
  FoodView,
  NutritionTagView,
} from "~/features/nutrition-library/public/foods";

export { FOOD_CATEGORIES, FOOD_ICONS, TAG_FAMILIES };

export type FoodFormValues = {
  name: string;
  category: FoodCategory;
  icon: FoodIcon;
  kcal: string;
  protein: string;
  carb: string;
  fat: string;
  defaultPortionGrams: string;
  tagIds: string[];
};

export const FOOD_PROBLEM_FIELDS = [
  "name",
  "kcal",
  "protein",
  "carb",
  "fat",
  "defaultPortionGrams",
] as const;

export type FoodProblemField = (typeof FOOD_PROBLEM_FIELDS)[number];

export type FoodFieldProblems = Partial<Record<FoodProblemField, string>>;

export const CATEGORY_LABELS: Readonly<Record<FoodCategory, string>> = {
  protein: "Protein",
  carb: "Carb",
  fat: "Fat",
  legume: "Legumes",
  extra: "Extra",
  seasoning: "Seasoning",
};

export const TAG_FAMILY_LABELS: Readonly<
  Record<NutritionTagView["family"], string>
> = {
  "meal-time": "Meal-time",
  "cycle-phase": "Cycle phase",
  nutrient: "Nutrient / benefit",
  dietary: "Dietary",
};

const NAME_PROBLEM_COPY = {
  missing: "Give the food a name",
  "too-long": `Keep the name to ${MAX_FOOD_NAME_LENGTH} characters`,
  taken: "A food with this name already exists",
} as const;

const MACRO_PROBLEM = `Enter a value from 0 to ${MAX_MACRO_PER_100G.toLocaleString("en-GB")}`;

const PORTION_PROBLEM = `Enter whole grams up to ${MAX_PORTION_GRAMS.toLocaleString("en-GB")}`;

const MACRO_FIELDS = ["kcal", "protein", "carb", "fat"] as const;

export function newFoodFormValues(): FoodFormValues {
  return {
    name: "",
    category: "protein",
    icon: "other",
    kcal: "",
    protein: "",
    carb: "",
    fat: "",
    defaultPortionGrams: String(DEFAULT_PORTION_GRAMS),
    tagIds: [],
  };
}

export function foodFormValuesOf(food: FoodView): FoodFormValues {
  return {
    name: food.name,
    category: food.category,
    icon: food.icon,
    kcal: String(food.kcal),
    protein: String(food.protein),
    carb: String(food.carb),
    fat: String(food.fat),
    defaultPortionGrams: String(food.defaultPortionGrams),
    tagIds: [...food.tagIds],
  };
}

export function foodRequestOf(values: FoodFormValues): FoodRequest {
  const amountOf = (entered: string) =>
    entered.trim() === "" ? 0 : Number(entered);

  return {
    name: values.name,
    category: values.category,
    icon: values.icon,
    kcal: amountOf(values.kcal),
    protein: amountOf(values.protein),
    carb: amountOf(values.carb),
    fat: amountOf(values.fat),
    defaultPortionGrams: amountOf(values.defaultPortionGrams),
    tagIds: [...values.tagIds],
  };
}

export function foodFieldProblemsOf(
  problems: FoodDraftProblems,
): FoodFieldProblems {
  const macros = MACRO_FIELDS.filter((field) => problems[field]).map(
    (field) => [field, MACRO_PROBLEM],
  );

  return {
    ...(problems.name && { name: NAME_PROBLEM_COPY[problems.name] }),
    ...Object.fromEntries(macros),
    ...(problems.defaultPortionGrams && {
      defaultPortionGrams: PORTION_PROBLEM,
    }),
  };
}

export function shownFoodProblemsOf(
  errors: FieldErrors<FoodFormValues>,
): FoodFieldProblems {
  return Object.fromEntries(
    FOOD_PROBLEM_FIELDS.map((field) => [field, errors[field]?.message]),
  );
}

export function foodFormResolver(
  otherNames: () => readonly string[],
  knownTagIds: readonly string[],
): Resolver<FoodFormValues> {
  return (values) => {
    const draft = FoodDraft.from(foodRequestOf(values), {
      otherNames: otherNames(),
      knownTagIds,
    });

    if (draft.status === "valid") {
      return { values, errors: {} };
    }

    const errors: FieldErrors<FoodFormValues> = Object.fromEntries(
      Object.entries(foodFieldProblemsOf(draft.problems)).map(
        ([field, message]) => [field, { type: "problem", message }],
      ),
    );

    return { values: {}, errors };
  };
}
