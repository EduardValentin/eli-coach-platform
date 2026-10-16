// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";

import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMemoryRouter, RouterProvider, useParams } from "react-router";
import { afterEach, describe, expect, it } from "vitest";

import type {
  FoodLibraryView,
  FoodView,
  NutritionTagView,
} from "~/features/nutrition-library/public/foods";
import {
  COACH_NUTRITION_PATH,
  FOOD_EDITOR_ROUTE_SEGMENT,
  NEW_FOOD_PATH,
} from "~/features/nutrition-library/public/paths";

import FoodLibraryRoute from "./food-library-page";

const TAGS: NutritionTagView[] = [
  { id: "mt-breakfast", family: "meal-time", label: "Breakfast" },
  { id: "mt-lunch", family: "meal-time", label: "Lunch" },
  { id: "cp-luteal", family: "cycle-phase", label: "Luteal" },
  { id: "nu-omega3", family: "nutrient", label: "Omega-3" },
  { id: "di-vegetarian", family: "dietary", label: "Vegetarian" },
];

const CHICKEN: FoodView = {
  id: "1a2b3c4d-5e6f-4a7b-8c9d-0e1f2a3b4c5d",
  name: "Chicken breast",
  category: "protein",
  icon: "poultry",
  kcal: 165,
  protein: 31,
  carb: 0,
  fat: 3.6,
  defaultPortionGrams: 150,
  tagIds: ["di-vegetarian", "mt-lunch"],
};

const SALMON: FoodView = {
  id: "2b3c4d5e-6f7a-4b8c-9d0e-1f2a3b4c5d6e",
  name: "Salmon",
  category: "protein",
  icon: "fish",
  kcal: 208,
  protein: 20.42,
  carb: 0,
  fat: 13.42,
  defaultPortionGrams: 120,
  tagIds: [],
};

afterEach(() => {
  cleanup();
});

describe("the coach's food library", () => {
  it("names the page and offers a new food", async () => {
    // arrange, act
    await renderLibrary({ foods: [CHICKEN], tags: TAGS });

    // assert
    expect(
      screen.getByText("Build your food library and recipes."),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "New food" })).toHaveAttribute(
      "href",
      NEW_FOOD_PATH,
    );
  });

  it("lists every food in the library's order with its category, values per 100 g and tags in the vocabulary's order", async () => {
    // arrange, act
    await renderLibrary({ foods: [CHICKEN, SALMON], tags: TAGS });

    // assert
    expect(
      screen.getAllByRole("columnheader").map((header) => header.textContent),
    ).toEqual(["Food", "kcal", "Protein", "Carbs", "Fat", "Tags", "Actions"]);
    expect(rowTexts()).toEqual([
      [
        "Chicken breastProtein",
        "165",
        "31g",
        "0g",
        "3.6g",
        "LunchVegetarian",
        "",
      ],
      ["SalmonProtein", "208", "20.42g", "0g", "13.42g", "", ""],
    ]);
  });

  it("gives each tag its own pill", async () => {
    // arrange, act
    await renderLibrary({ foods: [CHICKEN], tags: TAGS });

    // assert
    const [, row] = screen.getAllByRole("row");
    expect(
      within(row as HTMLElement)
        .getAllByRole("listitem")
        .map((pill) => pill.textContent),
    ).toEqual(["Lunch", "Vegetarian"]);
  });

  it("opens a food's editor from Edit in its row menu", async () => {
    // arrange
    const user = userEvent.setup();
    await renderLibrary({ foods: [CHICKEN, SALMON], tags: TAGS });

    // act
    await user.click(
      screen.getByRole("button", { name: "Actions for Salmon" }),
    );
    await user.click(await screen.findByRole("menuitem", { name: "Edit" }));

    // assert
    expect(
      await screen.findByRole("heading", { name: `Editing ${SALMON.id}` }),
    ).toBeInTheDocument();
  });

  it("holds nothing but Edit in a row menu", async () => {
    // arrange
    const user = userEvent.setup();
    await renderLibrary({ foods: [CHICKEN], tags: TAGS });

    // act
    await user.click(
      screen.getByRole("button", { name: "Actions for Chicken breast" }),
    );

    // assert
    expect(
      (await screen.findAllByRole("menuitem")).map((item) => item.textContent),
    ).toEqual(["Edit"]);
  });

  it("tells her the library is empty until she adds a food", async () => {
    // arrange, act
    await renderLibrary({ foods: [], tags: TAGS });

    // assert
    expect(screen.getByText("No foods yet")).toBeInTheDocument();
    expect(screen.getByText("Foods you add appear here.")).toBeInTheDocument();
    expect(screen.getAllByRole("row")).toHaveLength(2);
  });
});

function EditorStandIn() {
  const { foodId } = useParams();

  return <h1>{`Editing ${foodId}`}</h1>;
}

function rowTexts(): string[][] {
  const [, ...rows] = screen.getAllByRole("row");

  return rows.map((row) =>
    within(row)
      .getAllByRole("cell")
      .map((cell) => cell.textContent ?? ""),
  );
}

async function renderLibrary(library: FoodLibraryView) {
  const router = createMemoryRouter(
    [
      {
        Component: FoodLibraryRoute,
        loader: () => library,
        path: COACH_NUTRITION_PATH,
      },
      {
        Component: () => <h1>New food</h1>,
        path: NEW_FOOD_PATH,
      },
      {
        Component: EditorStandIn,
        path: `/coach/${FOOD_EDITOR_ROUTE_SEGMENT}`,
      },
    ],
    { initialEntries: [COACH_NUTRITION_PATH] },
  );

  render(<RouterProvider router={router} />);
  await screen.findByRole("heading", { level: 1, name: "Nutrition" });
}
