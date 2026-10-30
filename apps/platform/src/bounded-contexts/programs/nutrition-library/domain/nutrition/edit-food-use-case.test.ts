import { describe, expect, it, vi } from "vitest";

import { EditFoodUseCase } from "./edit-food-use-case";
import { Food } from "./food";
import type { FoodDraftInput } from "./food-draft";
import type { FoodReference, FoodReplacement } from "./food-library-port";
import type { NutritionLibraryIncidentsPort } from "./nutrition-library-incidents-port";
import type { NutritionTag } from "./nutrition-tags-port";

const CREATED_AT = new Date("2026-10-13T09:00:00.000Z");
const NOW = new Date("2026-10-14T09:00:00.000Z");
const COACH_ACCOUNT_ID = "coach-account-1";
const OTHER_COACH_ACCOUNT_ID = "coach-account-2";

const TAGS: NutritionTag[] = [
  { id: "mt-breakfast", family: "meal-time", label: "Breakfast", order: 1 },
  { id: "di-vegetarian", family: "dietary", label: "Vegetarian", order: 15 },
];

function foodCalled(id: string, name: string, ownerAccountId: string): Food {
  return Food.reconstitute({
    id,
    ownerAccountId,
    name,
    category: "carb",
    icon: "grain",
    kcal: 389,
    protein: 16.9,
    carb: 66.3,
    fat: 6.9,
    defaultPortionGrams: 40,
    tagIds: ["mt-breakfast"],
    archivedAt: null,
    createdAt: CREATED_AT,
    updatedAt: CREATED_AT,
  });
}

const OATS = foodCalled("food-1", "Oats", COACH_ACCOUNT_ID);
const RICE = foodCalled("food-2", "Rice", COACH_ACCOUNT_ID);
const OTHER_COACHS_QUINOA = foodCalled(
  "food-3",
  "Quinoa",
  OTHER_COACH_ACCOUNT_ID,
);

const ROLLED_OATS: FoodDraftInput = {
  name: " Rolled oats ",
  category: "carb",
  icon: "grain",
  kcal: 375,
  protein: 13.2,
  carb: 67.7,
  fat: 6.5,
  defaultPortionGrams: 50,
  tagIds: ["di-vegetarian"],
};

function createUseCase() {
  const stored = [OATS, RICE, OTHER_COACHS_QUINOA];
  const ownedBy = (ownerAccountId: string) =>
    stored.filter(
      (food) => food.toSnapshot().ownerAccountId === ownerAccountId,
    );
  const library = {
    list: vi.fn(async (ownerAccountId: string) => ownedBy(ownerAccountId)),
    find: vi.fn(
      async ({ ownerAccountId, foodId }: FoodReference) =>
        ownedBy(ownerAccountId).find(({ id }) => id === foodId) ?? null,
    ),
    replace: vi.fn(async (): Promise<FoodReplacement> => "replaced"),
  };
  const tags = { list: vi.fn(async () => TAGS) };
  const incidents = {
    foodCreationFailed: vi.fn(),
    foodEditFailed: vi.fn(),
    recipeCreationFailed: vi.fn(),
    recipeEditFailed: vi.fn(),
    recipePhotoCleanupFailed: vi.fn(),
  } satisfies NutritionLibraryIncidentsPort;
  const editFoodUseCase = new EditFoodUseCase({
    foodLibraryPort: library,
    nutritionTagsPort: tags,
    clockPort: { now: () => NOW },
    nutritionLibraryIncidentsPort: incidents,
  });

  return { editFoodUseCase, library, incidents };
}

describe("EditFoodUseCase", () => {
  it("replaces her food as a whole, keeping its id, owner and creation moment, updated now", async () => {
    // arrange
    const { editFoodUseCase, library } = createUseCase();

    // act
    const result = await editFoodUseCase.execute({
      ownerAccountId: COACH_ACCOUNT_ID,
      foodId: "food-1",
      draft: ROLLED_OATS,
    });

    // assert
    const edited = Food.reconstitute({
      ...OATS.toSnapshot(),
      ...ROLLED_OATS,
      name: "Rolled oats",
      category: "carb",
      icon: "grain",
      tagIds: ["di-vegetarian"],
      updatedAt: NOW,
    });
    expect(result).toEqual({ status: "edited", food: edited });
    expect(library.replace).toHaveBeenCalledWith(edited);
  });

  it("keeps its own name, recased and spaced", async () => {
    // arrange
    const { editFoodUseCase } = createUseCase();

    // act
    const result = await editFoodUseCase.execute({
      ownerAccountId: COACH_ACCOUNT_ID,
      foodId: "food-1",
      draft: { ...ROLLED_OATS, name: "  OATS " },
    });

    // assert
    expect(result.status).toBe("edited");
  });

  it("refuses a rename onto another of her foods, without replacing it", async () => {
    // arrange
    const { editFoodUseCase, library } = createUseCase();

    // act
    const result = await editFoodUseCase.execute({
      ownerAccountId: COACH_ACCOUNT_ID,
      foodId: "food-1",
      draft: { ...ROLLED_OATS, name: "rice" },
    });

    // assert
    expect(result).toEqual({ status: "invalid", problems: { name: "taken" } });
    expect(library.replace).not.toHaveBeenCalled();
  });

  it("renames onto a name only another coach's food has", async () => {
    // arrange
    const { editFoodUseCase } = createUseCase();

    // act
    const result = await editFoodUseCase.execute({
      ownerAccountId: COACH_ACCOUNT_ID,
      foodId: "food-1",
      draft: { ...ROLLED_OATS, name: "Quinoa" },
    });

    // assert
    expect(result.status).toBe("edited");
  });

  it("refuses a draft that breaks a rule, without replacing the food", async () => {
    // arrange
    const { editFoodUseCase, library } = createUseCase();

    // act
    const result = await editFoodUseCase.execute({
      ownerAccountId: COACH_ACCOUNT_ID,
      foodId: "food-1",
      draft: { ...ROLLED_OATS, defaultPortionGrams: 0.5, tagIds: ["x"] },
    });

    // assert
    expect(result).toEqual({
      status: "invalid",
      problems: { tagIds: "unknown" },
    });
    expect(library.replace).not.toHaveBeenCalled();
  });

  it("refuses the name when the library finds it taken by a food renamed meanwhile", async () => {
    // arrange
    const { editFoodUseCase, library } = createUseCase();
    library.replace.mockResolvedValueOnce("name-taken");

    // act
    const result = await editFoodUseCase.execute({
      ownerAccountId: COACH_ACCOUNT_ID,
      foodId: "food-1",
      draft: ROLLED_OATS,
    });

    // assert
    expect(result).toEqual({ status: "invalid", problems: { name: "taken" } });
  });

  it.each([
    ["an unknown food", "food-9"],
    ["another coach's food", "food-3"],
  ])("finds nothing to edit for %s", async (_case, foodId) => {
    // arrange
    const { editFoodUseCase, library } = createUseCase();

    // act
    const result = await editFoodUseCase.execute({
      ownerAccountId: COACH_ACCOUNT_ID,
      foodId,
      draft: ROLLED_OATS,
    });

    // assert
    expect(result).toEqual({ status: "not-found" });
    expect(library.replace).not.toHaveBeenCalled();
  });

  it("reports a failed write with the food's id and answers that the edit failed", async () => {
    // arrange
    const failure = new Error("connection terminated");
    const { editFoodUseCase, library, incidents } = createUseCase();
    library.replace.mockRejectedValueOnce(failure);

    // act
    const result = await editFoodUseCase.execute({
      ownerAccountId: COACH_ACCOUNT_ID,
      foodId: "food-1",
      draft: ROLLED_OATS,
    });

    // assert
    expect(result).toEqual({ status: "failed" });
    expect(incidents.foodEditFailed).toHaveBeenCalledWith({
      foodId: "food-1",
      error: failure,
    });
  });
});
