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
  ClientOnboardingJourney,
  regularSubmission,
  type OnboardingSubmission,
} from "~integration-test-config/client-onboarding-journey";
import {
  ExerciseLibraryJourney,
  type ExerciseFields,
} from "~integration-test-config/exercise-library-journey";
import {
  CLIENT_SESSION,
  COACH_SESSION,
  OTHER_COACH_SESSION,
  PlatformRig,
  type AccountSession,
} from "~integration-test-config/platform-rig";
import {
  textNodesOf,
  visibleDocument,
} from "~integration-test-config/rendered-page";
import {
  stripeSubscriptionObject,
  SubscriptionLifecycleJourney,
} from "~integration-test-config/subscription-lifecycle-journey";
import { SubscriptionsJourney } from "~integration-test-config/subscriptions-journey";
import {
  coachClientPage,
  exerciseRow,
  planWithSession,
  programBuilderPage,
  programSetupPage,
  SIGNED_OUT,
  TrainingProgramsJourney,
  type DraftRow,
  type ProgramSetupRequest,
  type StoredBlock,
} from "~integration-test-config/training-programs-journey";
import { toUnixSeconds } from "~integration-test-config/wire-mock/expectations/stripe-api";

const suite = new ApiIntegrationTestSuite();
const rig = new PlatformRig(suite);
const sales = new SubscriptionsJourney(rig);
const onboarding = new ClientOnboardingJourney(rig, sales);
const lifecycle = new SubscriptionLifecycleJourney(rig);
const library = new ExerciseLibraryJourney(rig);
const programs = new TrainingProgramsJourney(rig, onboarding);

const ANA_CLIENT: AccountSession = {
  sessionId: "sess_programs_client",
  subjectId: "user_programs_client",
};

const UNKNOWN_CLIENT_ID = "0b8d2f7e-2f55-4d3e-9d7c-7d7a3f1c2b10";
const UNKNOWN_EXERCISE_ID = "5c1e9a3d-7b2f-4e8a-a6d4-3f0b9c2e8d71";

const PAID_THROUGH = new Date("2027-01-21T08:00:00.000Z");

const AFTER_THE_PAID_PERIOD = new Date("2027-01-22T08:00:00.000Z");

const NOT_CREATED_MESSAGE =
  "The program wasn’t created. Your choices are still here, so try again.";

const PREFILLED_BEGINNER_SETUP: ProgramSetupRequest = {
  goal: "Lose fat",
  level: "beginner",
  trainingDays: 3,
  sessionMinutes: 60,
  language: "en",
  dailySteps: 6000,
  splitShape: "full-body",
  equipment: ["Full gym", "Dumbbells"],
};

type WeekEntry =
  | { kind: "session"; sessionId: string }
  | { kind: "cardio"; cardioId: string }
  | { kind: "rest" };

const EMPTY_WEEK: Record<string, WeekEntry> = {
  mon: { kind: "rest" },
  tue: { kind: "rest" },
  wed: { kind: "rest" },
  thu: { kind: "rest" },
  fri: { kind: "rest" },
  sat: { kind: "rest" },
  sun: { kind: "rest" },
};

function emptySession(id: string, name: string) {
  return {
    id,
    originId: id,
    name,
    warmUp: { items: [] },
    coolDown: { enabled: false, items: [] },
    rows: [],
  };
}

function block(id: string, type: string, weeks: number) {
  const calendar: Record<string, WeekEntry> = {
    ...EMPTY_WEEK,
    tue: { kind: "session", sessionId: `${id}-a` },
    fri: { kind: "session", sessionId: `${id}-b` },
    sun: { kind: "cardio", cardioId: `${id}-walk` },
  };

  return {
    id,
    originId: id,
    type,
    weeks,
    trainingDays: 2,
    calibrationWeek: false,
    introText: "",
    clientNote: "",
    split: { shape: "full-body", name: "", text: "" },
    targetMinutes: 45,
    calendar,
    sessions: [
      emptySession(`${id}-a`, "Full Body A"),
      emptySession(`${id}-b`, "Full Body B"),
    ],
    cardioSessions: [
      {
        id: `${id}-walk`,
        originId: `${id}-walk`,
        name: "Cardio",
        segments: [],
      },
    ],
    dailySteps: 8000,
    missedDayNote: "",
  };
}

function reshapedPlan(...blocks: ReturnType<typeof block>[]) {
  return {
    header: { title: "", focus: "", personalNote: "" },
    plan: { blocks },
    nutritionNotes: "",
    lifestyleNotes: "",
  };
}

const RESHAPED_PLAN = reshapedPlan(
  block("block-1", "foundation", 3),
  block("block-2", "strength", 5),
);

const STRUCTURED_EXPERIENCE =
  "I train consistently and follow a structured program";

const INCLINE_WALK: ExerciseFields = {
  name: "Incline walk",
  type: "cardio",
  unit: "time",
  perSide: false,
  primaryMuscles: [],
  secondaryMuscles: [],
  equipment: ["Treadmill"],
  difficulty: "Beginner",
  pattern: null,
  role: null,
  tags: [],
  cues: "",
};

const BACK_SQUAT: ExerciseFields = {
  name: "Back squat",
  type: "resistance",
  unit: "reps",
  perSide: false,
  primaryMuscles: ["Quadriceps", "Glutes"],
  secondaryMuscles: ["Core"],
  equipment: ["Barbell", "Squat rack"],
  difficulty: "Intermediate",
  pattern: "squat",
  role: "main-compound",
  tags: ["Strength"],
  cues: "",
};

const GOBLET_SQUAT: ExerciseFields = {
  ...BACK_SQUAT,
  name: "Goblet squat",
  equipment: ["Dumbbells"],
  difficulty: "Beginner",
};

const SPLIT_SQUAT: ExerciseFields = {
  ...BACK_SQUAT,
  name: "Bulgarian split squat",
  perSide: true,
  equipment: ["Dumbbells", "Bench"],
  pattern: "lunge",
  role: "secondary-compound",
};

const DUMBBELL_ROW: ExerciseFields = {
  ...BACK_SQUAT,
  name: "One-arm dumbbell row",
  perSide: true,
  primaryMuscles: ["Lats", "Upper back"],
  secondaryMuscles: ["Biceps"],
  equipment: ["Dumbbells", "Bench"],
  pattern: "horizontal-pull",
  role: "secondary-compound",
};

const HIP_CIRCLES: ExerciseFields = {
  ...INCLINE_WALK,
  name: "Hip circles",
  type: "mobility",
  unit: "time",
  primaryMuscles: ["Hip flexors"],
  equipment: [],
};

const PIGEON_STRETCH: ExerciseFields = {
  ...INCLINE_WALK,
  name: "Pigeon stretch",
  type: "stretching",
  unit: "time",
  primaryMuscles: ["Glutes"],
  equipment: ["Mat"],
};

describe("a client's training program, from her profile", () => {
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

  describe("creating her program", () => {
    it("creates her program from the prefilled setup, with version 1 a draft of the beginner plan, and opens it in the builder", async () => {
      // arrange
      const clientId = await programs.approvedClient(ANA_CLIENT);

      // act
      const response = await programs.create(
        COACH_SESSION,
        clientId,
        PREFILLED_BEGINNER_SETUP,
      );

      // assert
      const versions = await programs.versionRowsOf(clientId);
      const blocks = versions[0]?.content.plan.blocks ?? [];

      expect(response.status).toBe(302);
      expect(response.headers.get("location")).toBe(
        suite.path(programBuilderPage(clientId)),
      );
      expect(await programs.programRowsOf(clientId)).toEqual([
        expect.objectContaining({
          goal: "Lose fat",
          level: "beginner",
          language: "en",
        }),
      ]);
      expect(
        versions.map(({ number, status }) => ({ number, status })),
      ).toEqual([{ number: 1, status: "draft" }]);
      expect(blocks.map(({ type, weeks }) => ({ type, weeks }))).toEqual([
        { type: "foundation", weeks: 4 },
        { type: "hypertrophy", weeks: 6 },
        { type: "deload", weeks: 1 },
      ]);
      expect(blocks.map(setupCarriedBy)).toEqual(
        blocks.map(() => ({
          splitShape: "full-body",
          trainingDays: 3,
          sessionMinutes: 60,
          dailySteps: 6000,
        })),
      );
      expect(blocks.map(sessionNamesOf)).toEqual(
        blocks.map(() => ["Full Body A", "Full Body B", "Full Body C"]),
      );
      expect(blocks.flatMap(exerciseRowsOf)).toEqual([]);
    });

    it("builds the intermediate plan for an intermediate client, every block carrying the setup's split, training days, session length and daily steps", async () => {
      // arrange
      const clientId = await programs.approvedClient(
        ANA_CLIENT,
        submissionAnswering({
          experienceLevel: STRUCTURED_EXPERIENCE,
          trainingDaysPerWeek: "4 days",
          minutesPerSession: "30–45 minutes",
        }),
      );

      // act
      const response = await programs.create(COACH_SESSION, clientId, {
        ...PREFILLED_BEGINNER_SETUP,
        goal: "Build muscle",
        level: "intermediate",
        trainingDays: 4,
        sessionMinutes: 45,
        splitShape: "upper-lower",
        dailySteps: 8000,
        language: "ro",
      });

      // assert
      const [version] = await programs.versionRowsOf(clientId);
      const blocks = version?.content.plan.blocks ?? [];

      expect(response.status).toBe(302);
      expect(await programs.programRowsOf(clientId)).toEqual([
        expect.objectContaining({
          goal: "Build muscle",
          level: "intermediate",
          language: "ro",
        }),
      ]);
      expect(
        blocks.map(({ type, weeks, calibrationWeek }) => ({
          type,
          weeks,
          calibrationWeek,
        })),
      ).toEqual([
        { type: "hypertrophy", weeks: 6, calibrationWeek: true },
        { type: "deload", weeks: 1, calibrationWeek: false },
        { type: "hypertrophy", weeks: 6, calibrationWeek: false },
      ]);
      expect(blocks.map(setupCarriedBy)).toEqual(
        blocks.map(() => ({
          splitShape: "upper-lower",
          trainingDays: 4,
          sessionMinutes: 45,
          dailySteps: 8000,
        })),
      );
      expect(blocks.map(sessionNamesOf)).toEqual(
        blocks.map(() => ["Lower A", "Upper A", "Lower B", "Upper B"]),
      );
      expect(blocks.flatMap(exerciseRowsOf)).toEqual([]);
    });

    it("prefills every block's cardio sessions with a cardio exercise from the coach's library", async () => {
      // arrange
      await library.createAccepted(COACH_SESSION, BACK_SQUAT);
      const walk = await library.createAccepted(COACH_SESSION, INCLINE_WALK);
      const clientId = await programs.approvedClient(ANA_CLIENT);

      // act
      await programs.start(clientId, PREFILLED_BEGINNER_SETUP);

      // assert
      const [version] = await programs.versionRowsOf(clientId);
      const blocks = version?.content.plan.blocks ?? [];

      expect(blocks.map(cardioSessionCountOf)).toEqual([2, 3, 3]);
      expect(new Set(blocks.flatMap(cardioExercisesOf))).toEqual(
        new Set([walk.id]),
      );
    });

    it("prefills the cardio sessions without an exercise when the coach's library holds no cardio exercise", async () => {
      // arrange
      await library.createAccepted(COACH_SESSION, BACK_SQUAT);
      const clientId = await programs.approvedClient(ANA_CLIENT);

      // act
      await programs.start(clientId, PREFILLED_BEGINNER_SETUP);

      // assert
      const [version] = await programs.versionRowsOf(clientId);
      const blocks = version?.content.plan.blocks ?? [];

      expect(blocks.map(cardioSessionCountOf)).toEqual([2, 3, 3]);
      expect(new Set(blocks.flatMap(cardioExercisesOf))).toEqual(new Set([""]));
    });
  });

  describe("her equipment", () => {
    it("saves equipment changed in the setup to her client profile", async () => {
      // arrange
      const clientId = await programs.approvedClient(ANA_CLIENT);

      // act
      await programs.start(clientId, {
        ...PREFILLED_BEGINNER_SETUP,
        equipment: ["Kettlebells", "Resistance bands"],
      });

      // assert
      const profile = await onboarding.profileRowOf(clientId);

      expect([...(profile?.equipment ?? [])].sort()).toEqual([
        "Kettlebells",
        "Resistance bands",
      ]);
    });

    it("leaves her client profile as it was when the setup keeps her equipment", async () => {
      // arrange
      const clientId = await programs.approvedClient(ANA_CLIENT);
      const before = await onboarding.profileRowOf(clientId);

      // act
      await programs.start(clientId, {
        ...PREFILLED_BEGINNER_SETUP,
        equipment: ["Dumbbells", "Full gym"],
      });

      // assert
      expect(await onboarding.profileRowOf(clientId)).toEqual(before);
      expect(await programs.programRowsOf(clientId)).toHaveLength(1);
    });

    it("creates no program and keeps her equipment when the save fails because her profile changed meanwhile", async () => {
      // arrange
      const clientId = await programs.approvedClient(ANA_CLIENT);
      const concurrentProfileSave = await suite.postgres.beginTransaction();
      await concurrentProfileSave.executeSql({
        sql: "update app.client_profiles set updated_at = updated_at + interval '1 second' where client_id = $1",
        values: [clientId],
      });

      // act
      const pendingCreate = programs.create(COACH_SESSION, clientId, {
        ...PREFILLED_BEGINNER_SETUP,
        equipment: ["Kettlebells"],
      });
      await waitForAWriteBlockedOnTheOpenTransaction();
      await concurrentProfileSave.commit();
      const response = await pendingCreate;

      // assert
      const texts = textNodesOf(await visibleDocument(response));
      const profile = await onboarding.profileRowOf(clientId);

      expect(response.status).toBe(200);
      expect(texts).toContain(NOT_CREATED_MESSAGE);
      expect(await programs.programRowsOf(clientId)).toEqual([]);
      expect(await programs.versionRowsOf(clientId)).toEqual([]);
      expect(profile?.equipment).toEqual(["Full gym", "Dumbbells"]);
    });
  });

  describe("a create refused by direct request", () => {
    it("leads back to the setup and creates nothing while her answers are not approved", async () => {
      // arrange
      const clientId = await programs.submittedClient(ANA_CLIENT);

      // act
      const response = await programs.create(
        COACH_SESSION,
        clientId,
        PREFILLED_BEGINNER_SETUP,
      );

      // assert
      expect(response.status).toBe(302);
      expect(response.headers.get("location")).toBe(
        suite.path(programSetupPage(clientId)),
      );
      expect(await programs.programRowsOf(clientId)).toEqual([]);
    });

    it("leads back to her page and creates nothing once her coaching has ended", async () => {
      // arrange
      const clientId = await programs.approvedClient(ANA_CLIENT);
      await endHerCoaching();

      // act
      const response = await programs.create(
        COACH_SESSION,
        clientId,
        PREFILLED_BEGINNER_SETUP,
      );

      // assert
      expect(response.status).toBe(302);
      expect(response.headers.get("location")).toBe(
        suite.path(coachClientPage(clientId)),
      );
      expect(await programs.programRowsOf(clientId)).toEqual([]);
    });

    it("opens her existing draft in the builder and makes no second program when she already has one", async () => {
      // arrange
      const clientId = await programs.approvedClient(ANA_CLIENT);
      await programs.start(clientId, PREFILLED_BEGINNER_SETUP);

      // act
      const response = await programs.create(COACH_SESSION, clientId, {
        ...PREFILLED_BEGINNER_SETUP,
        level: "advanced",
        equipment: ["Kettlebells"],
      });

      // assert
      expect(response.status).toBe(302);
      expect(response.headers.get("location")).toBe(
        suite.path(programBuilderPage(clientId)),
      );
      expect(await programs.programRowsOf(clientId)).toEqual([
        expect.objectContaining({ level: "beginner" }),
      ]);
      expect(await programs.versionRowsOf(clientId)).toHaveLength(1);
      expect((await onboarding.profileRowOf(clientId))?.equipment).toEqual([
        "Full gym",
        "Dumbbells",
      ]);
    });

    it.each([
      ["without a goal", { goal: "" }, '"goal","missing"'],
      ["without equipment", { equipment: [] }, '"equipment","missing"'],
      [
        "with a goal outside her options",
        { goal: "Run a marathon" },
        '"goal","unknown"',
      ],
      [
        "with equipment outside her options",
        { equipment: ["Rowing machine"] },
        '"equipment","unknown"',
      ],
    ])(
      "answers the setup %s with its problem and creates nothing",
      async (_case, change, problem) => {
        // arrange
        const clientId = await programs.approvedClient(ANA_CLIENT);
        const before = await onboarding.profileRowOf(clientId);

        // act
        const response = await programs.submitSetupForm(clientId, {
          ...PREFILLED_BEGINNER_SETUP,
          ...change,
        });

        // assert
        expect(response.status).toBe(200);
        expect(await response.text()).toContain(problem);
        expect(await programs.programRowsOf(clientId)).toEqual([]);
        expect(await onboarding.profileRowOf(clientId)).toEqual(before);
      },
    );
  });

  describe("the setup page", () => {
    it("opens with her training days, session length and equipment prefilled from her profile and the split that follows them", async () => {
      // arrange
      const clientId = await programs.approvedClient(ANA_CLIENT);

      // act
      const response = await programs.openSetup(COACH_SESSION, clientId);

      // assert
      const page = await visibleDocument(response);
      const texts = textNodesOf(page);

      expect(response.status).toBe(200);
      expect(page).toContain("<title>Build Ana’s program | Evoa</title>");
      expect(texts).toContain("Build Ana’s program");
      expect(texts).toContain("Back to Ana Popescu");
      expect(checkedChoicesOf(page)).toEqual(["3 days", "Full Body", "60 min"]);
      expect(checkedEquipmentOf(page)).toEqual(["Full gym", "Dumbbells"]);
      expect(texts).toContain("Create program");
    });

    it("says the program is not ready yet while her answers wait for approval", async () => {
      // arrange
      const clientId = await programs.submittedClient(ANA_CLIENT);

      // act
      const response = await programs.openSetup(COACH_SESSION, clientId);

      // assert
      const texts = textNodesOf(await visibleDocument(response));

      expect(response.status).toBe(200);
      expect(texts).toContain("Program not ready yet");
      expect(texts).toContain(
        "The program opens once her answers are approved.",
      );
      expect(texts).not.toContain("Create program");
    });

    it("leads back to her page once her coaching has ended", async () => {
      // arrange
      const clientId = await programs.approvedClient(ANA_CLIENT);
      await endHerCoaching();

      // act
      const response = await programs.openSetup(COACH_SESSION, clientId);

      // assert
      expect(response.status).toBe(302);
      expect(response.headers.get("location")).toBe(
        suite.path(coachClientPage(clientId)),
      );
    });

    it("opens her draft in the builder once she has a program", async () => {
      // arrange
      const clientId = await programs.approvedClient(ANA_CLIENT);
      await programs.start(clientId, PREFILLED_BEGINNER_SETUP);

      // act
      const response = await programs.openSetup(COACH_SESSION, clientId);

      // assert
      expect(response.status).toBe(302);
      expect(response.headers.get("location")).toBe(
        suite.path(programBuilderPage(clientId)),
      );
    });

    it("answers 404 for a client no one paid for and for an id that is not one", async () => {
      // arrange
      await programs.approvedClient(ANA_CLIENT);

      // act
      const unknown = await programs.openSetup(
        COACH_SESSION,
        UNKNOWN_CLIENT_ID,
      );
      const malformed = await programs.openSetup(COACH_SESSION, "client-1");

      // assert
      expect(unknown.status).toBe(404);
      expect(malformed.status).toBe(404);
    });
  });

  describe("the Program card on her page", () => {
    it("waits for her answers before offering a program", async () => {
      // arrange
      const clientId = await programs.submittedClient(ANA_CLIENT);

      // act
      const response = await programs.openClientPage(COACH_SESSION, clientId);

      // assert
      const page = await visibleDocument(response);
      const texts = textNodesOf(page);

      expect(response.status).toBe(200);
      expect(texts).toContain("Program");
      expect(texts).toContain("No program yet");
      expect(texts).toContain(
        "The program opens once her answers are approved.",
      );
      expect(texts).not.toContain("Build program");
    });

    it("offers Build program once her answers are approved", async () => {
      // arrange
      const clientId = await programs.approvedClient(ANA_CLIENT);

      // act
      const response = await programs.openClientPage(COACH_SESSION, clientId);

      // assert
      const page = await visibleDocument(response);
      const texts = textNodesOf(page);

      expect(response.status).toBe(200);
      expect(texts).toContain("No program yet");
      expect(texts).toContain("Build it from her profile.");
      expect(buildProgramLinkOf(page)).toContain(
        `href="${suite.path(programSetupPage(clientId))}"`,
      );
    });

    it("offers Build program to a cancelled client whose paid period still runs", async () => {
      // arrange
      const clientId = await programs.approvedClient(ANA_CLIENT);
      await scheduleHerCancellation();

      // act
      const response = await programs.openClientPage(COACH_SESSION, clientId);

      // assert
      const page = await visibleDocument(response);
      const texts = textNodesOf(page);

      expect(response.status).toBe(200);
      expect(texts).toContain("Cancelled");
      expect(texts).toContain("No program yet");
      expect(buildProgramLinkOf(page)).toBeDefined();
    });

    it("says her coaching has ended and offers nothing once her coaching has ended", async () => {
      // arrange
      const clientId = await programs.approvedClient(ANA_CLIENT);
      await endHerCoaching();

      // act
      const response = await programs.openClientPage(COACH_SESSION, clientId);

      // assert
      const page = await visibleDocument(response);
      const texts = textNodesOf(page);

      expect(response.status).toBe(200);
      expect(texts).toContain("No program");
      expect(texts).toContain("Her coaching has ended.");
      expect(texts).not.toContain("No program yet");
      expect(buildProgramLinkOf(page)).toBeUndefined();
    });

    it("says her coaching has ended once a cancelled client's paid period is over", async () => {
      // arrange
      const clientId = await programs.approvedClient(ANA_CLIENT);
      await scheduleHerCancellation();
      await rig.holdClock(AFTER_THE_PAID_PERIOD);

      // act
      const response = await programs.openClientPage(COACH_SESSION, clientId);

      // assert
      const page = await visibleDocument(response);
      const texts = textNodesOf(page);

      expect(response.status).toBe(200);
      expect(texts).toContain("No program");
      expect(texts).toContain("Her coaching has ended.");
      expect(buildProgramLinkOf(page)).toBeUndefined();
    });

    it("says her coaching has ended rather than waiting when her answers were never approved", async () => {
      // arrange
      const clientId = await programs.submittedClient(ANA_CLIENT);
      await endHerCoaching();

      // act
      const response = await programs.openClientPage(COACH_SESSION, clientId);

      // assert
      const texts = textNodesOf(await visibleDocument(response));

      expect(response.status).toBe(200);
      expect(texts).toContain("No program");
      expect(texts).toContain("Her coaching has ended.");
      expect(texts).not.toContain(
        "The program opens once her answers are approved.",
      );
    });

    it("shows the draft's blocks, its empty sessions and what is still missing", async () => {
      // arrange
      const clientId = await programs.approvedClient(ANA_CLIENT);
      await programs.start(clientId, PREFILLED_BEGINNER_SETUP);

      // act
      const response = await programs.openClientPage(COACH_SESSION, clientId);

      // assert
      const page = await visibleDocument(response);
      const texts = textNodesOf(page);

      expect(response.status).toBe(200);
      expect(texts).toContain("Version 1 · draft");
      expect(texts).toContain("Foundation · 4 wk");
      expect(texts).toContain("Hypertrophy · 6 wk");
      expect(texts).toContain("Deload · 1 wk");
      expect(texts.filter((text) => text === "0 of 3 sessions")).toHaveLength(
        3,
      );
      expect(texts).toContain("Still missing");
      expect(texts).toContain("9 sessions without exercises");
      expect(texts).not.toContain("No program yet");
      expect(buildProgramLinkOf(page)).toBeUndefined();
      expect(page).toContain(
        `href="${suite.path(programBuilderPage(clientId))}"`,
      );
      expect(texts).toContain("Continue draft");
    });

    it("shows the draft and says it can't be published once her coaching has ended", async () => {
      // arrange
      const clientId = await programs.approvedClient(ANA_CLIENT);
      await programs.start(clientId, PREFILLED_BEGINNER_SETUP);
      await endHerCoaching();

      // act
      const response = await programs.openClientPage(COACH_SESSION, clientId);

      // assert
      const texts = textNodesOf(await visibleDocument(response));

      expect(response.status).toBe(200);
      expect(texts).toContain("Version 1 · draft");
      expect(texts).toContain("Foundation · 4 wk");
      expect(texts).toContain(
        "Her coaching has ended, so this draft can’t be published.",
      );
      expect(texts).not.toContain("Still missing");
      expect(texts).not.toContain("9 sessions without exercises");
    });
  });

  describe("the builder page", () => {
    it("opens her draft on the plan overview with its blocks and her name on the draft line", async () => {
      // arrange
      const clientId = await programs.approvedClient(ANA_CLIENT);
      await programs.start(clientId, PREFILLED_BEGINNER_SETUP);

      // act
      const response = await programs.openBuilder(COACH_SESSION, clientId);

      // assert
      const page = await visibleDocument(response);
      const texts = textNodesOf(page);

      expect(response.status).toBe(200);
      expect(page).toContain("<title>Overview · Ana Popescu | Evoa</title>");
      expect(texts).toContain("Ana Popescu · v1 draft");
      expect(texts).toContain("Overview");
      expect(texts).toContain("Foundation");
      expect(texts).toContain("Hypertrophy");
      expect(texts).toContain("Deload");
      expect(texts).toContain("Add block");
    });

    it("says she has no program yet and offers the setup", async () => {
      // arrange
      const clientId = await programs.approvedClient(ANA_CLIENT);

      // act
      const response = await programs.openBuilder(COACH_SESSION, clientId);

      // assert
      const page = await visibleDocument(response);
      const texts = textNodesOf(page);

      expect(response.status).toBe(200);
      expect(texts).toContain("No program yet");
      expect(texts).toContain(
        "There is no draft to edit yet. Set up the program to start its first version.",
      );
      expect(texts).toContain("Set up program");
      expect(page).toContain(
        `href="${suite.path(programSetupPage(clientId))}"`,
      );
    });

    it("answers 404 for a client no one paid for and for an id that is not one", async () => {
      // arrange
      await programs.approvedClient(ANA_CLIENT);

      // act
      const unknown = await programs.openBuilder(
        COACH_SESSION,
        UNKNOWN_CLIENT_ID,
      );
      const malformed = await programs.openBuilder(COACH_SESSION, "client-1");

      // assert
      expect(unknown.status).toBe(404);
      expect(malformed.status).toBe(404);
    });
  });

  describe("saving her draft", () => {
    it("saves the changed draft as the coach sent it and answers the new marker, and her page shows it", async () => {
      // arrange
      const clientId = await programs.approvedClient(ANA_CLIENT);
      const createdAt = await holdClockAfter(rig.now());
      await programs.start(clientId, PREFILLED_BEGINNER_SETUP);
      const savedAt = await holdClockAfter(createdAt);

      // act
      const response = await programs.saveDraft(COACH_SESSION, clientId, {
        content: RESHAPED_PLAN,
        level: "beginner",
        language: "en",
        updatedAt: createdAt.toISOString(),
      });

      // assert
      const page = await programs.openClientPage(COACH_SESSION, clientId);
      const texts = textNodesOf(await visibleDocument(page));

      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({
        status: "saved",
        updatedAt: savedAt.toISOString(),
      });
      expect(await programs.draftRowsOf(clientId)).toEqual([
        { content: RESHAPED_PLAN, updatedAt: savedAt },
      ]);
      expect(texts).toContain("Foundation · 3 wk");
      expect(texts).toContain("Strength · 5 wk");
      expect(texts).not.toContain("Hypertrophy · 6 wk");
    });

    it("saves a change of level and language with the draft", async () => {
      // arrange
      const clientId = await programs.approvedClient(ANA_CLIENT);
      const createdAt = await holdClockAfter(rig.now());
      await programs.start(clientId, PREFILLED_BEGINNER_SETUP);
      await holdClockAfter(createdAt);

      // act
      const response = await programs.saveDraft(COACH_SESSION, clientId, {
        content: RESHAPED_PLAN,
        level: "advanced",
        language: "ro",
        updatedAt: createdAt.toISOString(),
      });

      // assert
      expect(response.status).toBe(200);
      expect(await programs.programRowsOf(clientId)).toEqual([
        expect.objectContaining({ level: "advanced", language: "ro" }),
      ]);
    });

    it("refuses a save from an older copy as changed elsewhere and keeps the newer draft", async () => {
      // arrange
      const clientId = await programs.approvedClient(ANA_CLIENT);
      const createdAt = await holdClockAfter(rig.now());
      await programs.start(clientId, PREFILLED_BEGINNER_SETUP);
      const savedAt = await holdClockAfter(createdAt);
      await expectSaved(
        programs.saveDraft(COACH_SESSION, clientId, {
          content: RESHAPED_PLAN,
          level: "beginner",
          language: "en",
          updatedAt: createdAt.toISOString(),
        }),
      );
      await holdClockAfter(savedAt);

      // act
      const response = await programs.saveDraft(COACH_SESSION, clientId, {
        content: reshapedPlan(block("block-9", "hypertrophy", 8)),
        level: "advanced",
        language: "ro",
        updatedAt: createdAt.toISOString(),
      });

      // assert
      expect(response.status).toBe(409);
      expect(await response.json()).toEqual({ error: "changed-elsewhere" });
      expect(await programs.draftRowsOf(clientId)).toEqual([
        { content: RESHAPED_PLAN, updatedAt: savedAt },
      ]);
      expect(await programs.programRowsOf(clientId)).toEqual([
        expect.objectContaining({ level: "beginner", language: "en" }),
      ]);
    });

    it("refuses a draft that is not well formed and keeps the stored one", async () => {
      // arrange
      const clientId = await programs.approvedClient(ANA_CLIENT);
      const createdAt = await holdClockAfter(rig.now());
      await programs.start(clientId, PREFILLED_BEGINNER_SETUP);
      const stored = await storedDraftOf(clientId);
      const save = (content: unknown) =>
        programs.saveDraft(COACH_SESSION, clientId, {
          content,
          level: "beginner",
          language: "en",
          updatedAt: createdAt.toISOString(),
        });

      // act
      const longDeload = await save(
        reshapedPlan(
          block("block-1", "foundation", 3),
          block("block-2", "deload", 2),
        ),
      );
      const noWeeks = await save(
        reshapedPlan(block("block-1", "foundation", 0)),
      );
      const unknownDay = await save(
        reshapedPlan({
          ...block("block-1", "foundation", 3),
          calendar: {
            ...EMPTY_WEEK,
            mon: { kind: "session", sessionId: "gone" },
          },
        }),
      );

      // assert
      expect(
        [longDeload, noWeeks, unknownDay].map((response) => response.status),
      ).toEqual([400, 400, 400]);
      expect(await programs.draftRowsOf(clientId)).toEqual([stored]);
    });

    it("answers that she has no program yet", async () => {
      // arrange
      const clientId = await programs.approvedClient(ANA_CLIENT);

      // act
      const response = await programs.saveDraft(COACH_SESSION, clientId, {
        content: RESHAPED_PLAN,
        level: "beginner",
        language: "en",
        updatedAt: rig.now().toISOString(),
      });

      // assert
      expect(response.status).toBe(404);
      expect(await response.json()).toEqual({ error: "no-program" });
    });

    it("answers 404 for a client no one paid for and for an id that is not one", async () => {
      // arrange
      const request = {
        content: RESHAPED_PLAN,
        level: "beginner",
        language: "en",
        updatedAt: rig.now().toISOString(),
      };

      // act
      const unknown = await programs.saveDraft(
        COACH_SESSION,
        UNKNOWN_CLIENT_ID,
        request,
      );
      const malformed = await programs.saveDraft(
        COACH_SESSION,
        "not-a-client",
        request,
      );

      // assert
      expect(unknown.status).toBe(404);
      expect(malformed.status).toBe(404);
    });
  });

  describe("filling a session", () => {
    it("saves a session filled from her library, details, warm-up and a switched-off cool-down included, and the builder opens it again after a reload", async () => {
      // arrange
      const clientId = await programs.approvedClient(ANA_CLIENT);
      await programs.start(clientId, PREFILLED_BEGINNER_SETUP);
      const content = planWithSession(await filledSession());
      const [draft] = await programs.draftRowsOf(clientId);

      // act
      const response = await programs.saveDraft(COACH_SESSION, clientId, {
        content,
        level: "beginner",
        language: "en",
        updatedAt: draft?.updatedAt.toISOString(),
      });

      // assert
      const reload = await programs.openBuilder(COACH_SESSION, clientId);

      expect(response.status).toBe(200);
      expect(await programs.draftRowsOf(clientId)).toEqual([
        { content, updatedAt: expect.any(Date) },
      ]);
      expect(reload.status).toBe(200);
      expect(textNodesOf(await visibleDocument(reload))).toContain(
        "Foundation",
      );
    });

    it("counts the filled session on the Program card of her page", async () => {
      // arrange
      const clientId = await programs.approvedClient(ANA_CLIENT);
      await programs.start(clientId, PREFILLED_BEGINNER_SETUP);
      await programs.saveOverStoredDraft(
        clientId,
        planWithSession(await filledSession()),
      );

      // act
      const response = await programs.openClientPage(COACH_SESSION, clientId);

      // assert
      const texts = textNodesOf(await visibleDocument(response));

      expect(response.status).toBe(200);
      expect(texts).toContain("Foundation · 3 wk");
      expect(texts).toContain("1 of 2 sessions");
      expect(texts).toContain("Still missing");
      expect(texts).toContain("1 session without exercises");
    });

    it("refuses a session naming another coach's exercise or an unknown one as not well formed and keeps the stored draft", async () => {
      // arrange
      const clientId = await programs.approvedClient(ANA_CLIENT);
      await programs.start(clientId, PREFILLED_BEGINNER_SETUP);
      const stored = await storedDraftOf(clientId);
      const squat = await library.createAccepted(COACH_SESSION, BACK_SQUAT);
      await rig.provisionOtherCoach();
      const othersSquat = await library.createAccepted(
        OTHER_COACH_SESSION,
        GOBLET_SQUAT,
      );
      const save = (session: Parameters<typeof planWithSession>[0]) =>
        programs.saveDraft(COACH_SESSION, clientId, {
          content: planWithSession(session),
          level: "beginner",
          language: "en",
          updatedAt: stored.updatedAt.toISOString(),
        });

      // act
      const othersExercise = await save({
        rows: [exerciseRow("row-1", othersSquat.id, { slot: "A" })],
      });
      const unknownSubstitution = await save({
        rows: [
          exerciseRow("row-1", squat.id, {
            slot: "A",
            substitutions: [UNKNOWN_EXERCISE_ID],
          }),
        ],
      });

      // assert
      expect(othersExercise.status).toBe(400);
      expect(unknownSubstitution.status).toBe(400);
      expect(await programs.draftRowsOf(clientId)).toEqual([stored]);
    });
  });

  describe("access", () => {
    it("keeps a signed-in client out of the setup page", async () => {
      // arrange
      const clientId = await programs.approvedClient(ANA_CLIENT);
      await rig.provisionClient();

      // act
      const response = await programs.openSetup(CLIENT_SESSION, clientId);

      // assert
      expect(response.status).toBe(403);
    });

    it("refuses a signed-in client's create and creates nothing", async () => {
      // arrange
      const clientId = await programs.approvedClient(ANA_CLIENT);
      await rig.provisionClient();

      // act
      const response = await programs.create(
        CLIENT_SESSION,
        clientId,
        PREFILLED_BEGINNER_SETUP,
      );

      // assert
      expect(response.status).toBe(403);
      expect(await programs.programRowsOf(clientId)).toEqual([]);
    });

    it("keeps a signed-in client out of the client's page and its Program card", async () => {
      // arrange
      const clientId = await programs.approvedClient(ANA_CLIENT);
      await rig.provisionClient();

      // act
      const response = await programs.openClientPage(CLIENT_SESSION, clientId);

      // assert
      expect(response.status).toBe(403);
    });

    it("sends a signed-out visitor from the setup page to sign in", async () => {
      // arrange
      const clientId = await programs.approvedClient(ANA_CLIENT);

      // act
      const response = await programs.openSetup(SIGNED_OUT, clientId);

      // assert
      expect(response.status).toBe(302);
      expect(response.headers.get("location")).toContain("/sign-in");
    });

    it("refuses a signed-out visitor's create and creates nothing", async () => {
      // arrange
      const clientId = await programs.approvedClient(ANA_CLIENT);

      // act
      const response = await programs.create(
        SIGNED_OUT,
        clientId,
        PREFILLED_BEGINNER_SETUP,
      );

      // assert
      expect(response.status).toBe(302);
      expect(response.headers.get("location")).toContain("/sign-in");
      expect(await programs.programRowsOf(clientId)).toEqual([]);
    });

    it("refuses a signed-in client's draft save and saves nothing", async () => {
      // arrange
      const clientId = await programs.approvedClient(ANA_CLIENT);
      await programs.start(clientId, PREFILLED_BEGINNER_SETUP);
      const stored = await storedDraftOf(clientId);
      await rig.provisionClient();

      // act
      const response = await programs.saveDraft(CLIENT_SESSION, clientId, {
        content: RESHAPED_PLAN,
        level: "beginner",
        language: "en",
        updatedAt: stored.updatedAt.toISOString(),
      });

      // assert
      expect(response.status).toBe(403);
      expect(await programs.draftRowsOf(clientId)).toEqual([stored]);
    });

    it("sends a signed-out visitor's draft save to sign in and saves nothing", async () => {
      // arrange
      const clientId = await programs.approvedClient(ANA_CLIENT);
      await programs.start(clientId, PREFILLED_BEGINNER_SETUP);
      const stored = await storedDraftOf(clientId);

      // act
      const response = await programs.saveDraft(SIGNED_OUT, clientId, {
        content: RESHAPED_PLAN,
        level: "beginner",
        language: "en",
        updatedAt: stored.updatedAt.toISOString(),
      });

      // assert
      expect(response.status).toBe(302);
      expect(response.headers.get("location")).toContain("/sign-in");
      expect(await programs.draftRowsOf(clientId)).toEqual([stored]);
    });

    it("keeps a signed-in client out of the builder", async () => {
      // arrange
      const clientId = await programs.approvedClient(ANA_CLIENT);
      await programs.start(clientId, PREFILLED_BEGINNER_SETUP);
      await rig.provisionClient();

      // act
      const response = await programs.openBuilder(CLIENT_SESSION, clientId);

      // assert
      expect(response.status).toBe(403);
    });

    it("sends a signed-out visitor from the builder to sign in", async () => {
      // arrange
      const clientId = await programs.approvedClient(ANA_CLIENT);
      await programs.start(clientId, PREFILLED_BEGINNER_SETUP);

      // act
      const response = await programs.openBuilder(SIGNED_OUT, clientId);

      // assert
      expect(response.status).toBe(302);
      expect(response.headers.get("location")).toContain("/sign-in");
    });

    it("sends a signed-out visitor from the client's page to sign in", async () => {
      // arrange
      const clientId = await programs.approvedClient(ANA_CLIENT);

      // act
      const response = await programs.openClientPage(SIGNED_OUT, clientId);

      // assert
      expect(response.status).toBe(302);
      expect(response.headers.get("location")).toContain("/sign-in");
    });
  });
});

async function filledSession() {
  const squat = await library.createAccepted(COACH_SESSION, BACK_SQUAT);
  const goblet = await library.createAccepted(COACH_SESSION, GOBLET_SQUAT);
  const splitSquat = await library.createAccepted(COACH_SESSION, SPLIT_SQUAT);
  const dumbbellRow = await library.createAccepted(COACH_SESSION, DUMBBELL_ROW);
  const hipCircles = await library.createAccepted(COACH_SESSION, HIP_CIRCLES);
  const pigeon = await library.createAccepted(COACH_SESSION, PIGEON_STRETCH);

  return {
    rows: [
      exerciseRow("row-1", squat.id, {
        slot: "A",
        tempo: "3-1-1-0",
        substitutions: [goblet.id],
        cues: "Drive through the whole foot.",
        touched: ["tempo"],
      }),
      exerciseRow("row-2", splitSquat.id, { supersetGroup: "superset-1" }),
      exerciseRow("row-3", dumbbellRow.id, { supersetGroup: "superset-1" }),
    ],
    warmUp: [
      { id: "warm-up-1", exerciseId: hipCircles.id, sets: 1, seconds: 45 },
    ],
    coolDown: {
      enabled: false,
      items: [{ id: "cool-down-1", exerciseId: pigeon.id, seconds: 30 }],
    },
  };
}

function submissionAnswering(
  goalAndWeek: Record<string, unknown>,
): OnboardingSubmission {
  const submission = regularSubmission();

  return {
    ...submission,
    answers: {
      ...submission.answers,
      "goal-availability": {
        ...submission.answers["goal-availability"],
        ...goalAndWeek,
      },
    },
  };
}

async function endHerCoaching(): Promise<void> {
  const response = await lifecycle.deliverEvent({
    id: "evt_programs_coaching_ended",
    type: "customer.subscription.deleted",
    object: stripeSubscriptionObject({
      status: "canceled",
      ended_at: toUnixSeconds(rig.now()),
    }),
  });

  if (response.status !== 200) {
    throw new Error(`Ending her coaching answered ${response.status}.`);
  }
}

async function storedDraftOf(clientId: string): Promise<DraftRow> {
  const [draft] = await programs.draftRowsOf(clientId);

  if (!draft) {
    throw new Error("Her program holds no draft.");
  }

  return draft;
}

async function holdClockAfter(instant: Date): Promise<Date> {
  const later = new Date(instant.getTime() + 60_000);
  await rig.holdClock(later);

  return later;
}

async function expectSaved(saving: Promise<Response>): Promise<void> {
  const response = await saving;

  if (response.status !== 200) {
    throw new Error(`Saving her draft answered ${response.status}.`);
  }
}

async function scheduleHerCancellation(): Promise<void> {
  const response = await lifecycle.deliverEvent({
    id: "evt_programs_cancellation_scheduled",
    type: "customer.subscription.updated",
    object: stripeSubscriptionObject({
      cancel_at: toUnixSeconds(PAID_THROUGH),
    }),
    previousAttributes: { cancel_at: null },
  });

  if (response.status !== 200) {
    throw new Error(`Scheduling her cancellation answered ${response.status}.`);
  }
}

async function waitForAWriteBlockedOnTheOpenTransaction(): Promise<void> {
  await expect
    .poll(async () =>
      suite.postgres.countRows({
        tableName: "pg_locks",
        values: [],
        whereClause: "not granted",
      }),
    )
    .toBeGreaterThan(0);
}

function setupCarriedBy(block: StoredBlock) {
  return {
    splitShape: block.split.shape,
    trainingDays: block.trainingDays,
    sessionMinutes: block.targetMinutes,
    dailySteps: block.dailySteps,
  };
}

function sessionNamesOf(block: StoredBlock): string[] {
  return block.sessions.map((session) => session.name);
}

function exerciseRowsOf(block: StoredBlock): unknown[] {
  return block.sessions.flatMap((session) => session.rows);
}

function cardioSessionCountOf(block: StoredBlock): number {
  return block.cardioSessions.length;
}

function cardioExercisesOf(block: StoredBlock): string[] {
  return block.cardioSessions.flatMap((cardio) =>
    cardio.segments.map((segment) => segment.exerciseId),
  );
}

function buildProgramLinkOf(page: string): string | undefined {
  return /<a[^>]*>Build program<\/a>/.exec(page)?.[0];
}

function checkedChoicesOf(page: string): string[] {
  return [
    ...page.matchAll(/<button[^>]*aria-checked="true"[^>]*>([^<]*)</g),
  ].map(([, label = ""]) => label);
}

function checkedEquipmentOf(page: string): string[] {
  return [...page.matchAll(/<input[^>]*type="checkbox"[^>]*>/g)]
    .map(([input]) => input)
    .filter((input) => input.includes('checked=""'))
    .map((input) => /aria-label="([^"]*)"/.exec(input)?.[1] ?? "");
}
