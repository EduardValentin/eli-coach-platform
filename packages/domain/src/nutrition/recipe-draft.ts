import {
  COOKING_METHODS,
  MAX_INGREDIENT_GRAMS,
  MAX_INSTRUCTIONS_LENGTH,
  MAX_RECIPE_MINUTES,
  MAX_RECIPE_NAME_LENGTH,
  MIN_INGREDIENT_GRAMS,
  RECIPE_ICONS,
  type CookingMethod,
  type RecipeIcon,
  type TagFamily,
} from "./nutrition";
import type { NutritionTag } from "./nutrition-tags";

type RecipeIngredientInput = {
  foodId: string;
  grams: number;
  method: string;
};

export type RecipeDraftInput = {
  name: string;
  ingredients: readonly RecipeIngredientInput[];
  prepMinutes: number;
  cookMinutes: number;
  instructions: string;
  icon: string | null;
  tagIds: readonly string[];
};

export type RecipeIngredientSnapshot = {
  foodId: string;
  grams: number;
  method: CookingMethod;
};

export type RecipeDraftSnapshot = {
  name: string;
  ingredients: RecipeIngredientSnapshot[];
  prepMinutes: number;
  cookMinutes: number;
  instructions: string;
  icon: RecipeIcon | null;
  mealRoleIds: string[];
  tagIds: string[];
};

type RecipeIngredientProblem = {
  position: number;
  problem: "grams-out-of-range" | "unknown-food" | "unknown-method";
};

export type RecipeDraftProblems = {
  name?: "missing" | "too-long" | "taken";
  ingredients?: RecipeIngredientProblem[];
  prepMinutes?: "out-of-range";
  cookMinutes?: "out-of-range";
  instructions?: "too-long";
  icon?: "unknown";
  tagIds?: "unknown";
};

type RecipeDraftContext = {
  otherNames: readonly string[];
  tags: readonly Pick<NutritionTag, "id" | "family">[];
  pickableFoodIds: readonly string[];
};

type RecipeDraftResult =
  | { status: "valid"; draft: RecipeDraft }
  | { status: "invalid"; problems: RecipeDraftProblems };

type ParsedRecipeInput =
  | { status: "parsed"; snapshot: RecipeDraftSnapshot }
  | { status: "invalid"; problems: RecipeDraftProblems };

const ROLE_FAMILY: TagFamily = "meal-time";

class RecipeInputParser {
  constructor(private readonly context: RecipeDraftContext) {}

  parse(input: RecipeDraftInput): ParsedRecipeInput {
    const icon = this.iconOf(input.icon);
    const { ingredients, unknownMethods } = this.ingredientsOf(
      input.ingredients,
    );
    const unknownTag = this.hasUnknownTag(input.tagIds);

    if (icon === undefined || unknownMethods.length > 0 || unknownTag) {
      return {
        status: "invalid",
        problems: {
          ...(unknownMethods.length > 0 && { ingredients: unknownMethods }),
          ...(icon === undefined && { icon: "unknown" }),
          ...(unknownTag && { tagIds: "unknown" }),
        },
      };
    }

    const chosenTags = this.context.tags.filter(({ id }) =>
      input.tagIds.includes(id),
    );

    return {
      status: "parsed",
      snapshot: {
        name: input.name.trim(),
        ingredients,
        prepMinutes: input.prepMinutes,
        cookMinutes: input.cookMinutes,
        instructions: input.instructions.trim(),
        icon,
        mealRoleIds: chosenTags
          .filter(({ family }) => family === ROLE_FAMILY)
          .map(({ id }) => id),
        tagIds: chosenTags
          .filter(({ family }) => family !== ROLE_FAMILY)
          .map(({ id }) => id),
      },
    };
  }

  private iconOf(entered: string | null): RecipeIcon | null | undefined {
    return entered === null
      ? null
      : RECIPE_ICONS.find((known) => known === entered);
  }

  private ingredientsOf(entered: readonly RecipeIngredientInput[]): {
    ingredients: RecipeIngredientSnapshot[];
    unknownMethods: RecipeIngredientProblem[];
  } {
    const ingredients: RecipeIngredientSnapshot[] = [];
    const unknownMethods: RecipeIngredientProblem[] = [];

    entered.forEach(({ foodId, grams, method }, position) => {
      const known = COOKING_METHODS.find((candidate) => candidate === method);

      if (known === undefined) {
        unknownMethods.push({ position, problem: "unknown-method" });
      } else {
        ingredients.push({ foodId, grams, method: known });
      }
    });

    return { ingredients, unknownMethods };
  }

  private hasUnknownTag(tagIds: readonly string[]): boolean {
    return tagIds.some(
      (tagId) => !this.context.tags.some(({ id }) => id === tagId),
    );
  }
}

export class RecipeDraft {
  private constructor(private readonly snapshot: RecipeDraftSnapshot) {}

  static from(
    input: RecipeDraftInput,
    context: RecipeDraftContext,
  ): RecipeDraftResult {
    const parsed = new RecipeInputParser(context).parse(input);

    if (parsed.status === "invalid") return parsed;

    const draft = new RecipeDraft(parsed.snapshot);
    const problems = draft.problemsAmong(context);

    if (Object.keys(problems).length > 0) {
      return { status: "invalid", problems };
    }

    return { status: "valid", draft };
  }

  toSnapshot(): RecipeDraftSnapshot {
    return {
      ...this.snapshot,
      ingredients: this.snapshot.ingredients.map((ingredient) => ({
        ...ingredient,
      })),
      mealRoleIds: [...this.snapshot.mealRoleIds],
      tagIds: [...this.snapshot.tagIds],
    };
  }

  private problemsAmong(context: RecipeDraftContext): RecipeDraftProblems {
    const { prepMinutes, cookMinutes, instructions } = this.snapshot;
    const name = this.nameProblemAmong(context.otherNames);
    const ingredients = this.ingredientProblemsAmong(context.pickableFoodIds);

    return {
      ...(name && { name }),
      ...(ingredients.length > 0 && { ingredients }),
      ...(!this.areMinutesInRange(prepMinutes) && {
        prepMinutes: "out-of-range",
      }),
      ...(!this.areMinutesInRange(cookMinutes) && {
        cookMinutes: "out-of-range",
      }),
      ...(instructions.length > MAX_INSTRUCTIONS_LENGTH && {
        instructions: "too-long",
      }),
    };
  }

  private nameProblemAmong(
    otherNames: readonly string[],
  ): RecipeDraftProblems["name"] {
    if (this.snapshot.name.length === 0) return "missing";
    if (this.snapshot.name.length > MAX_RECIPE_NAME_LENGTH) return "too-long";
    if (this.isNameAmong(otherNames)) return "taken";

    return undefined;
  }

  private isNameAmong(otherNames: readonly string[]): boolean {
    const comparable = this.snapshot.name.toLowerCase();

    return otherNames.some(
      (otherName) => otherName.trim().toLowerCase() === comparable,
    );
  }

  private ingredientProblemsAmong(
    pickableFoodIds: readonly string[],
  ): RecipeIngredientProblem[] {
    return this.snapshot.ingredients.flatMap<RecipeIngredientProblem>(
      ({ foodId, grams }, position) => {
        if (!pickableFoodIds.includes(foodId)) {
          return [{ position, problem: "unknown-food" }];
        }

        if (!this.areGramsInRange(grams)) {
          return [{ position, problem: "grams-out-of-range" }];
        }

        return [];
      },
    );
  }

  private areGramsInRange(grams: number): boolean {
    return (
      Number.isInteger(grams) &&
      grams >= MIN_INGREDIENT_GRAMS &&
      grams <= MAX_INGREDIENT_GRAMS
    );
  }

  private areMinutesInRange(minutes: number): boolean {
    return (
      Number.isInteger(minutes) && minutes >= 0 && minutes <= MAX_RECIPE_MINUTES
    );
  }
}
