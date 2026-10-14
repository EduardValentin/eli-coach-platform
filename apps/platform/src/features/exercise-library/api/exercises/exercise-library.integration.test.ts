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
  ExerciseLibraryJourney,
  VISITOR,
  type ExerciseFields,
} from "~integration-test-config/exercise-library-journey";
import {
  CLIENT_SESSION,
  COACH_SESSION,
  PlatformRig,
} from "~integration-test-config/platform-rig";

const suite = new ApiIntegrationTestSuite();
const rig = new PlatformRig(suite);
const library = new ExerciseLibraryJourney(rig);

const CREATED_AT = new Date("2026-10-14T09:00:00.000Z");
const EDITED_AT = new Date("2026-10-15T10:30:00.000Z");
const UNKNOWN_ID = "9e8d7c6b-5a49-4382-9716-a5b4c3d2e1f0";
const NOT_A_UUID = "not-an-exercise";
const LIBRARY = { redirectTo: "/coach/training" };

const BACK_SQUAT: ExerciseFields = {
  name: "Back squat",
  type: "resistance",
  unit: "reps",
  perSide: false,
  primaryMuscles: ["Quadriceps", "Glutes"],
  secondaryMuscles: ["Core"],
  equipment: ["Barbell", "Squat rack"],
  difficulty: "Intermediate",
  tags: ["Strength"],
  cues: "Brace, then sit between the hips.",
};

const HIP_THRUST: ExerciseFields = {
  name: "Hip thrust",
  type: "resistance",
  unit: "reps",
  perSide: false,
  primaryMuscles: ["Glutes"],
  secondaryMuscles: ["Hamstrings"],
  equipment: ["Barbell", "Bench"],
  difficulty: "Beginner",
  tags: ["Hypertrophy"],
  cues: "",
};

const BOX_BREATHING: ExerciseFields = {
  name: "Box breathing",
  type: "breathing",
  unit: "breaths",
  perSide: false,
  primaryMuscles: ["Core"],
  secondaryMuscles: [],
  equipment: ["Mat"],
  difficulty: "Beginner",
  tags: ["Recovery"],
  cues: "Four counts each side of the box.",
};

const FIVE_PROBLEMS = [
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
    problem: "form cues of 1,001 characters",
    fields: { cues: "c".repeat(1_001) },
    problems: { cues: "too-long" },
  },
  {
    problem: "no primary muscle for a resistance exercise",
    fields: { primaryMuscles: [] },
    problems: { primaryMuscles: "missing" },
  },
  {
    problem: "a name another exercise has",
    fields: { name: "  hip THRUST " },
    problems: { name: "taken" },
  },
];

describe.sequential("exercise library integration", () => {
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

  describe("creating an exercise", () => {
    it("stores every entry, the name trimmed, and names the library as the next page", async () => {
      // arrange
      await rig.holdClock(CREATED_AT);

      // act
      const response = await library.create(COACH_SESSION, {
        ...BACK_SQUAT,
        name: "  Back squat  ",
      });

      // assert
      expect(response.status).toBe(200);
      expect(await response.json()).toEqual(LIBRARY);
      const { cues, ...columns } = BACK_SQUAT;
      expect(await library.exerciseRows()).toEqual([
        {
          ...columns,
          id: expect.any(String),
          formCues: cues,
          createdAt: CREATED_AT,
          updatedAt: CREATED_AT,
        },
      ]);
    });

    it("stores a cardio exercise without a primary muscle and a bodyweight exercise without equipment", async () => {
      // arrange
      const jog = {
        ...BACK_SQUAT,
        name: "Easy jog",
        type: "cardio",
        unit: "time",
        primaryMuscles: [],
        secondaryMuscles: [],
        equipment: [],
        tags: [],
        cues: "",
      };

      // act
      const response = await library.create(COACH_SESSION, jog);

      // assert
      expect(response.status).toBe(200);
      expect(await library.exerciseRows()).toEqual([
        expect.objectContaining({
          name: "Easy jog",
          primaryMuscles: [],
          equipment: [],
        }),
      ]);
    });

    it.each(FIVE_PROBLEMS)(
      "refuses $problem with 422 and its code, storing nothing new",
      async ({ fields, problems }) => {
        // arrange
        await library.createAccepted(COACH_SESSION, HIP_THRUST);

        // act
        const response = await library.create(COACH_SESSION, {
          ...BACK_SQUAT,
          ...fields,
        });

        // assert
        expect(response.status).toBe(422);
        expect(await response.json()).toEqual({ problems });
        expect((await library.exerciseRows()).map(({ name }) => name)).toEqual([
          "Hip thrust",
        ]);
      },
    );

    it.each([
      ["the same name", "Hip thrust"],
      ["a differently cased name", "HIP THRUST"],
      ["a name with surrounding spaces", "  Hip thrust  "],
    ])("refuses a duplicate given as %s", async (_case, name) => {
      // arrange
      await library.createAccepted(COACH_SESSION, HIP_THRUST);

      // act
      const response = await library.create(COACH_SESSION, {
        ...HIP_THRUST,
        name,
      });

      // assert
      expect(response.status).toBe(422);
      expect(await response.json()).toEqual({ problems: { name: "taken" } });
      expect(await library.exerciseRows()).toHaveLength(1);
    });

    it("keeps one of two exercises created at once under the same name and refuses the other as taken", async () => {
      // arrange
      const twins = [{ ...HIP_THRUST }, { ...HIP_THRUST, name: " hip thrust" }];

      // act
      const responses = await Promise.all(
        twins.map((fields) => library.create(COACH_SESSION, fields)),
      );

      // assert
      const statuses = responses.map(({ status }) => status).sort();
      expect(statuses).toEqual([200, 422]);
      const refused = responses.find(({ status }) => status === 422);
      expect(await refused?.json()).toEqual({ problems: { name: "taken" } });
      expect(await library.exerciseRows()).toHaveLength(1);
    });

    it("refuses values outside the library's vocabulary with 422 and their codes", async () => {
      // arrange
      const fields = {
        ...BACK_SQUAT,
        type: "yoga",
        equipment: ["Sled"],
        tags: ["Power"],
      };

      // act
      const response = await library.create(COACH_SESSION, fields);

      // assert
      expect(response.status).toBe(422);
      expect(await response.json()).toEqual({
        problems: { type: "unknown", equipment: "unknown", tags: "unknown" },
      });
      expect(await library.exerciseRows()).toEqual([]);
    });

    it("refuses a unit the type does not measure in", async () => {
      // arrange
      const fields = { ...BOX_BREATHING, unit: "reps" };

      // act
      const response = await library.create(COACH_SESSION, fields);

      // assert
      expect(response.status).toBe(422);
      expect(await response.json()).toEqual({
        problems: { unit: "not-allowed" },
      });
    });

    it.each([
      ["a body that is not JSON", "{"],
      ["a body missing a field", { ...BACK_SQUAT, cues: undefined }],
      ["a field of the wrong shape", { ...BACK_SQUAT, perSide: "no" }],
    ])("answers 400 to %s", async (_case, body) => {
      // arrange
      const malformed = body;

      // act
      const response = await library.create(COACH_SESSION, malformed);

      // assert
      expect(response.status).toBe(400);
      expect(await library.exerciseRows()).toEqual([]);
    });
  });

  describe("editing an exercise", () => {
    it("replaces every entry, keeps the moment it was created and names the library as the next page", async () => {
      // arrange
      await rig.holdClock(CREATED_AT);
      const squat = await library.createAccepted(COACH_SESSION, BACK_SQUAT);
      await rig.holdClock(EDITED_AT);
      const revised = {
        ...BACK_SQUAT,
        name: " Front squat ",
        type: "mobility",
        unit: "time",
        perSide: true,
        primaryMuscles: ["Quadriceps", "Core"],
        secondaryMuscles: ["Glutes"],
        equipment: [],
        difficulty: "Advanced",
        tags: ["Strength", "Recovery"],
        cues: "Elbows high.",
      };

      // act
      const response = await library.edit(COACH_SESSION, squat.id, revised);

      // assert
      expect(response.status).toBe(200);
      expect(await response.json()).toEqual(LIBRARY);
      const { cues, ...columns } = revised;
      expect(await library.exerciseRows()).toEqual([
        {
          ...columns,
          id: squat.id,
          name: "Front squat",
          formCues: cues,
          createdAt: CREATED_AT,
          updatedAt: EDITED_AT,
        },
      ]);
    });

    it.each([
      ["unchanged", "Back squat"],
      ["recased and spaced", "  back SQUAT "],
    ])("keeps its own name %s", async (_case, name) => {
      // arrange
      const squat = await library.createAccepted(COACH_SESSION, BACK_SQUAT);
      await library.createAccepted(COACH_SESSION, HIP_THRUST);

      // act
      const response = await library.edit(COACH_SESSION, squat.id, {
        ...BACK_SQUAT,
        name,
        tags: [],
      });

      // assert
      expect(response.status).toBe(200);
      expect(await library.exerciseRows()).toEqual([
        expect.objectContaining({ id: squat.id, name: name.trim(), tags: [] }),
        expect.objectContaining({ name: "Hip thrust" }),
      ]);
    });

    it.each([
      ["the same name", "Hip thrust"],
      ["a differently cased and spaced name", " HIP thrust  "],
    ])(
      "refuses a rename onto another exercise's name given as %s",
      async (_case, name) => {
        // arrange
        const squat = await library.createAccepted(COACH_SESSION, BACK_SQUAT);
        await library.createAccepted(COACH_SESSION, HIP_THRUST);

        // act
        const response = await library.edit(COACH_SESSION, squat.id, {
          ...BACK_SQUAT,
          name,
        });

        // assert
        expect(response.status).toBe(422);
        expect(await response.json()).toEqual({ problems: { name: "taken" } });
        expect(
          (await library.exerciseRows()).map(({ name: stored }) => stored),
        ).toEqual(["Back squat", "Hip thrust"]);
      },
    );

    it.each(FIVE_PROBLEMS)(
      "refuses $problem with 422 and its code, leaving the exercise as it was",
      async ({ fields, problems }) => {
        // arrange
        await rig.holdClock(CREATED_AT);
        const squat = await library.createAccepted(COACH_SESSION, BACK_SQUAT);
        await library.createAccepted(COACH_SESSION, HIP_THRUST);

        // act
        const response = await library.edit(COACH_SESSION, squat.id, {
          ...BACK_SQUAT,
          ...fields,
        });

        // assert
        expect(response.status).toBe(422);
        expect(await response.json()).toEqual({ problems });
        expect((await library.exerciseRows())[0]).toEqual(squat);
      },
    );

    it.each([
      ["an unknown exercise", UNKNOWN_ID],
      ["an id that is not a uuid", NOT_A_UUID],
    ])("answers 404 for %s", async (_case, exerciseId) => {
      // arrange
      await library.createAccepted(COACH_SESSION, BACK_SQUAT);

      // act
      const response = await library.edit(
        COACH_SESSION,
        exerciseId,
        HIP_THRUST,
      );

      // assert
      expect(response.status).toBe(404);
      expect((await library.exerciseRows()).map(({ name }) => name)).toEqual([
        "Back squat",
      ]);
    });
  });

  describe("who may write", () => {
    it.each([
      { who: "a signed-in client", requester: CLIENT_SESSION, status: 403 },
      { who: "a signed-out visitor", requester: VISITOR, status: 401 },
    ] as const)(
      "refuses $who on every exercise endpoint",
      async ({ requester, status }) => {
        // arrange
        await rig.provisionClient();
        const squat = await library.createAccepted(COACH_SESSION, BACK_SQUAT);

        // act
        const answers = await Promise.all([
          library.create(requester, HIP_THRUST),
          library.edit(requester, squat.id, HIP_THRUST),
        ]);

        // assert
        expect(answers.map((answer) => answer.status)).toEqual([
          status,
          status,
        ]);
        expect(await library.exerciseRows()).toEqual([squat]);
      },
    );
  });
});
