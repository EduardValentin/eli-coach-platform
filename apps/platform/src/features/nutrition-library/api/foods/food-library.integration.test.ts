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
  LIBRARY_PAGE,
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
  textNodesOf,
  visibleDocument,
} from "~integration-test-config/rendered-page";

const suite = new ApiIntegrationTestSuite();
const rig = new PlatformRig(suite);
const library = new FoodLibraryJourney(rig);

const CREATED_AT = new Date("2026-10-14T09:00:00.000Z");
const EDITED_AT = new Date("2026-10-15T10:30:00.000Z");
const UNKNOWN_ID = "9e8d7c6b-5a49-4382-9716-a5b4c3d2e1f0";
const NOT_A_UUID = "not-a-food";
const LIBRARY = { redirectTo: "/coach/nutrition" };

const CHICKEN: FoodFields = {
  name: "Chicken breast",
  category: "protein",
  icon: "poultry",
  kcal: 165,
  protein: 31,
  carb: 0,
  fat: 3.6,
  defaultPortionGrams: 150,
  tagIds: ["mt-lunch", "di-lactose-free"],
};

const OATS: FoodFields = {
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

const SALMON: FoodFields = {
  name: "salmon",
  category: "protein",
  icon: "fish",
  kcal: 208,
  protein: 20.42,
  carb: 0,
  fat: 13.42,
  defaultPortionGrams: 120,
  tagIds: ["nu-omega3"],
};

const PROBLEMS = [
  {
    problem: "no name",
    fields: { name: "   " },
    problems: { name: "missing" },
  },
  {
    problem: "a name of 81 characters",
    fields: { name: "n".repeat(81) },
    problems: { name: "too-long" },
  },
  {
    problem: "calories of 10,000",
    fields: { kcal: 10_000 },
    problems: { kcal: "out-of-range" },
  },
  {
    problem: "protein with three decimals",
    fields: { protein: 1.234 },
    problems: { protein: "out-of-range" },
  },
  {
    problem: "fat below 0",
    fields: { fat: -1 },
    problems: { fat: "out-of-range" },
  },
  {
    problem: "a portion of half a gram",
    fields: { defaultPortionGrams: 0.5 },
    problems: { defaultPortionGrams: "out-of-range" },
  },
  {
    problem: "a portion of 100,000 grams",
    fields: { defaultPortionGrams: 100_000 },
    problems: { defaultPortionGrams: "out-of-range" },
  },
  {
    problem: "a tag outside the vocabulary",
    fields: { tagIds: ["mt-lunch", "mt-brunch"] },
    problems: { tagIds: "unknown" },
  },
  {
    problem: "an icon outside the vocabulary",
    fields: { icon: "pizza" },
    problems: { icon: "unknown" },
  },
  {
    problem: "a name another food has",
    fields: { name: "  OATS " },
    problems: { name: "taken" },
  },
];

const MALFORMED_BODIES: [string, unknown][] = [
  ["a body that is not JSON", "{"],
  ["a body missing a field", { ...CHICKEN, fat: undefined }],
  ["a value given as text", { ...CHICKEN, kcal: "165" }],
];

describe.sequential("nutrition library integration", () => {
  beforeAll(async () => {
    process.env.BOOTSTRAP_COACH_AUTH_SUBJECT_ID = COACH_SESSION.subjectId;
    await suite.start();
  });

  beforeEach(async () => {
    await rig.switchWaitlistModeOff();
    await rig.provisionCoach();
  });

  afterEach(async () => {
    rig.releaseClock();
    await suite.reset();
  });

  afterAll(async () => {
    await suite.stop();
    delete process.env.BOOTSTRAP_COACH_AUTH_SUBJECT_ID;
  });

  describe("the tag vocabulary", () => {
    it("holds the sixteen tags in their four families after migrating", async () => {
      // arrange, act
      const tags = await library.tagRows();

      // assert
      expect(tags.map(({ id }) => id)).toEqual([
        "mt-breakfast",
        "mt-lunch",
        "mt-dinner",
        "mt-snack",
        "mt-pre-workout",
        "mt-post-workout",
        "cp-menstrual",
        "cp-follicular",
        "cp-ovulatory",
        "cp-luteal",
        "nu-iron",
        "nu-omega3",
        "nu-magnesium",
        "nu-anti-inflammatory",
        "di-vegetarian",
        "di-lactose-free",
      ]);
      expect(new Set(tags.map(({ family }) => family))).toEqual(
        new Set(["meal-time", "cycle-phase", "nutrient", "dietary"]),
      );
    });
  });

  describe("creating a food", () => {
    it("stores every entry with its tags, the name trimmed, as the signed-in coach's active food, and names the library as the next page", async () => {
      // arrange
      await rig.holdClock(CREATED_AT);

      // act
      const response = await library.create(COACH_SESSION, {
        ...CHICKEN,
        name: "  Chicken breast  ",
      });

      // assert
      expect(response.status).toBe(200);
      expect(await response.json()).toEqual(LIBRARY);
      expect(await library.foodRows()).toEqual([
        {
          ...CHICKEN,
          tagIds: ["mt-lunch", "di-lactose-free"],
          id: expect.any(String),
          ownerSubjectId: COACH_SESSION.subjectId,
          archivedAt: null,
          createdAt: CREATED_AT,
          updatedAt: CREATED_AT,
        },
      ]);
    });

    it("stores blank values as 0 and a portion of 0 grams as 100", async () => {
      // arrange
      const blank = {
        ...CHICKEN,
        kcal: 0,
        protein: 0,
        carb: 0,
        fat: 0,
        defaultPortionGrams: 0,
        tagIds: [],
      };

      // act
      const response = await library.create(COACH_SESSION, blank);

      // assert
      expect(response.status).toBe(200);
      expect(await library.foodRows()).toEqual([
        expect.objectContaining({
          kcal: 0,
          protein: 0,
          carb: 0,
          fat: 0,
          defaultPortionGrams: 100,
          tagIds: [],
        }),
      ]);
    });

    it("stores the highest values and two decimals as entered", async () => {
      // arrange
      const highest = {
        ...CHICKEN,
        kcal: 9_999.99,
        protein: 0.01,
        carb: 12.34,
        defaultPortionGrams: 99_999,
      };

      // act
      const response = await library.create(COACH_SESSION, highest);

      // assert
      expect(response.status).toBe(200);
      expect(await library.foodRows()).toEqual([
        expect.objectContaining({
          kcal: 9_999.99,
          protein: 0.01,
          carb: 12.34,
          defaultPortionGrams: 99_999,
        }),
      ]);
    });

    it.each(PROBLEMS)(
      "refuses $problem with 422 and its code, storing nothing new",
      async ({ fields, problems }) => {
        // arrange
        await library.createAccepted(COACH_SESSION, OATS);

        // act
        const response = await library.create(COACH_SESSION, {
          ...CHICKEN,
          ...fields,
        });

        // assert
        expect(response.status).toBe(422);
        expect(await response.json()).toEqual({ problems });
        expect((await library.foodRows()).map(({ name }) => name)).toEqual([
          "Oats",
        ]);
      },
    );

    it.each([
      ["the same name", "Oats"],
      ["a differently cased name", "OATS"],
      ["a name with surrounding spaces", "  Oats  "],
    ])("refuses a duplicate given as %s", async (_case, name) => {
      // arrange
      await library.createAccepted(COACH_SESSION, OATS);

      // act
      const response = await library.create(COACH_SESSION, { ...OATS, name });

      // assert
      expect(response.status).toBe(422);
      expect(await response.json()).toEqual({ problems: { name: "taken" } });
      expect(await library.foodRows()).toHaveLength(1);
    });

    it("keeps one of two foods created at once under the same name and refuses the other as taken", async () => {
      // arrange
      const twins = [{ ...OATS }, { ...OATS, name: " oats" }];

      // act
      const responses = await Promise.all(
        twins.map((fields) => library.create(COACH_SESSION, fields)),
      );

      // assert
      const statuses = responses.map(({ status }) => status).sort();
      expect(statuses).toEqual([200, 422]);
      const refused = responses.find(({ status }) => status === 422);
      expect(await refused?.json()).toEqual({ problems: { name: "taken" } });
      expect(await library.foodRows()).toHaveLength(1);
    });

    it.each(MALFORMED_BODIES)("answers 400 to %s", async (_case, body) => {
      // arrange
      const malformed = body;

      // act
      const response = await library.create(COACH_SESSION, malformed);

      // assert
      expect(response.status).toBe(400);
      expect(await library.foodRows()).toEqual([]);
    });
  });

  describe("editing a food", () => {
    it("replaces every entry and its tags, keeps its owner and the moment it was created, and names the library as the next page", async () => {
      // arrange
      await rig.holdClock(CREATED_AT);
      const oats = await library.createAccepted(COACH_SESSION, OATS);
      await rig.holdClock(EDITED_AT);
      const revised = {
        name: " Rolled oats ",
        category: "extra",
        icon: "bread",
        kcal: 375,
        protein: 13.2,
        carb: 67.7,
        fat: 6.5,
        defaultPortionGrams: 0,
        tagIds: ["cp-luteal", "mt-snack"],
      };

      // act
      const response = await library.edit(COACH_SESSION, oats.id, revised);

      // assert
      expect(response.status).toBe(200);
      expect(await response.json()).toEqual(LIBRARY);
      expect(await library.foodRows()).toEqual([
        {
          ...revised,
          id: oats.id,
          name: "Rolled oats",
          defaultPortionGrams: 100,
          tagIds: ["mt-snack", "cp-luteal"],
          ownerSubjectId: COACH_SESSION.subjectId,
          archivedAt: null,
          createdAt: CREATED_AT,
          updatedAt: EDITED_AT,
        },
      ]);
    });

    it.each([
      ["unchanged", "Oats"],
      ["recased and spaced", "  OATS "],
    ])("keeps its own name %s", async (_case, name) => {
      // arrange
      const oats = await library.createAccepted(COACH_SESSION, OATS);
      await library.createAccepted(COACH_SESSION, CHICKEN);

      // act
      const response = await library.edit(COACH_SESSION, oats.id, {
        ...OATS,
        name,
        tagIds: [],
      });

      // assert
      expect(response.status).toBe(200);
      expect(await library.foodRows()).toEqual([
        expect.objectContaining({ name: "Chicken breast" }),
        expect.objectContaining({ id: oats.id, name: name.trim(), tagIds: [] }),
      ]);
    });

    it.each([
      ["the same name", "Chicken breast"],
      ["a differently cased and spaced name", " CHICKEN breast  "],
    ])(
      "refuses a rename onto another food's name given as %s",
      async (_case, name) => {
        // arrange
        const oats = await library.createAccepted(COACH_SESSION, OATS);
        await library.createAccepted(COACH_SESSION, CHICKEN);

        // act
        const response = await library.edit(COACH_SESSION, oats.id, {
          ...OATS,
          name,
        });

        // assert
        expect(response.status).toBe(422);
        expect(await response.json()).toEqual({ problems: { name: "taken" } });
        expect(
          (await library.foodRows()).map(({ name: stored }) => stored),
        ).toEqual(["Chicken breast", "Oats"]);
      },
    );

    it.each(PROBLEMS)(
      "refuses $problem with 422 and its code, leaving the food as it was",
      async ({ fields, problems }) => {
        // arrange
        await rig.holdClock(CREATED_AT);
        const chicken = await library.createAccepted(COACH_SESSION, CHICKEN);
        await library.createAccepted(COACH_SESSION, OATS);

        // act
        const response = await library.edit(COACH_SESSION, chicken.id, {
          ...CHICKEN,
          ...fields,
        });

        // assert
        expect(response.status).toBe(422);
        expect(await response.json()).toEqual({ problems });
        expect((await library.foodRows())[0]).toEqual(chicken);
      },
    );

    it.each(MALFORMED_BODIES)(
      "answers 400 to %s, leaving the food as it was",
      async (_case, body) => {
        // arrange
        const chicken = await library.createAccepted(COACH_SESSION, CHICKEN);

        // act
        const response = await library.edit(COACH_SESSION, chicken.id, body);

        // assert
        expect(response.status).toBe(400);
        expect(await library.foodRows()).toEqual([chicken]);
      },
    );

    it.each([
      ["an unknown food", UNKNOWN_ID],
      ["an id that is not a uuid", NOT_A_UUID],
    ])("answers 404 for %s", async (_case, foodId) => {
      // arrange
      await library.createAccepted(COACH_SESSION, CHICKEN);

      // act
      const response = await library.edit(COACH_SESSION, foodId, OATS);

      // assert
      expect(response.status).toBe(404);
      expect((await library.foodRows()).map(({ name }) => name)).toEqual([
        "Chicken breast",
      ]);
    });
  });

  describe("whose library it is", () => {
    beforeEach(async () => {
      await rig.provisionOtherCoach();
    });

    it("stores a name another coach's food already has as her own", async () => {
      // arrange
      await library.createAccepted(OTHER_COACH_SESSION, OATS);

      // act
      const response = await library.create(COACH_SESSION, {
        ...OATS,
        name: " oATS",
      });

      // assert
      expect(response.status).toBe(200);
      expect(
        (await library.foodRows()).map(({ name, ownerSubjectId }) => [
          name,
          ownerSubjectId,
        ]),
      ).toEqual([
        ["oATS", COACH_SESSION.subjectId],
        ["Oats", OTHER_COACH_SESSION.subjectId],
      ]);
    });

    it("renames her food onto a name only another coach's food has", async () => {
      // arrange
      await library.createAccepted(OTHER_COACH_SESSION, OATS);
      const chicken = await library.createAccepted(COACH_SESSION, CHICKEN);

      // act
      const response = await library.edit(COACH_SESSION, chicken.id, {
        ...CHICKEN,
        name: "Oats",
      });

      // assert
      expect(response.status).toBe(200);
      expect(
        (await library.foodRows()).map(({ id, ownerSubjectId }) => [
          id,
          ownerSubjectId,
        ]),
      ).toEqual([
        [chicken.id, COACH_SESSION.subjectId],
        [expect.any(String), OTHER_COACH_SESSION.subjectId],
      ]);
    });

    it("answers 404 to editing another coach's food, leaving it as it was", async () => {
      // arrange
      const othersOats = await library.createAccepted(
        OTHER_COACH_SESSION,
        OATS,
      );

      // act
      const response = await library.edit(
        COACH_SESSION,
        othersOats.id,
        CHICKEN,
      );

      // assert
      expect(response.status).toBe(404);
      expect(await library.foodRows()).toEqual([othersOats]);
    });

    it("lists only her own foods", async () => {
      // arrange
      await library.createAccepted(COACH_SESSION, CHICKEN);
      await library.createAccepted(OTHER_COACH_SESSION, SALMON);

      // act
      const response = await library.openLibrary(COACH_SESSION);

      // assert
      expect(response.status).toBe(200);
      const page = await pageTextOf(response);
      expect(page).toContain("Chicken breast");
      expect(page).not.toContain("salmon");
    });

    it("returns her to the library when she opens another coach's food", async () => {
      // arrange
      const othersOats = await library.createAccepted(
        OTHER_COACH_SESSION,
        OATS,
      );

      // act
      const response = await library.openFood(COACH_SESSION, othersOats.id);

      // assert
      expect(response.status).toBe(302);
      expect(response.headers.get("location")).toBe(suite.path(LIBRARY_PAGE));
    });
  });

  describe("who may write", () => {
    it.each([
      { who: "a signed-in client", requester: CLIENT_SESSION, status: 403 },
      { who: "a signed-out visitor", requester: VISITOR, status: 401 },
    ] as const)(
      "refuses $who on every food endpoint",
      async ({ requester, status }) => {
        // arrange
        await rig.provisionClient();
        const chicken = await library.createAccepted(COACH_SESSION, CHICKEN);

        // act
        const answers = await Promise.all([
          library.create(requester, OATS),
          library.edit(requester, chicken.id, OATS),
        ]);

        // assert
        expect(answers.map((answer) => answer.status)).toEqual([
          status,
          status,
        ]);
        expect(await library.foodRows()).toEqual([chicken]);
      },
    );
  });

  describe("the coach's pages", () => {
    it("lists every food A to Z with its category, values per 100 g and tags in the vocabulary's order", async () => {
      // arrange
      await library.createAccepted(COACH_SESSION, OATS);
      await library.createAccepted(COACH_SESSION, SALMON);
      await library.createAccepted(COACH_SESSION, {
        ...CHICKEN,
        tagIds: ["di-lactose-free", "mt-lunch"],
      });

      // act
      const response = await library.openLibrary(COACH_SESSION);

      // assert
      expect(response.status).toBe(200);
      const page = await pageTextOf(response);
      expect(page).toContain(
        "Nutrition Build your food library and recipes. New food",
      );
      expect(page).toContain(
        [
          "Chicken breast Protein 165 31g 0g 3.6g Lunch Lactose-free",
          "Oats Carb 389 16.9g 66.3g 6.9g Breakfast Vegetarian",
          "salmon Protein 208 20.42g 0g 13.42g Omega-3",
        ].join(" "),
      );
    });

    it("tells her the library is empty before she adds a food", async () => {
      // arrange, act
      const response = await library.openLibrary(COACH_SESSION);

      // assert
      expect(response.status).toBe(200);
      expect(await pageTextOf(response)).toContain(
        "No foods yet Foods you add appear here.",
      );
    });

    it("opens a blank food on the new food page", async () => {
      // arrange, act
      const response = await library.openNewFood(COACH_SESSION);

      // assert
      expect(response.status).toBe(200);
      const document = await visibleDocument(response);
      expect(document).toContain('value="100"');
      const page = textOf(document);
      expect(page).toContain("Back to foods New food About the food");
      expect(page).toContain("Protein");
      expect(page).toContain("Nutrition per 100 g");
      expect(page).toContain("Proposed when the food enters a recipe.");
      expect(page).toContain("Meal-time Breakfast Lunch");
      expect(page).toContain("Dietary Vegetarian Lactose-free");
      expect(page).toContain("Cancel Create food");
    });

    it("opens a saved food's editor with its values", async () => {
      // arrange
      const oats = await library.createAccepted(COACH_SESSION, OATS);

      // act
      const response = await library.openFood(COACH_SESSION, oats.id);

      // assert
      expect(response.status).toBe(200);
      const document = await visibleDocument(response);
      expect(document).toContain('value="Oats"');
      expect(document).toContain('value="389"');
      expect(document).toContain('value="16.9"');
      expect(document).toContain('value="40"');
      const page = textOf(document);
      expect(page).toContain("Back to foods Edit food");
      expect(page).toContain("Carb");
      expect(page).toContain("Cancel Save changes");
    });

    it.each([
      ["an unknown food", UNKNOWN_ID],
      ["an id that is not a uuid", NOT_A_UUID],
    ])("returns her to the library for %s", async (_case, foodId) => {
      // arrange, act
      const response = await library.openFood(COACH_SESSION, foodId);

      // assert
      expect(response.status).toBe(302);
      expect(response.headers.get("location")).toBe(suite.path(LIBRARY_PAGE));
    });

    it("refuses a signed-in client on the library and both editor pages", async () => {
      // arrange
      await rig.provisionClient();
      const oats = await library.createAccepted(COACH_SESSION, OATS);

      // act
      const answers = await Promise.all([
        library.openLibrary(CLIENT_SESSION),
        library.openNewFood(CLIENT_SESSION),
        library.openFood(CLIENT_SESSION, oats.id),
      ]);

      // assert
      expect(answers.map(({ status }) => status)).toEqual([403, 403, 403]);
    });

    it("sends a signed-out visitor to sign in from the library and both editor pages", async () => {
      // arrange
      const oats = await library.createAccepted(COACH_SESSION, OATS);
      const pages = [
        LIBRARY_PAGE,
        `${LIBRARY_PAGE}/foods/new`,
        `${LIBRARY_PAGE}/foods/${oats.id}`,
      ];

      // act
      const answers = await Promise.all([
        library.openLibrary(VISITOR),
        library.openNewFood(VISITOR),
        library.openFood(VISITOR, oats.id),
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
