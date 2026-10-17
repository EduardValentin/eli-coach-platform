import { describe, expect, it, vi } from "vitest";

import { CreateFoodUseCase } from "./create-food-use-case";
import { Food } from "./food";
import type { FoodDraftInput } from "./food-draft";
import type { FoodAddition } from "./food-library";
import type { NutritionLibraryIncidents } from "./nutrition-library-incidents";
import type { NutritionTag } from "./nutrition-tags";

const STORED_AT = new Date("2026-10-13T09:00:00.000Z");
const NOW = new Date("2026-10-14T09:00:00.000Z");
const COACH_ACCOUNT_ID = "coach-account-1";
const OTHER_COACH_ACCOUNT_ID = "coach-account-2";

const TAGS: NutritionTag[] = [
  { id: "mt-lunch", family: "meal-time", label: "Lunch", order: 2 },
  {
    id: "di-lactose-free",
    family: "dietary",
    label: "Lactose-free",
    order: 16,
  },
];

const OATS = Food.reconstitute({
  id: "food-1",
  ownerAccountId: COACH_ACCOUNT_ID,
  name: "Oats",
  category: "carb",
  icon: "grain",
  kcal: 389,
  protein: 16.9,
  carb: 66.3,
  fat: 6.9,
  defaultPortionGrams: 40,
  tagIds: [],
  archivedAt: null,
  createdAt: STORED_AT,
  updatedAt: STORED_AT,
});

const OTHER_COACHS_RICE = Food.reconstitute({
  ...OATS.toSnapshot(),
  id: "food-3",
  ownerAccountId: OTHER_COACH_ACCOUNT_ID,
  name: "Rice",
});

const CHICKEN: FoodDraftInput = {
  name: "  Chicken breast ",
  category: "protein",
  icon: "poultry",
  kcal: 165,
  protein: 31,
  carb: 0,
  fat: 3.6,
  defaultPortionGrams: 0,
  tagIds: ["mt-lunch", "di-lactose-free"],
};

function createUseCase() {
  const stored = [OATS, OTHER_COACHS_RICE];
  const library = {
    list: vi.fn(async (ownerAccountId: string): Promise<Food[]> =>
      stored.filter(
        (food) => food.toSnapshot().ownerAccountId === ownerAccountId,
      ),
    ),
    add: vi.fn(async (): Promise<FoodAddition> => "added"),
  };
  const tags = { list: vi.fn(async () => TAGS) };
  const incidents = {
    foodCreationFailed: vi.fn(),
    foodEditFailed: vi.fn(),
    recipeCreationFailed: vi.fn(),
    recipeEditFailed: vi.fn(),
    recipePhotoCleanupFailed: vi.fn(),
  } satisfies NutritionLibraryIncidents;
  const useCase = new CreateFoodUseCase({
    library,
    tags,
    ids: { generate: () => "food-2" },
    clock: { now: () => NOW },
    incidents,
  });

  return { useCase, library, tags, incidents };
}

describe("CreateFoodUseCase", () => {
  it("adds the food under a new id, owned by the coach who created it, its name trimmed and a 0 portion made 100 grams, created now", async () => {
    // arrange
    const { useCase, library } = createUseCase();

    // act
    const result = await useCase.execute({
      ownerAccountId: COACH_ACCOUNT_ID,
      draft: CHICKEN,
    });

    // assert
    const created = Food.reconstitute({
      ...CHICKEN,
      id: "food-2",
      ownerAccountId: COACH_ACCOUNT_ID,
      name: "Chicken breast",
      category: "protein",
      icon: "poultry",
      defaultPortionGrams: 100,
      tagIds: ["mt-lunch", "di-lactose-free"],
      archivedAt: null,
      createdAt: NOW,
      updatedAt: NOW,
    });
    expect(result).toEqual({ status: "created", food: created });
    expect(library.add).toHaveBeenCalledWith(created);
  });

  it("refuses a draft that breaks a rule, naming each problem, without adding it", async () => {
    // arrange
    const { useCase, library } = createUseCase();

    // act
    const result = await useCase.execute({
      ownerAccountId: COACH_ACCOUNT_ID,
      draft: { ...CHICKEN, name: " ", kcal: 10_000 },
    });

    // assert
    expect(result).toEqual({
      status: "invalid",
      problems: { name: "missing", kcal: "out-of-range" },
    });
    expect(library.add).not.toHaveBeenCalled();
  });

  it("refuses a tag outside the vocabulary the tags answer, without adding it", async () => {
    // arrange
    const { useCase, library } = createUseCase();

    // act
    const result = await useCase.execute({
      ownerAccountId: COACH_ACCOUNT_ID,
      draft: { ...CHICKEN, tagIds: ["mt-lunch", "mt-brunch"] },
    });

    // assert
    expect(result).toEqual({
      status: "invalid",
      problems: { tagIds: "unknown" },
    });
    expect(library.add).not.toHaveBeenCalled();
  });

  it("refuses a name another of her foods already has, whatever its case and spaces, without adding it", async () => {
    // arrange
    const { useCase, library } = createUseCase();

    // act
    const result = await useCase.execute({
      ownerAccountId: COACH_ACCOUNT_ID,
      draft: { ...CHICKEN, name: " OATS  " },
    });

    // assert
    expect(result).toEqual({ status: "invalid", problems: { name: "taken" } });
    expect(library.add).not.toHaveBeenCalled();
  });

  it("adds a name only another coach's food has", async () => {
    // arrange
    const { useCase, library } = createUseCase();

    // act
    const result = await useCase.execute({
      ownerAccountId: COACH_ACCOUNT_ID,
      draft: { ...CHICKEN, name: "rice" },
    });

    // assert
    expect(result.status).toBe("created");
    expect(library.add).toHaveBeenCalledOnce();
  });

  it("refuses the name when the library finds it taken by a food added meanwhile", async () => {
    // arrange
    const { useCase, library } = createUseCase();
    library.add.mockResolvedValueOnce("name-taken");

    // act
    const result = await useCase.execute({
      ownerAccountId: COACH_ACCOUNT_ID,
      draft: CHICKEN,
    });

    // assert
    expect(result).toEqual({ status: "invalid", problems: { name: "taken" } });
  });

  it("reports a failed read of the tags and answers that the creation failed without adding it", async () => {
    // arrange
    const failure = new Error("connection terminated");
    const { useCase, library, tags, incidents } = createUseCase();
    tags.list.mockRejectedValueOnce(failure);

    // act
    const result = await useCase.execute({
      ownerAccountId: COACH_ACCOUNT_ID,
      draft: CHICKEN,
    });

    // assert
    expect(result).toEqual({ status: "failed" });
    expect(library.add).not.toHaveBeenCalled();
    expect(incidents.foodCreationFailed).toHaveBeenCalledWith({
      error: failure,
    });
  });

  it("reports a failed write and answers that the creation failed", async () => {
    // arrange
    const failure = new Error("connection terminated");
    const { useCase, library, incidents } = createUseCase();
    library.add.mockRejectedValueOnce(failure);

    // act
    const result = await useCase.execute({
      ownerAccountId: COACH_ACCOUNT_ID,
      draft: CHICKEN,
    });

    // assert
    expect(result).toEqual({ status: "failed" });
    expect(incidents.foodCreationFailed).toHaveBeenCalledWith({
      error: failure,
    });
  });
});
