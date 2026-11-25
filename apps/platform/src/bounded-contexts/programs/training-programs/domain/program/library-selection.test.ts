import { describe, expect, it } from "vitest";

import type { LibraryExercise } from "./library-exercise";
import { LibrarySelection } from "./library-selection";
import type { Block, ExerciseRow, Session } from "./program-content";

function exercise(
  id: string,
  overrides: Partial<LibraryExercise> = {},
): LibraryExercise {
  return {
    id,
    name: id,
    type: "resistance",
    unit: "reps",
    perSide: false,
    pattern: "isolation",
    role: null,
    primaryMuscles: ["Glutes"],
    secondaryMuscles: [],
    equipment: [],
    tags: [],
    cues: "",
    videoPath: null,
    archived: false,
    ...overrides,
  };
}

const BACK_SQUAT = exercise("Barbell Back Squat", {
  pattern: "squat",
  primaryMuscles: ["Quadriceps"],
  equipment: ["Barbell", "Squat rack"],
});
const GOBLET_SQUAT = exercise("Goblet Squat", {
  pattern: "squat",
  primaryMuscles: ["Quadriceps"],
  equipment: ["Dumbbells"],
});
const PUSH_UP = exercise("Push-Up", {
  pattern: "horizontal-push",
  primaryMuscles: ["Chest"],
});
const WALKING_LUNGES = exercise("Walking Lunges", {
  pattern: "lunge",
  primaryMuscles: ["Quadriceps"],
});
const ARCHIVED_THRUST = exercise("Barbell Hip Thrust", {
  pattern: "hinge",
  equipment: ["Barbell"],
  archived: true,
});
const BURPEE = exercise("Burpee", {
  pattern: "conditioning",
  primaryMuscles: ["Full body"],
  tags: ["Conditioning"],
});
const HIP_CIRCLES = exercise("Hip Circles", {
  type: "mobility",
  pattern: null,
});
const PIGEON = exercise("Pigeon Stretch", {
  type: "stretching",
  unit: "time",
  pattern: null,
});
const BIKE = exercise("Stationary bike", {
  type: "cardio",
  unit: "time",
  pattern: null,
  equipment: ["Bike"],
});

const LIBRARY = [
  BACK_SQUAT,
  GOBLET_SQUAT,
  PUSH_UP,
  WALKING_LUNGES,
  ARCHIVED_THRUST,
  BURPEE,
  HIP_CIRCLES,
  PIGEON,
  BIKE,
];

const DUMBBELLS_ONLY = ["Dumbbells", "Bench"] as const;

function names(offered: readonly LibraryExercise[]): string[] {
  return offered.map((item) => item.name);
}

function row(id: string, exerciseId: string): ExerciseRow {
  return {
    id,
    exerciseId,
    slot: "A",
    startSets: [],
    restSeconds: 60,
    lastSetTechnique: "none",
    substitutions: [],
    progression: { kind: "double" },
    cues: "",
    touched: [],
  };
}

function blockWith(session: Session): Block {
  return { sessions: [session] } as Block;
}

const SESSION: Session = {
  id: "session-1",
  originId: "session-1",
  name: "Full Body A",
  warmUp: { items: [] },
  coolDown: { enabled: false, items: [] },
  rows: [row("row-1", BACK_SQUAT.id)],
};

describe("LibrarySelection offered", () => {
  it("offers her active resistance exercises with only her equipment at first", () => {
    // act
    const offered = LibrarySelection.initial().offered(LIBRARY, DUMBBELLS_ONLY);

    // assert
    expect(names(offered)).toEqual([
      "Goblet Squat",
      "Push-Up",
      "Walking Lunges",
      "Burpee",
    ]);
  });

  it("offers every active exercise of the chosen type once her equipment is no longer required", () => {
    // arrange
    const selection = LibrarySelection.initial().withOnlyHerEquipmentToggled();

    // act
    const resistance = selection.offered(LIBRARY, DUMBBELLS_ONLY);
    const cardio = selection.withType("cardio").offered(LIBRARY, []);

    // assert
    expect(names(resistance)).toEqual([
      "Barbell Back Squat",
      "Goblet Squat",
      "Push-Up",
      "Walking Lunges",
      "Burpee",
    ]);
    expect(names(cardio)).toEqual(["Stationary bike"]);
  });

  it("offers only exercises without equipment for bodyweight", () => {
    // act
    const offered = LibrarySelection.initial()
      .withOnlyHerEquipmentToggled()
      .withBodyweightToggled()
      .offered(LIBRARY, DUMBBELLS_ONLY);

    // assert
    expect(names(offered)).toEqual(["Push-Up", "Walking Lunges", "Burpee"]);
  });

  it("narrows by movement pattern for resistance only", () => {
    // arrange
    const squats = LibrarySelection.initial()
      .withOnlyHerEquipmentToggled()
      .withPatternToggled("squat");

    // act
    const resistance = squats.offered(LIBRARY, []);
    const mobility = squats.withType("mobility").offered(LIBRARY, []);

    // assert
    expect(names(resistance)).toEqual(["Barbell Back Squat", "Goblet Squat"]);
    expect(names(mobility)).toEqual(["Hip Circles"]);
    expect(squats.withType("mobility").panelFilters()).toEqual([]);
  });

  it("narrows by primary muscle", () => {
    // act
    const offered = LibrarySelection.initial()
      .withOnlyHerEquipmentToggled()
      .withMuscleToggled("Chest")
      .withMuscleToggled("Full body")
      .offered(LIBRARY, []);

    // assert
    expect(names(offered)).toEqual(["Push-Up", "Burpee"]);
  });

  it("narrows by the exercise name, whatever its case", () => {
    // act
    const offered = LibrarySelection.initial()
      .withOnlyHerEquipmentToggled()
      .withQuery(" LUNGE ")
      .offered(LIBRARY, []);

    // assert
    expect(names(offered)).toEqual(["Walking Lunges"]);
  });
});

describe("LibrarySelection offerFor", () => {
  it("offers mobility and Conditioning-tagged exercises to a warm-up, and stretching to a cool-down", () => {
    // arrange
    const block = blockWith(SESSION);
    const warmUp = LibrarySelection.initial()
      .withOnlyHerEquipmentToggled()
      .forOffer(
        LibrarySelection.offerFor(
          { kind: "warm-up", sessionId: SESSION.id },
          { block, libraryExercises: LIBRARY },
        )!,
      );
    const coolDown = LibrarySelection.offerFor(
      { kind: "cool-down", sessionId: SESSION.id },
      { block, libraryExercises: LIBRARY },
    );

    // act
    const forWarmUp = warmUp.offered(LIBRARY, []);
    const afterTypeChange = warmUp.withType("stretching").offered(LIBRARY, []);

    // assert
    expect(warmUp.type).toBe("mobility");
    expect(names(forWarmUp)).toEqual(["Burpee", "Hip Circles"]);
    expect(names(afterTypeChange)).toEqual(["Pigeon Stretch"]);
    expect(coolDown).toEqual({ type: "stretching", patterns: [] });
  });

  it("pre-filters a substitution to the pattern of the row's exercise and offers resistance to a slot", () => {
    // arrange
    const block = blockWith(SESSION);

    // act
    const substitution = LibrarySelection.offerFor(
      { kind: "substitution", sessionId: SESSION.id, rowId: "row-1" },
      { block, libraryExercises: LIBRARY },
    );
    const slot = LibrarySelection.offerFor(
      { kind: "slot", sessionId: SESSION.id, slot: "C" },
      { block, libraryExercises: LIBRARY },
    );
    const elsewhere = LibrarySelection.offerFor(
      { kind: "slot", sessionId: "another-session", slot: "C" },
      { block, libraryExercises: LIBRARY },
    );

    // assert
    expect(substitution).toEqual({ type: "resistance", patterns: ["squat"] });
    expect(slot).toEqual({ type: "resistance", patterns: [] });
    expect(elsewhere).toBeNull();
  });

  it("takes an offer's type and patterns, turns bodyweight off and keeps the search, muscles and her equipment", () => {
    // arrange
    const selection = LibrarySelection.initial()
      .withQuery("squat")
      .withMuscleToggled("Quadriceps")
      .withBodyweightToggled()
      .withType("mobility");

    // act
    const offered = selection.forOffer({
      type: "resistance",
      patterns: ["squat"],
    });

    // assert
    expect(offered.type).toBe("resistance");
    expect(offered.query).toBe("squat");
    expect(offered.patterns).toEqual(["squat"]);
    expect(offered.muscles).toEqual(["Quadriceps"]);
    expect(offered.onlyHerEquipment).toBe(true);
    expect(offered.bodyweightOnly).toBe(false);
  });
});

describe("LibrarySelection filters", () => {
  it("lists the search and the panel's filters, and removes one at a time", () => {
    // arrange
    const selection = LibrarySelection.initial()
      .withQuery("zzz")
      .withPatternToggled("squat");

    // act
    const active = selection.activeFilters();
    const withoutHerEquipment = selection.withoutFilter({
      kind: "only-her-equipment",
    });

    // assert
    expect(active).toEqual([
      { kind: "search", query: "zzz" },
      { kind: "pattern", pattern: "squat" },
      { kind: "only-her-equipment" },
    ]);
    expect(selection.panelFilters()).toHaveLength(2);
    expect(withoutHerEquipment.activeFilters()).toEqual([
      { kind: "search", query: "zzz" },
      { kind: "pattern", pattern: "squat" },
    ]);
  });

  it("clears the panel's filters and keeps the search, or clears everything", () => {
    // arrange
    const selection = LibrarySelection.initial()
      .withQuery("squat")
      .withBodyweightToggled()
      .withMuscleToggled("Chest");

    // act
    const panelCleared = selection.withPanelFiltersCleared();
    const cleared = selection.cleared();

    // assert
    expect(panelCleared.activeFilters()).toEqual([
      { kind: "search", query: "squat" },
    ]);
    expect(cleared.activeFilters()).toEqual([]);
    expect(cleared.type).toBe("resistance");
  });
});
