import { describe, expect, it, vi } from "vitest";

import { Food } from "./food";
import { ListFoodsUseCase } from "./list-foods-use-case";
import type { NutritionTag } from "./nutrition-tags-port";

const AT = new Date("2026-10-14T09:00:00.000Z");
const COACH_ACCOUNT_ID = "coach-account-1";

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
  tagIds: ["mt-breakfast"],
  archivedAt: null,
  createdAt: AT,
  updatedAt: AT,
});

const TAGS: NutritionTag[] = [
  { id: "mt-breakfast", family: "meal-time", label: "Breakfast", order: 1 },
  { id: "di-vegetarian", family: "dietary", label: "Vegetarian", order: 15 },
];

describe("ListFoodsUseCase", () => {
  it("lists her foods with the tag vocabulary in display order", async () => {
    // arrange
    const library = { list: vi.fn(async () => [OATS]) };
    const tags = { list: vi.fn(async () => TAGS) };
    const useCase = new ListFoodsUseCase({ library, tags });

    // act
    const result = await useCase.execute(COACH_ACCOUNT_ID);

    // assert
    expect(result).toEqual({ status: "listed", foods: [OATS], tags: TAGS });
    expect(library.list).toHaveBeenCalledWith(COACH_ACCOUNT_ID);
  });
});
