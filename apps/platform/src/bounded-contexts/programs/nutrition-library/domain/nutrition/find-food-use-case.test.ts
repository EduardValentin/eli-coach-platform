import { describe, expect, it, vi } from "vitest";

import { Food } from "./food";
import type { FoodLibrary } from "./food-library";
import { FindFoodUseCase } from "./find-food-use-case";
import type { NutritionTag } from "./nutrition-tags";

const AT = new Date("2026-10-14T09:00:00.000Z");
const COACH_ACCOUNT_ID = "coach-account-1";
const OTHER_COACH_ACCOUNT_ID = "coach-account-2";

const TAGS: NutritionTag[] = [
  { id: "mt-breakfast", family: "meal-time", label: "Breakfast", order: 1 },
];

function foodCalled(id: string, name: string, ownerAccountId: string): Food {
  return Food.reconstitute({
    id,
    ownerAccountId,
    name,
    category: "carb",
    icon: "grain",
    kcal: 100,
    protein: 1,
    carb: 20,
    fat: 1,
    defaultPortionGrams: 100,
    tagIds: [],
    archivedAt: null,
    createdAt: AT,
    updatedAt: AT,
  });
}

const OATS = foodCalled("food-1", "Oats", COACH_ACCOUNT_ID);
const RICE = foodCalled("food-2", "Rice", COACH_ACCOUNT_ID);
const QUINOA = foodCalled("food-3", "Quinoa", COACH_ACCOUNT_ID);
const OTHER_COACHS_PASTA = foodCalled(
  "food-4",
  "Pasta",
  OTHER_COACH_ACCOUNT_ID,
);

function createUseCase() {
  const stored = [OATS, QUINOA, RICE, OTHER_COACHS_PASTA];
  const ownedBy = (ownerAccountId: string) =>
    stored.filter(
      (food) => food.toSnapshot().ownerAccountId === ownerAccountId,
    );
  const library = {
    list: vi.fn(async (ownerAccountId: string) => ownedBy(ownerAccountId)),
  } satisfies Pick<FoodLibrary, "list">;
  const tags = { list: vi.fn(async () => TAGS) };

  return { useCase: new FindFoodUseCase({ library, tags }), library };
}

describe("FindFoodUseCase", () => {
  it("finds her food in one read of her library, with the names of every other food of hers, its own left out, and the tag vocabulary", async () => {
    // arrange
    const { useCase, library } = createUseCase();

    // act
    const result = await useCase.execute({
      ownerAccountId: COACH_ACCOUNT_ID,
      foodId: "food-1",
    });

    // assert
    expect(result).toEqual({
      status: "found",
      food: OATS,
      otherNames: ["Quinoa", "Rice"],
      tags: TAGS,
    });
    expect(library.list).toHaveBeenCalledOnce();
  });

  it("finds nothing for an unknown food", async () => {
    // arrange
    const { useCase } = createUseCase();

    // act
    const result = await useCase.execute({
      ownerAccountId: COACH_ACCOUNT_ID,
      foodId: "food-9",
    });

    // assert
    expect(result).toEqual({ status: "not-found" });
  });

  it("finds nothing for another coach's food", async () => {
    // arrange
    const { useCase } = createUseCase();

    // act
    const result = await useCase.execute({
      ownerAccountId: COACH_ACCOUNT_ID,
      foodId: "food-4",
    });

    // assert
    expect(result).toEqual({ status: "not-found" });
  });
});
