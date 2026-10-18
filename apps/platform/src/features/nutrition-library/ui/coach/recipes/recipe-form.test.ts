import { describe, expect, it } from "vitest";

import {
  browserPhotoRefusalMessage,
  KEEP_PHOTO,
  newRecipeFormValues,
  recipeMacrosOf,
  recipeSaveBodyOf,
  REMOVE_PHOTO,
  serverPhotoRefusalMessage,
  type RecipeFormValues,
} from "./recipe-form";

const OATS = { id: "oats", kcal: 380, protein: 13, carb: 60, fat: 7 };
const YOGURT = { id: "yogurt", kcal: 60, protein: 10, carb: 4, fat: 0 };

const MEGABYTE = 1024 * 1024;

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

describe("the photo refusal copy", () => {
  it.each([
    { name: "bowl.jpg", size: 10 * MEGABYTE, type: "image/jpeg" },
    { name: "bowl.JPEG", size: 5, type: "" },
    { name: "bowl.png", size: 5, type: "image/png" },
    { name: "bowl", size: 5, type: "image/webp" },
  ])(
    "takes $name typed '$type' as a photo the server may judge",
    ({ name, size, type }) => {
      // arrange
      const file = photoNamed(name, size, type);

      // act
      const refusal = browserPhotoRefusalMessage(file);

      // assert
      expect(refusal).toBeNull();
    },
  );

  it("names a file that is not a JPEG, PNG or WebP photo", () => {
    // arrange
    const file = photoNamed("bowl.gif", 5, "image/gif");

    // act
    const refusal = browserPhotoRefusalMessage(file);

    // assert
    expect(refusal).toBe(
      "bowl.gif is not a .jpg, .png or .webp — only JPEG, PNG and WebP photos are supported",
    );
  });

  it("names a photo over 10 MB", () => {
    // arrange
    const file = photoNamed("bowl.png", 10 * MEGABYTE + 1, "image/png");

    // act
    const refusal = browserPhotoRefusalMessage(file);

    // assert
    expect(refusal).toBe("bowl.png is larger than 10 MB");
  });

  it.each([
    {
      problem: "unsupported" as const,
      message: "bowl.jpg doesn’t contain a JPEG, PNG or WebP photo.",
    },
    { problem: "too-large" as const, message: "bowl.jpg is larger than 10 MB" },
  ])(
    "words the server refusing the photo as $problem with the file's name",
    ({ problem, message }) => {
      // arrange
      const file = photoNamed("bowl.jpg", 5);

      // act
      const refusal = serverPhotoRefusalMessage(problem, file);

      // assert
      expect(refusal).toBe(message);
    },
  );
});
