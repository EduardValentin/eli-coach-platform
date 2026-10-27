import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from "vitest";

import { ApiIntegrationTestSuite } from "~integration-test-config/api-integration-test-suite";
import {
  FoodLibraryJourney,
  VISITOR,
  type FoodFields,
} from "~integration-test-config/food-library-journey";
import {
  CLIENT_SESSION,
  COACH_SESSION,
  OTHER_COACH_SESSION,
  PlatformRig,
} from "~integration-test-config/platform-rig";
import {
  RECIPE_BUILDER_PAGE,
  RECIPES_PAGE,
  RecipeLibraryJourney,
  type RecipeFields,
  type UploadedPhoto,
} from "~integration-test-config/recipe-library-journey";
import {
  textNodesOf,
  visibleDocument,
} from "~integration-test-config/rendered-page";
import {
  cameraJpegWithOrientationAndLocation,
  imageFactsOf,
  landscapePng,
} from "~integration-test-config/sample-images";

const suite = new ApiIntegrationTestSuite();
const rig = new PlatformRig(suite);
const foods = new FoodLibraryJourney(rig);
const library = new RecipeLibraryJourney(rig);

const CREATED_AT = new Date("2026-10-14T09:00:00.000Z");
const EDITED_AT = new Date("2026-10-15T10:30:00.000Z");
const UNKNOWN_ID = "9e8d7c6b-5a49-4382-9716-a5b4c3d2e1f0";
const NOT_A_UUID = "not-a-recipe";
const RECIPES = { redirectTo: "/coach/nutrition?tab=recipes" };
const TEN_MEBIBYTES = 10 * 1024 * 1024;
const ONE_MEBIBYTE = 1024 * 1024;

const OATS: FoodFields = {
  name: "Oats",
  category: "carb",
  icon: "grain",
  kcal: 389,
  protein: 16.9,
  carb: 66.3,
  fat: 6.9,
  defaultPortionGrams: 40,
  tagIds: [],
};

const MILK: FoodFields = {
  name: "Milk",
  category: "protein",
  icon: "dairy",
  kcal: 42,
  protein: 3.4,
  carb: 5,
  fat: 1,
  defaultPortionGrams: 250,
  tagIds: [],
};

const HONEY: FoodFields = {
  name: "Honey",
  category: "extra",
  icon: "other",
  kcal: 304,
  protein: 0.3,
  carb: 82.4,
  fat: 0,
  defaultPortionGrams: 10,
  tagIds: [],
};

type StoredFoods = { oats: string; milk: string; honey: string };

function porridgeOf(stored: StoredFoods): RecipeFields {
  return {
    name: "Porridge",
    ingredients: [
      { foodId: stored.oats, grams: 40, method: "boiled" },
      { foodId: stored.milk, grams: 250, method: "raw" },
    ],
    prepMinutes: 5,
    cookMinutes: 10,
    instructions: "Simmer the oats in the milk.",
    icon: "pot",
    tagIds: ["di-vegetarian", "mt-breakfast"],
  };
}

type ProblemCase = {
  problem: string;
  fieldsOf: (stored: StoredFoods) => Partial<RecipeFields>;
  problems: unknown;
};

const PROBLEMS: ProblemCase[] = [
  {
    problem: "no name",
    fieldsOf: () => ({ name: "   " }),
    problems: { name: "missing" },
  },
  {
    problem: "a name of 81 characters",
    fieldsOf: () => ({ name: "n".repeat(81) }),
    problems: { name: "too-long" },
  },
  {
    problem: "a name another recipe has",
    fieldsOf: () => ({ name: "  OMELETTE " }),
    problems: { name: "taken" },
  },
  {
    problem: "an ingredient of 0 grams",
    fieldsOf: (stored) => ({
      ingredients: [
        { foodId: stored.oats, grams: 40, method: "boiled" },
        { foodId: stored.milk, grams: 0, method: "raw" },
      ],
    }),
    problems: { ingredients: [{ position: 1, problem: "grams-out-of-range" }] },
  },
  {
    problem: "an ingredient of 100,000 grams",
    fieldsOf: (stored) => ({
      ingredients: [{ foodId: stored.oats, grams: 100_000, method: "raw" }],
    }),
    problems: { ingredients: [{ position: 0, problem: "grams-out-of-range" }] },
  },
  {
    problem: "an ingredient of grams that are not whole",
    fieldsOf: (stored) => ({
      ingredients: [{ foodId: stored.oats, grams: 1.5, method: "raw" }],
    }),
    problems: { ingredients: [{ position: 0, problem: "grams-out-of-range" }] },
  },
  {
    problem: "an ingredient cooked by a method outside the vocabulary",
    fieldsOf: (stored) => ({
      ingredients: [{ foodId: stored.oats, grams: 40, method: "fried" }],
    }),
    problems: { ingredients: [{ position: 0, problem: "unknown-method" }] },
  },
  {
    problem: "prep minutes below 0",
    fieldsOf: () => ({ prepMinutes: -1 }),
    problems: { prepMinutes: "out-of-range" },
  },
  {
    problem: "cook minutes of 10,000",
    fieldsOf: () => ({ cookMinutes: 10_000 }),
    problems: { cookMinutes: "out-of-range" },
  },
  {
    problem: "minutes that are not whole",
    fieldsOf: () => ({ prepMinutes: 2.5, cookMinutes: 0.5 }),
    problems: { prepMinutes: "out-of-range", cookMinutes: "out-of-range" },
  },
  {
    problem: "instructions of 2,001 characters",
    fieldsOf: () => ({ instructions: "i".repeat(2_001) }),
    problems: { instructions: "too-long" },
  },
  {
    problem: "an icon outside the meal icons",
    fieldsOf: () => ({ icon: "burger" }),
    problems: { icon: "unknown" },
  },
  {
    problem: "a tag outside the vocabulary",
    fieldsOf: () => ({ tagIds: ["mt-breakfast", "mt-brunch"] }),
    problems: { tagIds: "unknown" },
  },
];

const MALFORMED_BODIES: [string, (stored: StoredFoods) => unknown][] = [
  ["a body that is not JSON", () => "{"],
  [
    "a body missing a field",
    (stored) => ({ ...porridgeOf(stored), cookMinutes: undefined }),
  ],
  [
    "grams given as text",
    (stored) => ({
      ...porridgeOf(stored),
      ingredients: [{ foodId: stored.oats, grams: "40", method: "raw" }],
    }),
  ],
  [
    "a body larger than 64 KiB",
    (stored) => ({
      ...porridgeOf(stored),
      instructions: "i".repeat(65 * 1024),
    }),
  ],
];

async function cameraPhoto(): Promise<UploadedPhoto> {
  return {
    name: "porridge.jpg",
    type: "image/jpeg",
    bytes: new Uint8Array(await cameraJpegWithOrientationAndLocation()),
  };
}

function paddedTo(photo: UploadedPhoto, sizeBytes: number): UploadedPhoto {
  const bytes = new Uint8Array(sizeBytes);
  bytes.set(photo.bytes);

  return { ...photo, bytes };
}

async function storeFoods(): Promise<StoredFoods> {
  const [oats, milk, honey] = await Promise.all(
    [OATS, MILK, HONEY].map((fields) =>
      foods.createAccepted(COACH_SESSION, fields),
    ),
  );

  return { oats: oats!.id, milk: milk!.id, honey: honey!.id };
}

describe.sequential("recipe library integration", () => {
  let stored: StoredFoods;

  beforeAll(async () => {
    process.env.BOOTSTRAP_COACH_AUTH_SUBJECT_ID = COACH_SESSION.subjectId;
    await suite.start();
  });

  beforeEach(async () => {
    await rig.switchWaitlistModeOff();
    await rig.provisionCoach();
    stored = await storeFoods();
  });

  afterEach(async () => {
    rig.releaseClock();
    await suite.reset();
  });

  afterAll(async () => {
    await suite.stop();
    delete process.env.BOOTSTRAP_COACH_AUTH_SUBJECT_ID;
  });

  describe("creating a recipe", () => {
    it("stores every entry with its ingredients in the order placed and its meal roles and tags, the name and instructions trimmed, as the signed-in coach's active recipe, and names the Recipes tab as the next page", async () => {
      // arrange
      await rig.holdClock(CREATED_AT);
      const porridge = porridgeOf(stored);

      // act
      const response = await library.create(COACH_SESSION, {
        ...porridge,
        name: "  Porridge  ",
        instructions: " Simmer the oats in the milk.\n",
      });

      // assert
      expect(response.status).toBe(200);
      expect(await response.json()).toEqual(RECIPES);
      expect(await library.recipeRows()).toEqual([
        {
          ...porridge,
          tagIds: ["mt-breakfast", "di-vegetarian"],
          id: expect.any(String),
          ownerSubjectId: COACH_SESSION.subjectId,
          archivedAt: null,
          createdAt: CREATED_AT,
          updatedAt: CREATED_AT,
        },
      ]);
    });

    it("stores a recipe with no ingredients, no icon and no tags", async () => {
      // arrange
      const bare = {
        ...porridgeOf(stored),
        ingredients: [],
        icon: null,
        tagIds: [],
        prepMinutes: 0,
        cookMinutes: 0,
        instructions: "",
      };

      // act
      const response = await library.create(COACH_SESSION, bare);

      // assert
      expect(response.status).toBe(200);
      expect(await library.recipeRows()).toEqual([
        expect.objectContaining({
          ingredients: [],
          icon: null,
          tagIds: [],
          prepMinutes: 0,
          cookMinutes: 0,
          instructions: "",
        }),
      ]);
    });

    it("stores the same food placed twice as two ingredients, with the highest grams and minutes", async () => {
      // arrange
      const twice = {
        ...porridgeOf(stored),
        ingredients: [
          { foodId: stored.oats, grams: 1, method: "raw" },
          { foodId: stored.oats, grams: 99_999, method: "pan-fried" },
        ],
        prepMinutes: 9_999,
        cookMinutes: 9_999,
        instructions: "i".repeat(2_000),
      };

      // act
      const response = await library.create(COACH_SESSION, twice);

      // assert
      expect(response.status).toBe(200);
      expect(await library.recipeRows()).toEqual([
        expect.objectContaining({
          ingredients: twice.ingredients,
          prepMinutes: 9_999,
          cookMinutes: 9_999,
        }),
      ]);
    });

    it.each(PROBLEMS)(
      "refuses $problem with 422 and its code, storing nothing new",
      async ({ fieldsOf, problems }) => {
        // arrange
        const omelette = await library.createAccepted(COACH_SESSION, {
          ...porridgeOf(stored),
          name: "Omelette",
        });

        // act
        const response = await library.create(COACH_SESSION, {
          ...porridgeOf(stored),
          ...fieldsOf(stored),
        });

        // assert
        expect(response.status).toBe(422);
        expect(await response.json()).toEqual({ problems });
        expect(await library.recipeRows()).toEqual([omelette]);
      },
    );

    it.each([
      ["the same name", "Porridge"],
      ["a differently cased name", "PORRIDGE"],
      ["a name with surrounding spaces", "  Porridge  "],
    ])("refuses a duplicate given as %s", async (_case, name) => {
      // arrange
      await library.createAccepted(COACH_SESSION, porridgeOf(stored));

      // act
      const response = await library.create(COACH_SESSION, {
        ...porridgeOf(stored),
        name,
      });

      // assert
      expect(response.status).toBe(422);
      expect(await response.json()).toEqual({ problems: { name: "taken" } });
      expect(await library.recipeRows()).toHaveLength(1);
    });

    it("keeps one of two recipes created at once under the same name and refuses the other as taken", async () => {
      // arrange
      const twins = [
        porridgeOf(stored),
        { ...porridgeOf(stored), name: " porridge" },
      ];

      // act
      const responses = await Promise.all(
        twins.map((fields) => library.create(COACH_SESSION, fields)),
      );

      // assert
      expect(responses.map(({ status }) => status).sort()).toEqual([200, 422]);
      const refused = responses.find(({ status }) => status === 422);
      expect(await refused?.json()).toEqual({ problems: { name: "taken" } });
      expect(await library.recipeRows()).toHaveLength(1);
    });

    it.each([
      ["an unknown food", () => UNKNOWN_ID],
      ["an id that is not a food", () => "mt-breakfast"],
      ["an archived food", () => stored.honey],
    ])(
      "refuses an ingredient naming %s at its position, storing nothing",
      async (_case, foodIdOf) => {
        // arrange
        await foods.archive(stored.honey);

        // act
        const response = await library.create(COACH_SESSION, {
          ...porridgeOf(stored),
          ingredients: [
            { foodId: stored.oats, grams: 40, method: "raw" },
            { foodId: foodIdOf(), grams: 40, method: "raw" },
          ],
        });

        // assert
        expect(response.status).toBe(422);
        expect(await response.json()).toEqual({
          problems: { ingredients: [{ position: 1, problem: "unknown-food" }] },
        });
        expect(await library.recipeRows()).toEqual([]);
      },
    );

    it.each(MALFORMED_BODIES)("answers 400 to %s", async (_case, bodyOf) => {
      // arrange
      const malformed = bodyOf(stored);

      // act
      const response = await library.create(COACH_SESSION, malformed);

      // assert
      expect(response.status).toBe(400);
      expect(await library.recipeRows()).toEqual([]);
    });
  });

  describe("editing a recipe", () => {
    it("replaces every entry, its ingredients and its tags as a whole, keeps its owner and the moment it was created, and names the Recipes tab as the next page", async () => {
      // arrange
      await rig.holdClock(CREATED_AT);
      const porridge = await library.createAccepted(
        COACH_SESSION,
        porridgeOf(stored),
      );
      await rig.holdClock(EDITED_AT);
      const revised = {
        name: " Honey milk ",
        ingredients: [
          { foodId: stored.milk, grams: 300, method: "steamed" },
          { foodId: stored.honey, grams: 15, method: "raw" },
          { foodId: stored.milk, grams: 50, method: "raw" },
        ],
        prepMinutes: 2,
        cookMinutes: 0,
        instructions: "Warm the milk, stir in the honey.",
        icon: "smoothie",
        tagIds: ["cp-luteal", "mt-snack", "nu-magnesium"],
      };

      // act
      const response = await library.edit(COACH_SESSION, porridge.id, revised);

      // assert
      expect(response.status).toBe(200);
      expect(await response.json()).toEqual(RECIPES);
      expect(await library.recipeRows()).toEqual([
        {
          ...revised,
          id: porridge.id,
          name: "Honey milk",
          tagIds: ["mt-snack", "cp-luteal", "nu-magnesium"],
          ownerSubjectId: COACH_SESSION.subjectId,
          archivedAt: null,
          createdAt: CREATED_AT,
          updatedAt: EDITED_AT,
        },
      ]);
    });

    it("empties a recipe of its ingredients and tags", async () => {
      // arrange
      const porridge = await library.createAccepted(
        COACH_SESSION,
        porridgeOf(stored),
      );

      // act
      const response = await library.edit(COACH_SESSION, porridge.id, {
        ...porridgeOf(stored),
        ingredients: [],
        tagIds: [],
      });

      // assert
      expect(response.status).toBe(200);
      expect(await library.recipeRows()).toEqual([
        expect.objectContaining({ ingredients: [], tagIds: [] }),
      ]);
    });

    it.each([
      ["unchanged", "Porridge"],
      ["recased and spaced", "  PORRIDGE "],
    ])("keeps its own name %s", async (_case, name) => {
      // arrange
      const porridge = await library.createAccepted(
        COACH_SESSION,
        porridgeOf(stored),
      );

      // act
      const response = await library.edit(COACH_SESSION, porridge.id, {
        ...porridgeOf(stored),
        name,
      });

      // assert
      expect(response.status).toBe(200);
      expect(await library.recipeRows()).toEqual([
        expect.objectContaining({ id: porridge.id, name: name.trim() }),
      ]);
    });

    it("refuses a rename onto another recipe's name, leaving both as they were", async () => {
      // arrange
      const porridge = await library.createAccepted(
        COACH_SESSION,
        porridgeOf(stored),
      );
      const omelette = await library.createAccepted(COACH_SESSION, {
        ...porridgeOf(stored),
        name: "Omelette",
        ingredients: [],
      });

      // act
      const response = await library.edit(COACH_SESSION, porridge.id, {
        ...porridgeOf(stored),
        name: " omelette",
        ingredients: [],
      });

      // assert
      expect(response.status).toBe(422);
      expect(await response.json()).toEqual({ problems: { name: "taken" } });
      expect(await library.recipeRows()).toEqual([omelette, porridge]);
    });

    it.each(PROBLEMS)(
      "refuses $problem with 422 and its code, leaving the recipe as it was",
      async ({ fieldsOf, problems }) => {
        // arrange
        await rig.holdClock(CREATED_AT);
        const porridge = await library.createAccepted(
          COACH_SESSION,
          porridgeOf(stored),
        );
        const omelette = await library.createAccepted(COACH_SESSION, {
          ...porridgeOf(stored),
          name: "Omelette",
        });

        // act
        const response = await library.edit(COACH_SESSION, porridge.id, {
          ...porridgeOf(stored),
          ...fieldsOf(stored),
        });

        // assert
        expect(response.status).toBe(422);
        expect(await response.json()).toEqual({ problems });
        expect(await library.recipeRows()).toEqual([omelette, porridge]);
      },
    );

    it("keeps an archived food the recipe already uses, editable and in its place", async () => {
      // arrange
      const porridge = await library.createAccepted(
        COACH_SESSION,
        porridgeOf(stored),
      );
      await foods.archive(stored.oats);
      const ingredients = [
        { foodId: stored.milk, grams: 200, method: "raw" },
        { foodId: stored.oats, grams: 60, method: "baked" },
      ];

      // act
      const response = await library.edit(COACH_SESSION, porridge.id, {
        ...porridgeOf(stored),
        ingredients,
      });

      // assert
      expect(response.status).toBe(200);
      expect(await library.recipeRows()).toEqual([
        expect.objectContaining({ id: porridge.id, ingredients }),
      ]);
    });

    it("refuses an archived food the recipe does not use yet, leaving the recipe as it was", async () => {
      // arrange
      const porridge = await library.createAccepted(
        COACH_SESSION,
        porridgeOf(stored),
      );
      await foods.archive(stored.honey);

      // act
      const response = await library.edit(COACH_SESSION, porridge.id, {
        ...porridgeOf(stored),
        ingredients: [
          ...porridgeOf(stored).ingredients,
          { foodId: stored.honey, grams: 10, method: "raw" },
        ],
      });

      // assert
      expect(response.status).toBe(422);
      expect(await response.json()).toEqual({
        problems: { ingredients: [{ position: 2, problem: "unknown-food" }] },
      });
      expect(await library.recipeRows()).toEqual([porridge]);
    });

    it.each(MALFORMED_BODIES)(
      "answers 400 to %s, leaving the recipe as it was",
      async (_case, bodyOf) => {
        // arrange
        const porridge = await library.createAccepted(
          COACH_SESSION,
          porridgeOf(stored),
        );

        // act
        const response = await library.edit(
          COACH_SESSION,
          porridge.id,
          bodyOf(stored),
        );

        // assert
        expect(response.status).toBe(400);
        expect(await library.recipeRows()).toEqual([porridge]);
      },
    );

    it.each([
      ["an unknown recipe", UNKNOWN_ID],
      ["an id that is not a uuid", NOT_A_UUID],
    ])("answers 404 for %s", async (_case, recipeId) => {
      // arrange
      const porridge = await library.createAccepted(
        COACH_SESSION,
        porridgeOf(stored),
      );

      // act
      const response = await library.edit(
        COACH_SESSION,
        recipeId,
        porridgeOf(stored),
      );

      // assert
      expect(response.status).toBe(404);
      expect(await library.recipeRows()).toEqual([porridge]);
    });
  });

  describe("whose library it is", () => {
    let othersFoodId: string;

    beforeEach(async () => {
      await rig.provisionOtherCoach();
      othersFoodId = (await foods.createAccepted(OTHER_COACH_SESSION, OATS)).id;
    });

    it("stores a name another coach's recipe already has as her own", async () => {
      // arrange
      await library.createAccepted(OTHER_COACH_SESSION, {
        ...porridgeOf(stored),
        ingredients: [{ foodId: othersFoodId, grams: 40, method: "raw" }],
      });

      // act
      const response = await library.create(COACH_SESSION, {
        ...porridgeOf(stored),
        name: " pORRIDGE",
      });

      // assert
      expect(response.status).toBe(200);
      expect(
        (await library.recipeRows()).map(({ name, ownerSubjectId }) => [
          name,
          ownerSubjectId,
        ]),
      ).toEqual([
        ["pORRIDGE", COACH_SESSION.subjectId],
        ["Porridge", OTHER_COACH_SESSION.subjectId],
      ]);
    });

    it("refuses an ingredient naming another coach's food on create and edit", async () => {
      // arrange
      const porridge = await library.createAccepted(
        COACH_SESSION,
        porridgeOf(stored),
      );
      const borrowing = {
        ...porridgeOf(stored),
        name: "Borrowed oats",
        ingredients: [{ foodId: othersFoodId, grams: 40, method: "raw" }],
      };

      // act
      const answers = await Promise.all([
        library.create(COACH_SESSION, borrowing),
        library.edit(COACH_SESSION, porridge.id, borrowing),
      ]);

      // assert
      expect(answers.map(({ status }) => status)).toEqual([422, 422]);
      for (const answer of answers) {
        expect(await answer.json()).toEqual({
          problems: { ingredients: [{ position: 0, problem: "unknown-food" }] },
        });
      }
      expect(await library.recipeRows()).toEqual([porridge]);
    });

    it("answers 404 to editing another coach's recipe, leaving it as it was", async () => {
      // arrange
      const othersPorridge = await library.createAccepted(OTHER_COACH_SESSION, {
        ...porridgeOf(stored),
        ingredients: [{ foodId: othersFoodId, grams: 40, method: "raw" }],
      });

      // act
      const response = await library.edit(COACH_SESSION, othersPorridge.id, {
        ...porridgeOf(stored),
        name: "Mine now",
      });

      // assert
      expect(response.status).toBe(404);
      expect(await library.recipeRows()).toEqual([othersPorridge]);
    });
  });

  describe("a recipe's photo", () => {
    beforeEach(async () => {
      await library.clearPhotoFiles();
    });

    async function porridgeWithPhoto(
      photo?: UploadedPhoto,
    ): Promise<{ recipeId: string; photoId: string }> {
      const response = await library.createWithPhoto(
        COACH_SESSION,
        { ...porridgeOf(stored), photo: "attach" },
        photo ?? (await cameraPhoto()),
      );

      if (response.status !== 200) {
        throw new Error(
          `Creating Porridge answered ${response.status}: ${await response.text()}`,
        );
      }

      const [porridge] = await library.recipeRows();
      const photoId = porridge && (await library.photoIdOf(porridge.id));

      if (!porridge || !photoId) {
        throw new Error("Porridge was not stored with a photo.");
      }

      return { recipeId: porridge.id, photoId };
    }

    it("stores the recipe with a new photo id and keeps one file of that id under the photo root", async () => {
      // arrange
      const photo = await cameraPhoto();

      // act
      const response = await library.createWithPhoto(
        COACH_SESSION,
        { ...porridgeOf(stored), photo: "attach" },
        photo,
      );

      // assert
      expect(response.status).toBe(200);
      expect(await response.json()).toEqual(RECIPES);
      const [porridge] = await library.recipeRows();
      const photoId = await library.photoIdOf(porridge!.id);
      expect(photoId).toEqual(expect.any(String));
      expect(await library.photoFiles()).toEqual([photoId]);
    });

    it("serves the coach the photo as one upright WebP within 1,200 px, without its metadata, privately cached for good", async () => {
      // arrange
      const porridge = await porridgeWithPhoto();

      // act
      const response = await library.openPhoto(COACH_SESSION, porridge);

      // assert
      expect(response.status).toBe(200);
      expect(response.headers.get("Content-Type")).toBe("image/webp");
      expect(response.headers.get("Cache-Control")).toBe(
        "private, max-age=31536000, immutable",
      );
      expect(response.headers.get("X-Content-Type-Options")).toBe("nosniff");
      expect(
        await imageFactsOf(new Uint8Array(await response.arrayBuffer())),
      ).toEqual({ format: "webp", width: 900, height: 1200, hasExif: false });
    });

    it("stores a PNG as the same one WebP rendition", async () => {
      // arrange
      const png = {
        name: "porridge.png",
        type: "image/png",
        bytes: new Uint8Array(await landscapePng()),
      };

      // act
      const porridge = await porridgeWithPhoto(png);

      // assert
      const response = await library.openPhoto(COACH_SESSION, porridge);
      expect(
        await imageFactsOf(new Uint8Array(await response.arrayBuffer())),
      ).toEqual({ format: "webp", width: 1200, height: 900, hasExif: false });
    });

    it("keeps only the new file when she replaces the photo, and answers 404 for the replaced photo's address", async () => {
      // arrange
      const porridge = await porridgeWithPhoto();

      // act
      const response = await library.editWithPhoto(
        COACH_SESSION,
        porridge.recipeId,
        {
          fields: { ...porridgeOf(stored), photo: "attach" },
          photo: await cameraPhoto(),
        },
      );

      // assert
      expect(response.status).toBe(200);
      const replacedBy = await library.photoIdOf(porridge.recipeId);
      expect(replacedBy).not.toBe(porridge.photoId);
      expect(await library.photoFiles()).toEqual([replacedBy]);
      expect((await library.openPhoto(COACH_SESSION, porridge)).status).toBe(
        404,
      );
      expect(
        (
          await library.openPhoto(COACH_SESSION, {
            recipeId: porridge.recipeId,
            photoId: replacedBy!,
          })
        ).status,
      ).toBe(200);
    });

    it("keeps the photo when she saves the recipe without touching it", async () => {
      // arrange
      const porridge = await porridgeWithPhoto();

      // act
      const response = await library.edit(COACH_SESSION, porridge.recipeId, {
        ...porridgeOf(stored),
        name: "Oat porridge",
      });

      // assert
      expect(response.status).toBe(200);
      expect(await library.photoIdOf(porridge.recipeId)).toBe(porridge.photoId);
      expect(await library.photoFiles()).toEqual([porridge.photoId]);
    });

    it("leaves no photo and no file when she removes the photo", async () => {
      // arrange
      const porridge = await porridgeWithPhoto();

      // act
      const response = await library.edit(COACH_SESSION, porridge.recipeId, {
        ...porridgeOf(stored),
        photo: "remove",
      });

      // assert
      expect(response.status).toBe(200);
      expect(await library.photoIdOf(porridge.recipeId)).toBeNull();
      expect(await library.photoFiles()).toEqual([]);
      expect((await library.openPhoto(COACH_SESSION, porridge)).status).toBe(
        404,
      );
    });

    it("refuses a text file renamed as a photo with 422, storing nothing", async () => {
      // arrange
      const renamed = {
        name: "porridge.jpg",
        type: "image/jpeg",
        bytes: new TextEncoder().encode("not a photo at all"),
      };

      // act
      const response = await library.createWithPhoto(
        COACH_SESSION,
        { ...porridgeOf(stored), photo: "attach" },
        renamed,
      );

      // assert
      expect(response.status).toBe(422);
      expect(await response.json()).toEqual({
        problems: { photo: "unsupported" },
      });
      expect(await library.recipeRows()).toEqual([]);
      expect(await library.photoFiles()).toEqual([]);
    });

    it("refuses a photo over 10 MB with 422, storing nothing", async () => {
      // arrange
      const oversized = paddedTo(await cameraPhoto(), TEN_MEBIBYTES + 1);

      // act
      const response = await library.createWithPhoto(
        COACH_SESSION,
        { ...porridgeOf(stored), photo: "attach" },
        oversized,
      );

      // assert
      expect(response.status).toBe(422);
      expect(await response.json()).toEqual({
        problems: { photo: "too-large" },
      });
      expect(await library.recipeRows()).toEqual([]);
      expect(await library.photoFiles()).toEqual([]);
    });

    it("answers 413 to a save beyond 10 MB and its 1 MB allowance, storing nothing", async () => {
      // arrange
      const oversized = paddedTo(
        await cameraPhoto(),
        TEN_MEBIBYTES + ONE_MEBIBYTE + 1,
      );

      // act
      const response = await library.createWithPhoto(
        COACH_SESSION,
        { ...porridgeOf(stored), photo: "attach" },
        oversized,
      );

      // assert
      expect(response.status).toBe(413);
      expect(await response.json()).toEqual({
        problems: { photo: "too-large" },
      });
      expect(await library.recipeRows()).toEqual([]);
      expect(await library.photoFiles()).toEqual([]);
    });

    it("refuses a name another recipe has with 422 and keeps no file of the photo sent with it", async () => {
      // arrange
      await library.createAccepted(COACH_SESSION, {
        ...porridgeOf(stored),
        name: "Omelette",
      });

      // act
      const response = await library.createWithPhoto(
        COACH_SESSION,
        { ...porridgeOf(stored), name: " omelette", photo: "attach" },
        await cameraPhoto(),
      );

      // assert
      expect(response.status).toBe(422);
      expect(await response.json()).toEqual({ problems: { name: "taken" } });
      expect(await library.recipeRows()).toHaveLength(1);
      expect(await library.photoFiles()).toEqual([]);
    });

    it("answers 400 to a photo attached without a file, storing nothing", async () => {
      // arrange
      const attachingNothing = { ...porridgeOf(stored), photo: "attach" };

      // act
      const response = await library.create(COACH_SESSION, attachingNothing);

      // assert
      expect(response.status).toBe(400);
      expect(await library.recipeRows()).toEqual([]);
    });

    it("answers 404 for a photo id that is not the recipe's", async () => {
      // arrange
      const porridge = await porridgeWithPhoto();

      // act
      const response = await library.openPhoto(COACH_SESSION, {
        recipeId: porridge.recipeId,
        photoId: UNKNOWN_ID,
      });

      // assert
      expect(response.status).toBe(404);
    });

    it("answers 404 to a signed-in client, a signed-out visitor and another coach", async () => {
      // arrange
      await rig.provisionClient();
      await rig.provisionOtherCoach();
      const porridge = await porridgeWithPhoto();

      // act
      const answers = await Promise.all([
        library.openPhoto(CLIENT_SESSION, porridge),
        library.openPhoto(VISITOR, porridge),
        library.openPhoto(OTHER_COACH_SESSION, porridge),
      ]);

      // assert
      expect(answers.map(({ status }) => status)).toEqual([404, 404, 404]);
    });

    it("refuses a signed-in client's save with a photo, storing nothing", async () => {
      // arrange
      await rig.provisionClient();

      // act
      const response = await library.createWithPhoto(
        CLIENT_SESSION,
        { ...porridgeOf(stored), photo: "attach" },
        await cameraPhoto(),
      );

      // assert
      expect(response.status).toBe(403);
      expect(await library.recipeRows()).toEqual([]);
      expect(await library.photoFiles()).toEqual([]);
    });
  });

  describe("who may write", () => {
    it.each([
      { who: "a signed-in client", requester: CLIENT_SESSION, status: 403 },
      { who: "a signed-out visitor", requester: VISITOR, status: 401 },
    ] as const)(
      "refuses $who on every recipe endpoint",
      async ({ requester, status }) => {
        // arrange
        await rig.provisionClient();
        const porridge = await library.createAccepted(
          COACH_SESSION,
          porridgeOf(stored),
        );

        // act
        const answers = await Promise.all([
          library.create(requester, {
            ...porridgeOf(stored),
            name: "Omelette",
          }),
          library.edit(requester, porridge.id, {
            ...porridgeOf(stored),
            name: "Omelette",
          }),
        ]);

        // assert
        expect(answers.map((answer) => answer.status)).toEqual([
          status,
          status,
        ]);
        expect(await library.recipeRows()).toEqual([porridge]);
      },
    );
  });
  describe("the coach's pages", () => {
    it("shows every recipe A to Z as a card with its name, total minutes, the macros its foods give and its meal roles before its tags", async () => {
      // arrange
      await library.createAccepted(COACH_SESSION, porridgeOf(stored));
      await library.createAccepted(COACH_SESSION, {
        name: "Honey milk",
        ingredients: [
          { foodId: stored.milk, grams: 300, method: "steamed" },
          { foodId: stored.honey, grams: 15, method: "raw" },
        ],
        prepMinutes: 2,
        cookMinutes: 0,
        instructions: "",
        icon: null,
        tagIds: [],
      });

      // act
      const response = await library.openRecipes(COACH_SESSION);

      // assert
      expect(response.status).toBe(200);
      const page = await pageTextOf(response);
      expect(page).toContain(
        "Nutrition Build your food library and recipes. New recipe Foods Recipes",
      );
      expect(page).toContain(
        [
          "Honey milk 2 min Per recipe kcal 172 P 10g C 27g F 3g",
          "Porridge 15 min Per recipe kcal 261 P 15g C 39g F 5g Breakfast Vegetarian",
        ].join(" "),
      );
    });

    it("tells her she has no recipes before she builds one", async () => {
      // arrange, act
      const response = await library.openRecipes(COACH_SESSION);

      // assert
      expect(response.status).toBe(200);
      expect(await pageTextOf(response)).toContain(
        "No recipes yet Recipes you build appear here.",
      );
    });

    it("opens a blank recipe on the builder with the foods she may use", async () => {
      // arrange
      await foods.archive(stored.honey);

      // act
      const response = await library.openNewRecipe(COACH_SESSION);

      // assert
      expect(response.status).toBe(200);
      const document = await visibleDocument(response);
      expect(document).toContain("<title>New recipe | Evoa</title>");
      expect(document).toContain('<html class="relative" data-portal="coach"');
      const page = textOf(document);
      expect(page).toContain("Food library Milk Oats Recipe builder");
      expect(page).not.toContain("Honey");
      expect(page).toContain(
        "Drag foods here (or use the + on a food) to add ingredients.",
      );
      expect(page).toContain(
        "Macros (whole recipe) kcal 0 P 0g C 0g F 0g Prep (min) Cook (min) Instructions",
      );
    });

    it("opens a saved recipe on the builder with its entries", async () => {
      // arrange
      const porridge = await library.createAccepted(
        COACH_SESSION,
        porridgeOf(stored),
      );

      // act
      const response = await library.openRecipe(COACH_SESSION, porridge.id);

      // assert
      expect(response.status).toBe(200);
      const document = await visibleDocument(response);
      expect(document).toContain("<title>Edit recipe | Evoa</title>");
      expect(document).toContain('value="Porridge"');
      expect(document).toContain('value="40"');
      expect(document).toContain('value="250"');
      const page = textOf(document);
      expect(page).toContain("Icon: Stew");
      expect(page).toContain("Oats Grams for Oats g Boiled");
      expect(page).toContain("Milk Grams for Milk g Raw");
      expect(page).toContain("kcal 261 P 15g C 39g F 5g");
      expect(page).toContain("Simmer the oats in the milk.");
    });

    it.each([
      ["an unknown recipe", () => UNKNOWN_ID],
      ["an id that is not a uuid", () => NOT_A_UUID],
    ])("returns her to the Recipes tab for %s", async (_case, recipeIdOf) => {
      // arrange, act
      const response = await library.openRecipe(COACH_SESSION, recipeIdOf());

      // assert
      expect(response.status).toBe(302);
      expect(response.headers.get("location")).toBe(suite.path(RECIPES_PAGE));
    });

    it("returns her to the Recipes tab when she opens another coach's recipe", async () => {
      // arrange
      await rig.provisionOtherCoach();
      const othersOats = await foods.createAccepted(OTHER_COACH_SESSION, OATS);
      const othersPorridge = await library.createAccepted(OTHER_COACH_SESSION, {
        ...porridgeOf(stored),
        ingredients: [{ foodId: othersOats.id, grams: 40, method: "raw" }],
      });

      // act
      const response = await library.openRecipe(
        COACH_SESSION,
        othersPorridge.id,
      );

      // assert
      expect(response.status).toBe(302);
      expect(response.headers.get("location")).toBe(suite.path(RECIPES_PAGE));
    });

    it("refuses a signed-in client on the Recipes tab and both builder pages", async () => {
      // arrange
      await rig.provisionClient();
      const porridge = await library.createAccepted(
        COACH_SESSION,
        porridgeOf(stored),
      );

      // act
      const answers = await Promise.all([
        library.openRecipes(CLIENT_SESSION),
        library.openNewRecipe(CLIENT_SESSION),
        library.openRecipe(CLIENT_SESSION, porridge.id),
      ]);

      // assert
      expect(answers.map(({ status }) => status)).toEqual([403, 403, 403]);
    });

    it("sends a signed-out visitor to sign in from the Recipes tab and both builder pages", async () => {
      // arrange
      const porridge = await library.createAccepted(
        COACH_SESSION,
        porridgeOf(stored),
      );
      const pages = [
        RECIPES_PAGE,
        RECIPE_BUILDER_PAGE,
        `${RECIPE_BUILDER_PAGE}/${porridge.id}`,
      ];

      // act
      const answers = await Promise.all([
        library.openRecipes(VISITOR),
        library.openNewRecipe(VISITOR),
        library.openRecipe(VISITOR, porridge.id),
      ]);

      // assert
      expect(
        answers.map((answer) => [
          answer.status,
          answer.headers.get("location"),
        ]),
      ).toEqual(
        pages.map((page) => [
          302,
          `https://evoa.fit/sign-in?redirect_url=${encodeURIComponent(
            `https://localhost:3000${suite.path(page)}`,
          )}`,
        ]),
      );
    });
  });
});

async function pageTextOf(response: Response): Promise<string> {
  return textOf(await visibleDocument(response));
}

function textOf(document: string): string {
  return textNodesOf(document)
    .filter((text) => text.length > 0)
    .join(" ");
}
