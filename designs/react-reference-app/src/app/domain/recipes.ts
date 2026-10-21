import type { CookingMethod, Food, Recipe, RecipeIngredient, RecipeMacros } from '../context/NutritionContext';

export const MAX_RECIPE_NAME_LENGTH = 80;
export const MIN_INGREDIENT_GRAMS = 1;
export const MAX_INGREDIENT_GRAMS = 99_999;
export const MAX_RECIPE_MINUTES = 9_999;
export const MAX_INSTRUCTIONS_LENGTH = 2_000;
export const RECIPE_PHOTO_MAX_BYTES = 10 * 1024 * 1024;
export const RECIPE_PHOTO_ACCEPT = '.jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp';

const RECIPE_PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const RECIPE_PHOTO_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp'];

function isRecipePhotoFile(file: Pick<File, 'name' | 'type'>): boolean {
  const name = file.name.toLowerCase();
  return RECIPE_PHOTO_TYPES.includes(file.type) || RECIPE_PHOTO_EXTENSIONS.some((extension) => name.endsWith(extension));
}

export function recipePhotoRefusal(file: Pick<File, 'name' | 'type' | 'size'>): string | undefined {
  if (!isRecipePhotoFile(file)) {
    return `${file.name} is not a .jpg, .png or .webp — only JPEG, PNG and WebP photos are supported`;
  }
  if (file.size > RECIPE_PHOTO_MAX_BYTES) return `${file.name} is larger than 10 MB`;
  return undefined;
}

export const recipePhotoContentRefusal = (file: Pick<File, 'name'>): string =>
  `${file.name} doesn’t contain a JPEG, PNG or WebP photo.`;

export type RecipeDraftIngredient = { foodId: string; grams: string; method: CookingMethod };

export type RecipeDraft = {
  name: string;
  ingredients: readonly RecipeDraftIngredient[];
  prepMinutes: string;
  cookMinutes: string;
  instructions: string;
  mealRoleIds: readonly string[];
  tagIds: readonly string[];
  icon: Recipe['icon'];
};

export type RecipeDraftProblems = {
  name?: string;
  ingredients?: (string | undefined)[];
  prepMinutes?: string;
  cookMinutes?: string;
  instructions?: string;
};

export type RecipeFields = Pick<
  Recipe,
  'name' | 'ingredients' | 'prepMinutes' | 'cookMinutes' | 'instructions' | 'mealRoleIds' | 'tagIds' | 'icon'
>;

const MINUTE_FIELDS = ['prepMinutes', 'cookMinutes'] as const;

type NamedRecipe = { name: string; archivedAt?: string };

type MacroFood = Pick<Food, 'id' | 'kcal' | 'protein' | 'carb' | 'fat'>;

const normalisedName = (name: string) => name.trim().toLowerCase();

const minutesOf = (value: string) => (value.trim() === '' ? 0 : Number(value));

const gramsOf = (value: string) => (value.trim() === '' ? Number.NaN : Number(value));

const isWholeBetween = (value: number, min: number, max: number) =>
  Number.isInteger(value) && value >= min && value <= max;

function nameProblem(name: string, otherRecipes: readonly NamedRecipe[]): string | undefined {
  if (name.trim() === '') return 'Give the recipe a name';
  if (name.trim().length > MAX_RECIPE_NAME_LENGTH) return `Keep the name to ${MAX_RECIPE_NAME_LENGTH} characters`;
  const taken = otherRecipes.some((other) => !other.archivedAt && normalisedName(other.name) === normalisedName(name));
  return taken ? 'A recipe with this name already exists' : undefined;
}

function gramsProblem(value: string): string | undefined {
  return isWholeBetween(gramsOf(value), MIN_INGREDIENT_GRAMS, MAX_INGREDIENT_GRAMS)
    ? undefined
    : 'Enter whole grams from 1 to 99,999';
}

function minutesProblem(value: string): string | undefined {
  return isWholeBetween(minutesOf(value), 0, MAX_RECIPE_MINUTES) ? undefined : 'Enter whole minutes up to 9,999';
}

function instructionsProblem(instructions: string): string | undefined {
  return instructions.trim().length > MAX_INSTRUCTIONS_LENGTH ? 'Keep the instructions to 2,000 characters' : undefined;
}

export function draftProblems(draft: RecipeDraft, otherRecipes: readonly NamedRecipe[]): RecipeDraftProblems {
  const problems: RecipeDraftProblems = {};
  const name = nameProblem(draft.name, otherRecipes);
  if (name) problems.name = name;
  const ingredients = draft.ingredients.map((ingredient) => gramsProblem(ingredient.grams));
  if (ingredients.some(Boolean)) problems.ingredients = ingredients;
  for (const field of MINUTE_FIELDS) {
    const problem = minutesProblem(draft[field]);
    if (problem) problems[field] = problem;
  }
  const instructions = instructionsProblem(draft.instructions);
  if (instructions) problems.instructions = instructions;
  return problems;
}

export function isValidDraft(problems: RecipeDraftProblems): boolean {
  return Object.keys(problems).length === 0;
}

export function recipeFrom(draft: RecipeDraft): RecipeFields {
  return {
    name: draft.name.trim(),
    ingredients: draft.ingredients.map((ingredient) => ({ ...ingredient, grams: gramsOf(ingredient.grams) })),
    prepMinutes: minutesOf(draft.prepMinutes),
    cookMinutes: minutesOf(draft.cookMinutes),
    instructions: draft.instructions.trim(),
    mealRoleIds: [...draft.mealRoleIds],
    tagIds: [...draft.tagIds],
    icon: draft.icon,
  };
}

export function computeRecipeMacros(
  ingredients: readonly Pick<RecipeIngredient, 'foodId' | 'grams'>[],
  foods: readonly MacroFood[],
): RecipeMacros {
  const total = ingredients.reduce(
    (sum, ingredient) => {
      const food = foods.find((candidate) => candidate.id === ingredient.foodId);
      if (!food) return sum;
      const factor = ingredient.grams / 100;
      return {
        kcal: sum.kcal + food.kcal * factor,
        protein: sum.protein + food.protein * factor,
        carb: sum.carb + food.carb * factor,
        fat: sum.fat + food.fat * factor,
      };
    },
    { kcal: 0, protein: 0, carb: 0, fat: 0 },
  );
  return {
    kcal: Math.round(total.kcal),
    protein: Math.round(total.protein),
    carb: Math.round(total.carb),
    fat: Math.round(total.fat),
  };
}
