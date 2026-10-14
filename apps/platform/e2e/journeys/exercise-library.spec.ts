import { test } from "../support/fixtures";
import type { SavedExercise } from "../support/exercise-editor-page";
import { resolveRunId } from "../support/run-id";

test(
  "the coach reaches her exercise library from the menu, creates an exercise, finds it listed and edits it",
  { tag: "@critical" },
  async ({
    coachDashboard,
    exerciseEditor,
    exerciseLibrary,
    page,
    provisionCoach,
    signInAsCoach,
  }) => {
    // arrange
    const runId = resolveRunId();
    const created: SavedExercise = {
      name: `Glute bridge ${runId}`,
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
      name: `Weighted glute bridge ${runId}`,
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
