import { expect, test } from "../support/fixtures";
import type { SavedExercise } from "../support/exercise-editor-page";
import type { ExerciseFields } from "../support/exercise-requests";
import { setPhoneViewport } from "../support/viewport";

const UNKNOWN_EXERCISE_ID = "9e8d7c6b-5a49-4382-9716-a5b4c3d2e1f0";
const NOT_AN_EXERCISE_ID = "not-an-exercise";

function hipThrustNamed(name: string): ExerciseFields {
  return {
    name,
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
}

test(
  "the coach reaches her exercise library from the menu, creates an exercise, finds it listed and edits it",
  { tag: "@critical" },
  async ({
    coachDashboard,
    exerciseEditor,
    exerciseLibrary,
    page,
    provisionCoach,
    scenarioTag,
    signInAsCoach,
  }) => {
    // arrange
    const created: SavedExercise = {
      name: `Glute bridge ${scenarioTag}`,
      type: "Resistance",
      unit: "Time",
      sides: "One side at a time",
      primaryMuscles: ["Glutes"],
      secondaryMuscles: ["Hamstrings", "Core"],
      equipment: ["Mat"],
      difficulty: "Beginner",
      tags: ["Strength"],
      cues: "Squeeze at the top and hold.",
    };
    const edited: SavedExercise = {
      ...created,
      name: `Weighted glute bridge ${scenarioTag}`,
      equipment: ["Mat", "Barbell"],
      difficulty: "Intermediate",
      tags: ["Strength", "Hypertrophy"],
    };
    await provisionCoach();
    await page.goto("/store");
    await signInAsCoach();
    await coachDashboard.open();

    // act
    await exerciseLibrary.openFromNavigation();

    // assert
    await exerciseLibrary.expectTrainingRightAfterDashboard();

    // act
    await exerciseLibrary.startNewExercise();

    // assert
    await exerciseEditor.expectNewExercise();

    // act
    await exerciseEditor.enter({
      name: created.name,
      unit: created.unit,
      sides: created.sides,
      primaryMuscles: created.primaryMuscles,
      secondaryMuscles: created.secondaryMuscles,
      equipment: created.equipment,
      toggledTags: created.tags,
      cues: created.cues,
    });
    await exerciseEditor.create();

    // assert
    await exerciseLibrary.expectOpen();
    await exerciseLibrary.expectConfirmation("Exercise created");
    await exerciseLibrary.expectListed({
      name: created.name,
      summary: "Resistance · Mat",
      tags: created.tags,
      primaryMuscles: created.primaryMuscles,
      difficulty: created.difficulty,
    });

    // act
    await exerciseLibrary.edit(created.name);

    // assert
    await exerciseEditor.expectEditing(created);

    // act
    await exerciseEditor.enter({
      name: edited.name,
      equipment: ["Barbell"],
      difficulty: edited.difficulty,
      toggledTags: ["Hypertrophy"],
    });
    await exerciseEditor.saveChanges();

    // assert
    await exerciseLibrary.expectOpen();
    await exerciseLibrary.expectConfirmation("Exercise updated");
    await exerciseLibrary.expectListed({
      name: edited.name,
      summary: "Resistance · Mat, Barbell",
      tags: edited.tags,
      primaryMuscles: edited.primaryMuscles,
      difficulty: edited.difficulty,
    });
    await exerciseLibrary.expectNotListed(created.name);

    // act
    await exerciseLibrary.edit(edited.name);

    // assert
    await exerciseEditor.expectEditing(edited);
  },
);

test(
  "the editor shows each problem under its field, announced with the field, and creates nothing until they clear",
  { tag: "@completeness" },
  async ({
    coachDashboard,
    exerciseEditor,
    exerciseRequests,
    page,
    provisionCoach,
    scenarioTag,
    signInAsCoach,
  }) => {
    // arrange
    const takenName = `Hip thrust ${scenarioTag}`;
    await provisionCoach();
    await page.goto("/store");
    await signInAsCoach();
    await coachDashboard.open();
    await exerciseRequests.createAccepted(hipThrustNamed(takenName));

    // act
    await exerciseEditor.openNew();

    // assert
    await exerciseEditor.expectNewExercise();

    // act
    await exerciseEditor.enter({ name: `Lunge ${scenarioTag}` });

    // assert
    await exerciseEditor.expectOnlyProblem(
      "Primary muscles",
      "Pick at least one primary muscle",
    );

    // act
    await exerciseEditor.enter({ type: "Cardio" });

    // assert
    await exerciseEditor.expectNoProblems();
    await exerciseEditor.expectCreateAvailable();

    // act
    await exerciseEditor.enter({ type: "Resistance" });

    // assert
    await exerciseEditor.expectOnlyProblem(
      "Primary muscles",
      "Pick at least one primary muscle",
    );

    // act
    await exerciseEditor.enter({ primaryMuscles: ["Quadriceps"] });

    // assert
    await exerciseEditor.expectNoProblems();
    await exerciseEditor.expectCreateAvailable();

    // act
    await exerciseEditor.enter({ name: "   " });

    // assert
    await exerciseEditor.expectOnlyProblem("Name", "Give the exercise a name");

    // act
    await exerciseEditor.enter({ name: "n".repeat(81) });

    // assert
    await exerciseEditor.expectOnlyProblem(
      "Name",
      "Keep the name to 80 characters",
    );

    // act
    await exerciseEditor.enter({ name: `  ${"n".repeat(80)}  ` });

    // assert
    await exerciseEditor.expectNoProblems();

    // act
    await exerciseEditor.enter({ name: `  ${takenName.toUpperCase()} ` });

    // assert
    await exerciseEditor.expectOnlyProblem(
      "Name",
      "An exercise with this name already exists",
    );

    // act
    await exerciseEditor.enter({
      name: `Lunge ${scenarioTag}`,
      cues: "c".repeat(1_001),
    });

    // assert
    await exerciseEditor.expectOnlyProblem(
      "Form cues",
      "Keep the form cues to 1,000 characters",
    );

    // act
    await exerciseEditor.enter({ cues: "c".repeat(1_000) });

    // assert
    await exerciseEditor.expectNoProblems();
    await exerciseEditor.expectCreateAvailable();
  },
);

test(
  "a name taken while the editor is open is shown on the name field and her entries stay",
  { tag: "@completeness" },
  async ({
    coachDashboard,
    exerciseEditor,
    exerciseLibrary,
    exerciseRequests,
    page,
    provisionCoach,
    scenarioTag,
    signInAsCoach,
  }) => {
    // arrange
    const entered: SavedExercise = {
      name: `Bulgarian split squat ${scenarioTag}`,
      type: "Resistance",
      unit: "Reps",
      sides: "One side at a time",
      primaryMuscles: ["Quadriceps", "Glutes"],
      secondaryMuscles: ["Adductors"],
      equipment: ["Dumbbells", "Bench"],
      difficulty: "Advanced",
      tags: ["Strength"],
      cues: "Front shin stays vertical.",
    };
    await provisionCoach();
    await page.goto("/store");
    await signInAsCoach();
    await coachDashboard.open();
    await exerciseEditor.openNew();
    await exerciseEditor.enter({
      name: entered.name,
      sides: entered.sides,
      primaryMuscles: entered.primaryMuscles,
      secondaryMuscles: entered.secondaryMuscles,
      equipment: entered.equipment,
      difficulty: entered.difficulty,
      toggledTags: entered.tags,
      cues: entered.cues,
    });
    await exerciseRequests.createAccepted(
      hipThrustNamed(` ${entered.name.toLowerCase()}`),
    );

    // act
    await exerciseEditor.create();

    // assert
    await exerciseEditor.expectOnlyProblem(
      "Name",
      "An exercise with this name already exists",
    );
    await exerciseEditor.expectFocusOn("Name");
    await exerciseEditor.expectStillNew();
    await exerciseEditor.expectEntries(entered);

    // act
    await exerciseEditor.enter({ name: `${entered.name} (heavy)` });
    await exerciseEditor.create();

    // assert
    await exerciseLibrary.expectOpen();
    await exerciseLibrary.expectConfirmation("Exercise created");
    await exerciseLibrary.expectListed({
      name: `${entered.name} (heavy)`,
      summary: "Resistance · Dumbbells, Bench",
      tags: entered.tags,
      primaryMuscles: entered.primaryMuscles,
      difficulty: entered.difficulty,
    });
  },
);

test(
  "the unit offers only what the type allows, keeps a unit she picked and otherwise follows the type's default",
  { tag: "@completeness" },
  async ({
    coachDashboard,
    exerciseEditor,
    exerciseLibrary,
    exerciseRequests,
    page,
    provisionCoach,
    scenarioTag,
    signInAsCoach,
  }) => {
    // arrange
    const pickedTime = `Wall sit ${scenarioTag}`;
    const defaultReps = `Squat ${scenarioTag}`;
    await provisionCoach();
    await page.goto("/store");
    await signInAsCoach();
    await coachDashboard.open();
    await exerciseRequests.createAccepted({
      ...hipThrustNamed(pickedTime),
      unit: "time",
    });
    await exerciseRequests.createAccepted(hipThrustNamed(defaultReps));
    await exerciseEditor.openNew();

    for (const [type, units] of [
      ["Resistance", ["Reps", "Time", "Distance"]],
      ["Cardio", ["Time", "Distance"]],
      ["Mobility", ["Time", "Reps"]],
      ["Stretching", ["Time"]],
      ["Breathing", ["Breaths", "Time"]],
    ] as const) {
      // act
      await exerciseEditor.enter({ type });

      // assert
      await exerciseEditor.expectUnit(units[0]);
      await exerciseEditor.expectUnitChoices(units);
    }

    // act
    await exerciseEditor.enter({ type: "Resistance" });
    await exerciseEditor.enter({ type: "Mobility" });

    // assert
    await exerciseEditor.expectUnit("Time");

    // act
    await exerciseEditor.enter({ type: "Resistance" });

    // assert
    await exerciseEditor.expectUnit("Reps");

    // act
    await exerciseEditor.enter({ unit: "Time" });
    await exerciseEditor.enter({ type: "Cardio" });

    // assert
    await exerciseEditor.expectUnit("Time");

    // act
    await exerciseEditor.enter({ type: "Breathing" });

    // assert
    await exerciseEditor.expectUnit("Time");

    // act
    await exerciseEditor.enter({ type: "Cardio", unit: "Distance" });
    await exerciseEditor.enter({ type: "Mobility" });

    // assert
    await exerciseEditor.expectUnit("Time");

    // act
    await exerciseLibrary.open();
    await exerciseLibrary.edit(pickedTime);
    await exerciseEditor.enter({ type: "Breathing" });

    // assert
    await exerciseEditor.expectUnit("Time");

    // act
    await exerciseLibrary.open();
    await exerciseLibrary.edit(defaultReps);
    await exerciseEditor.enter({ type: "Mobility" });

    // assert
    await exerciseEditor.expectUnit("Time");
  },
);

test(
  "a muscle made primary leaves the secondary muscles, which offer only muscles that aren't primary",
  { tag: "@completeness" },
  async ({
    coachDashboard,
    exerciseEditor,
    page,
    provisionCoach,
    signInAsCoach,
  }) => {
    // arrange
    await provisionCoach();
    await page.goto("/store");
    await signInAsCoach();
    await coachDashboard.open();
    await exerciseEditor.openNew();
    await exerciseEditor.enter({
      primaryMuscles: ["Glutes"],
      secondaryMuscles: ["Hamstrings", "Core"],
    });

    // assert
    await exerciseEditor.expectSecondaryChoicesWithout(["Glutes"]);

    // act
    await exerciseEditor.enter({ primaryMuscles: ["Hamstrings"] });

    // assert
    await exerciseEditor.expectEntries({
      name: "",
      type: "Resistance",
      unit: "Reps",
      sides: "Both sides together",
      primaryMuscles: ["Glutes", "Hamstrings"],
      secondaryMuscles: ["Core"],
      equipment: [],
      difficulty: "Beginner",
      tags: [],
      cues: "",
    });
    await exerciseEditor.expectSecondaryChoicesWithout([
      "Glutes",
      "Hamstrings",
    ]);
  },
);

test(
  "the coach creates an exercise by keyboard alone and finds it listed A to Z",
  { tag: "@completeness" },
  async ({
    coachDashboard,
    exerciseEditor,
    exerciseLibrary,
    exerciseRequests,
    page,
    provisionCoach,
    scenarioTag,
    signInAsCoach,
  }) => {
    // arrange
    const later = `Calf raise ${scenarioTag}`;
    const created: SavedExercise = {
      name: `ab wheel ${scenarioTag}`,
      type: "Mobility",
      unit: "Reps",
      sides: "One side at a time",
      primaryMuscles: ["Core"],
      secondaryMuscles: ["Lats"],
      equipment: ["Mat"],
      difficulty: "Intermediate",
      tags: ["Strength", "Recovery"],
      cues: "Ribs down, roll out slowly.",
    };
    await provisionCoach();
    await page.goto("/store");
    await signInAsCoach();
    await coachDashboard.open();
    await exerciseRequests.createAccepted(hipThrustNamed(later));
    await exerciseLibrary.open();

    // act
    await exerciseLibrary.startNewExerciseWithKeyboard();

    // assert
    await exerciseEditor.expectNewExercise();

    // act
    await exerciseEditor.createWithKeyboard(created);

    // assert
    await exerciseLibrary.expectOpen();
    await exerciseLibrary.expectConfirmation("Exercise created");
    await exerciseLibrary.expectListed({
      name: created.name,
      summary: "Mobility · Mat",
      tags: created.tags,
      primaryMuscles: created.primaryMuscles,
      difficulty: created.difficulty,
    });
    await exerciseLibrary.expectListedInOrder([created.name, later]);
  },
);

test(
  "Training sits right after Dashboard in the coach's phone menu and opens the library",
  { tag: "@completeness" },
  async ({
    coachDashboard,
    exerciseLibrary,
    page,
    provisionCoach,
    signInAsCoach,
  }) => {
    // arrange
    await provisionCoach();
    await page.goto("/store");
    await signInAsCoach();
    await coachDashboard.open();
    await setPhoneViewport(page);

    // act
    await exerciseLibrary.openPhoneMenu();

    // assert
    await exerciseLibrary.expectPhoneMenuTrainingRightAfterDashboard();

    // act
    await exerciseLibrary.openFromPhoneMenu();

    // assert
    await exerciseLibrary.expectOpen();
  },
);

test(
  "an unknown exercise returns the coach to the library",
  { tag: "@completeness" },
  async ({
    coachDashboard,
    exerciseEditor,
    exerciseLibrary,
    page,
    provisionCoach,
    signInAsCoach,
  }) => {
    // arrange
    await provisionCoach();
    await page.goto("/store");
    await signInAsCoach();
    await coachDashboard.open();

    for (const exerciseId of [UNKNOWN_EXERCISE_ID, NOT_AN_EXERCISE_ID]) {
      // act
      await exerciseEditor.open(exerciseId);

      // assert
      await exerciseLibrary.expectOpen();
    }
  },
);

test(
  "Cancel and the back link return to the library without saving",
  { tag: "@completeness" },
  async ({
    coachDashboard,
    exerciseEditor,
    exerciseLibrary,
    exerciseRequests,
    page,
    provisionCoach,
    scenarioTag,
    signInAsCoach,
  }) => {
    // arrange
    const saved = `Step up ${scenarioTag}`;
    const discarded = `Box step up ${scenarioTag}`;
    await provisionCoach();
    await page.goto("/store");
    await signInAsCoach();
    await coachDashboard.open();
    await exerciseRequests.createAccepted(hipThrustNamed(saved));
    await exerciseLibrary.open();
    await exerciseLibrary.edit(saved);
    await exerciseEditor.enter({ name: discarded, difficulty: "Advanced" });

    // act
    await exerciseEditor.cancel();

    // assert
    await exerciseLibrary.expectOpen();
    await exerciseLibrary.expectNotListed(discarded);

    // act
    await exerciseLibrary.edit(saved);
    await exerciseEditor.enter({ name: discarded, difficulty: "Advanced" });
    await exerciseEditor.goBack();

    // assert
    await exerciseLibrary.expectOpen();
    await exerciseLibrary.expectNotListed(discarded);
    await exerciseLibrary.expectListed({
      name: saved,
      summary: "Resistance · Barbell, Bench",
      tags: ["Hypertrophy"],
      primaryMuscles: ["Glutes"],
      difficulty: "Beginner",
    });

    // act
    await exerciseLibrary.startNewExercise();
    await exerciseEditor.enter({ name: discarded, primaryMuscles: ["Glutes"] });
    await exerciseEditor.cancel();

    // assert
    await exerciseLibrary.expectOpen();
    await exerciseLibrary.expectNotListed(discarded);
  },
);

test(
  "a signed-out visitor and a signed-in client are refused the library, the editor and every exercise endpoint",
  { tag: "@completeness" },
  async ({
    accountPortal,
    coachDashboard,
    exerciseEditor,
    exerciseLibrary,
    exerciseRequests,
    page,
    provisionAccount,
    provisionCoach,
    publicNav,
    scenarioTag,
    signIn,
    signInAsCoach,
    visitorExerciseRequests,
  }) => {
    // arrange
    const kept = hipThrustNamed(`Good morning ${scenarioTag}`);
    await provisionCoach();
    await provisionAccount("CLIENT");
    await page.goto("/store");
    await signInAsCoach();
    await coachDashboard.open();
    await exerciseRequests.createAccepted(kept);
    await exerciseLibrary.open();
    await exerciseLibrary.edit(kept.name);
    const exerciseId = await exerciseEditor.exerciseId();
    await page.goto("/");
    await publicNav.signOut();

    // act
    const visitorStatuses = [
      (
        await visitorExerciseRequests.create(
          hipThrustNamed(`Visitor ${scenarioTag}`),
        )
      ).status,
      (
        await visitorExerciseRequests.edit(
          exerciseId,
          hipThrustNamed("Visitor"),
        )
      ).status,
    ];

    // assert
    expect(visitorStatuses).toEqual([401, 401]);

    for (const open of [
      () => exerciseLibrary.open(),
      () => exerciseEditor.openNew(),
      () => exerciseEditor.open(exerciseId),
    ]) {
      // act
      await open();

      // assert
      await accountPortal.expectEmailStepVisible();
    }

    // arrange
    await page.goto("/store");
    await signIn();

    for (const open of [
      () => exerciseLibrary.open(),
      () => exerciseEditor.openNew(),
      () => exerciseEditor.open(exerciseId),
    ]) {
      // act
      await open();

      // assert
      await exerciseLibrary.expectRefused();
    }

    // act
    const clientStatuses = [
      (await exerciseRequests.create(hipThrustNamed(`Client ${scenarioTag}`)))
        .status,
      (await exerciseRequests.edit(exerciseId, hipThrustNamed("Client")))
        .status,
    ];

    // assert
    expect(clientStatuses).toEqual([403, 403]);
  },
);
