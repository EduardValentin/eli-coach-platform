import { describe, expect, it } from "vitest";

import {
  newRecipeFormValues,
  recipeMacrosOf,
  recipeSaveBodyOf,
  type RecipeFormValues,
} from "./recipe-form";
import { KEEP_PHOTO, REMOVE_PHOTO } from "./recipe-photo-entry";

const OATS = { id: "oats", kcal: 380, protein: 13, carb: 60, fat: 7 };
const YOGURT = { id: "yogurt", kcal: 60, protein: 10, carb: 4, fat: 0 };

const PORRIDGE_VALUES: RecipeFormValues = {
  ...newRecipeFormValues(),
  name: "Porridge",
  ingredients: [{ foodId: "oats", grams: "40", method: "boiled" }],
  prepMinutes: "5",
  icon: "pot",
  tagIds: ["mt-breakfast"],
};

const PORRIDGE_REQUEST = {
  name: "Porridge",
  ingredients: [{ foodId: "oats", grams: 40, method: "boiled" }],
  prepMinutes: 5,
  cookMinutes: 0,
  instructions: "",
  icon: "pot",
  tagIds: ["mt-breakfast"],
};

function photoNamed(name: string, size: number, type = "image/jpeg"): File {
  const file = new File(["photo"], name, { type });
  Object.defineProperty(file, "size", { value: size });

  return file;
}

describe("recipe macros", () => {
  it("adds up the whole recipe from the grams entered for each ingredient", () => {
    // arrange
    const ingredients = [
      { foodId: "oats", grams: "50", method: "raw" as const },
      { foodId: "yogurt", grams: "150", method: "raw" as const },
    ];

    // act
    const macros = recipeMacrosOf(ingredients, [OATS, YOGURT]);

    // assert
    expect(macros).toEqual({ kcal: 280, protein: 22, carb: 36, fat: 4 });
  });

  it("counts an ingredient whose grams are empty or not a number as none", () => {
    // arrange
    const ingredients = [
      { foodId: "oats", grams: "", method: "raw" as const },
      { foodId: "yogurt", grams: "abc", method: "boiled" as const },
    ];

    // act
    const macros = recipeMacrosOf(ingredients, [OATS, YOGURT]);

    // assert
    expect(macros).toEqual({ kcal: 0, protein: 0, carb: 0, fat: 0 });
  });
});

describe("the recipe save body", () => {
  it.each([
    { chosen: KEEP_PHOTO, photo: "keep" },
    { chosen: REMOVE_PHOTO, photo: "remove" },
  ])(
    "stays a plain request saying $photo when no new photo was chosen",
    ({ chosen, photo }) => {
      // arrange
      const values = PORRIDGE_VALUES;

      // act
      const body = recipeSaveBodyOf(values, chosen);

      // assert
      expect(body).toEqual({ ...PORRIDGE_REQUEST, photo });
    },
  );

  it("carries the request saying attach and the chosen file as two form parts", async () => {
    // arrange
    const file = photoNamed("bowl.jpg", 5);

    // act
    const body = recipeSaveBodyOf(PORRIDGE_VALUES, {
      kind: "attach",
      file,
      previewUrl: "blob:bowl.jpg",
    });

    // assert
    expect(body).toBeInstanceOf(FormData);
    const parts = body as FormData;
    expect(JSON.parse(String(parts.get("recipe")))).toEqual({
      ...PORRIDGE_REQUEST,
      photo: "attach",
    });
    expect(await (parts.get("photo") as File).text()).toBe("photo");
    expect([...parts.keys()]).toEqual(["recipe", "photo"]);
  });
});
