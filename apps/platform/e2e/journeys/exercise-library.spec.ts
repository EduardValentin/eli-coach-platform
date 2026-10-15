import { LANDSCAPE_SAMPLE_VIDEO_PATH } from "@eli-coach-platform/test-support/sample-videos";

import { expect, test } from "../support/fixtures";
import type { SavedExercise } from "../support/exercise-editor-page";
import type { ExerciseFields } from "../support/exercise-requests";
import { storedExerciseVideoIds } from "../support/exercise-video-files";
import { resolveRunId } from "../support/run-id";
import { setPhoneViewport } from "../support/viewport";

const UNKNOWN_EXERCISE_ID = "9e8d7c6b-5a49-4382-9716-a5b4c3d2e1f0";
const NOT_AN_EXERCISE_ID = "not-an-exercise";
const NOT_A_VIDEO_REFUSAL =
  "squat-notes.txt is not an .mp4 or .mov — only .mp4 and .mov videos are supported";
const OVER_THE_CAP_REFUSAL = "deadlift-demo.mp4 is larger than 50 MB";
const NO_VIDEO_INSIDE_REFUSAL =
  "squat-demo.mp4 doesn’t contain an MP4 or MOV video.";
const SEEK_TO_SECONDS = 1.2;

function videoIdOf(videoPath: string): string {
  const videoId = videoPath.split("/").pop();

  if (!videoId) throw new Error(`${videoPath} names no video.`);

  return videoId;
}

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
  "the coach reaches her exercise library from the menu, creates an exercise with a demo video, finds it listed, plays the video and edits it",
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
    await exerciseEditor.attachVideo(LANDSCAPE_SAMPLE_VIDEO_PATH);

    // assert
    await exerciseEditor.expectVideoPreview();

    // act
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
      video: "Attached",
    });

    // act
    const servedStatus = exerciseEditor.servedVideoStatus();
    await exerciseLibrary.edit(created.name);

    // assert
    await exerciseEditor.expectEditing(created);
    await exerciseEditor.expectServedVideo();
    expect(await servedStatus).toBe(206);

    // act
    await exerciseEditor.playVideo();

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
      video: "Attached",
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

test(
  "the demo video field takes a video by drop or browse and refuses a non-video or one over 50 MB on the spot, keeping what was there",
  { tag: "@completeness" },
  async ({
    coachDashboard,
    exerciseEditor,
    exerciseVideoSamples,
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

    // assert
    await exerciseEditor.expectVideoGuidance();
    await exerciseEditor.expectNoVideo();

    // act
    await exerciseEditor.chooseVideo(exerciseVideoSamples.notAVideo());

    // assert
    await exerciseEditor.expectVideoRefused(NOT_A_VIDEO_REFUSAL);
    await exerciseEditor.expectNoVideo();

    // act
    await exerciseEditor.chooseVideo(exerciseVideoSamples.overTheCap());

    // assert
    await exerciseEditor.expectVideoRefused(OVER_THE_CAP_REFUSAL);
    await exerciseEditor.expectNoVideo();

    // act
    await exerciseEditor.dropVideo(exerciseVideoSamples.notAVideo());

    // assert
    await exerciseEditor.expectVideoRefused(NOT_A_VIDEO_REFUSAL);
    await exerciseEditor.expectNoVideo();

    // act
    await exerciseEditor.dropVideo(exerciseVideoSamples.landscape);

    // assert
    await exerciseEditor.expectChosenVideoPreview();
    await exerciseEditor.expectNoVideoProblem();

    // act
    await exerciseEditor.replaceVideo(exerciseVideoSamples.notAVideo());

    // assert
    await exerciseEditor.expectVideoRefused(NOT_A_VIDEO_REFUSAL);
    await exerciseEditor.expectChosenVideoPreview();

    // act
    await exerciseEditor.replaceVideo(exerciseVideoSamples.overTheCap());

    // assert
    await exerciseEditor.expectVideoRefused(OVER_THE_CAP_REFUSAL);
    await exerciseEditor.expectChosenVideoPreview();

    // act
    await exerciseEditor.replaceVideo(exerciseVideoSamples.portrait);

    // assert
    await exerciseEditor.expectChosenVideoPreview();
    await exerciseEditor.expectNoVideoProblem();

    // act
    await exerciseEditor.removeVideo();

    // assert
    await exerciseEditor.expectNoVideo();
    await exerciseEditor.expectNoVideoProblem();
  },
);

test(
  "Cancel and the back link discard a chosen, replaced or removed video",
  { tag: "@completeness" },
  async ({
    coachDashboard,
    exerciseEditor,
    exerciseLibrary,
    exerciseRequests,
    exerciseVideoSamples,
    page,
    provisionCoach,
    signInAsCoach,
  }) => {
    // arrange
    const runId = resolveRunId();
    const saved = hipThrustNamed(`Kickback ${runId}`);
    const discarded = `Cable kickback ${runId}`;
    await provisionCoach();
    await page.goto("/store");
    await signInAsCoach();
    await coachDashboard.open();
    await exerciseRequests.createWithVideo(
      saved,
      exerciseVideoSamples.landscape,
    );
    await exerciseLibrary.open();
    await exerciseLibrary.edit(saved.name);
    const savedVideo = await exerciseEditor.servedVideoPath();
    await exerciseEditor.replaceVideo(exerciseVideoSamples.portrait);
    await exerciseEditor.expectChosenVideoPreview();

    // act
    await exerciseEditor.cancel();
    await exerciseLibrary.edit(saved.name);

    // assert
    expect(await exerciseEditor.servedVideoPath()).toBe(savedVideo);

    // act
    await exerciseEditor.removeVideo();
    await exerciseEditor.expectNoVideo();
    await exerciseEditor.goBack();

    // assert
    await exerciseLibrary.expectOpen();
    await exerciseLibrary.expectListed({
      name: saved.name,
      summary: "Resistance · Barbell, Bench",
      tags: saved.tags,
      primaryMuscles: saved.primaryMuscles,
      difficulty: saved.difficulty,
      video: "Attached",
    });

    // act
    await exerciseLibrary.edit(saved.name);

    // assert
    expect(await exerciseEditor.servedVideoPath()).toBe(savedVideo);

    // arrange
    const storedBefore = storedExerciseVideoIds();
    await exerciseLibrary.open();
    await exerciseLibrary.startNewExercise();
    await exerciseEditor.enter({ name: discarded, primaryMuscles: ["Glutes"] });
    await exerciseEditor.chooseVideo(exerciseVideoSamples.landscape);
    await exerciseEditor.expectChosenVideoPreview();

    // act
    await exerciseEditor.cancel();

    // assert
    await exerciseLibrary.expectOpen();
    await exerciseLibrary.expectNotListed(discarded);
    expect(storedExerciseVideoIds()).toEqual(storedBefore);
  },
);

test(
  "a file that only looks like a video is refused on save on the video field and her entries and choice stay",
  { tag: "@completeness" },
  async ({
    coachDashboard,
    exerciseEditor,
    exerciseLibrary,
    exerciseVideoSamples,
    page,
    provisionCoach,
    signInAsCoach,
  }) => {
    // arrange
    const runId = resolveRunId();
    const entered: SavedExercise = {
      name: `Goblet squat ${runId}`,
      type: "Resistance",
      unit: "Reps",
      sides: "Both sides together",
      primaryMuscles: ["Quadriceps"],
      secondaryMuscles: ["Glutes"],
      equipment: ["Dumbbells"],
      difficulty: "Intermediate",
      tags: ["Strength"],
      cues: "Elbows inside the knees.",
    };
    await provisionCoach();
    await page.goto("/store");
    await signInAsCoach();
    await coachDashboard.open();
    await exerciseEditor.openNew();
    await exerciseEditor.enter({
      name: entered.name,
      primaryMuscles: entered.primaryMuscles,
      secondaryMuscles: entered.secondaryMuscles,
      equipment: entered.equipment,
      difficulty: entered.difficulty,
      toggledTags: entered.tags,
      cues: entered.cues,
    });
    await exerciseEditor.chooseVideo(exerciseVideoSamples.textNamedAsVideo());
    await exerciseEditor.expectNoVideoProblem();
    const storedBefore = storedExerciseVideoIds();

    // act
    await exerciseEditor.create();

    // assert
    await exerciseEditor.expectVideoRefused(NO_VIDEO_INSIDE_REFUSAL);
    await exerciseEditor.expectChosenVideoPreview();
    await exerciseEditor.expectFocusOnReplaceVideo();
    await exerciseEditor.expectStillNew();
    await exerciseEditor.expectEntries(entered);
    expect(storedExerciseVideoIds()).toEqual(storedBefore);

    // act
    await exerciseEditor.replaceVideo(exerciseVideoSamples.landscape);
    await exerciseEditor.create();

    // assert
    await exerciseLibrary.expectOpen();
    await exerciseLibrary.expectConfirmation("Exercise created");
    await exerciseLibrary.expectListed({
      name: entered.name,
      summary: "Resistance · Dumbbells",
      tags: entered.tags,
      primaryMuscles: entered.primaryMuscles,
      difficulty: entered.difficulty,
      video: "Attached",
    });
  },
);

test(
  "a name taken on a save with a video is shown on the name field and keeps the chosen video",
  { tag: "@completeness" },
  async ({
    coachDashboard,
    exerciseEditor,
    exerciseLibrary,
    exerciseRequests,
    exerciseVideoSamples,
    page,
    provisionCoach,
    signInAsCoach,
  }) => {
    // arrange
    const runId = resolveRunId();
    const name = `Single-leg deadlift ${runId}`;
    const renamed = `Banded single-leg deadlift ${runId}`;
    await provisionCoach();
    await page.goto("/store");
    await signInAsCoach();
    await coachDashboard.open();
    await exerciseEditor.openNew();
    await exerciseEditor.enter({ name, primaryMuscles: ["Hamstrings"] });
    await exerciseEditor.chooseVideo(exerciseVideoSamples.landscape);
    await exerciseRequests.createAccepted(hipThrustNamed(name));
    const storedBefore = storedExerciseVideoIds();

    // act
    await exerciseEditor.create();

    // assert
    await exerciseEditor.expectOnlyProblem(
      "Name",
      "An exercise with this name already exists",
    );
    await exerciseEditor.expectStillNew();
    await exerciseEditor.expectChosenVideoPreview();
    await exerciseEditor.expectNoVideoProblem();
    expect(storedExerciseVideoIds()).toEqual(storedBefore);

    // act
    await exerciseEditor.enter({ name: renamed });
    await exerciseEditor.create();

    // assert
    await exerciseLibrary.expectOpen();
    await exerciseLibrary.expectListed({
      name: renamed,
      summary: "Resistance · No equipment",
      tags: [],
      primaryMuscles: ["Hamstrings"],
      difficulty: "Beginner",
      video: "Attached",
    });
  },
);

test(
  "the save uploads the video with its progress announced, refuses a second submit and finishes up before it lands",
  { tag: "@completeness" },
  async ({
    coachDashboard,
    exerciseEditor,
    exerciseLibrary,
    exerciseVideoSamples,
    page,
    provisionCoach,
    signInAsCoach,
  }) => {
    // arrange
    const runId = resolveRunId();
    const name = `Hip thrust hold ${runId}`;
    await provisionCoach();
    await page.goto("/store");
    await signInAsCoach();
    await coachDashboard.open();
    await exerciseEditor.openNew();
    await exerciseEditor.enter({ name, primaryMuscles: ["Glutes"] });
    await exerciseEditor.chooseVideo(exerciseVideoSamples.slowToUpload());
    const saves = exerciseEditor.countSaves();
    await exerciseEditor.recordUploadMessages();
    const restoreUploads = await exerciseEditor.slowUploadsDown();

    // act
    await exerciseEditor.create();

    // assert
    await exerciseEditor.expectUploading();
    await exerciseEditor.expectUploadAdvancing();

    // act
    await exerciseEditor.submitAgainWhileSaving();
    await exerciseEditor.waitForUploadToLand();

    // assert
    await exerciseLibrary.expectOpen();
    await exerciseLibrary.expectConfirmation("Exercise created");
    expect(saves()).toBe(1);
    await exerciseEditor.expectUploadAnnouncedThenFinishedUp();
    await restoreUploads();
  },
);

test(
  "a failed upload tells her so, keeps her entries and the video, and Try again saves them",
  { tag: "@completeness" },
  async ({
    coachDashboard,
    exerciseEditor,
    exerciseLibrary,
    exerciseVideoSamples,
    page,
    provisionCoach,
    signInAsCoach,
  }) => {
    // arrange
    const runId = resolveRunId();
    const entered: SavedExercise = {
      name: `Reverse lunge ${runId}`,
      type: "Resistance",
      unit: "Reps",
      sides: "One side at a time",
      primaryMuscles: ["Glutes"],
      secondaryMuscles: ["Quadriceps"],
      equipment: ["Dumbbells"],
      difficulty: "Beginner",
      tags: ["Hypertrophy"],
      cues: "Step long, knee kisses the floor.",
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
      toggledTags: entered.tags,
      cues: entered.cues,
    });
    await exerciseEditor.chooseVideo(exerciseVideoSamples.landscape);
    await exerciseEditor.failNextSave();

    // act
    await exerciseEditor.create();

    // assert
    await exerciseEditor.expectUploadFailed();
    await exerciseEditor.expectStillNew();
    await exerciseEditor.expectEntries(entered);

    // act
    await exerciseEditor.retryUpload();

    // assert
    await exerciseLibrary.expectOpen();
    await exerciseLibrary.expectConfirmation("Exercise created");
    await exerciseLibrary.expectListed({
      name: entered.name,
      summary: "Resistance · Dumbbells",
      tags: entered.tags,
      primaryMuscles: entered.primaryMuscles,
      difficulty: entered.difficulty,
      video: "Attached",
    });
  },
);

test(
  "replacing or removing a saved video keeps only what she saved and deletes the file it replaced",
  { tag: "@completeness" },
  async ({
    coachDashboard,
    exerciseEditor,
    exerciseLibrary,
    exerciseRequests,
    exerciseVideoSamples,
    page,
    provisionCoach,
    signInAsCoach,
  }) => {
    // arrange
    const runId = resolveRunId();
    const saved = hipThrustNamed(`Frog pump ${runId}`);
    const listed = {
      name: saved.name,
      summary: "Resistance · Barbell, Bench",
      tags: saved.tags,
      primaryMuscles: saved.primaryMuscles,
      difficulty: saved.difficulty,
    };
    await provisionCoach();
    await page.goto("/store");
    await signInAsCoach();
    await coachDashboard.open();
    await exerciseRequests.createWithVideo(
      saved,
      exerciseVideoSamples.landscape,
    );
    await exerciseLibrary.open();
    await exerciseLibrary.edit(saved.name);
    const firstVideo = await exerciseEditor.servedVideoPath();

    // act
    await exerciseEditor.replaceVideo(exerciseVideoSamples.portrait);
    await exerciseEditor.saveChanges();

    // assert
    await exerciseLibrary.expectOpen();
    await exerciseLibrary.expectListed({ ...listed, video: "Attached" });

    // act
    await exerciseLibrary.edit(saved.name);
    const secondVideo = await exerciseEditor.servedVideoPath();

    // assert
    expect(secondVideo).not.toBe(firstVideo);
    await exerciseEditor.expectVideoShownWhole();
    expect(storedExerciseVideoIds()).toContain(videoIdOf(secondVideo));
    expect(storedExerciseVideoIds()).not.toContain(videoIdOf(firstVideo));
    expect((await exerciseRequests.openVideo(firstVideo)).status).toBe(404);

    // act
    await exerciseEditor.removeVideo();
    await exerciseEditor.saveChanges();

    // assert
    await exerciseLibrary.expectOpen();
    await exerciseLibrary.expectListed({ ...listed, video: "—" });

    // act
    await exerciseLibrary.edit(saved.name);

    // assert
    await exerciseEditor.expectNoVideo();
    expect(storedExerciseVideoIds()).not.toContain(videoIdOf(secondVideo));
    expect((await exerciseRequests.openVideo(secondVideo)).status).toBe(404);
  },
);

test(
  "a saved video plays from the server with seeking, and Replace and Remove leave the player's controls clear on desktop and phone",
  { tag: "@completeness" },
  async ({
    coachDashboard,
    exerciseEditor,
    exerciseLibrary,
    exerciseRequests,
    exerciseVideoSamples,
    page,
    provisionCoach,
    signInAsCoach,
  }) => {
    // arrange
    const runId = resolveRunId();
    const saved = hipThrustNamed(`Banded walk ${runId}`);
    await provisionCoach();
    await page.goto("/store");
    await signInAsCoach();
    await coachDashboard.open();
    await exerciseRequests.createWithVideo(
      saved,
      exerciseVideoSamples.portrait,
    );
    await exerciseLibrary.open();

    // act
    await exerciseLibrary.edit(saved.name);

    // assert
    await exerciseEditor.expectServedVideo();
    await exerciseEditor.expectVideoShownWhole();
    await exerciseEditor.expectPlayerControlsUncovered();

    // act
    await exerciseEditor.seekVideoTo(SEEK_TO_SECONDS);
    await exerciseEditor.playVideoFromControls();

    // act
    await setPhoneViewport(page);

    // assert
    await exerciseEditor.expectVideoShownWhole();
    await exerciseEditor.expectPlayerControlsUncovered();
  },
);

test(
  "the save endpoint judges an uploaded video by its content and size, and the served video answers byte ranges",
  { tag: "@completeness" },
  async ({
    coachDashboard,
    exerciseEditor,
    exerciseLibrary,
    exerciseRequests,
    exerciseVideoSamples,
    page,
    provisionCoach,
    signInAsCoach,
  }) => {
    // arrange
    const runId = resolveRunId();
    const saved = hipThrustNamed(`Sumo deadlift ${runId}`);
    await provisionCoach();
    await page.goto("/store");
    await signInAsCoach();
    await coachDashboard.open();

    // act
    const refusals = [
      await exerciseRequests.createWithVideo(
        hipThrustNamed(`Disguised ${runId}`),
        exerciseVideoSamples.textNamedAsVideo(),
      ),
      await exerciseRequests.createWithVideo(
        hipThrustNamed(`Over the cap ${runId}`),
        exerciseVideoSamples.overTheCap(),
      ),
      await exerciseRequests.createWithVideo(
        hipThrustNamed(`Over the request cap ${runId}`),
        exerciseVideoSamples.overTheRequestCap(),
      ),
    ];

    // assert
    expect(refusals).toEqual([
      { status: 422, body: { problems: { video: "unsupported" } } },
      { status: 422, body: { problems: { video: "too-large" } } },
      { status: 413, body: { problems: { video: "too-large" } } },
    ]);

    // act
    const created = await exerciseRequests.createWithVideoUnder(
      "Multipart/Form-Data",
      { fields: saved, video: exerciseVideoSamples.landscape },
    );

    // assert
    expect(created.status).toBe(200);

    // act
    await exerciseLibrary.open();
    await exerciseLibrary.edit(saved.name);
    const videoPath = await exerciseEditor.servedVideoPath();
    const [whole, head, tail, beyond] = [
      await exerciseRequests.openVideo(videoPath),
      await exerciseRequests.openVideo(videoPath, "bytes=0-99"),
      await exerciseRequests.openVideo(videoPath, "bytes=-100"),
      await exerciseRequests.openVideo(videoPath, "bytes=99999999-"),
    ];
    const size = whole.byteCount;

    // assert
    expect(whole).toMatchObject({
      status: 200,
      headers: {
        "accept-ranges": "bytes",
        "content-type": "video/mp4",
        "x-content-type-options": "nosniff",
      },
    });
    expect(head).toMatchObject({
      status: 206,
      byteCount: 100,
      headers: { "content-range": `bytes 0-99/${size}` },
    });
    expect(tail).toMatchObject({
      status: 206,
      byteCount: 100,
      headers: { "content-range": `bytes ${size - 100}-${size - 1}/${size}` },
    });
    expect(beyond).toMatchObject({
      status: 416,
      headers: { "content-range": `bytes */${size}` },
    });
  },
);

test(
  "a signed-out visitor and a signed-in client can neither play an exercise's demo video nor upload one",
  { tag: "@completeness" },
  async ({
    coachDashboard,
    exerciseEditor,
    exerciseLibrary,
    exerciseRequests,
    exerciseVideoSamples,
    page,
    provisionAccount,
    provisionCoach,
    publicNav,
    signIn,
    signInAsCoach,
    visitorExerciseRequests,
  }) => {
    // arrange
    const runId = resolveRunId();
    const kept = hipThrustNamed(`Nordic curl ${runId}`);
    const video = exerciseVideoSamples.landscape;
    await provisionCoach();
    await provisionAccount("CLIENT");
    await page.goto("/store");
    await signInAsCoach();
    await coachDashboard.open();
    await exerciseRequests.createWithVideo(kept, video);
    await exerciseLibrary.open();
    await exerciseLibrary.edit(kept.name);
    const exerciseId = await exerciseEditor.exerciseId();
    const videoPath = await exerciseEditor.servedVideoPath();
    expect((await exerciseRequests.openVideo(videoPath)).status).toBe(200);
    await page.goto("/");
    await publicNav.signOut();

    // act
    const visitorStatuses = [
      (await visitorExerciseRequests.openVideo(videoPath)).status,
      (await visitorExerciseRequests.openVideo(videoPath, "bytes=0-99")).status,
      (
        await visitorExerciseRequests.createWithVideo(
          hipThrustNamed(`Visitor ${runId}`),
          video,
        )
      ).status,
      (
        await visitorExerciseRequests.editWithVideo(exerciseId, {
          fields: kept,
          video,
        })
      ).status,
    ];

    // assert
    expect(visitorStatuses).toEqual([404, 404, 401, 401]);

    // arrange
    await page.goto("/store");
    await signIn();

    // act
    const clientStatuses = [
      (await exerciseRequests.openVideo(videoPath)).status,
      (await exerciseRequests.openVideo(videoPath, "bytes=0-99")).status,
      (
        await exerciseRequests.createWithVideo(
          hipThrustNamed(`Client ${runId}`),
          video,
        )
      ).status,
      (
        await exerciseRequests.editWithVideo(exerciseId, {
          fields: kept,
          video,
        })
      ).status,
    ];

    // assert
    expect(clientStatuses).toEqual([404, 404, 403, 403]);
  },
);

test(
  "the coach chooses, replaces, removes and plays a demo video by keyboard alone, with every refusal announced on the field",
  { tag: "@completeness" },
  async ({
    coachDashboard,
    exerciseEditor,
    exerciseLibrary,
    exerciseVideoSamples,
    page,
    provisionCoach,
    signInAsCoach,
  }) => {
    // arrange
    const runId = resolveRunId();
    const created: SavedExercise = {
      name: `Dead bug ${runId}`,
      type: "Mobility",
      unit: "Reps",
      sides: "One side at a time",
      primaryMuscles: ["Core"],
      secondaryMuscles: [],
      equipment: ["Mat"],
      difficulty: "Beginner",
      tags: ["Recovery"],
      cues: "Low back stays on the mat.",
    };
    await provisionCoach();
    await page.goto("/store");
    await signInAsCoach();
    await coachDashboard.open();
    await exerciseEditor.openNew();

    // act
    await exerciseEditor.chooseVideoWithKeyboard(
      exerciseVideoSamples.notAVideo(),
    );

    // assert
    await exerciseEditor.expectVideoRefused(NOT_A_VIDEO_REFUSAL);

    // act
    await exerciseEditor.chooseVideoWithKeyboard(
      exerciseVideoSamples.landscape,
    );

    // assert
    await exerciseEditor.expectChosenVideoPreview();
    await exerciseEditor.expectFocusOnReplaceVideo();
    await exerciseEditor.expectNoVideoProblem();

    // act
    await exerciseEditor.playVideoWithKeyboard();
    await exerciseEditor.replaceVideoWithKeyboard(
      exerciseVideoSamples.notAVideo(),
    );

    // assert
    await exerciseEditor.expectVideoRefused(NOT_A_VIDEO_REFUSAL);
    await exerciseEditor.expectChosenVideoPreview();

    // act
    await exerciseEditor.replaceVideoWithKeyboard(
      exerciseVideoSamples.portrait,
    );

    // assert
    await exerciseEditor.expectChosenVideoPreview();
    await exerciseEditor.expectNoVideoProblem();

    // act
    await exerciseEditor.removeVideoWithKeyboard();

    // assert
    await exerciseEditor.expectNoVideo();
    await exerciseEditor.expectFocusOnVideoDropzone();

    // act
    await exerciseEditor.chooseVideoWithKeyboard(
      exerciseVideoSamples.landscape,
    );
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
      video: "Attached",
    });
  },
);
