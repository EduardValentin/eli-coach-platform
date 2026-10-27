import type {
  Food,
  FoodDraftInput,
  FoodDraftProblems,
  FoodSnapshot,
  NutritionTag,
} from "~/bounded-contexts/programs/nutrition-library/domain/nutrition";
import { z } from "zod";

export type FoodView = Omit<
  FoodSnapshot,
  "ownerAccountId" | "archivedAt" | "createdAt" | "updatedAt"
>;

export type NutritionTagView = Omit<NutritionTag, "order">;

export type FoodLibraryView = {
  foods: FoodView[];
  tags: NutritionTagView[];
};

export type FoodEditorView = {
  food: FoodView | null;
  otherNames: string[];
  tags: NutritionTagView[];
};

export const foodRequestSchema = z.object({
  name: z.string(),
  category: z.string(),
  icon: z.string(),
  kcal: z.number(),
  protein: z.number(),
  carb: z.number(),
  fat: z.number(),
  defaultPortionGrams: z.number(),
  tagIds: z.array(z.string()),
}) satisfies z.ZodType<FoodDraftInput>;

export type FoodRequest = z.infer<typeof foodRequestSchema>;

export const foodSavedAnswerSchema = z.object({
  redirectTo: z.string().regex(/^\/(?!\/)/),
});

const outOfRange = z.enum(["out-of-range"]).optional();

const foodProblemsSchema = z.object({
  name: z.enum(["missing", "too-long", "taken"]).optional(),
  category: z.enum(["unknown"]).optional(),
  icon: z.enum(["unknown"]).optional(),
  kcal: outOfRange,
  protein: outOfRange,
  carb: outOfRange,
  fat: outOfRange,
  defaultPortionGrams: outOfRange,
  tagIds: z.enum(["unknown"]).optional(),
}) satisfies z.ZodType<FoodDraftProblems>;

export type FoodProblems = z.infer<typeof foodProblemsSchema>;

export const foodProblemsAnswerSchema = z.object({
  problems: foodProblemsSchema,
});

export function presentFood(food: Food): FoodView {
  const {
    ownerAccountId: _ownerAccountId,
    archivedAt: _archivedAt,
    createdAt: _createdAt,
    updatedAt: _updatedAt,
    ...view
  } = food.toSnapshot();

  return view;
}

export function presentTag({
  id,
  family,
  label,
}: NutritionTag): NutritionTagView {
  return { id, family, label };
}
