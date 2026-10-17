// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";

import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMemoryRouter, RouterProvider, useParams } from "react-router";
import { afterEach, describe, expect, it } from "vitest";

import type {
  FoodView,
  NutritionTagView,
} from "~/features/nutrition-library/public/foods";
import {
  COACH_NUTRITION_PATH,
  COACH_RECIPES_PATH,
  FOOD_EDITOR_ROUTE_SEGMENT,
  NEW_FOOD_PATH,
  NEW_RECIPE_PATH,
  RECIPE_EDITOR_ROUTE_SEGMENT,
} from "~/features/nutrition-library/public/paths";
import type { RecipeCardView } from "~/features/nutrition-library/public/recipes";

import NutritionRoute from "./nutrition-page";

type NutritionLibrary = {
  foods: FoodView[];
  tags: NutritionTagView[];
  recipes: RecipeCardView[];
};

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

const PORRIDGE: RecipeCardView = {
  id: "3c4d5e6f-7a8b-4c9d-8e0f-1a2b3c4d5e6f",
  name: "Porridge",
  icon: "pot",
  totalMinutes: 15,
  macros: { kcal: 261, protein: 15, carb: 39, fat: 5 },
  tagIds: ["mt-breakfast", "mt-lunch", "di-vegetarian", "nu-omega3"],
};

const SALMON_BOWL: RecipeCardView = {
  id: "4d5e6f7a-8b9c-4d0e-9f1a-2b3c4d5e6f7a",
  name: "Salmon bowl",
  icon: null,
  totalMinutes: 0,
  macros: { kcal: 0, protein: 0, carb: 0, fat: 0 },
  tagIds: [],
};

afterEach(() => {
  cleanup();
});

describe("the Foods tab", () => {
  it("names the page and offers a new food", async () => {
    // arrange, act
    await renderLibrary({ foods: [CHICKEN], tags: TAGS, recipes: [] });

    // assert
    expect(
      screen.getByText("Build your food library and recipes."),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "New food" })).toHaveAttribute(
      "href",
      NEW_FOOD_PATH,
    );
    expect(screen.queryByRole("link", { name: "New recipe" })).toBeNull();
  });

  it("lists every food in the library's order with its category, values per 100 g and tags in the vocabulary's order", async () => {
    // arrange, act
    await renderLibrary({ foods: [CHICKEN, SALMON], tags: TAGS, recipes: [] });

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
    await renderLibrary({ foods: [CHICKEN], tags: TAGS, recipes: [] });

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
    await renderLibrary({ foods: [CHICKEN, SALMON], tags: TAGS, recipes: [] });

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
    await renderLibrary({ foods: [CHICKEN], tags: TAGS, recipes: [] });

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
    await renderLibrary({ foods: [], tags: TAGS, recipes: [] });

    // assert
    expect(screen.getByText("No foods yet")).toBeInTheDocument();
    expect(screen.getByText("Foods you add appear here.")).toBeInTheDocument();
    expect(screen.getAllByRole("row")).toHaveLength(2);
  });
});

describe("choosing between foods and recipes", () => {
  it("opens on the Foods tab when the address names no tab", async () => {
    // arrange, act
    await renderLibrary({ foods: [CHICKEN], tags: TAGS, recipes: [PORRIDGE] });

    // assert
    expect(screen.getByRole("tab", { name: "Foods" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(screen.getByRole("table")).toBeInTheDocument();
    expect(screen.queryByRole("article", { name: "Porridge" })).toBeNull();
  });

  it("opens on the Recipes tab the address names and offers a new recipe instead of a new food", async () => {
    // arrange, act
    await renderLibrary(
      { foods: [CHICKEN], tags: TAGS, recipes: [PORRIDGE] },
      COACH_RECIPES_PATH,
    );

    // assert
    expect(screen.getByRole("tab", { name: "Recipes" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(screen.getByRole("link", { name: "New recipe" })).toHaveAttribute(
      "href",
      NEW_RECIPE_PATH,
    );
    expect(screen.queryByRole("link", { name: "New food" })).toBeNull();
    expect(screen.queryByRole("table")).toBeNull();
  });

  it("falls back to the Foods tab for a tab it does not know", async () => {
    // arrange, act
    await renderLibrary(
      { foods: [CHICKEN], tags: TAGS, recipes: [PORRIDGE] },
      `${COACH_NUTRITION_PATH}?tab=plans`,
    );

    // assert
    expect(screen.getByRole("tab", { name: "Foods" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(screen.getByRole("link", { name: "New food" })).toBeVisible();
  });

  it("keeps the chosen tab in the address without a history entry and swaps the header action", async () => {
    // arrange
    const user = userEvent.setup();
    const router = await renderLibrary({
      foods: [CHICKEN],
      tags: TAGS,
      recipes: [PORRIDGE],
    });

    // act
    await user.click(screen.getByRole("tab", { name: "Recipes" }));

    // assert
    expect(
      await screen.findByRole("article", { name: "Porridge" }),
    ).toBeInTheDocument();
    expect(router.state.location.search).toBe("?tab=recipes");
    expect(router.state.historyAction).toBe("REPLACE");
    expect(screen.getByRole("link", { name: "New recipe" })).toBeVisible();

    // act
    screen.getByRole("tab", { name: "Recipes" }).focus();
    await user.keyboard("{ArrowLeft}");

    // assert
    expect(await screen.findByRole("table")).toBeInTheDocument();
    expect(router.state.location.search).toBe("?tab=foods");
    expect(screen.getByRole("link", { name: "New food" })).toBeVisible();
  });

  it("keeps her keyboard on the tab she moves to with the arrow keys", async () => {
    // arrange
    const user = userEvent.setup();
    await renderLibrary({ foods: [CHICKEN], tags: TAGS, recipes: [PORRIDGE] });
    screen.getByRole("tab", { name: "Foods" }).focus();

    // act
    await user.keyboard("{ArrowRight}");

    // assert
    expect(
      await screen.findByRole("article", { name: "Porridge" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Recipes" })).toHaveFocus();

    // act
    await user.keyboard("{ArrowLeft}");

    // assert
    expect(await screen.findByRole("table")).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Foods" })).toHaveFocus();
  });

  it("keeps her focus on the tab she clicks", async () => {
    // arrange
    const user = userEvent.setup();
    await renderLibrary({ foods: [CHICKEN], tags: TAGS, recipes: [PORRIDGE] });

    // act
    await user.click(screen.getByRole("tab", { name: "Recipes" }));

    // assert
    expect(
      await screen.findByRole("article", { name: "Porridge" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Recipes" })).toHaveFocus();
  });
});

describe("the Recipes tab", () => {
  it("shows each recipe as a card in the library's order with its visual, name, total minutes and macros", async () => {
    // arrange, act
    await renderLibrary(
      { foods: [], tags: TAGS, recipes: [PORRIDGE, SALMON_BOWL] },
      COACH_RECIPES_PATH,
    );

    // assert
    expect(
      screen
        .getAllByRole("article")
        .map((card) => card.getAttribute("aria-label")),
    ).toEqual(["Porridge", "Salmon bowl"]);
    const porridge = screen.getByRole("article", { name: "Porridge" });
    expect(
      within(porridge).getByRole("heading", { level: 2, name: "Porridge" }),
    ).toBeInTheDocument();
    expect(
      within(porridge).getByRole("img", { name: "Porridge" }),
    ).toBeVisible();
    expect(within(porridge).getByText("15 min")).toBeInTheDocument();
    expect(within(porridge).getByText("Per recipe")).toBeInTheDocument();
    expect(macroTilesOf(porridge)).toEqual([
      ["kcal", "261"],
      ["P", "15g"],
      ["C", "39g"],
      ["F", "5g"],
    ]);
    const bowl = screen.getByRole("article", { name: "Salmon bowl" });
    expect(within(bowl).getByText("0 min")).toBeInTheDocument();
    expect(macroTilesOf(bowl)).toEqual([
      ["kcal", "0"],
      ["P", "0g"],
      ["C", "0g"],
      ["F", "0g"],
    ]);
  });

  it("lists a card's meal roles before its other tags, each as its own pill", async () => {
    // arrange, act
    await renderLibrary(
      { foods: [], tags: TAGS, recipes: [PORRIDGE, SALMON_BOWL] },
      COACH_RECIPES_PATH,
    );

    // assert
    expect(
      within(screen.getByRole("article", { name: "Porridge" }))
        .getAllByRole("listitem")
        .map((pill) => pill.textContent),
    ).toEqual(["Breakfast", "Lunch", "Vegetarian", "Omega-3"]);
    expect(
      within(
        screen.getByRole("article", { name: "Salmon bowl" }),
      ).queryAllByRole("listitem"),
    ).toEqual([]);
  });

  it("opens a recipe in the builder from Edit, the only action in its menu", async () => {
    // arrange
    const user = userEvent.setup();
    await renderLibrary(
      { foods: [], tags: TAGS, recipes: [PORRIDGE, SALMON_BOWL] },
      COACH_RECIPES_PATH,
    );
    await user.click(
      screen.getByRole("button", { name: "Actions for Salmon bowl" }),
    );

    // act
    const items = await screen.findAllByRole("menuitem");
    await user.click(screen.getByRole("menuitem", { name: "Edit" }));

    // assert
    expect(items.map((item) => item.textContent)).toEqual(["Edit"]);
    expect(
      await screen.findByRole("heading", {
        name: `Building ${SALMON_BOWL.id}`,
      }),
    ).toBeInTheDocument();
  });

  it("tells her she has no recipes until she builds one", async () => {
    // arrange, act
    await renderLibrary(
      { foods: [CHICKEN], tags: TAGS, recipes: [] },
      COACH_RECIPES_PATH,
    );

    // assert
    expect(screen.getByText("No recipes yet")).toBeInTheDocument();
    expect(
      screen.getByText("Recipes you build appear here."),
    ).toBeInTheDocument();
    expect(screen.queryByRole("article")).toBeNull();
  });
});

function EditorStandIn() {
  const { foodId } = useParams();

  return <h1>{`Editing ${foodId}`}</h1>;
}

function BuilderStandIn() {
  const { recipeId } = useParams();

  return <h1>{`Building ${recipeId}`}</h1>;
}

function macroTilesOf(card: HTMLElement): string[][] {
  const terms = within(card).getAllByRole("term");

  return terms.map((term) => [
    term.textContent ?? "",
    term.nextElementSibling?.textContent ?? "",
  ]);
}

function rowTexts(): string[][] {
  const [, ...rows] = screen.getAllByRole("row");

  return rows.map((row) =>
    within(row)
      .getAllByRole("cell")
      .map((cell) => cell.textContent ?? ""),
  );
}

async function renderLibrary(
  library: NutritionLibrary,
  entry: string = COACH_NUTRITION_PATH,
) {
  const router = createMemoryRouter(
    [
      {
        Component: NutritionRoute,
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
      {
        Component: BuilderStandIn,
        path: `/coach/${RECIPE_EDITOR_ROUTE_SEGMENT}`,
      },
    ],
    { initialEntries: [entry] },
  );

  render(<RouterProvider router={router} />);
  await screen.findByRole("heading", { level: 1, name: "Nutrition" });

  return router;
}
