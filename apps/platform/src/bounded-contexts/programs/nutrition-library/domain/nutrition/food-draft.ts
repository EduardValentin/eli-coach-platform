import {
  DEFAULT_PORTION_GRAMS,
  FOOD_CATEGORIES,
  FOOD_ICONS,
  MAX_FOOD_NAME_LENGTH,
  MAX_MACRO_PER_100G,
  MAX_PORTION_GRAMS,
  type FoodCategory,
  type FoodIcon,
} from "./nutrition";

export type FoodDraftInput = {
  name: string;
  category: string;
  icon: string;
  kcal: number;
  protein: number;
  carb: number;
  fat: number;
  defaultPortionGrams: number;
  tagIds: readonly string[];
};

export type FoodDraftSnapshot = {
  name: string;
  category: FoodCategory;
  icon: FoodIcon;
  kcal: number;
  protein: number;
  carb: number;
  fat: number;
  defaultPortionGrams: number;
  tagIds: string[];
};

type MacroProblem = "out-of-range";

export type FoodDraftProblems = {
  name?: "missing" | "too-long" | "taken";
  category?: "unknown";
  icon?: "unknown";
  kcal?: MacroProblem;
  protein?: MacroProblem;
  carb?: MacroProblem;
  fat?: MacroProblem;
  defaultPortionGrams?: "out-of-range";
  tagIds?: "unknown";
};

type FoodDraftContext = {
  otherNames: readonly string[];
  knownTagIds: readonly string[];
};

type FoodDraftResult =
  | { status: "valid"; draft: FoodDraft }
  | { status: "invalid"; problems: FoodDraftProblems };

const MACROS = ["kcal", "protein", "carb", "fat"] as const;

export class FoodDraft {
  private constructor(private readonly snapshot: FoodDraftSnapshot) {}

  static from(
    input: FoodDraftInput,
    context: FoodDraftContext,
  ): FoodDraftResult {
    const category = FOOD_CATEGORIES.find((known) => known === input.category);
    const icon = FOOD_ICONS.find((known) => known === input.icon);
    const unknownTag = input.tagIds.some(
      (tagId) => !context.knownTagIds.includes(tagId),
    );

    if (category === undefined || icon === undefined || unknownTag) {
      return {
        status: "invalid",
        problems: {
          ...(category === undefined && { category: "unknown" }),
          ...(icon === undefined && { icon: "unknown" }),
          ...(unknownTag && { tagIds: "unknown" }),
        },
      };
    }

    const draft = new FoodDraft({
      name: input.name.trim(),
      category,
      icon,
      kcal: input.kcal,
      protein: input.protein,
      carb: input.carb,
      fat: input.fat,
      defaultPortionGrams:
        input.defaultPortionGrams === 0
          ? DEFAULT_PORTION_GRAMS
          : input.defaultPortionGrams,
      tagIds: [...new Set(input.tagIds)],
    });
    const problems = draft.problemsAmong(context.otherNames);

    if (Object.keys(problems).length > 0) {
      return { status: "invalid", problems };
    }

    return { status: "valid", draft };
  }

  toSnapshot(): FoodDraftSnapshot {
    return { ...this.snapshot, tagIds: [...this.snapshot.tagIds] };
  }

  private problemsAmong(otherNames: readonly string[]): FoodDraftProblems {
    const name = this.nameProblemAmong(otherNames);
    const macros = MACROS.filter(
      (macro) => !this.isMacroInRange(this.snapshot[macro]),
    ).map((macro) => [macro, "out-of-range"]);

    return {
      ...(name && { name }),
      ...Object.fromEntries(macros),
      ...(!this.isPortionInRange() && { defaultPortionGrams: "out-of-range" }),
    };
  }

  private nameProblemAmong(
    otherNames: readonly string[],
  ): FoodDraftProblems["name"] {
    if (this.snapshot.name.length === 0) return "missing";
    if (this.snapshot.name.length > MAX_FOOD_NAME_LENGTH) return "too-long";
    if (this.isNameAmong(otherNames)) return "taken";

    return undefined;
  }

  private isNameAmong(otherNames: readonly string[]): boolean {
    const comparable = this.snapshot.name.toLowerCase();

    return otherNames.some(
      (otherName) => otherName.trim().toLowerCase() === comparable,
    );
  }

  private isMacroInRange(value: number): boolean {
    return (
      Number.isFinite(value) &&
      value >= 0 &&
      value <= MAX_MACRO_PER_100G &&
      Math.round(value * 100) / 100 === value
    );
  }

  private isPortionInRange(): boolean {
    const grams = this.snapshot.defaultPortionGrams;

    return Number.isInteger(grams) && grams >= 1 && grams <= MAX_PORTION_GRAMS;
  }
}
