// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";

import { Toaster } from "@eli-coach-platform/ui/toast";
import {
  cleanup,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent, { type UserEvent } from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { createMemoryRouter, redirect, RouterProvider } from "react-router";
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import { clientAction as editFood } from "~/features/nutrition-library/api/foods/food";
import { clientAction as createFood } from "~/features/nutrition-library/api/foods/foods";
import type {
  FoodView,
  NutritionTagView,
} from "~/features/nutrition-library/public/foods";
import {
  COACH_NUTRITION_PATH,
  FOOD_EDITOR_ROUTE_SEGMENT,
  foodEditorPath,
  NEW_FOOD_PATH,
  NUTRITION_LIBRARY_API_PATHS,
} from "~/features/nutrition-library/public/paths";
import { frameworkModeAction } from "~/server/test-support/framework-mode-action";

import FoodEditorRoute from "./food-editor-page";
import NutritionRoute from "~/features/nutrition-library/ui/coach/nutrition/nutrition-page";

const TAGS: NutritionTagView[] = [
  { id: "mt-breakfast", family: "meal-time", label: "Breakfast" },
  { id: "mt-lunch", family: "meal-time", label: "Lunch" },
  { id: "cp-luteal", family: "cycle-phase", label: "Luteal" },
  { id: "nu-omega3", family: "nutrient", label: "Omega-3" },
  { id: "di-vegetarian", family: "dietary", label: "Vegetarian" },
  { id: "di-lactose-free", family: "dietary", label: "Lactose-free" },
];

const OATS: FoodView = {
  id: "1a2b3c4d-5e6f-4a7b-8c9d-0e1f2a3b4c5d",
  name: "Oats",
  category: "carb",
  icon: "grain",
  kcal: 389,
  protein: 16.9,
  carb: 66.3,
  fat: 6.9,
  defaultPortionGrams: 40,
  tagIds: ["mt-breakfast", "di-vegetarian"],
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
  tagIds: ["nu-omega3"],
};

const LIBRARY = [OATS, SALMON];
const UNKNOWN_ID = "9e8d7c6b-5a49-4382-9716-a5b4c3d2e1f0";
const SAVE_FAILED = "We couldn't save the food. Try again in a moment.";
const MACRO_PROBLEM = "Enter a value from 0 to 9,999.99";
const PORTION_PROBLEM = "Enter whole grams up to 99,999";

const server = setupServer();

let sentBodies: { method: string; path: string; body: unknown }[] = [];

beforeAll(() => {
  server.listen({ onUnhandledRequest: "error" });
  Element.prototype.scrollIntoView = () => {};
  Element.prototype.hasPointerCapture = () => false;
  Element.prototype.releasePointerCapture = () => {};
  vi.stubGlobal(
    "ResizeObserver",
    class {
      disconnect() {}
      observe() {}
      unobserve() {}
    },
  );
});

beforeEach(() => {
  sentBodies = [];
});

afterEach(() => {
  cleanup();
  server.resetHandlers();
});

afterAll(() => {
  server.close();
  vi.unstubAllGlobals();
});

describe("a new food", () => {
  it("starts as a Protein with the neutral icon, blank values, a 100 g portion, no tag and nothing flagged", async () => {
    // arrange, act
    await renderEditor(NEW_FOOD_PATH);

    // assert
    expect(
      screen.getByRole("heading", { level: 1, name: "New food" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("textbox", { name: "Name (required)" }),
    ).toHaveValue("");
    expect(
      screen.getByRole("combobox", { name: "Category" }),
    ).toHaveTextContent("Protein");
    expect(screen.getByRole("button", { name: "Other" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(
      screen
        .getAllByRole("button", { pressed: true })
        .map((button) => button.getAttribute("aria-label")),
    ).toEqual(["Other"]);
    for (const amount of ["Calories", "Protein (g)", "Carbs (g)", "Fat (g)"]) {
      expect(screen.getByRole("spinbutton", { name: amount })).toHaveValue(
        null,
      );
    }
    expect(
      screen.getByRole("spinbutton", { name: "Default portion (g)" }),
    ).toHaveValue(100);
    expect(
      screen.getByRole("spinbutton", { name: "Default portion (g)" }),
    ).toHaveAccessibleDescription("Proposed when the food enters a recipe.");
    for (const tag of TAGS) {
      expect(
        screen.getByRole("checkbox", { name: tag.label }),
      ).not.toBeChecked();
    }
    expect(screen.queryByText("Give the food a name")).toBeNull();
    expect(screen.getByRole("button", { name: "Create food" })).toBeDisabled();
  });

  it("groups the tags under their four families", async () => {
    // arrange, act
    await renderEditor(NEW_FOOD_PATH);

    // assert
    const tags = within(
      screen.getByRole("region", { name: "Tags" }),
    ).getAllByRole("group");
    expect(
      tags.map((family) => [
        family.querySelector("legend")?.textContent,
        within(family)
          .getAllByRole("checkbox")
          .map((tag) => tag.getAttribute("aria-label")),
      ]),
    ).toEqual([
      ["Meal-time", ["Breakfast", "Lunch"]],
      ["Cycle phase", ["Luteal"]],
      ["Nutrient / benefit", ["Omega-3"]],
      ["Dietary", ["Vegetarian", "Lactose-free"]],
    ]);
  });

  it("shows a problem under its field once she starts filling the form", async () => {
    // arrange
    const user = await renderEditor(NEW_FOOD_PATH);

    // act
    await user.type(
      screen.getByRole("textbox", { name: "Name (required)" }),
      "O",
    );
    await user.clear(screen.getByRole("textbox", { name: "Name (required)" }));

    // assert
    const name = screen.getByRole("textbox", { name: "Name (required)" });
    expect(name).toHaveAccessibleDescription("Give the food a name");
    expect(name).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByRole("button", { name: "Create food" })).toBeDisabled();
  });

  it.each([
    { entered: "  SALMON ", problem: "A food with this name already exists" },
    { entered: "n".repeat(81), problem: "Keep the name to 80 characters" },
  ])(
    "refuses the name $entered with “$problem” and keeps Create disabled",
    async ({ entered, problem }) => {
      // arrange
      const user = await renderEditor(NEW_FOOD_PATH);

      // act
      await enter(user, "Name (required)", entered);

      // assert
      expect(
        screen.getByRole("textbox", { name: "Name (required)" }),
      ).toHaveAccessibleDescription(problem);
      expect(
        screen.getByRole("button", { name: "Create food" }),
      ).toBeDisabled();
    },
  );

  it("counts the name's length after trimming the spaces around it", async () => {
    // arrange
    const user = await renderEditor(NEW_FOOD_PATH);

    // act
    await enter(user, "Name (required)", `  ${"n".repeat(80)}  `);

    // assert
    expect(
      screen.getByRole("textbox", { name: "Name (required)" }),
    ).not.toHaveAttribute("aria-invalid");
    expect(screen.getByRole("button", { name: "Create food" })).toBeEnabled();
  });

  it.each([
    { field: "Calories", entered: "10000", problem: MACRO_PROBLEM },
    { field: "Protein (g)", entered: "1.234", problem: MACRO_PROBLEM },
    { field: "Carbs (g)", entered: "-1", problem: MACRO_PROBLEM },
    { field: "Fat (g)", entered: "9999.991", problem: MACRO_PROBLEM },
    { field: "Default portion (g)", entered: "0.5", problem: PORTION_PROBLEM },
    {
      field: "Default portion (g)",
      entered: "100000",
      problem: PORTION_PROBLEM,
    },
  ])(
    "refuses $entered in $field with “$problem”, keeping what she typed",
    async ({ field, entered, problem }) => {
      // arrange
      const user = await renderEditor(NEW_FOOD_PATH);
      await enter(user, "Name (required)", "Chicken breast");

      // act
      await enterAmount(user, field, entered);

      // assert
      const amount = screen.getByRole("spinbutton", { name: field });
      expect(amount).toHaveAccessibleDescription(
        expect.stringContaining(problem),
      );
      expect(amount).toHaveAttribute("aria-invalid", "true");
      expect(amount).toHaveValue(Number(entered));
      expect(
        screen.getByRole("button", { name: "Create food" }),
      ).toBeDisabled();
    },
  );

  it("accepts the highest values, two decimals and whole grams", async () => {
    // arrange
    const user = await renderEditor(NEW_FOOD_PATH);
    await enter(user, "Name (required)", "Chicken breast");

    // act
    await enterAmount(user, "Calories", "9999.99");
    await enterAmount(user, "Protein (g)", "0.01");
    await enterAmount(user, "Default portion (g)", "99999");

    // assert
    expect(screen.queryByText(MACRO_PROBLEM)).toBeNull();
    expect(screen.queryByText(PORTION_PROBLEM)).toBeNull();
    expect(screen.getByRole("button", { name: "Create food" })).toBeEnabled();
  });

  it("chooses the icon and the tags from the keyboard", async () => {
    // arrange
    const user = await renderEditor(NEW_FOOD_PATH);
    screen.getByRole("button", { name: "Poultry" }).focus();

    // act
    await user.keyboard("{Enter}");
    screen.getByRole("checkbox", { name: "Lunch" }).focus();
    await user.keyboard(" ");

    // assert
    expect(screen.getByRole("button", { name: "Poultry" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByRole("button", { name: "Other" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
    expect(screen.getByRole("checkbox", { name: "Lunch" })).toBeChecked();
  });

  it("creates the food with blank values as 0 and returns to the library with a confirmation", async () => {
    // arrange
    acceptSaves();
    const user = await renderEditor(NEW_FOOD_PATH);
    await enter(user, "Name (required)", "  Chicken breast ");
    await choose(user, "Category", "Fat");
    await user.click(screen.getByRole("button", { name: "Poultry" }));
    await enterAmount(user, "Calories", "165");
    await enterAmount(user, "Protein (g)", "31");
    await enterAmount(user, "Fat (g)", "3.6");
    await enterAmount(user, "Default portion (g)", "");
    await user.click(screen.getByRole("checkbox", { name: "Lactose-free" }));
    await user.click(screen.getByRole("checkbox", { name: "Lunch" }));

    // act
    await user.click(screen.getByRole("button", { name: "Create food" }));

    // assert
    expect(
      await screen.findByRole("heading", { level: 1, name: "Nutrition" }),
    ).toBeInTheDocument();
    expect(await screen.findByText("Food created")).toBeInTheDocument();
    expect(sentBodies).toEqual([
      {
        method: "POST",
        path: NUTRITION_LIBRARY_API_PATHS.foods,
        body: {
          name: "  Chicken breast ",
          category: "fat",
          icon: "poultry",
          kcal: 165,
          protein: 31,
          carb: 0,
          fat: 3.6,
          defaultPortionGrams: 0,
          tagIds: ["di-lactose-free", "mt-lunch"],
        },
      },
    ]);
  });

  it("shows a name taken while she was filling the form on the name field and keeps her entries", async () => {
    // arrange
    server.use(
      http.post(`*${NUTRITION_LIBRARY_API_PATHS.foods}`, () =>
        HttpResponse.json({ problems: { name: "taken" } }, { status: 422 }),
      ),
    );
    const user = await renderEditor(NEW_FOOD_PATH);
    await enter(user, "Name (required)", "Quinoa");
    await enterAmount(user, "Calories", "368");
    await user.click(screen.getByRole("checkbox", { name: "Vegetarian" }));

    // act
    await user.click(screen.getByRole("button", { name: "Create food" }));

    // assert
    const name = screen.getByRole("textbox", { name: "Name (required)" });
    expect(
      await screen.findByText("A food with this name already exists"),
    ).toBeInTheDocument();
    expect(name).toHaveAccessibleDescription(
      "A food with this name already exists",
    );
    expect(name).toHaveFocus();
    expect(name).toHaveValue("Quinoa");
    expect(screen.getByRole("spinbutton", { name: "Calories" })).toHaveValue(
      368,
    );
    expect(screen.getByRole("checkbox", { name: "Vegetarian" })).toBeChecked();
    expect(screen.getByRole("button", { name: "Create food" })).toBeDisabled();

    // act
    await enter(user, "Name (required)", "Red quinoa");

    // assert
    expect(name).not.toHaveAttribute("aria-invalid");
    expect(screen.getByRole("button", { name: "Create food" })).toBeEnabled();
  });

  it("words a save the server could not make as a failure and keeps her entries", async () => {
    // arrange
    server.use(
      http.post(
        `*${NUTRITION_LIBRARY_API_PATHS.foods}`,
        () => new HttpResponse("Internal Server Error", { status: 500 }),
      ),
    );
    const user = await renderEditor(NEW_FOOD_PATH);
    await enter(user, "Name (required)", "Quinoa");

    // act
    await user.click(screen.getByRole("button", { name: "Create food" }));

    // assert
    expect(await screen.findByText(SAVE_FAILED)).toBeInTheDocument();
    expect(
      screen.getByRole("textbox", { name: "Name (required)" }),
    ).toHaveValue("Quinoa");
    expect(screen.getByRole("button", { name: "Create food" })).toBeEnabled();
  });
});

describe("editing a food", () => {
  it("opens with the food's saved values", async () => {
    // arrange, act
    await renderEditor(foodEditorPath(OATS.id));

    // assert
    expect(
      screen.getByRole("heading", { level: 1, name: "Edit food" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("textbox", { name: "Name (required)" }),
    ).toHaveValue("Oats");
    expect(
      screen.getByRole("combobox", { name: "Category" }),
    ).toHaveTextContent("Carb");
    expect(screen.getByRole("button", { name: "Grain" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByRole("spinbutton", { name: "Calories" })).toHaveValue(
      389,
    );
    expect(screen.getByRole("spinbutton", { name: "Protein (g)" })).toHaveValue(
      16.9,
    );
    expect(screen.getByRole("spinbutton", { name: "Carbs (g)" })).toHaveValue(
      66.3,
    );
    expect(screen.getByRole("spinbutton", { name: "Fat (g)" })).toHaveValue(
      6.9,
    );
    expect(
      screen.getByRole("spinbutton", { name: "Default portion (g)" }),
    ).toHaveValue(40);
    expect(screen.getByRole("checkbox", { name: "Breakfast" })).toBeChecked();
    expect(screen.getByRole("checkbox", { name: "Vegetarian" })).toBeChecked();
    expect(screen.getByRole("checkbox", { name: "Lunch" })).not.toBeChecked();
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "Save changes" }),
      ).toBeEnabled(),
    );
  });

  it("keeps its own name free while flagging another food's", async () => {
    // arrange
    const user = await renderEditor(foodEditorPath(OATS.id));

    // act
    await enter(user, "Name (required)", " oats ");

    // assert
    expect(
      screen.getByRole("textbox", { name: "Name (required)" }),
    ).not.toHaveAttribute("aria-invalid");

    // act
    await enter(user, "Name (required)", "salmon");

    // assert
    expect(
      screen.getByRole("textbox", { name: "Name (required)" }),
    ).toHaveAccessibleDescription("A food with this name already exists");
  });

  it("saves the whole food and returns to the library with a confirmation", async () => {
    // arrange
    acceptSaves();
    const user = await renderEditor(foodEditorPath(OATS.id));
    await enter(user, "Name (required)", "Rolled oats");
    await user.click(screen.getByRole("checkbox", { name: "Breakfast" }));
    await enterAmount(user, "Calories", "375");

    // act
    await user.click(screen.getByRole("button", { name: "Save changes" }));

    // assert
    expect(
      await screen.findByRole("heading", { level: 1, name: "Nutrition" }),
    ).toBeInTheDocument();
    expect(await screen.findByText("Food updated")).toBeInTheDocument();
    expect(sentBodies).toEqual([
      {
        method: "PUT",
        path: `${NUTRITION_LIBRARY_API_PATHS.foods}/${OATS.id}`,
        body: {
          name: "Rolled oats",
          category: "carb",
          icon: "grain",
          kcal: 375,
          protein: 16.9,
          carb: 66.3,
          fat: 6.9,
          defaultPortionGrams: 40,
          tagIds: ["di-vegetarian"],
        },
      },
    ]);
  });

  it("returns to the library for a food the library does not hold", async () => {
    // arrange, act
    await renderEditor(foodEditorPath(UNKNOWN_ID), "Nutrition");

    // assert
    expect(screen.getByRole("link", { name: "New food" })).toBeVisible();
  });

  it.each(["Cancel", "Back to foods"])(
    "returns to the library through %s without saving",
    async (leave) => {
      // arrange
      const user = await renderEditor(foodEditorPath(SALMON.id));
      await enter(user, "Name (required)", "Wild salmon");

      // act
      await user.click(screen.getByRole("link", { name: leave }));

      // assert
      expect(
        await screen.findByRole("heading", { level: 1, name: "Nutrition" }),
      ).toBeInTheDocument();
      expect(sentBodies).toEqual([]);
    },
  );
});

function acceptSaves() {
  const record = async ({ request }: { request: Request }) => {
    sentBodies.push({
      method: request.method,
      path: new URL(request.url).pathname,
      body: await request.json(),
    });

    return HttpResponse.json({ redirectTo: COACH_NUTRITION_PATH });
  };

  server.use(
    http.post(`*${NUTRITION_LIBRARY_API_PATHS.foods}`, record),
    http.put(`*${NUTRITION_LIBRARY_API_PATHS.foods}/:foodId`, record),
  );
}

async function enter(user: UserEvent, field: string, text: string) {
  const entry = screen.getByRole("textbox", { name: field });
  await user.clear(entry);
  await user.click(entry);
  await user.paste(text);
}

async function enterAmount(user: UserEvent, field: string, amount: string) {
  const entry = screen.getByRole("spinbutton", { name: field });
  await user.clear(entry);
  if (amount !== "") {
    await user.type(entry, amount);
  }
}

async function choose(user: UserEvent, field: string, option: string) {
  await user.click(screen.getByRole("combobox", { name: field }));
  await user.click(await screen.findByRole("option", { name: option }));
}

async function renderEditor(entry: string, heading?: string) {
  const user = userEvent.setup();
  const router = createMemoryRouter(
    [
      {
        Component: NutritionRoute,
        loader: () => ({ foods: LIBRARY, tags: TAGS, recipes: [] }),
        path: COACH_NUTRITION_PATH,
      },
      {
        Component: FoodEditorRoute,
        loader: () => ({
          food: null,
          otherNames: LIBRARY.map(({ name }) => name),
          tags: TAGS,
        }),
        path: NEW_FOOD_PATH,
      },
      {
        Component: FoodEditorRoute,
        loader: ({ params }) => {
          const food = LIBRARY.find(({ id }) => id === params.foodId);

          if (!food) {
            throw redirect(COACH_NUTRITION_PATH);
          }

          return {
            food,
            otherNames: LIBRARY.filter(({ id }) => id !== food.id).map(
              ({ name }) => name,
            ),
            tags: TAGS,
          };
        },
        path: `/coach/${FOOD_EDITOR_ROUTE_SEGMENT}`,
      },
      {
        action: frameworkModeAction(createFood),
        path: NUTRITION_LIBRARY_API_PATHS.foods,
      },
      {
        action: frameworkModeAction(editFood),
        path: NUTRITION_LIBRARY_API_PATHS.food,
      },
    ],
    { initialEntries: [entry] },
  );

  render(
    <>
      <RouterProvider router={router} />
      <Toaster />
    </>,
  );
  await screen.findByRole("heading", {
    level: 1,
    name: heading ?? /food$/,
  });

  return user;
}
